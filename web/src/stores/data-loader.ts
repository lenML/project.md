import {
  readDir, readTextFile, tryGetDir, tryGetFile, listDirAll,
  writeTextFile, createFile, removeEntry,
} from "../utils/fs";
import { parseFrontmatter, parseCheckboxes } from "../utils/markdown";
import type { ProjectData, KanbanData, ColumnData, CardData, EventRecord, ViewState } from "../types";

const STORAGE_KEY = "pmd-view-state";

export function saveView(view: ViewState, rootDir: string) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify({ project: view.project, kanban: view.kanban, rootDir }));
  } catch { /* skip */ }
}

export function loadView(): { project: string | null; kanban: string | null; rootDir: string } | null {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    return JSON.parse(raw);
  } catch { return null; }
}

export function shortHash(text: string): string {
  let hash = 0;
  for (let i = 0; i < text.length; i++) {
    hash = ((hash << 5) - hash) + text.charCodeAt(i);
    hash |= 0;
  }
  return (hash >>> 0).toString(16).padStart(8, "0").slice(0, 8);
}

export async function logWebEvent(
  root: FileSystemDirectoryHandle,
  projName: string,
  type: string,
  title: string,
  meta?: Record<string, unknown>,
) {
  try {
    const projDir = await tryGetDir(root, projName);
    if (!projDir) return;
    const eventFile = await createFile(projDir, "events.web.jsonl");
    const ts = new Date().toISOString();
    const id = shortHash("web" + type + ts + title);
    const line = JSON.stringify({ id, timestamp: ts, type, title, meta }) + "\n";
    const existing = await readTextFile(eventFile).catch(() => "");
    await writeTextFile(eventFile, existing + line);
  } catch { /* skip */ }
}

export async function loadProjectData(root: FileSystemDirectoryHandle): Promise<ProjectData[]> {
  const projects: ProjectData[] = [];
  const entries = await readDir(root);
  for (const entry of entries) {
    if (!entry.isDir) continue;
    const readmeHandle = await tryGetFile(entry.handle as FileSystemDirectoryHandle, "readme.md");
    if (!readmeHandle) continue;
    const readmeContent = await readTextFile(readmeHandle);
    const kanbans: KanbanData[] = [];
    const kanbanEntries = await readDir(entry.handle as FileSystemDirectoryHandle);
    for (const k of kanbanEntries) {
      if (!k.isDir) continue;
      if (k.name.startsWith(".")) continue;
      const columns: ColumnData[] = [];
      const colEntries = await readDir(k.handle as FileSystemDirectoryHandle);
      for (const c of colEntries) {
        if (!c.isDir) continue;
        if (c.name.startsWith(".")) continue;
        const colReadmeFile = await tryGetFile(c.handle as FileSystemDirectoryHandle, "readme.md");
        const colReadme = colReadmeFile ? await readTextFile(colReadmeFile) : undefined;
        const colOrder = colReadme ? (parseFrontmatter(colReadme)?.metadata?.order as number | undefined) : undefined;
        const cards: CardData[] = [];
        const fileEntries = await readDir(c.handle as FileSystemDirectoryHandle);
        for (const f of fileEntries) {
          if (f.isDir || !f.name.endsWith(".md") || f.name === "readme.md") continue;
          try {
            const content = await readTextFile(f.handle as FileSystemFileHandle);
            const parsed = parseFrontmatter(content);
            const meta = parsed?.metadata ?? {};
            const body = parsed?.body ?? content;
            const name = (meta.name as string) || f.name.replace(/\.md$/, "");
            cards.push({ name, path: [entry.name, k.name, c.name, f.name].join("/"), meta, body, checkboxes: parseCheckboxes(body) });
          } catch { /* skip */ }
        }
        columns.push({ name: c.name, cards, readme: colReadme, order: colOrder });
      }
      kanbans.push({ name: k.name, columns });
    }
    projects.push({ name: entry.name, kanbans, readme: readmeContent });
  }
  return projects;
}

export async function loadEventsFromDir(
  root: FileSystemDirectoryHandle,
  projectName: string,
): Promise<EventRecord[]> {
  try {
    const projDir = await tryGetDir(root, projectName);
    if (!projDir) return [];
    const all: EventRecord[] = [];
    for (const fname of ["events.jsonl", "events.web.jsonl"]) {
      const fh = await tryGetFile(projDir, fname);
      if (!fh) continue;
      const content = await readTextFile(fh);
      const lines = content.trimEnd().split("\n").filter(Boolean);
      all.push(...lines.map((l) => JSON.parse(l) as EventRecord));
    }
    return all.sort((a, b) => b.timestamp.localeCompare(a.timestamp));
  } catch { return []; }
}
