import { writeFile } from 'node:fs/promises';
import { try_read_file } from '../utils/fs.js';
import {
  parse_checkbox_lines,
  toggle_checkbox_by_hash,
  type CheckboxItem,
} from '../utils/markdown.js';

/**
 * 列出 item 中所有 checkbox。
 */
export async function todo_list(item_path: string): Promise<CheckboxItem[]> {
  const content = await try_read_file(item_path);
  if (content === null) return [];
  return parse_checkbox_lines(content);
}

/**
 * 切换 item 中指定 hash 的 checkbox 状态。
 * hash 不存在则不修改。
 */
export async function todo_toggle(item_path: string, hash: string): Promise<void> {
  const content = await try_read_file(item_path);
  if (content === null) return;
  const updated = toggle_checkbox_by_hash(content, hash);
  if (updated !== content) {
    await writeFile(item_path, updated, 'utf-8');
  }
}
