import { useStore } from "../stores/useStore";
import { useMemo } from "react";
import type { CardData } from "../types";

export function useColumnLogic(col: { name: string; cards: CardData[] }, cardPage: number, pageSize: number) {
  const updateColReadme = useStore((s) => s.updateColReadme);

  const sortedCards = useMemo(() => {
    return [...col.cards].sort((a, b) => {
      const ao = a.order ?? -1; const bo = b.order ?? -1;
      if (ao !== bo) return ao - bo;
      const am = a.mtime_ms ?? 0; const bm = b.mtime_ms ?? 0;
      if (am !== bm) return bm - am;
      return ((b.meta.created_at as string) || "").localeCompare((a.meta.created_at as string) || "");
    });
  }, [col.cards]);

  const visibleCards = sortedCards.slice(0, cardPage * pageSize);
  const remaining = col.cards.length - visibleCards.length;
  const totalCbs = col.cards.reduce((s, c) => s + c.checkboxes.length, 0);
  const doneCbs = col.cards.reduce((s, c) => s + c.checkboxes.filter((x) => x.checked).length, 0);

  async function saveColReadme(projectName: string, kanbanName: string, colName: string, readmeText: string) {
    await updateColReadme(projectName, kanbanName, colName, readmeText);
  }

  return { sortedCards, visibleCards, remaining, totalCbs, doneCbs, saveColReadme };
}