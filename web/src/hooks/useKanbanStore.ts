import { useStore } from "../stores/useStore";

export function useKanbanStore() {
  const projects = useStore((s) => s.projects);
  const view = useStore((s) => s.view);
  const setView = useStore((s) => s.setView);
  const moveCard = useStore((s) => s.moveCard);
  const writeMode = useStore((s) => s.writeMode);
  const searchQuery = useStore((s) => s.searchQuery);
  const setSearchQuery = useStore((s) => s.setSearchQuery);
  const loadTrash = useStore((s) => s.loadTrash);
  const CARD_PAGE_SIZE = useStore((s) => s.CARD_PAGE_SIZE);
  return { projects, view, setView, moveCard, writeMode, searchQuery, setSearchQuery, loadTrash, CARD_PAGE_SIZE };
}