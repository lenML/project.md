import { Save } from 'lucide-react';

export default function CardDetailEditor({
  editName,
  editDesc,
  editBody,
  setName,
  setDesc,
  setBody,
  onSave,
  onCancel,
}: {
  editName: string;
  editDesc: string;
  editBody: string;
  setName: (v: string) => void;
  setDesc: (v: string) => void;
  setBody: (v: string) => void;
  onSave: () => void;
  onCancel: () => void;
}) {
  return (
    <div className="space-y-3">
      <input
        className="w-full bg-slate-800 border border-slate-600 rounded px-3 py-2 text-sm text-slate-100"
        value={editName}
        onChange={(e) => setName(e.target.value)}
        placeholder="名称"
      />
      <input
        className="w-full bg-slate-800 border border-slate-600 rounded px-3 py-2 text-sm text-slate-100"
        value={editDesc}
        onChange={(e) => setDesc(e.target.value)}
        placeholder="描述"
      />
      <textarea
        className="w-full bg-slate-800 border border-slate-600 rounded px-3 py-2 text-sm text-slate-100 font-mono min-h-32"
        value={editBody}
        onChange={(e) => setBody(e.target.value)}
        placeholder="正文 (markdown)"
      />
      <div className="flex gap-2">
        <button
          onClick={onSave}
          className="flex items-center gap-1.5 px-4 py-2 bg-indigo-600 hover:bg-indigo-500 rounded-lg text-sm font-medium transition-colors"
        >
          <Save size={16} />
          保存
        </button>
        <button
          onClick={onCancel}
          className="px-4 py-2 bg-slate-700 hover:bg-slate-600 rounded-lg text-sm transition-colors"
        >
          取消
        </button>
      </div>
    </div>
  );
}
