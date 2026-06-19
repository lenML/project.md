import { useStore } from "../../stores/useStore";
import { useState } from "react";
import { Trash2, RotateCcw, X, AlertTriangle } from "lucide-react";

export default function TrashPanel({ onClose }: { onClose: () => void }) {
  const trashItems = useStore((s) => s.trashItems);
  const restoreFromTrash = useStore((s) => s.restoreFromTrash);
  const purgeFromTrash = useStore((s) => s.purgeFromTrash);
  const view = useStore((s) => s.view);
  const [targetCol, setTargetCol] = useState("todo");

  if (!view.project || !view.kanban) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center pt-12 bg-black/60" onClick={onClose}>
      <div className="w-full max-w-lg max-h-[70vh] bg-slate-900 border border-slate-700 rounded-xl shadow-2xl overflow-hidden" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between px-5 py-3 border-b border-slate-800">
          <h2 className="text-lg font-semibold text-slate-100 flex items-center gap-2">
            <Trash2 size={18} className="text-red-400" /> 回收站
          </h2>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-100 transition-colors"><X size={20} /></button>
        </div>
        <div className="p-4 space-y-2 overflow-y-auto max-h-[55vh]">
          {trashItems.length === 0 && (
            <div className="text-sm text-slate-500 text-center py-8">回收站为空</div>
          )}
          {trashItems.map((item) => (
            <div key={item.path} className="flex items-center gap-2 bg-slate-800/50 rounded-lg px-3 py-2">
              <span className="flex-1 text-sm text-slate-200 truncate">{item.name.replace(/_/g, " ")}</span>
              <select
                className="text-xs bg-slate-700 border border-slate-600 rounded px-1.5 py-1 text-slate-300"
                value={targetCol}
                onChange={(e) => setTargetCol(e.target.value)}
              >
                <option value="todo">todo</option>
                <option value="doing">doing</option>
                <option value="done">done</option>
                <option value="idea">idea</option>
              </select>
              <button
                onClick={() => restoreFromTrash(view.project!, view.kanban!, targetCol, item.path)}
                className="text-indigo-400 hover:text-indigo-300 transition-colors p-1"
                title="恢复"
              >
                <RotateCcw size={14} />
              </button>
              <button
                onClick={() => { if (confirm("永久删除?")) purgeFromTrash(item.path); }}
                className="text-red-400 hover:text-red-300 transition-colors p-1"
                title="永久删除"
              >
                <AlertTriangle size={14} />
              </button>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}