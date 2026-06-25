import { useState } from "react";
import { useCardDetail } from "../hooks/useCardDetail";
import { formatTime } from "../utils/format";
import { X, Edit3, Trash2, ListChecks, FileText, Loader2 } from "lucide-react";
import CheckboxRow from "./card/CheckboxRow";
import CardEventRow from "./card/CardEventRow";
import CardDetailEditor from "./card/CardDetailEditor";

export default function CardDetail() {
  const { card, closeCard, view, writeMode, updateCard, deleteCard, toggleCheckbox, cardEvents, saving } =
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

  const hasCheckboxes = c.checkboxes.length > 0;
  const hasChanges = editing && (
    editName !== String(c.meta.name || c.name) ||
    editDesc !== String(c.meta.desc || "") ||
    editBody !== c.body
  );
  const [showChecklist, setShowChecklist] = useState(true);
  const tab = hasCheckboxes && showChecklist ? "checklist" : "content";

  function handleClose() {
    if (hasChanges && !window.confirm("有未保存的修改，确定关闭？")) return;
    closeCard();
  }

  function handleDelete() {
    if (!view.project || !view.kanban) return;
    if (!window.confirm("确认删除「" + c.name + "」？")) return;
    deleteCard(view.project, view.kanban, c);
    closeCard();
  }

  return (
    <div
      className={"fixed inset-0 z-50 flex items-start justify-center pt-12 " + (saving ? "bg-black/70 cursor-wait" : "bg-black/60")}
      onClick={handleClose}
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
                  className={"text-slate-400 hover:text-indigo-400 transition-colors " + (saving ? "opacity-50" : "")}
                  title="编辑"
                  disabled={saving}
                >
                  {saving ? <Loader2 size={18} className="animate-spin" /> : <Edit3 size={18} />}
                </button>
                <button
                  onClick={handleDelete}
                  className={"text-slate-400 hover:text-red-400 transition-colors " + (saving ? "opacity-50" : "")}
                  title="删除"
                  disabled={saving}
                >
                  {saving ? <Loader2 size={18} className="animate-spin" /> : <Trash2 size={18} />}
                </button>
              </>
            )}
            <button
              onClick={handleClose}
              className="text-slate-400 hover:text-slate-100 transition-colors"
            >
              <X size={20} />
            </button>
          </div>
        </div>
        {editing ? (
          <div className="flex-1 overflow-y-auto p-6 card-detail-scroll">
            <CardDetailEditor
              editName={editName}
              editDesc={editDesc}
              editBody={editBody}
              setName={setEditName}
              setDesc={setEditDesc}
              setBody={setEditBody}
              onSave={saveEdit}
              onCancel={() => {
                if (hasChanges && !window.confirm('有未保存的修改，确定取消？')) return;
                setEditing(false);
              }}
              saving={saving}
            />
          </div>
        ) : (
          <div className="flex-1 flex flex-col min-h-0">
            {hasCheckboxes && (
              <div className="flex gap-1 px-5 pt-4 pb-0 border-b border-slate-800/50 shrink-0">
                <button
                  onClick={() => setShowChecklist(true)}
                  className={
                    "flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-t transition-colors " +
                    (tab === "checklist"
                      ? "bg-slate-800 text-indigo-300 border border-slate-700 border-b-slate-800 -mb-px"
                      : "text-slate-500 hover:text-slate-300")
                  }
                >
                  <ListChecks size={14} />
                  Checklist
                  <span className="text-slate-500 ml-0.5">
                    ({c.checkboxes.filter((cbx) => cbx.checked).length}/{c.checkboxes.length})
                  </span>
                </button>
                <button
                  onClick={() => setShowChecklist(false)}
                  className={
                    "flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-t transition-colors " +
                    (tab === "content"
                      ? "bg-slate-800 text-indigo-300 border border-slate-700 border-b-slate-800 -mb-px"
                      : "text-slate-500 hover:text-slate-300")
                  }
                >
                  <FileText size={14} />
                  内容
                </button>
              </div>
            )}
            <div className="flex-1 overflow-y-auto p-5 card-detail-scroll">
              {!!c.meta.id && (
                <div className="flex flex-wrap gap-2 text-xs text-slate-400 bg-slate-800/30 rounded-lg p-3 mb-4">
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
              {tab === "checklist" ? (
                <>
                  {c.checkboxes.length > 0 && (
                    <div className="space-y-1.5 mb-5">
                      {c.checkboxes.map((cb) => (
                        <CheckboxRow
                          key={cb.hash}
                          cb={cb}
                          writeMode={writeMode}
                          onToggle={toggleCheckbox}
                        />
                      ))}
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
                </>
              ) : (
                <>
                  {c.body.trim() && (
                    <pre className="text-sm text-slate-300 whitespace-pre-wrap font-mono">
                      {c.body.trim()}
                    </pre>
                  )}
                  {cardEvents.length > 0 && (
                    <div className="mt-5">
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
                </>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}










