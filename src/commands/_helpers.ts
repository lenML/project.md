import path from "node:path";
import { existsSync, readFileSync, statSync } from "node:fs";

const LINK_FILENAME = ".pmd-link";

/** 读取当前目录绑定的项目名，无绑定返回 null */
export function get_bound_project(): string | null {
  const link_path = path.join(process.cwd(), LINK_FILENAME);
  try {
    const content = readFileSync(link_path, "utf-8").trim();
    return content || null;
  } catch {
    return null;
  }
}

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
 * 如果当前目录有 .pmd-link 绑定，将项目名预置到路径前。
 * 如果路径以非绑定项目开头且该段为 root_dir 下的项目目录，则报错（除非 force=true）。
 * 返回完整的绝对路径。
 */
export function prepend_bound(
  root_dir: string,
  path_str: string,
  force?: boolean,
): string {
  const bound = get_bound_project();
  if (!bound) return path.join(root_dir, path_str);

  // 检查路径的第一个段是否为已知项目（非绑定）
  const first_seg = path_str.split("/")[0];
  if (first_seg && first_seg !== bound) {
    const candidate_path = path.join(root_dir, first_seg);
    const is_project =
      existsSync(candidate_path) && statSync(candidate_path).isDirectory();
    if (is_project) {
      if (!force) {
        throw new Error(
          `bound to project "${bound}", refusing "${first_seg}" (use --force to override)`,
        );
      }
      // force 模式：原路径直接拼接，不 prepend
      const result = path.join(root_dir, path_str);
      console.log(`[proj: ${bound}] (--force) ${path_str}`);
      return result;
    }
  }

  // 避免重复绑定：如果 path_str 以 "bound/" 开头则去掉前缀
  const prefix = bound + "/";
  const stripped = path_str.startsWith(prefix)
    ? path_str.slice(prefix.length)
    : path_str;
  const result = path.join(root_dir, bound, stripped);
  console.log(`[proj: ${bound}] ${path_str}`);
  return result;
}

/**
 * 解析 item 路径参数。如果是 ID，尝试在所有项目中查找；否则调用 prepend_bound。
 * 找不到时返回 null。
 */
export async function resolve_item_path(
  root_dir: string,
  item_arg: string,
  force?: boolean,
): Promise<string | null> {
  if (!is_item_id(item_arg)) return prepend_bound(root_dir, item_arg, force);

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
