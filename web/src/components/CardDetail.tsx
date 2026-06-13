import { useStore } from "../stores/useStore";
import { X, CheckSquare2, Square } from "lucide-react";

export default function CardDetail() {
  const card = useStore((s) => s.view.card);
  const closeCard = useStore((s) => s.closeCard);
  const events = useStore((s) => s.events);

  if (!card) return null;

  const cardEvents = events.filter((e) => {
    const meta = e.meta as Record<string, unknown> | undefined;
    return meta?.item_name === card.name || meta?.item_path?.toString().includes(card.path);
  });

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center pt-12 bg-black/60" onClick={closeCard}>
      <div
        className="w-full max-w-2xl max-h-[80vh] overflow-y-auto bg-slate-900 border border-slate-700 rounded-xl shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between px-5 py-3 border-b border-slate-800">
          <h2 className="text-lg font-semibold text-slate-100">{card.name}</h2>
          <button onClick={closeCard} className="text-slate-400 hover:text-slate-100 transition-colors">
            <X size={20} />
          </button>
        </div>
        <div className="p-5 space-y-4">
          {!!card.meta.id && (
            <div className="flex flex-wrap gap-2 text-xs text-slate-400">
              <span className="bg-slate-800 px-2 py-1 rounded font-mono">#{String(card.meta.id ?? "")}</span>
              {!!card.meta.created_at && (
                <span className="bg-slate-800 px-2 py-1 rounded">
                  {new Date(String(card.meta.created_at ?? "")).toLocaleString("zh-CN")}
                </span>
              )}
              {!!card.meta.desc && (
                <span className="bg-slate-800 px-2 py-1 rounded">{String(card.meta.desc ?? "")}</span>
              )}
            </div>
          )}
          {card.checkboxes.length > 0 && (
            <div>
              <div className="text-xs font-semibold uppercase tracking-wider text-slate-500 mb-2">
                Checklist {"("}{card.checkboxes.filter((c) => c.checked).length}/{card.checkboxes.length}{")"}
              </div>
              <div className="space-y-1">
                {card.checkboxes.map((cb) => (
                  <div key={cb.hash} className="flex items-center gap-2 text-sm">
                    {cb.checked ? (
                      <CheckSquare2 size={16} className="text-green-400 shrink-0" />
                    ) : (
                      <Square size={16} className="text-slate-500 shrink-0" />
                    )}
                    <span className={cb.checked ? "text-slate-400 line-through" : "text-slate-200"}>{cb.text}</span>
                    <span className="text-xs text-slate-600 font-mono">#{cb.hash}</span>
                  </div>
                ))}
              </div>
            </div>
          )}
          {card.body.trim() && (
            <div>
              <div className="text-xs font-semibold uppercase tracking-wider text-slate-500 mb-2">内容</div>
              <pre className="text-sm text-slate-300 whitespace-pre-wrap font-sans">{card.body.trim()}</pre>
            </div>
          )}
          {cardEvents.length > 0 && (
            <div>
              <div className="text-xs font-semibold uppercase tracking-wider text-slate-500 mb-2">
                相关操作 {"("}{cardEvents.length}{")"}
              </div>
              <div className="space-y-1">
                {cardEvents.map((e) => (
                  <div key={e.id} className="flex items-center gap-3 text-xs text-slate-400 bg-slate-800/30 rounded px-2 py-1">
                    <span>{new Date(e.timestamp).toLocaleString("zh-CN")}</span>
                    <span className="text-slate-500 font-mono">{e.type}</span>
                    <span>{e.title}</span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
