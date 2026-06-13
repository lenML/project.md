/**
 * project.md 文件系统工具。
 * 所有路径统一为 Posix 风格（前向斜杠），Windows 自动转换。
 */

import { existsSync } from 'node:fs';
import { mkdir, readFile, writeFile, readdir, rm } from 'node:fs/promises';
import path from 'node:path';
import os from 'node:os';

const DEFAULT_ROOT_NAME = '.project.md';

/** 获取默认根目录 `~/.project.md` */
export function get_default_root(): string {
  return path.join(os.homedir(), DEFAULT_ROOT_NAME);
}

/** 确保目录存在，不存在则创建 */
export async function ensure_dir(dir_path: string): Promise<string> {
  await mkdir(dir_path, { recursive: true });
  return dir_path;
}

/** 检查路径是否存在 */
export function path_exists(p: string): boolean {
  return existsSync(p);
}

/** 读取文件，不存在返回 null */
export async function try_read_file(file_path: string): Promise<string | null> {
  try {
    return await readFile(file_path, 'utf-8');
  } catch {
    return null;
  }
}

/** 写入文件（自动创建父目录） */
export async function write_file(file_path: string, content: string): Promise<void> {
  await mkdir(path.dirname(file_path), { recursive: true });
  await writeFile(file_path, content, 'utf-8');
}

export interface DirEntry {
  name: string;
  path: string;
  is_dir: boolean;
}

/** 列出目录下的直接子项，过滤掉隐藏文件和 .md 外的文件按需配置 */
export async function list_dir(dir_path: string): Promise<DirEntry[]> {
  const opts: Record<string, boolean> = { withFileTypes: true };
  const entries = await readdir(dir_path, opts);
  const results: DirEntry[] = [];
  for (const entry of entries) {
    if (entry.name.startsWith('.')) continue; // 跳过隐藏文件/目录
    results.push({
      name: entry.name,
      path: path.join(dir_path, entry.name),
      is_dir: entry.isDirectory(),
    });
  }
  // 按 name 排序
  results.sort((a, b) => a.name.localeCompare(b.name));
  return results;
}

/** 安全删除目录及其内容 */
export async function remove_dir(dir_path: string): Promise<void> {
  await rm(dir_path, { recursive: true, force: true });
}

/** 获取目录名（最后一级） */
export function dir_name(file_path: string): string {
  return path.basename(file_path);
}

/** 拼接路径（正斜杠风格用于显示） */
export function join_path(...parts: string[]): string {
  return path.join(...parts);
}
