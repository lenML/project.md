import { useStore } from "../stores/useStore";
import type { ColumnData, CardData } from "../types";
import { CheckSquare2, Square } from "lucide-react";

export default function KanbanBoard() {
  const projects = useStore((s) => s.projects);
  const view = useStore((s) => s.view);
  const setView = useStore((s) => s.setView);
  const project = projects.find((p) => p.name === view.project);
  const kanban = project?.kanbans.find((k) => k.name === view.kanban);

  if (!kanban) {
    return <div className="text-slate-500 text-sm text-center py-8">看板不存在</div>;
  }

  return (
    <div className="flex gap-4 h-full kanban-scroll overflow-x-auto pb-4">
      {kanban.columns.map((col) => (
        <ColumnView key={col.name} col={col} onCardClick={(c) => setView({ card: c })} />
      ))}
    </div>
  );
}

function ColumnView({ col, onCardClick }: { col: ColumnData; onCardClick: (c: CardData) => void }) {
  return (
    <div className="flex flex-col min-w-72 max-w-72 shrink-0">
      <div className="col-header flex items-center gap-2">
        <span className="text-xs bg-slate-800 text-slate-400 px-1.5 py-0.5 rounded">
          {col.cards.length}
        </span>
        {col.name}
      </div>
      <div className="flex flex-col gap-2">
        {col.cards.length === 0 && (
          <div className="text-xs text-slate-600 text-center py-6">空</div>
        )}
        {col.cards.map((card) => (
          <div key={card.path} className="card-hover" onClick={() => onCardClick(card)}>
            <div className="text-sm font-medium text-slate-200 mb-1">{card.name}</div>
            {!!card.meta.desc && (
              <div className="text-xs text-slate-400 mb-2 line-clamp-2">{String(card.meta.desc ?? "")}</div>
            )}
            {card.checkboxes.length > 0 && (
              <div className="flex flex-wrap gap-1.5 mt-2">
                {card.checkboxes.slice(0, 4).map((cb) => (
                  <span
                    key={cb.hash}
                    className={`inline-flex items-center gap-0.5 text-xs px-1.5 py-0.5 rounded ${
                      cb.checked ? "bg-green-900/30 text-green-400" : "bg-slate-700/50 text-slate-400"
                    }`}
                  >
                    {cb.checked ? <CheckSquare2 size={10} /> : <Square size={10} />}
                    {cb.text}
                  </span>
                ))}
                {card.checkboxes.length > 4 && (
                  <span className="text-xs text-slate-500">+{card.checkboxes.length - 4}</span>
                )}
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
