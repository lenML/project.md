import path from 'node:path';
import { ensure_dir, list_dir, try_read_file, write_file } from '../utils/fs.js';
import { build_frontmatter_doc, parse_yaml_frontmatter } from '../utils/markdown.js';

/**
 * 创建 column 目录。
 * @returns column 绝对路径
 */
export async function column_init(kanban_dir: string, name: string): Promise<string> {
  return ensure_dir(path.join(kanban_dir, name));
}

/** 含排序信息的列 */
export interface ColumnInfo {
  name: string;
  order?: number;
}

/**
 * 列出 kanban 下的所有 column，按 order 排序（降级按名称）。
 */
export async function column_list(kanban_dir: string): Promise<string[]> {
  const entries = await list_dir(kanban_dir);
  const cols = entries.filter((e) => e.is_dir).map((e) => e.name);
  return column_sort(kanban_dir, cols);
}

async function column_sort(kanban_dir: string, cols: string[]): Promise<string[]> {
  const info: ColumnInfo[] = await Promise.all(
    cols.map(async (name) => {
      const readme = await column_read_readme(kanban_dir, name);
      if (!readme) return { name };
      const parsed = parse_yaml_frontmatter(readme);
      const order = parsed?.metadata?.order as number | undefined;
      return { name, order };
    }),
  );
  info.sort((a, b) => (a.order ?? 9999) - (b.order ?? 9999) || a.name.localeCompare(b.name));
  return info.map((c) => c.name);
}

/**
 * 设置列排序位置（写入列 readme 的 frontmatter）。
 * position = 0 排最前，省略则清除 order
 */
export async function column_set_order(
  kanban_dir: string,
  col_name: string,
  position?: number,
): Promise<void> {
  const readme_path = path.join(kanban_dir, col_name, 'readme.md');
  const existing = (await try_read_file(readme_path)) || '';
  const parsed = parse_yaml_frontmatter(existing);
  let metadata: Record<string, unknown>;
  let body: string;
  if (parsed) {
    metadata = { ...parsed.metadata };
    body = parsed.body;
  } else {
    metadata = {};
    body = existing;
  }
  if (position !== undefined) {
    metadata.order = position;
  } else {
    delete metadata.order;
  }
  const content = build_frontmatter_doc(metadata, body);
  await write_file(readme_path, content);
}

export async function column_read_readme(
  kanban_dir: string,
  col_name: string,
): Promise<string | null> {
  const readme_path = path.join(kanban_dir, col_name, 'readme.md');
  return try_read_file(readme_path);
}
