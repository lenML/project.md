import path from 'node:path';
import { rename, readdir } from 'node:fs/promises';
import { ensure_dir, remove_dir, path_exists } from '../utils/fs.js';
import { get_kanban_dir_from_item } from './hooks.js';
import { log_event, get_project_dir } from './event_log.js';

const TRASH_NAME = '.trash';

export async function ensure_trash(kanban_dir: string): Promise<string> {
  const trash_dir = path.join(kanban_dir, TRASH_NAME);
  await ensure_dir(trash_dir);
  return trash_dir;
}

function get_trash_dir(item_path: string): string | null {
  const kanban_dir = get_kanban_dir_from_item(item_path);
  if (!kanban_dir) return null;
  return path.join(kanban_dir, TRASH_NAME);
}

export async function trash_item(item_path: string): Promise<string> {
  const trash_dir = get_trash_dir(item_path);
  if (!trash_dir) throw new Error('无法确定 kanban 目录');
  await ensure_dir(trash_dir);
  const base = path.basename(item_path);
  const ts = Date.now().toString(36);
  const trashed_name = base.replace(/\.md$/, '') + '.' + ts + '.md';
  const dest = path.join(trash_dir, trashed_name);
  await rename(item_path, dest);
  const proj_dir = get_project_dir(item_path);
  await log_event(proj_dir, 'item_trash', '移入回收站: ' + base.replace(/\.md$/, ''), undefined, {
    from: path.relative(proj_dir, path.dirname(item_path)).replace(/\\/g, '/'),
    file_path: path.relative(proj_dir, dest).replace(/\\/g, '/'),
  });
  return dest;
}

export async function permanent_delete(item_path: string): Promise<void> {
  const proj_dir = get_project_dir(item_path);
  const item_name = path.basename(item_path).replace(/\.md$/, '');
  await log_event(proj_dir, 'item_delete', '永久删除: ' + item_name, undefined, {
    file_path: path.relative(proj_dir, item_path).replace(/\\\\/g, '/'),
  });
  await remove_dir(item_path);
}

export async function list_trash(kanban_dir: string): Promise<string[]> {
  const trash_dir = path.join(kanban_dir, TRASH_NAME);
  if (!path_exists(trash_dir)) return [];
  const entries = await readdir(trash_dir, { withFileTypes: true });
  return entries
    .filter((e) => e.isFile() && e.name.endsWith('.md'))
    .map((e) => path.join(trash_dir, e.name))
    .sort();
}
