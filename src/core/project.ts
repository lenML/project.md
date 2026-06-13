import path from 'node:path';
import { ensure_dir, list_dir, try_read_file, write_file } from '../utils/fs.js';

/**
 * 初始化项目：创建项目目录和 readme.md。
 * @returns 项目路径
 */
export async function project_init(root_dir: string, name: string): Promise<string> {
  const project_dir = path.join(root_dir, name);
  await ensure_dir(project_dir);
  const readme_path = path.join(project_dir, 'readme.md');
  const existing = await try_read_file(readme_path);
  if (existing === null) {
    await write_file(readme_path, `# ${name}\n`);
  }
  return project_dir;
}

/**
 * 列出根目录下所有项目名（不含隐藏目录）。
 */
export async function project_list(root_dir: string): Promise<string[]> {
  const entries = await list_dir(root_dir);
  return entries.filter(e => e.is_dir).map(e => e.name);
}

/**
 * 获取项目的 readme.md 内容。
 * 项目不存在则返回 null。
 */
export async function project_context(root_dir: string, name: string): Promise<string | null> {
  const readme_path = path.join(root_dir, name, 'readme.md');
  return try_read_file(readme_path);
}
