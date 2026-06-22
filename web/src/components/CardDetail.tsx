import { useState } from "react";
import { useCardDetail } from "../hooks/useCardDetail";
import { formatTime } from "../utils/format";
import { X, Edit3, Trash2 } from "lucide-react";
import CheckboxRow from "./card/CheckboxRow";
import CardEventRow from "./card/CardEventRow";
import CardDetailEditor from "./card/CardDetailEditor";

export default function CardDetail() {
  const { card, closeCard, view, writeMode, updateCard, deleteCard, toggleCheckbox, cardEvents } =
    useCardDetail();
  if (!card) return null;
  const c = card;
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

  return (
    <div
      className="fixed inset-0 z-50 flex items-start justify-center pt-12 bg-black/60"
      onClick={closeCard}
    >
      <div
        className="w-full max-w-3xl max-h-[80vh] bg-slate-900 border border-slate-700 rounded-xl shadow-2xl flex flex-col"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between px-5 py-3 border-b border-slate-800 shrink-0">
          <h2 className="text-lg font-semibold text-slate-100">{c.name}</h2>
          <div className="flex items-center gap-2">
            {writeMode && !editing && (
              <>
                <button
                  onClick={startEdit}
                  className="text-slate-400 hover:text-indigo-400 transition-colors"
                  title="编辑"
                >
                  <Edit3 size={18} />
                </button>
                <button
                  onClick={() => {
                    if (view.project && view.kanban) deleteCard(view.project, view.kanban, c);
                    closeCard();
                  }}
                  className="text-slate-400 hover:text-red-400 transition-colors"
                  title="删除"
                >
                  <Trash2 size={18} />
                </button>
              </>
            )}
            <button
              onClick={closeCard}
              className="text-slate-400 hover:text-slate-100 transition-colors"
            >
              <X size={20} />
            </button>
          </div>
        </div>
        {editing ? (
          <div className="flex-1 overflow-y-auto p-6">
            <CardDetailEditor
              editName={editName}
              editDesc={editDesc}
              editBody={editBody}
              setName={setEditName}
              setDesc={setEditDesc}
              setBody={setEditBody}
              onSave={saveEdit}
              onCancel={() => setEditing(false)}
            />
          </div>
        ) : (
          <div className="flex-1 grid grid-cols-2 gap-4 p-6 min-h-0 overflow-hidden">
            {/* 左侧：元数据 + checklist + 事件 */}
            <div className="overflow-y-auto space-y-4 pr-2">
              {!!c.meta.id && (
                <div className="flex flex-wrap gap-2 text-xs text-slate-400 bg-slate-800/30 rounded-lg p-3">
                  <span className="bg-slate-800 px-2 py-1 rounded font-mono">
                    #{String(c.meta.id ?? "")}
                  </span>
                  {!!c.meta.created_at && (
                    <span className="bg-slate-800 px-2 py-1 rounded">
                      {formatTime(String(c.meta.created_at ?? ""))}
                    </span>
                  )}
                  {!!c.meta.desc && (
                    <span className="bg-slate-800 px-2 py-1 rounded">
                      {String(c.meta.desc ?? "")}
                    </span>
                  )}
                </div>
              )}
              {c.checkboxes.length > 0 && (
                <div>
                  <div className="text-xs font-semibold uppercase tracking-wider text-slate-500 mb-2">
                    Checklist (
                    {c.checkboxes.filter((cbx) => cbx.checked).length + "/" + c.checkboxes.length})
                  </div>
                  <div className="space-y-1.5">
                    {c.checkboxes.map((cb) => (
                      <CheckboxRow
                        key={cb.hash}
                        cb={cb}
                        writeMode={writeMode}
                        onToggle={toggleCheckbox}
                      />
                    ))}
                  </div>
                </div>
              )}
              {cardEvents.length > 0 && (
                <div>
                  <div className="text-xs font-semibold uppercase tracking-wider text-slate-500 mb-2">
                    相关操作 ({cardEvents.length})
                  </div>
                  <div className="space-y-1">
                    {cardEvents.map((e) => (
                      <CardEventRow key={e.id} e={e} />
                    ))}
                  </div>
                </div>
              )}
            </div>
            {/* 右侧：正文 */}
            <div className="overflow-y-auto pr-2">
              {c.body.trim() && (
                <div>
                  <div className="text-xs font-semibold uppercase tracking-wider text-slate-500 mb-2">
                    内容
                  </div>
                  <pre className="text-sm text-slate-300 whitespace-pre-wrap font-mono">
                    {c.body.trim()}
                  </pre>
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
