import path from 'node:path';
import { ensure_dir, list_dir, remove_dir } from '../utils/fs.js';
import { ensure_trash } from './trash.js';
import { best_practice_template, load_template_config, apply_template } from './template.js';

/**
 * 创建 kanban 目录，并自动创建 .trash 回收站。
 * @returns kanban 绝对路径
 */
export async function kanban_init(project_dir: string, name: string, template?: string): Promise<string> {
  const k_dir = path.join(project_dir, name);
  await ensure_dir(k_dir);
  await ensure_trash(k_dir);
  if (template === "bp") {
    await best_practice_template(k_dir);
  } else if (template) {
    // 自定义模板：template 是文件或目录路径
    const config = await load_template_config(template);
    if (config) {
      await apply_template(k_dir, config);
    } else {
      console.error("无法加载模板: " + template);
    }
  }
  return k_dir;
}

/**
 * 列出项目下的所有 kanban 名。
 */
export async function kanban_list(project_dir: string): Promise<string[]> {
  const entries = await list_dir(project_dir);
  // 排除 readme.md 等已知非 kanban 文件/目录
  return entries.filter(e => e.is_dir && e.name !== 'readme.md').map(e => e.name);
}

/**
 * 删除 kanban 目录（递归）。
 */
export async function kanban_remove(project_dir: string, name: string): Promise<void> {
  await remove_dir(path.join(project_dir, name));
}
