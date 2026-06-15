import path from "node:path";
import { ensure_dir, write_file } from "../utils/fs.js";
import { column_init } from "./column.js";

const BEST_PRACTICE_HOOKS = `
import { readFileSync } from "node:fs";

// project.md kanban hooks - 最佳实践模板
// 可导出以下函数：before_item_move, after_item_move, before_item_create,
//   after_item_create, after_item_delete, after_item_delete,
//   before_checkbox_toggle, after_checkbox_toggle
//
// before 钩子返回 { ok: true } 或 { ok: false, message: "原因" } 来放行/阻止
// after 钩子不返回值，仅做通知/日志

/**
 * 卡片移动到目标列之前。
 * backlog->todo: 必须有 checkbox 子任务
 * 移动到 done: 所有 checkbox 必须完成
 */
export function before_item_move(ctx) {
  // 从 backlog 移入 todo 前必须细化 checkbox
  if (ctx.src_column === "backlog" && ctx.dest_column === "todo" && ctx.item_path) {
    try {
      const content = readFileSync(ctx.item_path, "utf-8");
      const hasCb = /^- \[ |x\] /m.test(content);
      if (!hasCb) {
        return { ok: false, message: "backlog 卡片移入 todo 前需细化 checkbox 子任务" };
      }
    } catch { /* 放行 */ }
  }
  if (ctx.dest_column === "done" && ctx.item_path) {
    try {
      const content = readFileSync(ctx.item_path, "utf-8");
      const unchecked = content
        .split("\\n")
        .filter((l) => /^\\s*-\\s+\\[\\s\\]/.test(l))
        .map((l) => l.trim());
      if (unchecked.length > 0) {
        return { ok: false, message: unchecked.length + " 个 checkbox 未完成: " + unchecked.join(", ") };
      }
    } catch { /* 文件读取失败则放行 */ }
  }
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
  for (const col of ["idea", "backlog", "todo", "doing", "done"]) {
    await column_init(kanban_dir, col);
  }
  const hooks_dir = path.join(kanban_dir, ".hooks");
  await ensure_dir(hooks_dir);
  await write_file(path.join(hooks_dir, "index.mjs"), BEST_PRACTICE_HOOKS);
  const col_desc = {
    idea: "# idea\n\n想法/点子 \u2014 临时存放想法，不要求执行。移动到其他列后才被追踪。\n",
    backlog: "# backlog\n\n待细化 \u2014 已有初步想法，需要先拆分 checkbox 子任务才能排期。\n",
    todo: "# todo\n\n待办 \u2014 需要完成的任务，拆分到可执行的粒度。\n",
    doing: "# doing\n\n进行中 \u2014 正在做的事情，同一时间不要太多。\n",
    done: "# done\n\n完成 \u2014 已完成的卡片。移入前会自动检查所有 checkbox 是否完成。\n",
  };
  for (const [col, desc] of Object.entries(col_desc)) {
    await write_file(path.join(kanban_dir, col, "readme.md"), desc);
  }
}