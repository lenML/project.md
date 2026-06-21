import { item_move } from './item.js';
import { parse_checkbox_lines } from '../utils/markdown.js';
import { try_read_file } from '../utils/fs.js';
import { get_kanban_dir, run_before_hook, run_after_hook, type HookResult } from './hooks.js';

// ── 内置验证 ──────────────────────────────────────────────────────────────

export async function validate_checkboxes_all_done(item_path: string): Promise<HookResult> {
  const content = await try_read_file(item_path);
  if (content === null) return { ok: true };

  const items = parse_checkbox_lines(content);
  if (items.length === 0) return { ok: true };

  const unchecked = items.filter((t) => !t.checked);
  if (unchecked.length === 0) return { ok: true };

  const names = unchecked.map((t) => t.text).join(', ');
  return {
    ok: false,
    message: unchecked.length + ' 个 checkbox 未完成: ' + names,
  };
}

// ── 带 hooks 的 move ──────────────────────────────────────────────────────

export async function item_move_with_check(
  item_path: string,
  dest_column_dir: string,
  force = false,
): Promise<string> {
  const kanban_dir = get_kanban_dir(dest_column_dir);
  const col_name = dest_column_dir.split(/[/\\]/).pop() || '';
  const src_col = item_path.split(/[/\\]/).slice(-2, -1)[0] || '';
  const ctx = { item_path, dest_column: col_name, source_column: src_col };

  if (!force) {
    // 1. 自定义 hook
    const hook_result = await run_before_hook(kanban_dir, 'before_item_move', ctx);
    if (hook_result) {
      throw new Error(hook_result.message || 'hook 阻止移动');
    }

    // 2. 内置 done 检查（仅当无 hook 拦截时）
    if (col_name === 'done') {
      const built_in = await validate_checkboxes_all_done(item_path);
      if (!built_in.ok) {
        throw new Error('未完成的 checkbox: ' + built_in.message);
      }
    }
  }

  // 3. 移动
  const result = await item_move(item_path, dest_column_dir);

  // 4. after hook
  await run_after_hook(kanban_dir, 'after_item_move', ctx);

  return result;
}
