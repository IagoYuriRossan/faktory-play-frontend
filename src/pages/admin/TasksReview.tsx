import { useState, useEffect } from 'react';
import { api } from '../../utils/api';
import TaskReviewPanel from '../../components/tasks/TaskReviewPanel';
import { ClipboardCheck, Loader2 } from 'lucide-react';

interface Project {
  id: string;
  title: string;
}

export default function TasksReview() {
  const [projects, setProjects] = useState<Project[]>([]);
  const [selectedProject, setSelectedProject] = useState<string>('');
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    setLoading(true);
    api.get<{ projects: Project[] }>('/api/projects')
      .then(res => {
        const list = Array.isArray(res) ? res : (res as any).projects ?? [];
        setProjects(list);
        if (list.length === 1) setSelectedProject(list[0].id);
      })
      .catch(console.error)
      .finally(() => setLoading(false));
  }, []);

  return (
    <div className="max-w-3xl mx-auto px-4 py-8">
      {/* Header */}
      <div className="flex items-center gap-3 mb-6">
        <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-amber-100">
          <ClipboardCheck size={20} className="text-amber-600" />
        </div>
        <div>
          <h1 className="text-xl font-bold text-slate-800">Revisão de Tarefas</h1>
          <p className="text-sm text-slate-400">Uploads e arquivos aguardando aprovação</p>
        </div>
      </div>

      {/* Seletor de projeto */}
      {loading ? (
        <div className="flex justify-center py-8">
          <Loader2 size={20} className="animate-spin text-slate-400" />
        </div>
      ) : (
        <>
          {projects.length > 1 && (
            <div className="mb-5">
              <label className="block text-xs font-semibold text-slate-500 mb-1">Projeto</label>
              <select
                className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-faktory-blue outline-none"
                value={selectedProject}
                onChange={e => setSelectedProject(e.target.value)}
              >
                <option value="">Selecione um projeto...</option>
                {projects.map(p => (
                  <option key={p.id} value={p.id}>{p.title}</option>
                ))}
              </select>
            </div>
          )}

          {selectedProject ? (
            <TaskReviewPanel projectId={selectedProject} />
          ) : (
            <div className="rounded-xl border border-slate-200 bg-slate-50 p-6 text-center">
              <p className="text-sm text-slate-400">Selecione um projeto para ver as tarefas pendentes</p>
            </div>
          )}
        </>
      )}
    </div>
  );
}
