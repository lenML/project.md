import { CheckSquare2, Square } from 'lucide-react';
import type { CheckboxItem } from '../../utils/markdown';

export default function CheckboxRow({
  cb,
  writeMode,
  onToggle,
}: {
  cb: CheckboxItem;
  writeMode: boolean;
  onToggle: (hash: string) => void;
}) {
  return (
    <div className="flex items-center gap-2 text-sm" style={{ paddingLeft: cb.depth * 20 }}>
      <button
        onClick={() => onToggle(cb.hash)}
        className={
          'shrink-0 transition-colors ' +
          (writeMode ? 'cursor-pointer hover:opacity-80' : 'cursor-default')
        }
        title={writeMode ? '切换' : '只读模式'}
        disabled={!writeMode}
      >
        {cb.checked ? (
          <CheckSquare2 size={16} className="text-green-400" />
        ) : (
          <Square size={16} className="text-slate-500" />
        )}
      </button>
      <span className={cb.checked ? 'text-slate-400 line-through' : 'text-slate-200'}>
        {cb.text}
      </span>
      <span className="text-xs text-slate-600 font-mono">#{cb.hash}</span>
    </div>
  );
}
