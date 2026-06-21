import { useStore } from "../stores/useStore";
import type { ProjectData } from "../types";
import { FileText, KanbanSquare, ChevronRight, ChevronDown, Edit3, Save } from "lucide-react";
import { useState } from "react";

function KanbanItem({ p, k, view, onSelect }: {
  p: string; k: string; view: { project: string | null; kanban: string | null };
  onSelect: (p: string, k: string) => void;
}) {
  const loadEvents = useStore((s) => s.loadEvents);
  const selected = view.kanban === k && view.project === p;
  return (
    <button onClick={() => { onSelect(p, k); loadEvents(p); }}
      className={"w-full flex items-center gap-1.5 px-2 py-1 rounded text-sm transition-colors " +
        (selected ? "bg-indigo-600/20 text-indigo-300" : "text-slate-400 hover:text-slate-100 hover:bg-slate-800/50")}
    >
      <KanbanSquare size={14} />
      {k}
    </button>
  );
}

function ProjectSection({ p, expanded, view, writeMode, onToggle }: {
  p: ProjectData; expanded: boolean; view: { project: string | null; kanban: string | null };
  writeMode: boolean; onToggle: (name: string) => void;
}) {
  const setView = useStore((s) => s.setView);
  const updateReadme = useStore((s) => s.updateReadme);
  const [editingReadme, setEditingReadme] = useState(false);
  const [readmeText, setReadmeText] = useState("");

  function startEdit() {
    setReadmeText(p.readme || "");
    setEditingReadme(true);
  }

  function saveReadme() {
    updateReadme(p.name, readmeText || "# " + p.name);
    setEditingReadme(false);
  }

  return (
    <div key={p.name}>
      <div className="flex items-center gap-1">
        <button onClick={() => onToggle(p.name)}
          className={"flex-1 flex items-center gap-1.5 px-2 py-1.5 rounded text-sm transition-colors " +
            (view.project === p.name && !expanded ? "bg-slate-800 text-slate-100" : "text-slate-400 hover:text-slate-100 hover:bg-slate-800/50")}
        >
          {expanded ? <ChevronDown size={14} /> : <ChevronRight size={14} />}
          <FileText size={14} />
          {p.name}
        </button>
        {writeMode && (
          <button onClick={startEdit} className="text-slate-500 hover:text-indigo-400 transition-colors p-1" title="编辑 readme">
            <Edit3 size={14} />
          </button>
        )}
      </div>
      {editingReadme && (
        <div className="ml-4 mb-2 p-2 bg-slate-800/50 rounded">
          <textarea className="w-full bg-slate-900 border border-slate-600 rounded px-2 py-1 text-xs text-slate-200 font-mono min-h-24 mb-2"
            value={readmeText} onChange={(e) => setReadmeText(e.target.value)} placeholder="# project description" />
          <button onClick={saveReadme} className="flex items-center gap-1 text-xs text-indigo-400 hover:text-indigo-300 transition-colors">
            <Save size={12} /> 保存
          </button>
        </div>
      )}
      {expanded && (
        <div className="ml-3 pl-2 border-l border-slate-700/50 space-y-0.5 mt-0.5">
          {p.kanbans.map((k) => (
            <KanbanItem key={k.name} p={p.name} k={k.name} view={view}
              onSelect={(proj, kan) => setView({ project: proj, kanban: kan })} />
          ))}
        </div>
      )}
    </div>
  );
}

export default function Sidebar({ projects }: { projects: ProjectData[] }) {
  const view = useStore((s) => s.view);
  const writeMode = useStore((s) => s.writeMode);
  const [expanded, setExpanded] = useState<Record<string, boolean>>({});

  function toggle(name: string) {
    setExpanded((prev) => ({ ...prev, [name]: !prev[name] }));
  }

  return (
    <aside className="w-60 shrink-0 border-r border-slate-800 overflow-y-auto p-2 space-y-0.5">
      {projects.length === 0 && <div className="text-xs text-slate-600 text-center py-8">无项目</div>}
      {projects.map((p) => (
        <ProjectSection key={p.name} p={p} expanded={!!expanded[p.name]}
          view={view} writeMode={writeMode} onToggle={toggle} />
      ))}
    </aside>
  );
}