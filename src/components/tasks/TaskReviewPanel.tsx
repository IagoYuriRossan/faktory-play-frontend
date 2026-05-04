import { useEffect, useState, useCallback } from 'react';
import type { TaskCompletion } from '../../@types/tasks';
import taskService from '../../services/taskService';
import { CheckCircle2, XCircle, Loader2, FileImage, ExternalLink, ChevronDown, ChevronUp } from 'lucide-react';
import { cn } from '../../utils/utils';

interface Props {
  projectId: string;
}

export default function TaskReviewPanel({ projectId }: Props) {
  const [completions, setCompletions] = useState<TaskCompletion[]>([]);
  const [loading, setLoading] = useState(false);
  const [expanded, setExpanded] = useState<string | null>(null);
  const [reviewing, setReviewing] = useState<Record<string, boolean>>({});
  const [notes, setNotes] = useState<Record<string, string>>({});
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    if (!projectId) return;
    setLoading(true);
    try {
      const data = await taskService.getPendingTaskCompletions(projectId);
      setCompletions(data);
    } catch (e) {
      console.error('[TaskReviewPanel] error', e);
    } finally {
      setLoading(false);
    }
  }, [projectId]);

  useEffect(() => { load(); }, [load]);

  const handleReview = async (completionId: string, taskId: string, approved: boolean) => {
    setReviewing(prev => ({ ...prev, [completionId]: true }));
    setError(null);
    try {
      const updated = await taskService.reviewTaskCompletion(taskId, completionId, {
        status: approved ? 'completed' : 'failed',
        notes: notes[completionId] ?? undefined,
      });
      setCompletions(prev => prev.filter(c => c.id !== completionId));
    } catch (e: any) {
      setError(e?.serverMessage ?? 'Erro ao revisar tarefa');
    } finally {
      setReviewing(prev => ({ ...prev, [completionId]: false }));
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-10">
        <Loader2 size={20} className="animate-spin text-slate-400" />
      </div>
    );
  }

  if (!completions.length) {
    return (
      <div className="rounded-xl border border-slate-200 bg-slate-50 p-6 text-center">
        <CheckCircle2 size={28} className="mx-auto mb-2 text-green-400" />
        <p className="text-sm text-slate-500">Nenhuma tarefa aguardando revisão</p>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {error && <p className="text-xs text-red-600">{error}</p>}

      {completions.map(c => {
        const isExpanded = expanded === c.id;
        const isReviewing = reviewing[c.id] ?? false;
        const data = c.completionData;

        return (
          <div key={c.id} className="rounded-xl border border-amber-200 bg-white overflow-hidden">
            {/* Header */}
            <button
              type="button"
              onClick={() => setExpanded(isExpanded ? null : c.id)}
              className="w-full flex items-center justify-between gap-3 p-4 text-left hover:bg-amber-50/50 transition-colors"
            >
              <div className="flex items-center gap-2 min-w-0">
                <FileImage size={16} className="text-amber-500 shrink-0" />
                <div className="min-w-0">
                  <p className="text-sm font-semibold text-slate-800 truncate">
                    {data?.fileName ?? 'Arquivo enviado'}
                  </p>
                  <p className="text-xs text-slate-400">
                    Usuário: {c.userId} · {c.startedAt ? new Date(c.startedAt).toLocaleString('pt-BR') : ''}
                  </p>
                </div>
              </div>
              {isExpanded ? <ChevronUp size={14} className="text-slate-400 shrink-0" /> : <ChevronDown size={14} className="text-slate-400 shrink-0" />}
            </button>

            {isExpanded && (
              <div className="border-t border-amber-100 p-4 space-y-3">
                {/* Pré-visualização */}
                {data?.uploadedFileUrl && (
                  <div className="rounded-lg border border-slate-200 bg-slate-50 p-3">
                    {data.fileMimeType?.startsWith('image/') ? (
                      <img
                        src={data.uploadedFileUrl}
                        alt={data.fileName}
                        className="max-h-48 rounded object-contain mx-auto"
                      />
                    ) : (
                      <a
                        href={data.uploadedFileUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="flex items-center gap-1.5 text-sm text-faktory-blue hover:underline"
                      >
                        <ExternalLink size={14} />
                        Ver arquivo: {data.fileName}
                      </a>
                    )}
                    {data.fileSize && (
                      <p className="mt-1 text-center text-xs text-slate-400">
                        {(data.fileSize / 1024 / 1024).toFixed(2)} MB
                      </p>
                    )}
                  </div>
                )}

                {/* Notas do revisor */}
                <textarea
                  className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-faktory-blue outline-none resize-none min-h-[60px]"
                  placeholder="Adicionar observação (opcional)..."
                  value={notes[c.id] ?? ''}
                  onChange={e => setNotes(prev => ({ ...prev, [c.id]: e.target.value }))}
                />

                {/* Botões aprovar/reprovar */}
                <div className="flex gap-2">
                  <button
                    type="button"
                    disabled={isReviewing}
                    onClick={() => handleReview(c.id, c.taskId, true)}
                    className={cn(
                      'flex-1 flex items-center justify-center gap-1.5 rounded-lg py-2 text-sm font-semibold transition-all',
                      'bg-green-600 text-white hover:bg-green-700 disabled:opacity-50',
                    )}
                  >
                    {isReviewing ? <Loader2 size={14} className="animate-spin" /> : <CheckCircle2 size={14} />}
                    Aprovar
                  </button>
                  <button
                    type="button"
                    disabled={isReviewing}
                    onClick={() => handleReview(c.id, c.taskId, false)}
                    className={cn(
                      'flex-1 flex items-center justify-center gap-1.5 rounded-lg py-2 text-sm font-semibold transition-all',
                      'bg-red-600 text-white hover:bg-red-700 disabled:opacity-50',
                    )}
                  >
                    {isReviewing ? <Loader2 size={14} className="animate-spin" /> : <XCircle size={14} />}
                    Reprovar
                  </button>
                </div>
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}
