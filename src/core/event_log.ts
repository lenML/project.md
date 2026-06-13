import { appendFile, mkdir, readFile } from "node:fs/promises";
import { existsSync } from "node:fs";
import path from "node:path";
import { short_hash } from "../utils/hash.js";

export type EventType =
  | "project_init"
  | "item_create"
  | "item_move"
  | "item_delete"
  | "checkbox_toggle";

export interface EventRecord {
  id: string;
  timestamp: string;
  type: EventType;
  title: string;
  content?: string;
  meta?: Record<string, unknown>;
}

function get_events_path(project_dir: string): string {
  return path.join(project_dir, "events.jsonl");
}

/**
 * 追加一条事件到 project 的 events.jsonl。
 * 文件不存在则自动创建。
 */
export async function log_event(
  project_dir: string,
  type: EventType,
  title: string,
  content?: string,
  meta?: Record<string, unknown>,
): Promise<EventRecord> {
  const ts = new Date().toISOString();
  const id = short_hash(type + ts + title);
  const record: EventRecord = { id, timestamp: ts, type, title, content, meta };
  const line = JSON.stringify(record) + "\n";
  const file_path = get_events_path(project_dir);
  if (!existsSync(path.dirname(file_path))) {
    await mkdir(path.dirname(file_path), { recursive: true });
  }
  await appendFile(file_path, line, "utf-8");
  return record;
}

export interface EventQuery {
  limit?: number;
  offset?: number;
  type?: EventType;
}

/**
 * 读取 events.jsonl，按时间倒序排列。
 */
export async function list_events(
  project_dir: string,
  query: EventQuery = {},
): Promise<EventRecord[]> {
  const file_path = get_events_path(project_dir);
  if (!existsSync(file_path)) return [];

  const content = await readFile(file_path, "utf-8");
  const lines = content.trimEnd().split("\n").filter(Boolean);
  const all: EventRecord[] = lines.map((l) => JSON.parse(l) as EventRecord);
  all.sort((a, b) => b.timestamp.localeCompare(a.timestamp));

  let filtered = all;
  if (query.type) filtered = filtered.filter((e) => e.type === query.type);
  if (query.offset) filtered = filtered.slice(query.offset);
  if (query.limit) filtered = filtered.slice(0, query.limit);
  return filtered;
}

/**
 * 从项目路径中提取 project 目录名。
 * 约定：project 目录是 kanban 的父级。
 */
export function get_project_dir(item_or_column_path: string): string {
  // 向上找到 readme.md 所在目录
  let dir = path.dirname(item_or_column_path);
  for (let i = 0; i < 10; i++) {
    if (existsSync(path.join(dir, "readme.md"))) return dir;
    const parent = path.dirname(dir);
    if (parent === dir) break;
    dir = parent;
  }
  return path.dirname(item_or_column_path);
}