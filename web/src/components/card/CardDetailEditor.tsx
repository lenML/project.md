import { Save, Loader2 } from "lucide-react";

export default function CardDetailEditor({
  editName,
  editDesc,
  editBody,
  setName,
  setDesc,
  setBody,
  onSave,
  onCancel,
  saving,
}: {
  editName: string;
  editDesc: string;
  editBody: string;
  setName: (v: string) => void;
  setDesc: (v: string) => void;
  setBody: (v: string) => void;
  onSave: () => void;
  onCancel: () => void;
  saving?: boolean;
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
          disabled={saving}
          className={
            "flex items-center gap-1.5 px-4 py-2 rounded-lg text-sm font-medium transition-colors " +
            (saving
              ? "bg-indigo-500/50 text-indigo-200 cursor-not-allowed"
              : "bg-indigo-600 hover:bg-indigo-500 text-white")
          }
        >
          {saving ? <Loader2 size={16} className="animate-spin" /> : <Save size={16} />}
          {saving ? "保存中..." : "保存"}
        </button>
        <button
          onClick={onCancel}
          disabled={saving}
          className="px-4 py-2 bg-slate-700 hover:bg-slate-600 rounded-lg text-sm transition-colors"
        >
          取消
        </button>
      </div>
    </div>
  );
}
