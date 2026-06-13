import { create } from "zustand";
import {
  readDir, readTextFile, tryGetDir, tryGetFile,
  pickDirectory, writeTextFile, createFile, createDir, removeEntry,
  listDirAll,
} from "../utils/fs";
import { parseFrontmatter, parseCheckboxes, buildFrontmatterDoc } from "../utils/markdown";
import type { ProjectData, KanbanData, ColumnData, CardData, EventRecord, ViewState } from "../types";

function shortHash(text: string): string {
  let hash = 0;
  for (let i = 0; i < text.length; i++) {
    hash = ((hash << 5) - hash) + text.charCodeAt(i);
    hash |= 0;
  }
  return (hash >>> 0).toString(16).padStart(8, "0").slice(0, 8);
}

async function logWebEvent(root: FileSystemDirectoryHandle, projName: string, type: string, title: string, meta?: Record<string, unknown>) {
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

async function loadProjectData(root: FileSystemDirectoryHandle): Promise<ProjectData[]> {
  const projects: ProjectData[] = [];
  const entries = await readDir(root);
  for (const entry of entries) {
    if (!entry.isDir) continue;
    const readme = await tryGetFile(entry.handle as FileSystemDirectoryHandle, "readme.md");
    if (!readme) continue;
    const kanbans: KanbanData[] = [];
    const kanbanEntries = await readDir(entry.handle as FileSystemDirectoryHandle);
    for (const k of kanbanEntries) {
      if (!k.isDir) continue;
      const columns: ColumnData[] = [];
      const colEntries = await readDir(k.handle as FileSystemDirectoryHandle);
      for (const c of colEntries) {
        if (!c.isDir) continue;
        const cards: CardData[] = [];
        const fileEntries = await readDir(c.handle as FileSystemDirectoryHandle);
        for (const f of fileEntries) {
          if (f.isDir || !f.name.endsWith(".md")) continue;
          try {
            const content = await readTextFile(f.handle as FileSystemFileHandle);
            const parsed = parseFrontmatter(content);
            const meta = parsed?.metadata ?? {};
            const body = parsed?.body ?? content;
            const name = (meta.name as string) || f.name.replace(/\.md$/, "");
            cards.push({ name, path: [entry.name, k.name, c.name, f.name].join("/"), meta, body, checkboxes: parseCheckboxes(body) });
          } catch { /* skip */ }
        }
        columns.push({ name: c.name, cards });
      }
      kanbans.push({ name: k.name, columns });
    }
    projects.push({ name: entry.name, kanbans });
  }
  return projects;
}

async function loadEventsFromDir(root: FileSystemDirectoryHandle, projectName: string): Promise<EventRecord[]> {
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

interface AppStore {
  rootDir: string;
  rootHandle: FileSystemDirectoryHandle | null;
  projects: ProjectData[];
  events: EventRecord[];
  view: ViewState;
  loading: boolean;
  writeMode: boolean;
  error: string | null;

  selectDir: () => Promise<void>;
  loadAll: () => Promise<void>;
  loadEvents: (projectName: string) => Promise<void>;
  setView: (v: Partial<ViewState>) => void;
  closeCard: () => void;
  toggleWriteMode: () => void;

  // write actions
  createCard: (proj: string, kanban: string, col: string, name: string, desc?: string) => Promise<void>;
  deleteCard: (proj: string, kanban: string, card: CardData) => Promise<void>;
  moveCard: (proj: string, kanban: string, card: CardData, destCol: string) => Promise<void>;
  updateCard: (proj: string, kanban: string, card: CardData, meta: Record<string, unknown>, body: string) => Promise<void>;
  toggleCheckbox: (card: CardData) => Promise<void>;
  updateReadme: (proj: string, content: string) => Promise<void>;
}

export const useStore = create<AppStore>((set, get) => ({
  rootDir: "",
  rootHandle: null,
  projects: [],
  events: [],
  view: { project: null, kanban: null, showEvents: false, card: null },
  loading: false,
  writeMode: false,
  error: null,

  selectDir: async () => {
    try {
      const handle = await pickDirectory(true);
      set({ rootHandle: handle, rootDir: handle.name, error: null, view: { project: null, kanban: null, showEvents: false, card: null } });
      await get().loadAll();
    } catch (e: unknown) {
      if ((e as DOMException).name === "AbortError") return;
      set({ error: e instanceof Error ? e.message : String(e) });
    }
  },

  loadAll: async () => {
    const { rootHandle } = get();
    if (!rootHandle) return;
    set({ loading: true, error: null });
    try {
      const projects = await loadProjectData(rootHandle);
      set({ projects, loading: false });
    } catch (e: unknown) {
      set({ error: e instanceof Error ? e.message : String(e), loading: false });
    }
  },

  loadEvents: async (projectName: string) => {
    const { rootHandle } = get();
    if (!rootHandle) return;
    const events = await loadEventsFromDir(rootHandle, projectName);
    set({ events });
  },

  setView: (v) => set((s) => ({ view: { ...s.view, ...v } })),
  closeCard: () => set((s) => ({ view: { ...s.view, card: null } })),
  toggleWriteMode: () => set((s) => ({ writeMode: !s.writeMode })),

  createCard: async (proj, kanban, col, name, desc) => {
    const { rootHandle } = get();
    if (!rootHandle) return;
    try {
      const projDir = await tryGetDir(rootHandle, proj);
      if (!projDir) return;
      const kanbanDir = await tryGetDir(projDir, kanban);
      if (!kanbanDir) return;
      const colDir = await tryGetDir(kanbanDir, col);
      if (!colDir) return;
      const now = new Date().toISOString();
      const id = shortHash(name + now);
      const safeName = name.replace(/[<>:"/\\|?*]/g, "_");
      const meta: Record<string, unknown> = { id, name, created_at: now };
      if (desc) meta.desc = desc;
      const content = buildFrontmatterDoc(meta, desc || "");
      const file = await createFile(colDir, safeName + ".md");
      await writeTextFile(file, content);
      await logWebEvent(rootHandle, proj, "item_create", "创建卡片: " + name, { item_name: name, column: col, file_path: [proj, kanban, col, safeName + ".md"].join("/") });
      await get().loadAll();
    } catch (e: unknown) {
      set({ error: e instanceof Error ? e.message : String(e) });
    }
  },

  deleteCard: async (proj, kanban, card) => {
    const { rootHandle } = get();
    if (!rootHandle) return;
    try {
      const parts = card.path.split("/");
      let dir = rootHandle;
      for (let i = 0; i < parts.length - 1; i++) {
        dir = await tryGetDir(dir, parts[i]) as FileSystemDirectoryHandle;
        if (!dir) return;
      }
      // move to .trash
      const projDir = await tryGetDir(rootHandle, proj);
      if (!projDir) return;
      const kanbanDir = await tryGetDir(projDir, kanban);
      if (!kanbanDir) return;
      let trashDir = await tryGetDir(kanbanDir, ".trash");
      if (!trashDir) trashDir = await createDir(kanbanDir, ".trash");
      const ts = Date.now().toString(36);
      const oldName = parts[parts.length - 1];
      const newName = oldName.replace(/\.md$/, "") + "." + ts + ".md";
      const file = await createFile(trashDir, newName);
      const content = await readTextFile(dir as unknown as FileSystemFileHandle);
      await writeTextFile(file, content);
      await removeEntry(dir, parts[parts.length - 1]);
      await logWebEvent(rootHandle, proj, "item_trash", "移入回收站: " + card.name, { file_path: [proj, kanban, ".trash", newName].join("/") });
      await get().loadAll();
    } catch (e: unknown) {
      set({ error: e instanceof Error ? e.message : String(e) });
    }
  },

  moveCard: async (proj, kanban, card, destCol) => {
    const { rootHandle } = get();
    if (!rootHandle) return;
    try {
      const projDir = await tryGetDir(rootHandle, proj);
      if (!projDir) return;
      const kanbanDir = await tryGetDir(projDir, kanban);
      if (!kanbanDir) return;
      const destDir = await tryGetDir(kanbanDir, destCol);
      if (!destDir) return;
      const parts = card.path.split("/");
      const fileName = parts[parts.length - 1];
      const srcContent = await readTextFile(rootHandle as unknown as FileSystemFileHandle);
      // Can't directly read from FileSystemDirectoryHandle, need to navigate
      let srcDir = rootHandle;
      for (let i = 0; i < parts.length - 1; i++) {
        srcDir = await tryGetDir(srcDir, parts[i]) as FileSystemDirectoryHandle;
      }
      const file = await tryGetFile(srcDir, fileName);
      if (!file) return;
      const content = await readTextFile(file);
      const destFile = await createFile(destDir, fileName);
      await writeTextFile(destFile, content);
      await removeEntry(srcDir, fileName);
      await logWebEvent(rootHandle, proj, "item_move", "移动卡片: " + card.name, { from: parts[parts.length - 2], to: destCol, file_path: [proj, kanban, destCol, fileName].join("/") });
      await get().loadAll();
    } catch (e: unknown) {
      set({ error: e instanceof Error ? e.message : String(e) });
    }
  },

  updateCard: async (proj, kanban, card, meta, body) => {
    const { rootHandle } = get();
    if (!rootHandle) return;
    try {
      const parts = card.path.split("/");
      let dir = rootHandle;
      for (let i = 0; i < parts.length - 1; i++) {
        dir = await tryGetDir(dir, parts[i]) as FileSystemDirectoryHandle;
      }
      const file = await tryGetFile(dir, parts[parts.length - 1]);
      if (!file) return;
      const content = buildFrontmatterDoc(meta, body);
      await writeTextFile(file, content);
      await logWebEvent(rootHandle, proj, "item_update", "编辑卡片: " + card.name);
      await get().loadAll();
    } catch (e: unknown) {
      set({ error: e instanceof Error ? e.message : String(e) });
    }
  },

  toggleCheckbox: async (card) => {
    const { rootHandle } = get();
    if (!rootHandle) return;
    try {
      const parts = card.path.split("/");
      let dir = rootHandle;
      for (let i = 0; i < parts.length - 1; i++) {
        dir = await tryGetDir(dir, parts[i]) as FileSystemDirectoryHandle;
      }
      const file = await tryGetFile(dir, parts[parts.length - 1]);
      if (!file) return;
      const content = await readTextFile(file);
      // just re-write — simple toggle on all checkboxes not possible without CLI parser
      // in practice user edits in CardDetail
      // so this is a placeholder — web uses editing flow instead
      await logWebEvent(rootHandle, parts[0], "checkbox_toggle", "切换 checkbox: " + card.name);
      await get().loadAll();
    } catch { /* skip */ }
  },

  updateReadme: async (proj, content) => {
    const { rootHandle } = get();
    if (!rootHandle) return;
    try {
      const projDir = await tryGetDir(rootHandle, proj);
      if (!projDir) return;
      const readme = await createFile(projDir, "readme.md");
      await writeTextFile(readme, content);
      await logWebEvent(rootHandle, proj, "project_update", "更新 readme: " + proj);
      await get().loadAll();
    } catch (e: unknown) {
      set({ error: e instanceof Error ? e.message : String(e) });
    }
  },
}));
