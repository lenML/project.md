import { useStore } from "../stores/useStore";
import { FolderKanban } from "lucide-react";

export default function DirPicker() {
  const selectDir = useStore((s) => s.selectDir);
  return (
    <div className="h-screen flex items-center justify-center bg-slate-950 text-slate-100">
      <div className="flex flex-col items-center gap-6 p-8">
        <FolderKanban size={64} className="text-indigo-400" />
        <h1 className="text-2xl font-bold">Project.md Kanban</h1>
        <p className="text-sm text-slate-400 text-center max-w-md">
          选择 <code className="bg-slate-800 px-1.5 py-0.5 rounded text-indigo-300">project.md</code> 根目录以查看看板内容
        </p>
        <button
          onClick={selectDir}
          className="px-6 py-2.5 bg-indigo-600 hover:bg-indigo-500 rounded-lg font-medium transition-colors"
        >
          选择目录
        </button>
      </div>
    </div>
  );
}
