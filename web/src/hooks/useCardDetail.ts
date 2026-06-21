import { useStore } from "../stores/useStore";

export function useCardDetail() {
  const card = useStore((s) => s.view.card);
  const closeCard = useStore((s) => s.closeCard);
  const view = useStore((s) => s.view);
  const writeMode = useStore((s) => s.writeMode);
  const updateCard = useStore((s) => s.updateCard);
  const deleteCard = useStore((s) => s.deleteCard);
  const toggleCheckbox = useStore((s) => s.toggleCheckbox);
  const events = useStore((s) => s.events);
  return { card, closeCard, view, writeMode, updateCard, deleteCard, toggleCheckbox, events };
}