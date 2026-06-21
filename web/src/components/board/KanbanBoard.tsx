import { useStore } from '../../stores/useStore';
import type { CardData } from '../../types';
import { Search, X, Trash2 } from 'lucide-react';
import TrashPanel from '../trash/TrashPanel';
import { useState, useMemo } from 'react';
import ColumnView from './ColumnView';

export default function KanbanBoard() {
  const projects = useStore((s) => s.projects);
  const view = useStore((s) => s.view);
  const setView = useStore((s) => s.setView);
  const moveCard = useStore((s) => s.moveCard);
  const writeMode = useStore((s) => s.writeMode);
  const searchQuery = useStore((s) => s.searchQuery);
  const setSearchQuery = useStore((s) => s.setSearchQuery);
  const loadTrash = useStore((s) => s.loadTrash);
  const CARD_PAGE_SIZE = useStore((s) => s.CARD_PAGE_SIZE);
  const project = projects.find((p) => p.name === view.project);
  const kanban = project?.kanbans.find((k) => k.name === view.kanban);

  if (!kanban) {
    return <div className="text-slate-500 text-sm text-center py-8">看板不存在</div>;
  }

  const [dragOverCol, setDragOverCol] = useState<string | null>(null);
  
  const [cardPages, setCardPages] = useState<Record<string, number>>({});
  const [showTrash, setShowTrash] = useState(false);

  function onDrop(colName: string) {
    const cardJson = sessionStorage.getItem('drag-card');
    setDragOverCol(null);
    if (!cardJson || !view.project || !view.kanban) return;
    const card: CardData = JSON.parse(cardJson);
    if (colName === card.path.split('/').slice(-2, -1)[0]) return;
    moveCard(view.project, view.kanban, card, colName);
    sessionStorage.removeItem('drag-card');
  }



  function loadMoreCards(colName: string) {
    setCardPages((prev) => ({ ...prev, [colName]: (prev[colName] || 1) + 1 }));
  }

  const sortedColumns = useMemo(() => {
    return [...kanban.columns].sort((a, b) => (a.order ?? 9999) - (b.order ?? 9999));
  }, [kanban.columns]);

  const displayedColumns = useMemo(() => {
    if (!searchQuery) return sortedColumns;
    const q = searchQuery.toLowerCase();
    return sortedColumns.map((col) => ({
      ...col,
      cards: col.cards.filter(
        (c: CardData) =>
          c.name.toLowerCase().includes(q) ||
          String(c.meta.desc || '')
            .toLowerCase()
            .includes(q),
      ),
    }));
  }, [sortedColumns, searchQuery]);

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
            onDrop={() => onDrop(col.name)}
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
