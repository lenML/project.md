import path from "node:path";
/**
 * 将 "a/b/c" 拆为 { head: "a", tail: "b/c" }
 */
export function split_first(input: string): { head: string; tail: string } {
  const idx = input.indexOf("/");
  if (idx === -1) return { head: input, tail: "" };
  return { head: input.slice(0, idx), tail: input.slice(idx + 1) };
}
/** 判断字符串是否为 8 位 hex ID */
export function is_item_id(s: string): boolean {
  return /^[0-9a-f]{8}$/.test(s);
}

/**
 * 解析 item 路径参数。如果是 ID，尝试在所有项目中查找；否则直接 path.join。
 * 找不到时返回 null。
 */
export async function resolve_item_path(
  root_dir: string,
  item_arg: string,
): Promise<string | null> {
  if (!is_item_id(item_arg)) return path.join(root_dir, item_arg);

  // 按 ID 查找：遍历所有项目
  const { project_list } = await import("../core/project.js");
  const { resolve_item_by_id } = await import("../core/item.js");
  const projects = await project_list(root_dir);
  for (const proj of projects) {
    const fp = await resolve_item_by_id(root_dir, proj, item_arg);
    if (fp) return fp;
  }
  return null;
}