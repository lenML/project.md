import { try_read_file } from "../utils/fs.js";
import { safe_update_file } from "../utils/lock.js";
import { parse_checkbox_lines, toggle_checkbox_by_hash, type CheckboxItem } from "../utils/markdown.js";
import { get_kanban_dir_from_item, run_before_hook, run_after_hook } from "./hooks.js";
import { log_event, get_project_dir, make_paths_relative } from "./event_log.js";

export async function checkbox_list(
  item_path: string,
): Promise<CheckboxItem[]> {
  const content = await try_read_file(item_path);
  if (content === null) return [];
  return parse_checkbox_lines(content);
}

/**
 * 切换一个或多个 checkbox 状态，带文件锁防止竞态。
 */
export async function checkbox_toggle(
  item_path: string,
  ...hashes: string[]
): Promise<void> {
  if (hashes.length === 0) return;

  const kanban_dir = get_kanban_dir_from_item(item_path) ?? undefined;
  const hook_ctx = { item_path };
  const hook_result = await run_before_hook(
    kanban_dir,
    "before_checkbox_toggle",
    hook_ctx,
  );
  if (hook_result) {
    throw new Error(hook_result.message || "hook 阻止 toggle");
  }

  await safe_update_file(item_path, (content) => {
    if (content === null) return null;
    let current = content;
    let changed = false;
    for (const hash of hashes) {
      const updated = toggle_checkbox_by_hash(current, hash);
      if (updated !== current) {
        current = updated;
        changed = true;
      }
    }
    return changed ? current : null;
  });

  await run_after_hook(kanban_dir, "after_checkbox_toggle", hook_ctx);

  // event log
  const proj_dir = get_project_dir(item_path);
  await log_event(proj_dir, "checkbox_toggle", "切换 checkbox: " + hashes.join(", "), undefined, make_paths_relative(proj_dir, {
    item_path,
    hashes,
  }));
}
