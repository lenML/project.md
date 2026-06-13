import { useStore } from "../stores/useStore";
import { Clock } from "lucide-react";

const TYPE_COLORS: Record<string, string> = {
  project_init: "text-blue-400",
  item_create: "text-green-400",
  item_move: "text-yellow-400",
  item_delete: "text-red-400",
  checkbox_toggle: "text-purple-400",
};

export default function EventLog() {
  const events = useStore((s) => s.events);

  if (events.length === 0) {
    return (
      <div className="flex items-center justify-center h-48 text-slate-500 text-sm">
        <Clock size={16} className="mr-2" /> 暂无事件记录
      </div>
    );
  }

  return (
    <div className="space-y-1">
      {events.map((e) => (
        <div key={e.id} className="flex items-start gap-3 px-3 py-2 rounded-lg bg-slate-800/30 border border-slate-800 text-sm">
          <span className="text-xs text-slate-500 shrink-0 w-32">
            {new Date(e.timestamp).toLocaleString("zh-CN")}
          </span>
          <span className={`text-xs font-mono shrink-0 w-24 ${TYPE_COLORS[e.type] || "text-slate-400"}`}>
            {e.type}
          </span>
          <span className="text-slate-200">{e.title}</span>
          {e.content && <span className="text-slate-400 text-xs ml-auto">{e.content}</span>}
        </div>
      ))}
    </div>
  );
}
