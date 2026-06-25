import { readFileSync } from "node:fs";

// 列定义（按顺序）
const COLS = ["idea", "backlog", "todo", "doing", "done"];

// 允许的移动规则: src_col -> [dest_cols]
// 主流程 idea→backlog→todo→doing→done，允许后移
const ALLOWED_MOVES = {
  idea:     ["backlog", "todo", "doing"],
  backlog:  ["idea", "todo", "doing"],
  todo:     ["idea", "backlog", "doing"],
  doing:    ["idea", "backlog", "todo", "done"],
  done:     [],
};

/**
 * 卡片移动到目标列之前。
 * - 允许在主流程上前移或后移
 * - todo/doing/done 列必须含 checkbox
 * - done 列所有 checkbox 必须完成
 */
export function before_item_move(ctx) {
  const allowed = ALLOWED_MOVES[ctx.source_column];
  if (allowed && !allowed.includes(ctx.dest_column)) {
    const msg = ctx.source_column === ctx.dest_column
      ? "卡片已在 " + ctx.dest_column + " 列"
      : "不允许从 " + ctx.source_column + " 移动到 " + ctx.dest_column
        + "。主流程: idea→backlog→todo→doing→done，允许后移";
    return { ok: false, message: msg };
  }

  const cols_require_cb = ["todo", "doing", "done"];
  if (cols_require_cb.includes(ctx.dest_column) && ctx.item_path) {
    try {
      const content = readFileSync(ctx.item_path, "utf-8");
      const hasCb = /^- \[ |x\] /m.test(content);
      if (!hasCb) {
        return { ok: false, message: ctx.dest_column + " 列要求卡片必须有 checkbox 子任务，请先细化" };
      }
    } catch { /* skip */ }
  }

  if (ctx.dest_column === "done" && ctx.item_path) {
    try {
      const content = readFileSync(ctx.item_path, "utf-8");
      const unchecked = content
        .split("\n")
        .filter((l) => /^\s*-\s+\[\s\]/.test(l))
        .map((l) => l.trim());
      if (unchecked.length > 0) {
        return { ok: false, message: unchecked.length + " 个 checkbox 未完成: " + unchecked.join(", ") };
      }
    } catch { /* skip */ }
  }

  return { ok: true };
}

export async function after_item_move(ctx) {}
export function before_item_create(ctx) { return { ok: true }; }
export async function after_item_create(ctx) {}
export function before_item_delete(ctx) { return { ok: true }; }
export async function after_item_delete(ctx) {}
export function before_checkbox_toggle(ctx) { return { ok: true }; }
export async function after_checkbox_toggle(ctx) {}
