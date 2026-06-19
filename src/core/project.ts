import path from 'node:path';
import { ensure_dir, list_dir, try_read_file, write_file } from '../utils/fs.js';
import { parse_yaml_frontmatter, build_frontmatter_doc } from '../utils/markdown.js';
import { log_event } from './event_log.js';

export interface ProjectConfig {
  name?: string;
  description?: string;
}

/**
 * 初始化项目：创建项目目录和 readme.md（含 yaml frontmatter 配置）。
 */
export async function project_init(root_dir: string, name: string): Promise<string> {
  const project_dir = path.join(root_dir, name);
  await ensure_dir(project_dir);
  const readme_path = path.join(project_dir, 'readme.md');
  const existing = await try_read_file(readme_path);
  if (existing === null) {
    const meta: Record<string, unknown> = { name, description: '' };
    const content = build_frontmatter_doc(meta, '');
    await write_file(readme_path, content);
    await log_event(project_dir, 'project_init', '创建项目: ' + name);
  }
  return project_dir;
}

/**
 * 读取项目配置（readme.md 的 frontmatter）。
 */
export async function get_project_config(project_dir: string): Promise<ProjectConfig> {
  const readme_path = path.join(project_dir, 'readme.md');
  const content = await try_read_file(readme_path);
  if (content === null) return {};

  const parsed = parse_yaml_frontmatter(content);
  if (parsed === null) return {};

  const meta = parsed.metadata;
  return {
    name: (meta.name as string) || path.basename(project_dir),
    description: (meta.description as string) || '',
  };
}

/**
 * 列出所有项目名。
 */
export async function project_list(root_dir: string): Promise<string[]> {
  const entries = await list_dir(root_dir);
  return entries.filter((e) => e.is_dir).map((e) => e.name);
}

/**
 * 获取项目的 readme 正文（不含 frontmatter）。
 */
export async function project_context(root_dir: string, name: string): Promise<string | null> {
  const readme_path = path.join(root_dir, name, 'readme.md');
  const content = await try_read_file(readme_path);
  if (content === null) return null;

  const parsed = parse_yaml_frontmatter(content);
  if (parsed) return parsed.body.trim() || null;
  return content.trim() || null;
}

import { write_pmdrc, remove_pmdrc_key, get_pmdrc_value } from '../utils/pmdrc.js';

/**
 * 绑定当前工作目录到指定项目（写入 .pmdrc project = name）。
 */
export async function project_bind(root_dir: string, name: string): Promise<void> {
  const project_dir = path.join(root_dir, name);
  await ensure_dir(project_dir);
  write_pmdrc(process.cwd(), { project: name });
}

/**
 * 解除绑定（删除 .pmdrc 中的 project 配置）。
 */
export async function project_unbind(): Promise<void> {
  remove_pmdrc_key(process.cwd(), 'project');
}

/**
 * 获取当前目录绑定的项目名（从 .pmdrc 或旧 .pmd-link）。
 */
export function get_bound_project(): string | null {
  return get_pmdrc_value('project');
}
