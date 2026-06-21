import { useStore } from '../stores/useStore';
import { useMemo, useCallback } from 'react';
import type { CardData } from '../types';

export function useKanban() {
  const projects = useStore((s) => s.projects);
  const view = useStore((s) => s.view);
  const setView = useStore((s) => s.setView);
  const moveCard = useStore((s) => s.moveCard);
  const writeMode = useStore((s) => s.writeMode);
  const searchQuery = useStore((s) => s.searchQuery);
  const setSearchQuery = useStore((s) => s.setSearchQuery);
  const loadTrash = useStore((s) => s.loadTrash);
  const CARD_PAGE_SIZE = useStore((s) => s.CARD_PAGE_SIZE);

  const project = useMemo(
    () => projects.find((p) => p.name === view.project),
    [projects, view.project],
  );
  const kanban = useMemo(
    () => project?.kanbans.find((k) => k.name === view.kanban),
    [project, view.kanban],
  );

  const sortedColumns = useMemo(() => {
    if (!kanban) return [];
    return [...kanban.columns].sort((a, b) => (a.order ?? 9999) - (b.order ?? 9999));
  }, [kanban]);

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

  const onDrop = useCallback(
    (colName: string) => {
      const cardJson = sessionStorage.getItem('drag-card');
      if (!cardJson || !view.project || !view.kanban) return;
      const card: CardData = JSON.parse(cardJson);
      if (colName === card.path.split('/').slice(-2, -1)[0]) return;
      moveCard(view.project, view.kanban, card, colName);
      sessionStorage.removeItem('drag-card');
    },
    [view.project, view.kanban, moveCard],
  );

  return {
    projects,
    view,
    setView,
    moveCard,
    writeMode,
    searchQuery,
    setSearchQuery,
    loadTrash,
    CARD_PAGE_SIZE,
    project,
    kanban,
    sortedColumns,
    displayedColumns,
    onDrop,
  };
}
