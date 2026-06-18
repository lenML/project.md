import { create } from "zustand";
import {
  readDir, readTextFile, tryGetDir, tryGetFile, listDirAll,
  pickDirectory, writeTextFile, createFile, createDir, removeEntry,
} from "../utils/fs";
import { parseFrontmatter, parseCheckboxes, buildFrontmatterDoc, toggleCheckboxByHash } from "../utils/markdown";
import type { ProjectData, KanbanData, ColumnData, CardData, EventRecord, ViewState } from "../types";

// 持久化 view 状态到 localStorage
const STORAGE_KEY = "pmd-view-state";
function saveView(view: ViewState, rootDir: string) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify({ project: view.project, kanban: view.kanban, rootDir }));
  } catch { /* skip */ }
}
function loadView(): { project: string | null; kanban: string | null; rootDir: string } | null {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    return JSON.parse(raw);
  } catch { return null; }
}

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
        columns.push({ name: c.name, cards, readme: colReadme });
      }
      kanbans.push({ name: k.name, columns });
    }
    projects.push({ name: entry.name, kanbans, readme: readmeContent });
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
  searchQuery: string;
  eventFilter: string;
  eventPage: number;
  EVENT_PAGE_SIZE: number;
  CARD_PAGE_SIZE: number;

  selectDir: () => Promise<void>;
  loadAll: () => Promise<void>;
  loadEvents: (projectName: string) => Promise<void>;
  setView: (v: Partial<ViewState>) => void;
  closeCard: () => void;
  toggleWriteMode: () => void;
  setSearchQuery: (q: string) => void;
  setEventFilter: (q: string) => void;
  loadMoreEvents: () => void;
  toggleLog: () => void;

  // write actions
  createCard: (proj: string, kanban: string, col: string, name: string, desc?: string) => Promise<void>;
  deleteCard: (proj: string, kanban: string, card: CardData) => Promise<void>;
  moveCard: (proj: string, kanban: string, card: CardData, destCol: string) => Promise<void>;
  updateCard: (proj: string, kanban: string, card: CardData, meta: Record<string, unknown>, body: string) => Promise<void>;
  toggleCheckbox: (hash: string) => Promise<void>;
  reorderCard: (proj: string, kanban: string, col: string, card: CardData, newIndex: number) => Promise<void>;
  trashItems: Array<{ name: string; path: string; originalName: string }>;
  loadTrash: (proj: string, kanban: string) => Promise<void>;
  restoreFromTrash: (proj: string, kanban: string, col: string, trashPath: string) => Promise<void>;
  purgeFromTrash: (trashPath: string) => Promise<void>;
  updateColReadme: (proj: string, kanban: string, col: string, content: string) => Promise<void>;
  updateReadme: (proj: string, content: string) => Promise<void>;
}

export const useStore = create<AppStore>((set, get) => ({
  rootDir: "",
  rootHandle: null,
  projects: [],
  events: [],
  trashItems: [],
  view: { project: null, kanban: null, card: null, logOpen: false },
  loading: false,
  writeMode: false,
  error: null,
  searchQuery: "",
  eventFilter: "",
  eventPage: 1,
  EVENT_PAGE_SIZE: 50,
  CARD_PAGE_SIZE: 50,

  selectDir: async () => {
    try {
      const handle = await pickDirectory(true);
      set({ rootHandle: handle, rootDir: handle.name, error: null, view: { project: null, kanban: null, card: null, logOpen: false } });
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
      // 恢复记忆的看板选择
      const saved = loadView();
      const cur = get().view;
      if (!cur.project && saved && saved.rootDir === get().rootDir) {
        const projExists = projects.some((p) => p.name === saved.project);
        const kanbanExists = projExists && projects.find((p) => p.name === saved.project)?.kanbans.some((k) => k.name === saved.kanban);
        if (kanbanExists) {
          set({ view: { ...get().view, project: saved.project, kanban: saved.kanban } });
        } else if (projExists) {
          set({ view: { ...get().view, project: saved.project } });
        }
      }
      // 刷新事件
      const curProject = get().view.project;
      if (curProject) {
        get().loadEvents(curProject);
      }
    } catch (e: unknown) {
      set({ error: e instanceof Error ? e.message : String(e), loading: false });
    }
  },

  loadEvents: async (projectName: string) => {
    const { rootHandle } = get();
    if (!rootHandle) return;
    const events = await loadEventsFromDir(rootHandle, projectName);
    set({ events, eventPage: 1, eventFilter: "" });
  },

  setView: (v) => set((s) => {
    const newView = { ...s.view, ...v };
    // 持久化 project/kanban 选择
    if (v.project !== undefined || v.kanban !== undefined) {
      saveView(newView, s.rootDir);
    }
    return { view: newView };
  }),
  closeCard: () => set((s) => ({ view: { ...s.view, card: null } })),
  toggleWriteMode: () => set((s) => ({ writeMode: !s.writeMode })),
  setSearchQuery: (q: string) => set({ searchQuery: q }),
  setEventFilter: (q: string) => set({ eventFilter: q, eventPage: 1 }),
  loadMoreEvents: () => set((s) => ({ eventPage: s.eventPage + 1 })),
  toggleLog: () => set((s) => ({ view: { ...s.view, logOpen: !s.view.logOpen } })),

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
      const safeName = name.replace(/[\s<>:"/\\|?*]/g, "_");
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
      let dir: FileSystemDirectoryHandle = rootHandle;
      for (let i = 0; i < parts.length - 1; i++) {
        const next = await tryGetDir(dir, parts[i]);
        if (!next) return;
        dir = next;
      }
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
      let srcDir: FileSystemDirectoryHandle = rootHandle;
      for (let i = 0; i < parts.length - 1; i++) {
        const next = await tryGetDir(srcDir, parts[i]);
        if (!next) return;
        srcDir = next;
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
      let dir: FileSystemDirectoryHandle = rootHandle;
      for (let i = 0; i < parts.length - 1; i++) {
        const next = await tryGetDir(dir, parts[i]);
        if (!next) return;
        dir = next;
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

  toggleCheckbox: async (hash: string) => {
    const { rootHandle, view } = get();
    const card = view.card;
    if (!rootHandle || !card) return;
    try {
      const parts = card.path.split("/");
      let dir: FileSystemDirectoryHandle = rootHandle;
      for (let i = 0; i < parts.length - 1; i++) {
        const next = await tryGetDir(dir, parts[i]);
        if (!next) return;
        dir = next;
      }
      const file = await tryGetFile(dir, parts[parts.length - 1]);
      if (!file) return;
      const content = await readTextFile(file);

      // parse frontmatter + body, toggle in body
      const parsed = parseFrontmatter(content);
      if (!parsed) return;
      const newBody = toggleCheckboxByHash(parsed.body, hash);
      if (newBody === null) return;
      const newContent = buildFrontmatterDoc(parsed.metadata, newBody);
      await writeTextFile(file, newContent);

      const projName = card.path.split("/")[0];
      await logWebEvent(rootHandle, projName, "checkbox_toggle", "切换 checkbox: " + card.name);
      await get().loadAll();
    } catch (e: unknown) {
      set({ error: e instanceof Error ? e.message : String(e) });
    }
  },

  updateColReadme: async (proj, kanban, col, content) => {
    const { rootHandle } = get();
    if (!rootHandle) return;
    try {
      const projDir = await tryGetDir(rootHandle, proj);
      if (!projDir) return;
      const kanbanDir = await tryGetDir(projDir, kanban);
      if (!kanbanDir) return;
      const colDir = await tryGetDir(kanbanDir, col);
      if (!colDir) return;
      const readme = await createFile(colDir, "readme.md");
      await writeTextFile(readme, content);
      await logWebEvent(rootHandle, proj, "column_update", "更新列 readme: " + col);
      await get().loadAll();
    } catch (e: unknown) {
      set({ error: e instanceof Error ? e.message : String(e) });
    }
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

  reorderCard: async (proj, kanban, col, card, newIndex) => {
    const { rootHandle } = get();
    if (!rootHandle) return;
    try {
      const projDir = await tryGetDir(rootHandle, proj);
      if (!projDir) return;
      const kanbanDir = await tryGetDir(projDir, kanban);
      if (!kanbanDir) return;
      const colDir = await tryGetDir(kanbanDir, col);
      if (!colDir) return;
      const entries = await listDirAll(colDir);
      const mdFiles = entries.filter((e) => !e.isDir && e.name.endsWith('.md') && e.name !== 'readme.md');
      mdFiles.sort((a, b) => a.name.localeCompare(b.name));
      const cardName = card.path.split('/').pop() || '';
      const withoutTarget = mdFiles.filter((e) => e.name !== cardName);
      const target = mdFiles.find((e) => e.name === cardName);
      if (!target) return;
      const reordered = [...withoutTarget.slice(0, newIndex), target, ...withoutTarget.slice(newIndex)];
      for (let i = 0; i < reordered.length; i++) {
        const fh = reordered[i];
        if (!fh) continue;
        const raw = await readTextFile(fh.handle as FileSystemFileHandle);
        const parsed = parseFrontmatter(raw);
        if (!parsed) continue;
        const meta = { ...parsed.metadata, order: i };
        await writeTextFile(fh.handle as FileSystemFileHandle, buildFrontmatterDoc(meta, parsed.body));
      }
      await logWebEvent(rootHandle, proj, 'item_reorder', '重新排序: ' + col);
      await get().loadAll();
    } catch (e: unknown) {
      set({ error: e instanceof Error ? e.message : String(e) });
    }
  },

  loadTrash: async (proj, kanban) => {
    const { rootHandle } = get();
    if (!rootHandle) return;
    try {
      const projDir = await tryGetDir(rootHandle, proj);
      if (!projDir) return;
      const kanbanDir = await tryGetDir(projDir, kanban);
      if (!kanbanDir) return;
      const trashDir = await tryGetDir(kanbanDir, ".trash");
      if (!trashDir) { set({ trashItems: [] }); return; }
      const entries = await listDirAll(trashDir);
      const items: Array<{ name: string; path: string; originalName: string }> = [];
      for (const e of entries) {
        if (!e.isDir && e.name.endsWith(".md") && e.name !== "readme.md") {
          const base = e.name.replace(/.w+.md$/, "").replace(/.md$/, "");
          const fileParts = e.name.split(".");
          const originalName = fileParts.length > 2 ? fileParts.slice(0, -2).join(".") : base;
          items.push({ name: originalName, path: [proj, kanban, ".trash", e.name].join("/"), originalName });
        }
      }
      set({ trashItems: items });
    } catch (e: unknown) {
      set({ error: e instanceof Error ? e.message : String(e) });
    }
  },

  restoreFromTrash: async (proj, kanban, col, trashPath) => {
    const { rootHandle } = get();
    if (!rootHandle) return;
    try {
      const parts = trashPath.split("/");
      const fileName = parts[parts.length - 1];
      const projDir = await tryGetDir(rootHandle, proj);
      if (!projDir) return;
      const kanbanDir = await tryGetDir(projDir, kanban);
      if (!kanbanDir) return;
      const colDir = await tryGetDir(kanbanDir, col);
      if (!colDir) return;
      let trashDir: FileSystemDirectoryHandle = rootHandle;
      for (let i = 0; i < parts.length - 1; i++) {
        const next = await tryGetDir(trashDir, parts[i]);
        if (!next) return;
        trashDir = next;
      }
      const file = await tryGetFile(trashDir, fileName);
      if (!file) return;
      const content = await readTextFile(file);
      const cleanName = fileName.replace(/.w+.md$/, ".md");
      const destFile = await createFile(colDir, cleanName);
      await writeTextFile(destFile, content);
      await removeEntry(trashDir, fileName);
      await logWebEvent(rootHandle, proj, "item_create", "恢复卡片: " + cleanName);
      await get().loadTrash(proj, kanban);
      await get().loadAll();
    } catch (e: unknown) {
      set({ error: e instanceof Error ? e.message : String(e) });
    }
  },

  purgeFromTrash: async (trashPath) => {
    const { rootHandle } = get();
    if (!rootHandle) return;
    try {
      const parts = trashPath.split("/");
      const fileName = parts[parts.length - 1];
      let dir: FileSystemDirectoryHandle = rootHandle;
      for (let i = 0; i < parts.length - 1; i++) {
        const next = await tryGetDir(dir, parts[i]);
        if (!next) return;
        dir = next;
      }
      await removeEntry(dir, fileName);
      const proj = parts[0];
      const kanban = parts[1];
      await logWebEvent(rootHandle, proj, "item_delete", "永久删除: " + fileName);
      await get().loadTrash(proj, kanban);
    } catch (e: unknown) {
      set({ error: e instanceof Error ? e.message : String(e) });
    }
  },
}));
