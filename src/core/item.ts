import path from "node:path";
import { rename, stat } from "node:fs/promises";
import { short_hash } from "../utils/hash.js";
import {
  ensure_dir,
  list_dir,
  try_read_file,
  try_read_frontmatter,
  write_file,
} from "../utils/fs.js";
import {
  parse_yaml_frontmatter,
  build_frontmatter_doc,
  parse_checkbox_lines,
  type CheckboxItem,
} from "../utils/markdown.js";
import {
  get_kanban_dir_from_item,
  run_before_hook,
  run_after_hook,
} from "./hooks.js";
import { log_event, get_project_dir, make_paths_relative } from "./event_log.js";
import { trash_item } from "./trash.js";
import { kanban_list } from "./kanban.js";
import { column_list } from "./column.js";

export interface ItemSummary {
  name: string;
  id: string;
  file_path: string;
  created_at?: string;
  order?: number;
}

export interface ItemDetail {
  metadata: Record<string, unknown>;
  body: string;
  checkboxes: CheckboxItem[];
}

/**
 * 通过 ID 查找卡片文件路径（搜索项目下所有看板列）。
 */
export async function resolve_item_by_id(
  root_dir: string,
  project_name: string,
  id: string,
): Promise<string | null> {
  const project_dir = root_dir + "/" + project_name;
  const kanbans = await kanban_list(project_dir);
  for (const kanban_name of kanbans) {
    const cols = await column_list(project_dir + "/" + kanban_name);
    for (const col_name of cols) {
      const items = await item_list(project_dir + "/" + kanban_name + "/" + col_name);
      for (const item of items) {
        if (item.id === id) return item.file_path;
      }
    }
  }
  return null;
}

export async function item_new(
  column_dir: string,
  name: string,
  desc?: string,
): Promise<ItemSummary> {
  const now = new Date().toISOString();
  const id = short_hash(name + now);
  const safe_name = Array.from(name).map(ch => ch < ' ' ? '_' : ch).join('').replace(/[\s<>:"/\\|?*]/g, "_");
  const file_path = path.join(column_dir, `${safe_name}.md`);

  const kanban_dir = path.dirname(column_dir);
  const hook_ctx = { item_path: file_path, item_name: name };
  const hook_result = await run_before_hook(kanban_dir, "before_item_create", hook_ctx);
  if (hook_result) {
    throw new Error(hook_result.message || "hook 阻止创建");
  }

  const metadata: Record<string, unknown> = { id, name, created_at: now };
  if (desc) metadata.desc = desc;

    const body = desc || "";
  const content = build_frontmatter_doc(metadata, body);

  await ensure_dir(column_dir);
  await write_file(file_path, content);

  await run_after_hook(kanban_dir, "after_item_create", hook_ctx);

  const proj_dir = get_project_dir(column_dir);
  await log_event(proj_dir, "item_create", "创建卡片: " + name, desc, make_paths_relative(proj_dir, {
    item_id: id,
    item_name: name,
    column: path.basename(column_dir),
    file_path,
  }));

  return { name, id, file_path };
}

// ── mtime 缓存 ──────────────────────────────────────────────
const _listCache = new Map<string, { mtimeMs: number; items: ItemSummary[] }>();

export async function item_list(dir_path: string): Promise<ItemSummary[]> {
  // mtime 快速失效检查
  try {
    const st = await stat(dir_path);
    const cached = _listCache.get(dir_path);
    if (cached && cached.mtimeMs === st.mtimeMs) return cached.items;
  } catch { /* 无法 stat 则跳过缓存 */ }

  const entries = await list_dir(dir_path);
  const reads: Promise<ItemSummary | null>[] = [];
  for (const entry of entries) {
    if (!entry.name.endsWith(".md")) continue;
    reads.push(parse_item_frontmatter(entry.path, entry.name));
  }
  const items: ItemSummary[] = [];
  for (const r of await Promise.all(reads)) {
    if (r) items.push(r);
  }

  // 写入缓存（限制大小防泄漏）
  try {
    const st = await stat(dir_path);
    _listCache.set(dir_path, { mtimeMs: st.mtimeMs, items });
    if (_listCache.size > 100) {
      const key = _listCache.keys().next().value;
      if (key) _listCache.delete(key);
    }
  } catch { /* 缓存失败不影响结果 */ }

  return items;
}

/** 读取单个 md 文件的 frontmatter，返回 ItemSummary */
async function parse_item_frontmatter(file_path: string, entry_name: string): Promise<ItemSummary | null> {
  const head = await try_read_frontmatter(file_path);
  if (head === null) return null;
  const parsed = parse_yaml_frontmatter(head);
  if (parsed === null) return null;
  const id = (parsed.metadata.id as string) || "";
  const name = (parsed.metadata.name as string) || entry_name.replace(/\.md$/, "");
  const created_at = (parsed.metadata.created_at as string) || "";
  const order = parsed.metadata.order as number | undefined;
  if (!id) return null;
  return { name, id, file_path, created_at, order };
}

export async function item_show(file_path: string): Promise<ItemDetail | null> {
  const content = await try_read_file(file_path);
  if (content === null) return null;
  const parsed = parse_yaml_frontmatter(content);
  if (parsed === null) {
    return { metadata: {}, body: content, checkboxes: parse_checkbox_lines(content) };
  }
  return {
    metadata: parsed.metadata,
    body: parsed.body,
    checkboxes: parse_checkbox_lines(parsed.body),
  };
}

export async function item_move(
  file_path: string,
  dest_column_dir: string,
): Promise<string> {
  const file_name = path.basename(file_path);
  const dest_path = path.join(dest_column_dir, file_name);
  await ensure_dir(dest_column_dir);
  await rename(file_path, dest_path);

  const proj_dir = get_project_dir(dest_column_dir);
  const item_name = file_name.replace(/\.md$/, "");
  await log_event(proj_dir, "item_move", "移动卡片: " + item_name, undefined, make_paths_relative(proj_dir, {
    from: path.basename(path.dirname(file_path)),
    to: path.basename(dest_column_dir),
    file_path: dest_path,
  }, ["file_path"]));

  return dest_path;
}

export async function item_import(
  column_dir: string,
  source_file: string,
): Promise<ItemSummary> {
  const source_content = await try_read_file(source_file);
  if (source_content === null) throw new Error("file not found: " + source_file);

  const now = new Date().toISOString();

  // 提取文件名作为默认名称
  const source_basename = path.basename(source_file, ".md").replace(/[\s<>:"/\\|?*]/g, "_");
  const id = short_hash(source_content + now);

  // 解析已有 frontmatter，合并元数据
  const parsed = parse_yaml_frontmatter(source_content);
  let body: string;
  let metadata: Record<string, unknown>;

  if (parsed) {
    metadata = { ...parsed.metadata, id, name: (parsed.metadata.name as string) || source_basename, created_at: now };
    body = parsed.body;
  } else {
    metadata = { id, name: source_basename, created_at: now };
    body = source_content.trim();
  }

  const kanban_dir = path.dirname(column_dir);
  const safe_name = source_basename;
  const file_path = path.join(column_dir, `${safe_name}.md`);
  const hook_ctx = { item_path: file_path, item_name: metadata.name as string };

  const hook_result = await run_before_hook(kanban_dir, "before_item_create", hook_ctx);
  if (hook_result) throw new Error(hook_result.message || "hook 阻止导入");

  const content = build_frontmatter_doc(metadata, body);
  await ensure_dir(column_dir);
  await write_file(file_path, content);
  await run_after_hook(kanban_dir, "after_item_create", hook_ctx);

  const proj_dir = get_project_dir(column_dir);
  await log_event(proj_dir, "item_create", "导入卡片: " + (metadata.name as string), undefined, make_paths_relative(proj_dir, {
    item_id: id,
    item_name: metadata.name,
    column: path.basename(column_dir),
    file_path,
  }, ["file_path"]));

  return { name: metadata.name as string, id, file_path };
}

export async function item_remove(file_path: string): Promise<void> {
  const kanban_dir = get_kanban_dir_from_item(file_path);
  const hook_ctx = { item_path: file_path };
  const hook_result = await run_before_hook(kanban_dir ?? undefined, "before_item_delete", hook_ctx);
  if (hook_result) {
    throw new Error(hook_result.message || "hook 阻止删除");
  }
  await trash_item(file_path);
  await run_after_hook(kanban_dir ?? undefined, "after_item_delete", hook_ctx);
}
