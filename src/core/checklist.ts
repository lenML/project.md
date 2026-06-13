import path from "node:path";
import { pathToFileURL } from "node:url";
import { try_read_file } from "../utils/fs.js";
import { parse_checkbox_lines } from "../utils/markdown.js";
import { item_move } from "./item.js";

export interface ValidationResult {
  ok: boolean;
  message?: string;
}

export async function validate_checkboxes_all_done(
  item_path: string,
): Promise<ValidationResult> {
  const content = await try_read_file(item_path);
  if (content === null) return { ok: true };

  const items = parse_checkbox_lines(content);
  if (items.length === 0) return { ok: true };

  const unchecked = items.filter((t) => !t.checked);
  if (unchecked.length === 0) return { ok: true };

  const names = unchecked.map((t) => t.text).join(", ");
  return {
    ok: false,
    message: unchecked.length + " 个 checkbox 未完成: " + names,
  };
}

interface HookContext {
  item_path: string;
  dest_column: string;
}

type BeforeMoveFn = (
  ctx: HookContext,
) => ValidationResult | Promise<ValidationResult>;

async function load_hook(
  dest_column_dir: string,
): Promise<BeforeMoveFn | null> {
  const kanban_dir = path.dirname(dest_column_dir);
  const col_name = path.basename(dest_column_dir);
  const hook_path = path.join(kanban_dir, ".hooks", col_name + ".mjs");

  try {
    const href = pathToFileURL(hook_path).href;
    const mod = await import(href);
    if (typeof mod.before_move === "function") return mod.before_move;
    return null;
  } catch {
    return null;
  }
}

export async function item_move_with_check(
  item_path: string,
  dest_column_dir: string,
  force = false,
): Promise<string> {
  const col_name = path.basename(dest_column_dir);

  if (!force) {
    const hook = await load_hook(dest_column_dir);
    if (hook) {
      const result = await hook({ item_path, dest_column: col_name });
      if (!result.ok) {
        throw new Error(result.message || "hook 阻止移动");
      }
      return item_move(item_path, dest_column_dir);
    }

    if (col_name === "done") {
      const result = await validate_checkboxes_all_done(item_path);
      if (!result.ok) {
        throw new Error("未完成的 checkbox: " + result.message);
      }
    }
  }

  return item_move(item_path, dest_column_dir);
}