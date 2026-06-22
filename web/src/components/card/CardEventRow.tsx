import { formatTime } from '../../utils/format';
import type { EventRecord } from '../../types';

export default function CardEventRow({ e }: { e: EventRecord }) {
  return (
    <div className="flex items-center gap-3 text-xs text-slate-400 bg-slate-800/30 rounded px-2 py-1">
      <span>{formatTime(e.timestamp)}</span>
      <span className="text-slate-500 font-mono">{e.type}</span>
      <span>{e.title}</span>
    </div>
  );
}
