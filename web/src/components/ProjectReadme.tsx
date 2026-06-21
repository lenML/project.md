import { useStore } from '../stores/useStore';
import { Edit3, Save, X } from 'lucide-react';
import { useState } from 'react';

export default function ProjectReadme() {
  const projects = useStore((s) => s.projects);
  const view = useStore((s) => s.view);
  const writeMode = useStore((s) => s.writeMode);
  const updateReadme = useStore((s) => s.updateReadme);
  const found = projects.find((p) => p.name === view.project);
  const [editing, setEditing] = useState(false);
  const [text, setText] = useState('');

  if (!found) return null;
  const project = found;

  function startEdit() {
    setText(project.readme || '');
    setEditing(true);
  }

  async function save() {
    if (!view.project) return;
    await updateReadme(view.project, text || '# ' + view.project);
    setEditing(false);
  }

  const parsedBody = (() => {
    if (!project.readme) return '(empty)';
    const trimmed = project.readme.trimStart();
    if (trimmed.startsWith('---')) {
      const endIdx = trimmed.indexOf('\n---', 3);
      if (endIdx !== -1) return trimmed.slice(endIdx + 4).trim();
    }
    return project.readme;
  })();

  return (
    <div className="h-full overflow-y-auto p-6">
      <div className="flex items-center justify-between mb-4">
        <h1 className="text-xl font-bold text-slate-100">{project.name}</h1>
        {writeMode && !editing && (
          <button
            onClick={startEdit}
            className="flex items-center gap-1 text-xs text-slate-400 hover:text-indigo-400 transition-colors"
          >
            <Edit3 size={14} /> 编辑
          </button>
        )}
      </div>

      {editing ? (
        <div className="space-y-3">
          <textarea
            className="w-full bg-slate-800 border border-slate-600 rounded-lg px-4 py-3 text-sm text-slate-200 font-mono min-h-64 focus:outline-none focus:border-indigo-500/50"
            value={text}
            onChange={(e) => setText(e.target.value)}
            placeholder="# project description"
          />
          <div className="flex gap-2">
            <button
              onClick={save}
              className="flex items-center gap-1.5 px-4 py-2 bg-indigo-600 hover:bg-indigo-500 rounded-lg text-sm font-medium transition-colors"
            >
              <Save size={16} /> 保存
            </button>
            <button
              onClick={() => setEditing(false)}
              className="flex items-center gap-1.5 px-4 py-2 bg-slate-700 hover:bg-slate-600 rounded-lg text-sm transition-colors"
            >
              <X size={16} /> 取消
            </button>
          </div>
        </div>
      ) : (
        <pre className="text-sm text-slate-300 whitespace-pre-wrap font-sans leading-relaxed">
          {parsedBody}
        </pre>
      )}
    </div>
  );
}
