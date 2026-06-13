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

export async function checkbox_toggle(
  item_path: string,
  hash: string,
): Promise<void> {
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

  const content = await try_read_file(item_path);
  if (content === null) return;
  const updated = toggle_checkbox_by_hash(content, hash);
  if (updated !== content) {
    await writeFile(item_path, updated, "utf-8");
  }

  await run_after_hook(kanban_dir, "after_checkbox_toggle", hook_ctx);
}