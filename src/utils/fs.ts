import { existsSync } from "node:fs";
import { mkdir, readFile, writeFile, readdir, rm } from "node:fs/promises";
import type { Dirent } from "node:fs";
import path from "node:path";
import os from "node:os";

const DEFAULT_ROOT_NAME = ".project.md";

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
    return await readFile(file_path, "utf-8");
  } catch {
    return null;
  }
}

export async function write_file(
  file_path: string,
  content: string,
): Promise<void> {
  await mkdir(path.dirname(file_path), { recursive: true });
  await writeFile(file_path, content, "utf-8");
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
    if (entry.name.startsWith(".")) continue;
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