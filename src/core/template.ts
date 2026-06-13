import path from "node:path";
import { ensure_dir, write_file } from "../utils/fs.js";
import { column_init } from "./column.js";

const BEST_PRACTICE_HOOKS = `
// project.md kanban hooks - 最佳实践模板
// 可导出以下函数：before_item_move, after_item_move, before_item_create,
//   after_item_create, after_item_delete, after_item_delete,
//   before_checkbox_toggle, after_checkbox_toggle
//
// before 钩子返回 { ok: true } 或 { ok: false, message: "原因" } 来放行/阻止
// after 钩子不返回值，仅做通知/日志

/**
 * 卡片移动到目标列之前。
 * dest_column 为目标列名（idea/todo/doing/done）。
 * 内置 done 列会自动校验 checkbox 是否全部完成。
 */
export function before_item_move(ctx) {
  return { ok: true };
}

/**
 * 卡片移动到目标列之后。
 */
export async function after_item_move(ctx) {
}

/**
 * 创建卡片之前。
 */
export function before_item_create(ctx) {
  return { ok: true };
}

/**
 * 卡片创建之后。
 */
export async function after_item_create(ctx) {
}

/**
 * 删除卡片之前。
 */
export function before_item_delete(ctx) {
  return { ok: true };
}

/**
 * 卡片删除之后。
 */
export async function after_item_delete(ctx) {
}

/**
 * 切换 checkbox 之前。
 */
export function before_checkbox_toggle(ctx) {
  return { ok: true };
}

/**
 * 切换 checkbox 之后。
 */
export async function after_checkbox_toggle(ctx) {
}

`;

/**
 * 应用最佳实践模板：创建标准列和 hooks。
 */
export async function best_practice_template(kanban_dir: string): Promise<void> {
  for (const col of ["idea", "todo", "doing", "done"]) {
    await column_init(kanban_dir, col);
  }
  const hooks_dir = path.join(kanban_dir, ".hooks");
  await ensure_dir(hooks_dir);
  await write_file(path.join(hooks_dir, "index.mjs"), BEST_PRACTICE_HOOKS);
  await write_file(path.join(kanban_dir, "idea", ".gitkeep"), "");
}