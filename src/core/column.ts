import path from 'node:path';
import { ensure_dir, list_dir, try_read_file } from '../utils/fs.js';

/**
 * 创建 column 目录。
 * @returns column 绝对路径
 */
export async function column_init(kanban_dir: string, name: string): Promise<string> {
  return ensure_dir(path.join(kanban_dir, name));
}

/**
 * 列出 kanban 下的所有 column 名。
 */
export async function column_list(kanban_dir: string): Promise<string[]> {
  const entries = await list_dir(kanban_dir);
  return entries.filter(e => e.is_dir).map(e => e.name);
}

export async function column_read_readme(kanban_dir: string, col_name: string): Promise<string | null> {
  const readme_path = path.join(kanban_dir, col_name, 'readme.md');
  return try_read_file(readme_path);
}
