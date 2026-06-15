import { useState } from "react";
import { useStore } from "../stores/useStore";
import { X, CheckSquare2, Square, Edit3, Save, Trash2 } from "lucide-react";

export default function CardDetail() {
  const card = useStore((s) => s.view.card);
  if (!card) return null;
  const c = card;
  const closeCard = useStore((s) => s.closeCard);
  const view = useStore((s) => s.view);
  const writeMode = useStore((s) => s.writeMode);
  const updateCard = useStore((s) => s.updateCard);
  const deleteCard = useStore((s) => s.deleteCard);
  const toggleCheckbox = useStore((s) => s.toggleCheckbox);
  const events = useStore((s) => s.events);
  const [editing, setEditing] = useState(false);
  const [editName, setEditName] = useState("");
  const [editDesc, setEditDesc] = useState("");
  const [editBody, setEditBody] = useState("");

  function startEdit() {
    setEditName(String(c.meta.name || c.name));
    setEditDesc(String(c.meta.desc || ""));
    setEditBody(c.body);
    setEditing(true);
  }

  async function saveEdit() {
    if (!view.project || !view.kanban) return;
    const meta = { ...c.meta, name: editName, desc: editDesc };
    await updateCard(view.project, view.kanban, c, meta, editBody);
    setEditing(false);
  }

  const cardEvents = events.filter((e) => {
    const m = e.meta as Record<string, unknown> | undefined;
    return (m?.item_name === c.name || (m?.file_path?.toString() || "").includes(c.path));
  });

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center pt-12 bg-black/60" onClick={closeCard}>
      <div className="w-full max-w-2xl max-h-[80vh] overflow-y-auto bg-slate-900 border border-slate-700 rounded-xl shadow-2xl" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between px-5 py-3 border-b border-slate-800">
          <h2 className="text-lg font-semibold text-slate-100">{c.name}</h2>
          <div className="flex items-center gap-2">
            {writeMode && !editing && (
              <>
                <button onClick={startEdit} className="text-slate-400 hover:text-indigo-400 transition-colors" title="编辑"><Edit3 size={18} /></button>
                <button onClick={() => { if (view.project && view.kanban) deleteCard(view.project, view.kanban, c); closeCard(); }} className="text-slate-400 hover:text-red-400 transition-colors" title="删除"><Trash2 size={18} /></button>
              </>
            )}
            <button onClick={closeCard} className="text-slate-400 hover:text-slate-100 transition-colors"><X size={20} /></button>
          </div>
        </div>
        <div className="p-5 space-y-4">
          {editing ? (
            <div className="space-y-3">
              <input className="w-full bg-slate-800 border border-slate-600 rounded px-3 py-2 text-sm text-slate-100" value={editName} onChange={(e) => setEditName(e.target.value)} placeholder="名称" />
              <input className="w-full bg-slate-800 border border-slate-600 rounded px-3 py-2 text-sm text-slate-100" value={editDesc} onChange={(e) => setEditDesc(e.target.value)} placeholder="描述" />
              <textarea className="w-full bg-slate-800 border border-slate-600 rounded px-3 py-2 text-sm text-slate-100 font-mono min-h-32" value={editBody} onChange={(e) => setEditBody(e.target.value)} placeholder="正文 (markdown)" />
              <div className="flex gap-2">
                <button onClick={saveEdit} className="flex items-center gap-1.5 px-4 py-2 bg-indigo-600 hover:bg-indigo-500 rounded-lg text-sm font-medium transition-colors"><Save size={16} />保存</button>
                <button onClick={() => setEditing(false)} className="px-4 py-2 bg-slate-700 hover:bg-slate-600 rounded-lg text-sm transition-colors">取消</button>
              </div>
            </div>
          ) : (
            <>
              {!!c.meta.id && (
                <div className="flex flex-wrap gap-2 text-xs text-slate-400">
                  <span className="bg-slate-800 px-2 py-1 rounded font-mono">#{String(c.meta.id ?? "")}</span>
                  {!!c.meta.created_at && (
                    <span className="bg-slate-800 px-2 py-1 rounded">{new Date(String(c.meta.created_at ?? "")).toLocaleString("zh-CN")}</span>
                  )}
                  {!!c.meta.desc && (
                    <span className="bg-slate-800 px-2 py-1 rounded">{String(c.meta.desc ?? "")}</span>
                  )}
                </div>
              )}
              {c.checkboxes.length > 0 && (
                <div>
                  <div className="text-xs font-semibold uppercase tracking-wider text-slate-500 mb-2">
                    Checklist ({c.checkboxes.filter((cbx) => cbx.checked).length + "/" + c.checkboxes.length})
                  </div>
                  <div className="space-y-1">
                    {c.checkboxes.map((cb) => (
                      <div key={cb.hash} className="flex items-center gap-2 text-sm">
                        <button
                          onClick={() => toggleCheckbox(cb.hash)}
                          className={"shrink-0 transition-colors " + (writeMode ? "cursor-pointer hover:opacity-80" : "cursor-default")}
                          title={writeMode ? "切换" : "只读模式"}
                          disabled={!writeMode}
                        >
                          {cb.checked ? <CheckSquare2 size={16} className="text-green-400" /> : <Square size={16} className="text-slate-500" />}
                        </button>
                        <span className={cb.checked ? "text-slate-400 line-through" : "text-slate-200"}>{cb.text}</span>
                        <span className="text-xs text-slate-600 font-mono">#{cb.hash}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
              {c.body.trim() && (
                <div>
                  <div className="text-xs font-semibold uppercase tracking-wider text-slate-500 mb-2">内容</div>
                  <pre className="text-sm text-slate-300 whitespace-pre-wrap font-sans">{c.body.trim()}</pre>
                </div>
              )}
            </>
          )}
          {cardEvents.length > 0 && !editing && (
            <div>
              <div className="text-xs font-semibold uppercase tracking-wider text-slate-500 mb-2">
                相关操作 ({cardEvents.length})
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