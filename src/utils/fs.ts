import { existsSync } from 'node:fs';
import { mkdir, readFile, writeFile, readdir, rm } from 'node:fs/promises';
import type { Dirent } from 'node:fs';
import path from 'node:path';
import os from 'node:os';

const DEFAULT_ROOT_NAME = '.project.md';

export function get_default_root(): string {
  return process.env.PMD_DIR || path.join(os.homedir(), DEFAULT_ROOT_NAME);
}

export async function ensure_dir(dir_path: string): Promise<string> {
  await mkdir(dir_path, { recursive: true });
  return dir_path;
}

export function path_exists(p: string): boolean {
  return existsSync(p);
}

export async function try_read_file(file_path: string): Promise<string | null> {
  try {
    return await readFile(file_path, 'utf-8');
  } catch {
    return null;
  }
}

/**
 * 只读取文件的 frontmatter 部分（从开头到闭合 ---），
 * 避免读取整个文件内容。用于 item_list 等只需元数据的场景。
 */
export async function try_read_frontmatter(file_path: string): Promise<string | null> {
  try {
    const file = await readFile(file_path, 'utf-8');
    if (!file.startsWith('---')) return null;
    const end = file.indexOf('\n---\n', 3);
    if (end === -1) return null;
    // 返回 frontmatter 部分（含闭合 ---）
    return file.slice(0, end + 5);
  } catch {
    return null;
  }
}

export async function write_file(file_path: string, content: string): Promise<void> {
  await mkdir(path.dirname(file_path), { recursive: true });
  await writeFile(file_path, content, 'utf-8');
}

export interface DirEntry {
  name: string;
  path: string;
  is_dir: boolean;
}

export async function list_dir(dir_path: string): Promise<DirEntry[]> {
  const entries = (await readdir(dir_path, {
    withFileTypes: true,
  })) as unknown as Dirent[];
  const results: DirEntry[] = [];
  for (const entry of entries) {
    if (entry.name.startsWith('.')) continue;
    results.push({
      name: entry.name,
      path: path.join(dir_path, entry.name),
      is_dir: entry.isDirectory(),
    });
  }
  results.sort((a, b) => a.name.localeCompare(b.name));
  return results;
}

export async function remove_dir(dir_path: string): Promise<void> {
  await rm(dir_path, { recursive: true, force: true });
}

export function dir_name(file_path: string): string {
  return path.basename(file_path);
}

export function join_path(...parts: string[]): string {
  return path.join(...parts);
}

const RELATIVE_UNITS: [string, number][] = [
  ['秒', 60],
  ['分钟', 60],
  ['小时', 24],
  ['天', 30],
  ['月', 12],
];

export function format_relative_time(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime();
  if (diff < 0) return '刚刚';
  let seconds = Math.floor(diff / 1000);
  if (seconds < 10) return '刚刚';
  for (const [unit, divisor] of RELATIVE_UNITS) {
    if (seconds < divisor) return seconds + unit + '前';
    seconds = Math.floor(seconds / divisor);
  }
  return seconds + '年前';
}
