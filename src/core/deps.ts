import { try_read_file, write_file } from "../utils/fs.js";
import { parse_yaml_frontmatter, build_frontmatter_doc } from "../utils/markdown.js";

export interface DepItem {
  id: string;
  name: string;
  file_path: string;
}

/**
 * 读取 card 的 depends_on 列表
 */
export async function read_dep_ids(item_path: string): Promise<string[]> {
  const content = await try_read_file(item_path);
  if (content === null) return [];
  const parsed = parse_yaml_frontmatter(content);
  if (!parsed) return [];
  const deps = parsed.metadata.depends_on;
  if (!Array.isArray(deps)) return [];
  return deps.filter((d): d is string => typeof d === "string");
}

/**
 * 写入 depends_on
 */
export async function write_dep_ids(item_path: string, ids: string[]): Promise<void> {
  const content = await try_read_file(item_path);
  if (content === null) throw new Error("item not found");
  const parsed = parse_yaml_frontmatter(content);
  if (!parsed) throw new Error("item has no frontmatter");
  parsed.metadata.depends_on = ids;
  const result = build_frontmatter_doc(parsed.metadata, parsed.body);
  await write_file(item_path, result);
}

/**
 * 为 item 添加依赖（自动去重 + 循环检测）
 */
export async function add_dependency(item_path: string, target_id: string, resolve_fn: (id: string) => Promise<string | null>): Promise<void> {
  const deps = await read_dep_ids(item_path);

  if (deps.includes(target_id)) {
    throw new Error("dep already exists: " + target_id);
  }

  // 检测循环依赖：target 是否已经（直接或间接）依赖 item
  const item_id = await extract_id(item_path);
  if (item_id) {
    const visited = new Set<string>();
    const queue = [target_id];
    while (queue.length > 0) {
      const current = queue.shift()!;
      if (current === item_id) {
        throw new Error("circular dependency detected: " + item_id + " -> ... -> " + target_id);
      }
      if (visited.has(current)) continue;
      visited.add(current);
      const tp = await resolve_fn(current);
      if (tp) {
        const sub = await read_dep_ids(tp);
        queue.push(...sub);
      }
    }
  }

  deps.push(target_id);
  await write_dep_ids(item_path, deps);
}

/**
 * 移除依赖
 */
export async function remove_dependency(item_path: string, target_id: string): Promise<void> {
  const deps = await read_dep_ids(item_path);
  const idx = deps.indexOf(target_id);
  if (idx === -1) throw new Error("dep not found: " + target_id);
  deps.splice(idx, 1);
  await write_dep_ids(item_path, deps);
}

/**
 * 检查 item 是否已完成（所有 checkbox 都勾选）
 */
export async function is_item_done(item_path: string): Promise<boolean> {
  const content = await try_read_file(item_path);
  if (content === null) return true;
  const unchecked = content.match(/^- \[ \]/gm);
  return !(unchecked && unchecked.length > 0);
}

/**
 * 获取 item 自身的 id
 */
async function extract_id(item_path: string): Promise<string | null> {
  const content = await try_read_file(item_path);
  if (content === null) return null;
  const parsed = parse_yaml_frontmatter(content);
  return (parsed?.metadata.id as string) || null;
}
