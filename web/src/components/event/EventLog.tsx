import { useStore } from "../../stores/useStore";
import { Terminal, Search, X, ChevronDown, ChevronUp } from "lucide-react";
import { useState, useMemo, useRef } from "react";
import type { EventRecord } from "../../types";
import { formatTime } from "../../utils/format";

const TYPE_COLORS: Record<string, string> = {
  project_init: "text-blue-400",
  item_create: "text-green-400",
  item_move: "text-yellow-400",
  item_delete: "text-red-400",
  checkbox_toggle: "text-purple-400",
};

export default function EventLog() {
  const events = useStore((s) => s.events);
  const logOpen = useStore((s) => s.view.logOpen);
  const eventPage = useStore((s) => s.eventPage);
  const eventFilter = useStore((s) => s.eventFilter);
  const loadMoreEvents = useStore((s) => s.loadMoreEvents);
  const setEventFilter = useStore((s) => s.setEventFilter);
  const toggleLog = useStore((s) => s.toggleLog);
  const EVENT_PAGE_SIZE = useStore((s) => s.EVENT_PAGE_SIZE);
  const scrollRef = useRef<HTMLDivElement>(null);

  const filtered = useMemo(() => {
    if (!eventFilter) return events;
    const q = eventFilter.toLowerCase();
    return events.filter((e: EventRecord) =>
      e.type.toLowerCase().includes(q) ||
      e.title.toLowerCase().includes(q) ||
      (e.content || "").toLowerCase().includes(q)
    );
  }, [events, eventFilter]);

  const visible = filtered.slice(0, eventPage * EVENT_PAGE_SIZE);
  const remaining = filtered.length - visible.length;

  if (!logOpen) {
    return (
      <button onClick={toggleLog}
        className="flex items-center gap-2 px-4 py-2 text-xs text-slate-500 hover:text-slate-300 border-t border-slate-800 transition-colors w-full">
        <Terminal size={14} />
        事件日志 ({events.length})
        <ChevronUp size={14} className="ml-auto" />
      </button>
    );
  }

  return (
    <div className="border-t border-slate-800 bg-slate-950/95" ref={scrollRef}>
      <div className="flex items-center gap-2 px-4 py-2 border-b border-slate-800">
        <button onClick={toggleLog} className="flex items-center gap-2 text-xs text-slate-500 hover:text-slate-300 transition-colors">
          <Terminal size={14} />
          事件日志 ({events.length})
          <ChevronDown size={14} />
        </button>
        <div className="relative ml-auto">
          <Search size={12} className="absolute left-2 top-1/2 -translate-y-1/2 text-slate-600" />
          <input
            className="w-48 bg-slate-900 border border-slate-700 rounded pl-6 pr-6 py-1 text-xs text-slate-300 placeholder-slate-600 focus:outline-none focus:border-indigo-500/50"
            placeholder="筛选事件..."
            value={eventFilter}
            onChange={(e) => setEventFilter(e.target.value)}
          />
          {eventFilter && (
            <button className="absolute right-2 top-1/2 -translate-y-1/2 text-slate-600 hover:text-slate-400" onClick={() => setEventFilter("")}>
              <X size={12} />
            </button>
          )}
        </div>
      </div>
      <div className="max-h-64 overflow-y-auto font-mono text-xs">
        {visible.length === 0 && (
          <div className="text-slate-600 text-center py-4">无匹配事件</div>
        )}
        {visible.map((e: EventRecord) => (
          <div key={e.id} className="flex items-start gap-3 px-4 py-1.5 hover:bg-slate-800/30 transition-colors border-b border-slate-800/30 last:border-0">
            <span className="text-slate-600 shrink-0 w-28">{formatTime(e.timestamp)}</span>
            <span className={"shrink-0 w-20 " + (TYPE_COLORS[e.type] || "text-slate-500")}>{e.type}</span>
            <span className="text-slate-300 truncate">{e.title}</span>
            {e.content && <span className="text-slate-500 ml-auto shrink-0 truncate max-w-48">{e.content}</span>}
          </div>
        ))}
        {remaining > 0 && (
          <button onClick={loadMoreEvents}
            className="w-full text-center text-indigo-400/70 hover:text-indigo-300 py-2 transition-colors border-t border-slate-800/30">
            加载更多 ({remaining})
          </button>
        )}
      </div>
    </div>
  );
}
