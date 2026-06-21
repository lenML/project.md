import { useStore } from "../stores/useStore";
import { useMemo } from "react";

export function useCardDetail() {
  const card = useStore((s) => s.view.card);
  const closeCard = useStore((s) => s.closeCard);
  const view = useStore((s) => s.view);
  const writeMode = useStore((s) => s.writeMode);
  const updateCard = useStore((s) => s.updateCard);
  const deleteCard = useStore((s) => s.deleteCard);
  const toggleCheckbox = useStore((s) => s.toggleCheckbox);
  const events = useStore((s) => s.events);

  const cardEvents = useMemo(() => {
    if (!card) return [];
    return events.filter((e) => {
      const m = e.meta as Record<string, unknown> | undefined;
      return (m?.item_name === card.name || (m?.file_path?.toString() || "").includes(card.path));
    });
  }, [events, card]);

  return { card, closeCard, view, writeMode, updateCard, deleteCard, toggleCheckbox, events, cardEvents };
}