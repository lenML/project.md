import path from 'node:path';
import { rename } from 'node:fs/promises';
import { short_hash } from '../utils/hash.js';
import {
  ensure_dir,
  list_dir,
  try_read_file,
  write_file,
  remove_dir,
} from '../utils/fs.js';
import {
  parse_yaml_frontmatter,
  parse_checkbox_lines,
  type CheckboxItem,
} from '../utils/markdown.js';

export interface ItemSummary {
  name: string;
  id: string;
  file_path: string;
}

export interface ItemDetail {
  metadata: Record<string, unknown>;
  body: string;
  checkboxes: CheckboxItem[];
}

/**
 * 在 column 下创建一个新的 item（markdown 文件）。
 * 文件名取自 name，特殊字符替换为 `_`。
 */
export async function item_new(
  column_dir: string,
  name: string,
  desc?: string,
): Promise<ItemSummary> {
  const now = new Date().toISOString();
  const id = short_hash(name + now);
  // eslint-disable-next-line no-control-regex
  const safe_name = name.replace(/[<>:"/\\|?*\x00-\x1f]/g, '_');
  const file_path = path.join(column_dir, `${safe_name}.md`);

  const metadata: Record<string, unknown> = {
    id,
    name,
    created_at: now,
  };
  if (desc) {
    metadata.desc = desc;
  }

  const { build_frontmatter_doc } = await import('../utils/markdown.js');
  const body = desc || '';
  const content = build_frontmatter_doc(metadata, body);

  await ensure_dir(column_dir);
  await write_file(file_path, content);

  return { name, id, file_path };
}

/**
 * 列出目录下的 item（.md 文件）。
 */
export async function item_list(dir_path: string): Promise<ItemSummary[]> {
  const entries = await list_dir(dir_path);
  const items: ItemSummary[] = [];
  for (const entry of entries) {
    if (!entry.name.endsWith('.md')) continue;
    const file_path = entry.path;
    const content = await try_read_file(file_path);
    if (content === null) continue;
    const parsed = parse_yaml_frontmatter(content);
    if (parsed === null) continue;
    const id = (parsed.metadata.id as string) || '';
    const name = (parsed.metadata.name as string) || entry.name.replace(/\.md$/, '');
    items.push({ name, id, file_path });
  }
  return items;
}

/**
 * 显示 item 详情。
 */
export async function item_show(file_path: string): Promise<ItemDetail | null> {
  const content = await try_read_file(file_path);
  if (content === null) return null;
  const parsed = parse_yaml_frontmatter(content);
  if (parsed === null) {
    return {
      metadata: {},
      body: content,
      checkboxes: parse_checkbox_lines(content),
    };
  }
  return {
    metadata: parsed.metadata,
    body: parsed.body,
    checkboxes: parse_checkbox_lines(parsed.body),
  };
}

/**
 * 移动 item 到目标 column 目录。
 * @returns 新文件路径
 */
export async function item_move(file_path: string, dest_column_dir: string): Promise<string> {
  const file_name = path.basename(file_path);
  const dest_path = path.join(dest_column_dir, file_name);
  await ensure_dir(dest_column_dir);
  await rename(file_path, dest_path);
  return dest_path;
}

/**
 * 删除 item 文件。
 */
export async function item_remove(file_path: string): Promise<void> {
  await remove_dir(file_path);
}
