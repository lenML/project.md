import type { CardData } from '../../types';
import { useColumnLogic } from '../../hooks/useColumnView';
import { useStore } from '../../stores/useStore';
import { CheckSquare2, Square, Plus } from 'lucide-react';
import { useState, useRef } from 'react';
import { parseFrontmatter } from '../../utils/markdown';

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

function CardItem({
  card,
  writeMode,
  onCardClick,
  projectName,
  kanbanName,
}: {
  card: CardData;
  writeMode: boolean;
  onCardClick: (c: CardData) => void;
  projectName: string;
  kanbanName: string;
}) {
  const deleteCard = useStore((s) => s.deleteCard);
  return (
    <div
      key={card.path}
      className={'card-hover ' + (writeMode ? 'card-draggable' : '')}
      onClick={() => onCardClick(card)}
      draggable={writeMode}
      onDragStart={(e) => {
        sessionStorage.setItem('drag-card', JSON.stringify(card));
        e.dataTransfer.effectAllowed = 'move';
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
        <div className="text-xs text-slate-400 mb-2 line-clamp-2">
          {String(card.meta.desc ?? '')}
        </div>
      )}
      {card.checkboxes.length > 0 && <CheckboxBadges checkboxes={card.checkboxes} />}
    </div>
  );
}

function CheckboxBadges({ checkboxes }: { checkboxes: CardData['checkboxes'] }) {
  return (
    <div className="flex flex-wrap gap-1.5 mt-2">
      {checkboxes.slice(0, 4).map((cb) => {
        const Tag = cb.checked ? CheckSquare2 : Square;
        return (
          <span
            key={cb.hash}
            className={
              'inline-flex items-center gap-0.5 text-xs px-1.5 py-0.5 rounded truncate ' +
              (cb.checked ? 'bg-green-900/30 text-green-400' : 'bg-slate-700/50 text-slate-400')
            }
          >
            <span>
              <Tag size={10} />
            </span>
            {cb.text}
          </span>
        );
      })}
      {checkboxes.length > 4 && (
        <span className="text-xs text-slate-500">+{checkboxes.length - 4}</span>
      )}
    </div>
  );
}

function ColReadme({
  readme,
  writeMode,
  editingReadme,
  onEdit,
  onSave,
  onCancel,
  readmeText,
  setReadmeText,
}: {
  readme?: string;
  writeMode: boolean;
  editingReadme: boolean;
  onEdit: () => void;
  onSave: () => void;
  onCancel: () => void;
  readmeText: string;
  setReadmeText: (v: string) => void;
}) {
  if (editingReadme) {
    return (
      <div className="px-2 pt-1 space-y-1">
        <textarea
          className="w-full bg-slate-800 border border-slate-600 rounded px-2 py-1 text-xs text-slate-200 font-mono min-h-16 focus:outline-none focus:border-indigo-500/50"
          value={readmeText}
          onChange={(e) => setReadmeText(e.target.value)}
          placeholder="# 列说明"
        />
        <div className="flex gap-1">
          <button
            onClick={onSave}
            className="text-xs text-indigo-400 hover:text-indigo-300 transition-colors"
          >
            保存
          </button>
          <button
            onClick={onCancel}
            className="text-xs text-slate-500 hover:text-slate-300 transition-colors"
          >
            取消
          </button>
        </div>
      </div>
    );
  }
  if (!readme) return null;
  const body = (parseFrontmatter(readme)?.body ?? readme).replace(/^#+/gm, '').trim();
  return (
    <div className="px-2 pt-1">
      {writeMode && (
        <button
          onClick={onEdit}
          className="text-xs text-slate-600 hover:text-indigo-400 transition-colors"
          title="编辑列说明"
        >
          E
        </button>
      )}
      {body && (
        <div className="text-xs text-slate-500 italic leading-relaxed line-clamp-3">{body}</div>
      )}
    </div>
  );
}

function NewCardForm({
  show,
  onClose,
  projectName,
  kanbanName,
  colName,
}: {
  show: boolean;
  onClose: () => void;
  projectName: string;
  kanbanName: string;
  colName: string;
}) {
  const createCard = useStore((s) => s.createCard);
  const [newName, setNewName] = useState('');
  const [newDesc, setNewDesc] = useState('');
  const inputRef = useRef<HTMLInputElement>(null);

  async function handleCreate() {
    if (!newName.trim() || !projectName || !kanbanName) return;
    await createCard(projectName, kanbanName, colName, newName.trim(), newDesc.trim() || undefined);
    setNewName('');
    setNewDesc('');
    onClose();
  }

  if (!show) return null;
  return (
    <div className="border border-slate-600/50 bg-slate-800/80 rounded-lg p-2 space-y-2">
      <input
        ref={inputRef}
        className="w-full bg-slate-900 border border-slate-600 rounded px-2 py-1.5 text-sm text-slate-200 placeholder-slate-500 focus:outline-none focus:border-indigo-500/50"
        placeholder="卡片名称"
        value={newName}
        onChange={(e) => setNewName(e.target.value)}
        onKeyDown={(e) => {
          if (e.key === 'Enter') handleCreate();
          if (e.key === 'Escape') onClose();
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
          onClick={onClose}
          className="px-2 py-1.5 bg-slate-700 hover:bg-slate-600 rounded text-xs text-slate-300 transition-colors"
        >
          取消
        </button>
      </div>
    </div>
  );
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
  const [editingReadme, setEditingReadme] = useState(false);
  const [readmeText, setReadmeText] = useState('');
  const [showNew, setShowNew] = useState(false);
  const { visibleCards, remaining, totalCbs, doneCbs, saveColReadme } = useColumnLogic(
    col,
    cardPage,
    pageSize,
  );

  async function handleSaveReadme() {
    await saveColReadme(projectName, kanbanName, col.name, readmeText);
    setEditingReadme(false);
  }

  return (
    <div
      data-col={col.name}
      className={
        'flex flex-col min-w-72 max-w-72 shrink-0 rounded-xl bg-slate-900/50 p-2 transition-colors' +
        (isDragOver ? ' bg-indigo-900/20 ring-2 ring-indigo-500/50' : '')
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
        <span className="text-xs bg-slate-800 text-slate-400 px-1.5 py-0.5 rounded">
          {col.cards.length}
        </span>
        <span className="text-xs text-slate-500">{col.name}</span>
        {totalCbs > 0 && (
          <span className="text-xs text-slate-600 ml-auto">
            {doneCbs}/{totalCbs}
          </span>
        )}
      </div>
      <ColReadme
        readme={col.readme}
        writeMode={writeMode}
        editingReadme={editingReadme}
        onEdit={() => {
          setReadmeText(col.readme || '');
          setEditingReadme(true);
        }}
        onSave={handleSaveReadme}
        onCancel={() => setEditingReadme(false)}
        readmeText={readmeText}
        setReadmeText={setReadmeText}
      />
      <div className="flex flex-col gap-2 p-2 min-h-24 overflow-auto kanban-scroll">
        {visibleCards.length === 0 && !showNew && (
          <div className="text-xs text-slate-600 text-center py-6">空</div>
        )}
        {visibleCards.map((card) => (
          <CardItem
            key={card.path}
            card={card}
            writeMode={writeMode}
            onCardClick={onCardClick}
            projectName={projectName}
            kanbanName={kanbanName}
          />
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
            }}
            className="btn-new-card"
          >
            <Plus size={14} /> 新建卡片
          </button>
        )}
        <NewCardForm
          show={writeMode && showNew}
          onClose={() => setShowNew(false)}
          projectName={projectName}
          kanbanName={kanbanName}
          colName={col.name}
        />
      </div>
    </div>
  );
}
