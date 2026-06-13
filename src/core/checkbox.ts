import { writeFile } from "node:fs/promises";
import { try_read_file } from "../utils/fs.js";
import {
  parse_checkbox_lines,
  toggle_checkbox_by_hash,
  type CheckboxItem,
} from "../utils/markdown.js";
import {
  get_kanban_dir_from_item,
  run_before_hook,
  run_after_hook,
} from "./hooks.js";

export async function checkbox_list(
  item_path: string,
): Promise<CheckboxItem[]> {
  const content = await try_read_file(item_path);
  if (content === null) return [];
  return parse_checkbox_lines(content);
}

/**
 * 切换一个或多个 checkbox 状态。
 * 多个 hash 只触发一次 before/after hook。
 */
export async function checkbox_toggle(
  item_path: string,
  ...hashes: string[]
): Promise<void> {
  if (hashes.length === 0) return;

  const kanban_dir = get_kanban_dir_from_item(item_path);
  const hook_ctx = { item_path };
  const hook_result = await run_before_hook(
    kanban_dir,
    "before_checkbox_toggle",
    hook_ctx,
  );
  if (hook_result) {
    throw new Error(hook_result.message || "hook 阻止 toggle");
  }

  let content = await try_read_file(item_path);
  if (content === null) return;

  let changed = false;
  for (const hash of hashes) {
    const updated = toggle_checkbox_by_hash(content, hash);
    if (updated !== content) {
      content = updated;
      changed = true;
    }
  }

  if (changed) {
    await writeFile(item_path, content, "utf-8");
  }

  await run_after_hook(kanban_dir, "after_checkbox_toggle", hook_ctx);
}