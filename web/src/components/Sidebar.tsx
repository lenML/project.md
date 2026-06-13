import { useStore } from "../stores/useStore";
import type { ProjectData, KanbanData } from "../types";
import { FileText, KanbanSquare, ChevronRight, ChevronDown } from "lucide-react";
import { useState } from "react";

export default function Sidebar({ projects }: { projects: ProjectData[] }) {
  const view = useStore((s) => s.view);
  const setView = useStore((s) => s.setView);
  const loadEvents = useStore((s) => s.loadEvents);
  const [expanded, setExpanded] = useState<Record<string, boolean>>({});

  function toggle(name: string) {
    setExpanded((prev) => ({ ...prev, [name]: !prev[name] }));
  }

  function selectKanban(p: string, k: string) {
    setView({ project: p, kanban: k, showEvents: false });
  }

  return (
    <aside className="w-60 shrink-0 border-r border-slate-800 overflow-y-auto p-2 space-y-0.5">
      {projects.length === 0 && (
        <div className="text-xs text-slate-600 text-center py-8">无项目</div>
      )}
      {projects.map((p) => (
        <div key={p.name}>
          <button
            onClick={() => toggle(p.name)}
            className={`w-full flex items-center gap-1.5 px-2 py-1.5 rounded text-sm transition-colors ${
              view.project === p.name && !expanded[p.name]
                ? "bg-slate-800 text-slate-100"
                : "text-slate-400 hover:text-slate-100 hover:bg-slate-800/50"
            }`}
          >
            {expanded[p.name] ? <ChevronDown size={14} /> : <ChevronRight size={14} />}
            <FileText size={14} />
            {p.name}
          </button>
          {expanded[p.name] && (
            <div className="ml-3 pl-2 border-l border-slate-700/50 space-y-0.5 mt-0.5">
              {p.kanbans.map((k) => (
                <button
                  key={k.name}
                  onClick={() => { selectKanban(p.name, k.name); loadEvents(p.name); }}
                  className={`w-full flex items-center gap-1.5 px-2 py-1 rounded text-sm transition-colors ${
                    view.kanban === k.name && view.project === p.name && !view.showEvents
                      ? "bg-indigo-600/20 text-indigo-300"
                      : "text-slate-400 hover:text-slate-100 hover:bg-slate-800/50"
                  }`}
                >
                  <KanbanSquare size={14} />
                  {k.name}
                </button>
              ))}
            </div>
          )}
        </div>
      ))}
    </aside>
  );
}
