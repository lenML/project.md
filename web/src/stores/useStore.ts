import { create } from "zustand";
import { readDir, readTextFile, tryGetDir, tryGetFile, pickDirectory } from "../utils/fs";
import { parseFrontmatter, parseCheckboxes } from "../utils/markdown";
import type { ProjectData, KanbanData, ColumnData, CardData, EventRecord, ViewState } from "../types";

interface AppStore {
  rootDir: string;
  rootHandle: FileSystemDirectoryHandle | null;
  projects: ProjectData[];
  events: EventRecord[];
  view: ViewState;
  loading: boolean;
  error: string | null;
  selectDir: () => Promise<void>;
  loadAll: () => Promise<void>;
  loadEvents: (projectName: string) => Promise<void>;
  setView: (v: Partial<ViewState>) => void;
  closeCard: () => void;
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
      if (!k.isDir || k.name === "readme.md") continue;
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
            cards.push({
              name,
              path: [entry.name, k.name, c.name, f.name].join("/"),
              meta,
              body,
              checkboxes: parseCheckboxes(body),
            });
          } catch { /* skip unreadable */ }
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
    const eventFile = await tryGetFile(projDir, "events.jsonl");
    if (!eventFile) return [];
    const content = await readTextFile(eventFile);
    const lines = content.trimEnd().split("\n").filter(Boolean);
    return lines.map((l) => JSON.parse(l) as EventRecord)
      .sort((a, b) => b.timestamp.localeCompare(a.timestamp));
  } catch {
    return [];
  }
}

export const useStore = create<AppStore>((set, get) => ({
  rootDir: "",
  rootHandle: null,
  projects: [],
  events: [],
  view: { project: null, kanban: null, showEvents: false, card: null },
  loading: false,
  error: null,

  selectDir: async () => {
    try {
      const handle = await pickDirectory();
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
}));
