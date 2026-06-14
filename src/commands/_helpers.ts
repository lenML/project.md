import path from "node:path";
import { existsSync } from "node:fs";
import type { Command } from "commander";
import { get_pmdrc_value } from "../utils/pmdrc.js";

/** 读取当前目录绑定的项目名（从 .pmdrc 或旧 .pmd-link） */
export function get_bound_project(): string | null {
  return get_pmdrc_value("project");
}

/** 判断字符串是否为 8 位 hex ID */
export function is_item_id(s: string): boolean {
  return /^[0-9a-f]{8}$/.test(s);
}

/**
 * 从 commander program 或 .pmdrc 中获取 project 名。
 */
export function get_project_name(program: Command): string | null {
  return (program.getOptionValue("project") as string) || get_bound_project();
}

/** 获取 kanban 名：先 --kanban 标志，再 .pmdrc */
function get_kanban_name(program: Command): string | null {
  return (program.getOptionValue("kanban") as string) || get_pmdrc_value("kanban");
}

/** 获取 col 名：先 --col 标志，再 .pmdrc */
function get_col_name(program: Command): string | null {
  return (program.getOptionValue("col") as string) || get_pmdrc_value("col");
}

/** 验证并返回 project 目录 */
export function require_project_dir(root_dir: string, program: Command): string {
  const name = get_project_name(program);
  if (!name) throw new Error("need --project <name> or project bind");
  console.log(`[proj: ${name}]`);
  return path.join(root_dir, name);
}

/** 验证并返回 kanban 目录（--kanban / .pmdrc kanban） */
export function require_kanban_dir(root_dir: string, program: Command): string {
  const proj_dir = require_project_dir(root_dir, program);
  const name = get_kanban_name(program);
  if (!name) throw new Error("need --kanban <name> or set kanban in .pmdrc");
  return path.join(proj_dir, name);
}

/** 验证并返回 column 目录（--col / .pmdrc col） */
export function require_column_dir(root_dir: string, program: Command): string {
  const kanban_dir = require_kanban_dir(root_dir, program);
  const name = get_col_name(program);
  if (!name) throw new Error("need --col <name> or set col in .pmdrc");
  return path.join(kanban_dir, name);
}

/**
 * 解析 item。如果参数是 8 位 hex ID，全局查找；否则尝试按文件路径解析。
 */
export async function resolve_item(
  root_dir: string,
  item_arg: string,
): Promise<string | null> {
  if (!is_item_id(item_arg)) {
    const abs = path.isAbsolute(item_arg) ? item_arg : path.join(process.cwd(), item_arg);
    return existsSync(abs) ? abs : null;
  }

  const { project_list } = await import("../core/project.js");
  const { resolve_item_by_id } = await import("../core/item.js");
  const projects = await project_list(root_dir);
  for (const proj of projects) {
    const fp = await resolve_item_by_id(root_dir, proj, item_arg);
    if (fp) return fp;
  }
  return null;
}
