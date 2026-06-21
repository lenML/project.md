import { useKanban } from '../../hooks/useKanbanStore';
import type { CardData } from '../../types';
import { Search, X, Trash2 } from 'lucide-react';
import TrashPanel from '../trash/TrashPanel';
import { useState } from 'react';
import ColumnView from './ColumnView';

export default function KanbanBoard() {
  const {
    view,
    setView,
    writeMode,
    searchQuery,
    setSearchQuery,
    loadTrash,
    CARD_PAGE_SIZE,
    kanban,
    displayedColumns,
    onDrop,
  } = useKanban();

  if (!kanban) {
    return <div className="text-slate-500 text-sm text-center py-8">看板不存在</div>;
  }

  const [dragOverCol, setDragOverCol] = useState<string | null>(null);
  const [cardPages, setCardPages] = useState<Record<string, number>>({});
  const [showTrash, setShowTrash] = useState(false);

  function loadMoreCards(colName: string) {
    setCardPages((prev) => ({ ...prev, [colName]: (prev[colName] || 1) + 1 }));
  }

  return (
    <div className="flex flex-col h-full">
      {writeMode && (
        <div className="relative mb-3">
          <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" />
          <input
            className="w-full bg-slate-800 border border-slate-700 rounded-lg pl-9 pr-8 py-2 text-sm text-slate-200 placeholder-slate-500 focus:outline-none focus:border-indigo-500/50 transition-colors"
            placeholder="搜索卡片..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
          {searchQuery && (
            <button
              className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-500 hover:text-slate-300"
              onClick={() => setSearchQuery('')}
            >
              <X size={14} />
            </button>
          )}
          <button
            onClick={() => {
              loadTrash(view.project!, view.kanban!);
              setShowTrash(true);
            }}
            className="flex items-center gap-1 text-xs text-slate-500 hover:text-red-400 transition-colors shrink-0"
            title="回收站"
          >
            <Trash2 size={14} />
          </button>
        </div>
      )}
      <div className="flex gap-4 flex-1 kanban-scroll overflow-x-auto pb-4">
        {displayedColumns.map((col) => (
          <ColumnView
            key={col.name}
            col={col}
            onCardClick={(c: CardData) => setView({ card: c })}
            onDrop={() => {
              setDragOverCol(null);
              onDrop(col.name);
            }}
            onDragOver={() => setDragOverCol(col.name)}
            onDragLeave={() => setDragOverCol(null)}
            isDragOver={dragOverCol === col.name}
            writeMode={writeMode}
            projectName={view.project || ''}
            kanbanName={view.kanban || ''}
            cardPage={cardPages[col.name] || 1}
            pageSize={CARD_PAGE_SIZE}
            onLoadMore={() => loadMoreCards(col.name)}
          />
        ))}
      </div>
      {showTrash && <TrashPanel onClose={() => setShowTrash(false)} />}
    </div>
  );
}
