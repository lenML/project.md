import { useEffect, useRef } from "react";
import { useStore } from "./stores/useStore";
import DirPicker from "./components/DirPicker";
import Sidebar from "./components/Sidebar";
import KanbanBoard from "./components/KanbanBoard";
import EventLog from "./components/EventLog";
import CardDetail from "./components/CardDetail";
import { FolderOpen, Loader2, Lock, Unlock } from "lucide-react";

export default function App() {
  const rootHandle = useStore((s) => s.rootHandle);
  const projects = useStore((s) => s.projects);
  const view = useStore((s) => s.view);
  const loading = useStore((s) => s.loading);
  const error = useStore((s) => s.error);
  const writeMode = useStore((s) => s.writeMode);
  const loadAll = useStore((s) => s.loadAll);
  const selectDir = useStore((s) => s.selectDir);
  const toggleWriteMode = useStore((s) => s.toggleWriteMode);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    if (rootHandle) {
      intervalRef.current = setInterval(() => loadAll(), 3000);
      return () => { if (intervalRef.current) clearInterval(intervalRef.current); };
    }
  }, [rootHandle, loadAll]);

  if (!rootHandle) return <DirPicker />;

  return (
    <div className="h-screen flex flex-col bg-slate-950 text-slate-100">
      <header className="flex items-center gap-3 px-4 h-12 border-b border-slate-800 shrink-0">
        <button onClick={selectDir} className="flex items-center gap-1.5 text-sm text-slate-400 hover:text-slate-100 transition-colors">
          <FolderOpen size={16} />
          <span className="truncate max-w-48">{useStore.getState().rootDir}</span>
        </button>
        <span className="text-slate-700">|</span>
        <button onClick={loadAll} disabled={loading} className="text-sm text-slate-400 hover:text-slate-100 disabled:opacity-50 transition-colors">
          {loading ? <Loader2 size={16} className="animate-spin" /> : "刷新"}
        </button>
        <button
          onClick={toggleWriteMode}
          className={`text-sm ml-2 flex items-center gap-1 px-3 py-1 rounded-full transition-colors ${writeMode ? "bg-amber-600 text-white" : "text-slate-400 hover:text-slate-100 border border-slate-700"}`}
          title={writeMode ? "关闭编辑模式" : "开启编辑模式"}
        >
          {writeMode ? <Unlock size={14} /> : <Lock size={14} />}
          {writeMode ? "编辑中" : "只读"}
        </button>
        <button
          onClick={() => useStore.getState().setView({ showEvents: !view.showEvents })}
          className={`text-sm ml-auto px-3 py-1 rounded-full transition-colors ${view.showEvents ? "bg-indigo-600 text-white" : "text-slate-400 hover:text-slate-100"}`}
        >
          事件
        </button>
      </header>

      <div className="flex flex-1 overflow-hidden">
        <Sidebar projects={projects} />
        <main className="flex-1 overflow-auto p-4">
          {error && (
            <div className="mb-4 p-3 bg-red-900/30 border border-red-800 rounded-lg text-sm text-red-300">{error}</div>
          )}
          {loading && projects.length === 0 && (
            <div className="flex items-center justify-center h-48 text-slate-500">
              <Loader2 size={24} className="animate-spin mr-2" /> 加载中...
            </div>
          )}
          {!loading && projects.length === 0 && !error && (
            <div className="flex items-center justify-center h-48 text-slate-500 text-sm">
              该目录下没有项目 (缺少 readme.md 的目录)
            </div>
          )}
          {view.showEvents ? (
            <EventLog />
          ) : view.kanban ? (
            <KanbanBoard />
          ) : (
            <div className="flex items-center justify-center h-48 text-slate-500 text-sm">
              从左侧选择一个看板
            </div>
          )}
        </main>
      </div>

      {view.card && <CardDetail />}
    </div>
  );
}
