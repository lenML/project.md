import path from "node:path";
import { rename } from "node:fs/promises";
import { short_hash } from "../utils/hash.js";
import {
  ensure_dir,
  list_dir,
  try_read_file,
  write_file,
  remove_dir,
} from "../utils/fs.js";
import {
  parse_yaml_frontmatter,
  parse_checkbox_lines,
  type CheckboxItem,
} from "../utils/markdown.js";
import {
  get_kanban_dir_from_item,
  run_before_hook,
  run_after_hook,
} from "./hooks.js";

export interface ItemSummary {
  name: string;
  id: string;
  file_path: string;
}

export interface ItemDetail {
  metadata: Record<string, unknown>;
  body: string;
  checkboxes: CheckboxItem[];
}

export async function item_new(
  column_dir: string,
  name: string,
  desc?: string,
): Promise<ItemSummary> {
  const now = new Date().toISOString();
  const id = short_hash(name + now);
  // eslint-disable-next-line no-control-regex
  const safe_name = name.replace(/[<>:"/\\|?*\x00-\x1f]/g, "_");
  const file_path = path.join(column_dir, `${safe_name}.md`);

  // before hook
  const kanban_dir = path.dirname(column_dir);
  const hook_ctx = { item_path: file_path, item_name: name };
  const hook_result = await run_before_hook(
    kanban_dir,
    "before_item_create",
    hook_ctx,
  );
  if (hook_result) {
    throw new Error(hook_result.message || "hook 阻止创建");
  }

  const metadata: Record<string, unknown> = {
    id,
    name,
    created_at: now,
  };
  if (desc) {
    metadata.desc = desc;
  }

  const { build_frontmatter_doc } = await import("../utils/markdown.js");
  const body = desc || "";
  const content = build_frontmatter_doc(metadata, body);

  await ensure_dir(column_dir);
  await write_file(file_path, content);

  await run_after_hook(kanban_dir, "after_item_create", hook_ctx);

  return { name, id, file_path };
}

export async function item_list(dir_path: string): Promise<ItemSummary[]> {
  const entries = await list_dir(dir_path);
  const items: ItemSummary[] = [];
  for (const entry of entries) {
    if (!entry.name.endsWith(".md")) continue;
    const file_path = entry.path;
    const content = await try_read_file(file_path);
    if (content === null) continue;
    const parsed = parse_yaml_frontmatter(content);
    if (parsed === null) continue;
    const id = (parsed.metadata.id as string) || "";
    const name =
      (parsed.metadata.name as string) || entry.name.replace(/\.md$/, "");
    items.push({ name, id, file_path });
  }
  return items;
}

export async function item_show(
  file_path: string,
): Promise<ItemDetail | null> {
  const content = await try_read_file(file_path);
  if (content === null) return null;
  const parsed = parse_yaml_frontmatter(content);
  if (parsed === null) {
    return {
      metadata: {},
      body: content,
      checkboxes: parse_checkbox_lines(content),
    };
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
  return dest_path;
}

export async function item_remove(file_path: string): Promise<void> {
  const kanban_dir = get_kanban_dir_from_item(file_path);
  const hook_ctx = { item_path: file_path };
  const hook_result = await run_before_hook(
    kanban_dir,
    "before_item_delete",
    hook_ctx,
  );
  if (hook_result) {
    throw new Error(hook_result.message || "hook 阻止删除");
  }

  await remove_dir(file_path);

  await run_after_hook(kanban_dir, "after_item_delete", hook_ctx);
}