import type { CardData } from "../../types";
import { useStore } from "../../stores/useStore";
import { CheckSquare2, Square, Plus } from "lucide-react";
import { useState, useRef } from "react";
import { parseFrontmatter } from "../../utils/markdown";

interface ColumnViewProps {
  col: { name: string; cards: CardData[]; readme?: string };
  onCardClick: (c: CardData) => void;
  onDrop: () => void;
  onDragOver: () => void;
  onDragLeave: () => void;
  isDragOver: boolean;
  writeMode: boolean;
  projectName: string;
  kanbanName: string;
  cardPage: number;
  pageSize: number;
  onLoadMore: () => void;
}

export default function ColumnView({
  col,
  onCardClick,
  onDrop,
  onDragOver,
  onDragLeave,
  isDragOver,
  writeMode,
  projectName,
  kanbanName,
  cardPage,
  pageSize,
  onLoadMore,
}: ColumnViewProps) {
  const deleteCard = useStore((s) => s.deleteCard);
  const createCard = useStore((s) => s.createCard);
  const [showNew, setShowNew] = useState(false);
  const [newName, setNewName] = useState("");
  const [newDesc, setNewDesc] = useState("");
  const inputRef = useRef<HTMLInputElement>(null);

  async function handleCreate() {
    if (!newName.trim() || !projectName || !kanbanName) return;
    await createCard(projectName, kanbanName, col.name, newName.trim(), newDesc.trim() || undefined);
    setNewName("");
    setNewDesc("");
    setShowNew(false);
  }

  const [editingReadme, setEditingReadme] = useState(false);
  const [readmeText, setReadmeText] = useState("");
  const updateColReadme = useStore((s) => s.updateColReadme);

  async function saveColReadme() {
    await updateColReadme(projectName, kanbanName, col.name, readmeText);
    setEditingReadme(false);
  }

  // 按 order → mtime → created_at 排序
  const sortedCards = [...col.cards].sort((a, b) => {
    const ao = a.order ?? -1; const bo = b.order ?? -1;
    if (ao !== bo) return ao - bo;
    const am = a.mtime_ms ?? 0; const bm = b.mtime_ms ?? 0;
    if (am !== bm) return bm - am;
    return ((b.meta.created_at as string) || "").localeCompare((a.meta.created_at as string) || "");
  });
  const visibleCards = sortedCards.slice(0, cardPage * pageSize);
  const totalCards = col.cards.length;
  const remaining = totalCards - visibleCards.length;
  const totalCbs = col.cards.reduce((s, c) => s + c.checkboxes.length, 0);
  const doneCbs = col.cards.reduce((s, c) => s + c.checkboxes.filter((x) => x.checked).length, 0);

  return (
    <div
      data-col={col.name}
      className={
        "flex flex-col min-w-72 max-w-72 shrink-0 rounded-xl bg-slate-900/50 p-2 transition-colors" +
        (isDragOver ? " bg-indigo-900/20 ring-2 ring-indigo-500/50" : "")
      }
      onDragOver={(e) => {
        e.preventDefault();
        onDragOver();
      }}
      onDragLeave={onDragLeave}
      onDrop={(e) => {
        e.preventDefault();
        onDrop();
      }}
    >
      <div className="col-header flex items-center gap-2 px-2 pt-2">
        <span className="text-xs bg-slate-800 text-slate-400 px-1.5 py-0.5 rounded">{col.cards.length}</span>
        <span className="text-xs text-slate-500">{col.name}</span>
        {writeMode && (
          <button
            onClick={() => {
              setReadmeText(col.readme || "");
              setEditingReadme(true);
            }}
            className="text-xs text-slate-600 hover:text-indigo-400 ml-auto transition-colors"
            title="编辑列说明"
          >
            E
          </button>
        )}
        {totalCbs > 0 && (
          <span className="text-xs text-slate-600 ml-auto">
            {doneCbs}/{totalCbs}
          </span>
        )}
      </div>
      {editingReadme ? (
        <div className="px-2 pt-1 space-y-1">
          <textarea
            className="w-full bg-slate-800 border border-slate-600 rounded px-2 py-1 text-xs text-slate-200 font-mono min-h-16 focus:outline-none focus:border-indigo-500/50"
            value={readmeText}
            onChange={(e) => setReadmeText(e.target.value)}
            placeholder="# 列说明"
          />
          <div className="flex gap-1">
            <button onClick={saveColReadme} className="text-xs text-indigo-400 hover:text-indigo-300 transition-colors">
              保存
            </button>
            <button onClick={() => setEditingReadme(false)} className="text-xs text-slate-500 hover:text-slate-300 transition-colors">
              取消
            </button>
          </div>
        </div>
      ) : (
        col.readme && (
          <div className="px-2 pt-1">
            <div className="text-xs text-slate-500 italic leading-relaxed line-clamp-3">
              {(parseFrontmatter(col.readme)?.body ?? col.readme).replace(/^#+/gm, "").trim()}
            </div>
          </div>
        )
      )}
      <div className="flex flex-col gap-2 p-2 min-h-24 overflow-auto kanban-scroll">
        {visibleCards.length === 0 && !showNew && (
          <div className="text-xs text-slate-600 text-center py-6">空</div>
        )}
        {visibleCards.map((card: CardData) => (
          <div
            key={card.path}
            className={"card-hover " + (writeMode ? "card-draggable" : "")}
            onClick={() => onCardClick(card)}
            draggable={writeMode}
            onDragStart={(e) => {
              sessionStorage.setItem("drag-card", JSON.stringify(card));
              e.dataTransfer.effectAllowed = "move";
            }}
          >
            <div className="flex items-start justify-between gap-2">
              {writeMode && <span className="drag-handle text-xs mt-0.5">⠿</span>}
              <div className="text-sm font-medium text-slate-200 mb-1">{card.name}</div>
              {writeMode && (
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    deleteCard(projectName, kanbanName, card);
                  }}
                  className="text-slate-600 hover:text-red-400 transition-colors shrink-0"
                  title="移入回收站"
                >
                  X
                </button>
              )}
            </div>
            {!!card.meta.desc && (
              <div className="text-xs text-slate-400 mb-2 line-clamp-2">{String(card.meta.desc ?? "")}</div>
            )}
            {card.checkboxes.length > 0 && (
              <div className="flex flex-wrap gap-1.5 mt-2">
                {card.checkboxes.slice(0, 4).map((cb) => {
                  const Tag = cb.checked ? CheckSquare2 : Square;
                  return (
                    <span
                      key={cb.hash}
                      className={
                        "inline-flex items-center gap-0.5 text-xs px-1.5 py-0.5 rounded truncate " +
                        (cb.checked ? "bg-green-900/30 text-green-400" : "bg-slate-700/50 text-slate-400")
                      }
                    >
                      <Tag size={10} />
                      {cb.text}
                    </span>
                  );
                })}
                {card.checkboxes.length > 4 && (
                  <span className="text-xs text-slate-500">+{card.checkboxes.length - 4}</span>
                )}
              </div>
            )}
          </div>
        ))}
        {remaining > 0 && (
          <button
            onClick={onLoadMore}
            className="text-xs text-indigo-400 hover:text-indigo-300 py-2 border border-dashed border-slate-700/50 rounded transition-colors"
          >
            加载更多 ({remaining})
          </button>
        )}
        {writeMode && !showNew && (
          <button
            onClick={() => {
              setShowNew(true);
              setTimeout(() => inputRef.current?.focus(), 50);
            }}
            className="btn-new-card"
          >
            <Plus size={14} /> 新建卡片
          </button>
        )}
        {writeMode && showNew && (
          <div className="border border-slate-600/50 bg-slate-800/80 rounded-lg p-2 space-y-2">
            <input
              ref={inputRef}
              className="w-full bg-slate-900 border border-slate-600 rounded px-2 py-1.5 text-sm text-slate-200 placeholder-slate-500 focus:outline-none focus:border-indigo-500/50"
              placeholder="卡片名称"
              value={newName}
              onChange={(e) => setNewName(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") handleCreate();
                if (e.key === "Escape") setShowNew(false);
              }}
            />
            <input
              className="w-full bg-slate-900 border border-slate-600 rounded px-2 py-1.5 text-xs text-slate-200 placeholder-slate-500 focus:outline-none focus:border-indigo-500/50"
              placeholder="描述 (可选)"
              value={newDesc}
              onChange={(e) => setNewDesc(e.target.value)}
            />
            <div className="flex gap-1.5">
              <button
                onClick={handleCreate}
                className="flex-1 px-2 py-1.5 bg-indigo-600 hover:bg-indigo-500 rounded text-xs font-medium text-white transition-colors"
              >
                创建
              </button>
              <button
                onClick={() => setShowNew(false)}
                className="px-2 py-1.5 bg-slate-700 hover:bg-slate-600 rounded text-xs text-slate-300 transition-colors"
              >
                取消
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
