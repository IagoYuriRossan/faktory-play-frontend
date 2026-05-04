import { useState } from 'react';
import type { Task, TaskCompletion } from '../../@types/tasks';
import { useQuestionnaire, startAttempt, submitAttempt } from '../../hooks/useQuestionnaire';
import { CheckCircle2, ClipboardList, Loader2, ChevronDown, ChevronUp } from 'lucide-react';
import { cn } from '../../utils/utils';
import taskService from '../../services/taskService';

interface Props {
  task: Task;
  userId?: string;
  trailId?: string;
  enrollmentId?: string;
  existingCompletion?: TaskCompletion | null;
  onCompleted: (completion: TaskCompletion) => void;
}

export default function QuestionnaireTask({
  task,
  userId,
  trailId,
  enrollmentId,
  existingCompletion,
  onCompleted,
}: Props) {
  const questionnaireId = task.config.questionnaireId;
  const { questionnaire, loading: qLoading } = useQuestionnaire(questionnaireId);

  const [open, setOpen] = useState(false);
  const [attemptId, setAttemptId] = useState<string | null>(null);
  const [answers, setAnswers] = useState<Record<string, any>>({});
  const [starting, setStarting] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [result, setResult] = useState<any>(null);
  const [error, setError] = useState<string | null>(null);

  const alreadyDone = existingCompletion?.status === 'completed';

  const handleStart = async () => {
    if (!questionnaireId) return;
    setStarting(true);
    setError(null);
    try {
      const res = await startAttempt(questionnaireId, { trailId, enrollmentId, moduleId: task.moduleId });
      setAttemptId(res.attemptId);
    } catch (e: any) {
      setError(e?.serverMessage ?? 'Erro ao iniciar questionário');
    } finally {
      setStarting(false);
    }
  };

  const handleAnswer = (questionId: string, optionId: string, type: string) => {
    setAnswers(prev => {
      const cur = { ...prev };
      if (type === 'single_choice') {
        cur[questionId] = [optionId];
      } else if (type === 'multiple_choice') {
        const existing: string[] = cur[questionId] ?? [];
        cur[questionId] = existing.includes(optionId)
          ? existing.filter(id => id !== optionId)
          : [...existing, optionId];
      } else {
        cur[questionId] = optionId;
      }
      return cur;
    });
  };

  const handleSubmit = async () => {
    if (!attemptId || !questionnaireId) return;
    setSubmitting(true);
    setError(null);
    try {
      const formattedAnswers = Object.entries(answers).map(([questionId, val]) => {
        if (typeof val === 'string' && !Array.isArray(val)) {
          const question = questionnaire?.questions.find(q => q.id === questionId);
          if (question?.type === 'open') return { questionId, textAnswer: val };
          return { questionId, selectedOptionIds: [val] };
        }
        return { questionId, selectedOptionIds: val };
      });

      const res = await submitAttempt(attemptId, formattedAnswers, { enrollmentId, trailId });
      setResult(res);

      // Registra o completamento da tarefa
      const completion = await taskService.completeTask(task.id, {
        attemptId,
        score: res.score,
        maxScore: res.maxScore,
      });
      onCompleted(completion);

      // Notifica outros componentes sobre atualização de progresso
      if (task.projectId) {
        window.dispatchEvent(new CustomEvent('project:progress-updated', { detail: { projectId: task.projectId } }));
      }
    } catch (e: any) {
      setError(e?.serverMessage ?? 'Erro ao submeter questionário');
    } finally {
      setSubmitting(false);
    }
  };

  if (!questionnaireId) {
    return <p className="text-xs text-red-500">Tarefa mal configurada: questionnaireId ausente.</p>;
  }

  if (alreadyDone) {
    return (
      <div className="rounded-xl border border-green-200 bg-green-50 p-4 flex items-center gap-3">
        <CheckCircle2 size={22} className="text-green-500 shrink-0" />
        <div>
          <p className="text-sm font-semibold text-green-700">{task.title} — Concluído</p>
          {existingCompletion?.completionData?.score != null && (
            <p className="text-xs text-slate-500">
              Pontuação: {existingCompletion.completionData.score}/{existingCompletion.completionData.maxScore}
            </p>
          )}
        </div>
      </div>
    );
  }

  return (
    <div className="rounded-xl border border-slate-200 bg-white overflow-hidden">
      {/* Header colapsável */}
      <button
        type="button"
        onClick={() => setOpen(o => !o)}
        className="w-full flex items-center justify-between gap-3 p-4 text-left hover:bg-slate-50 transition-colors"
      >
        <div className="flex items-center gap-2">
          <ClipboardList size={18} className="text-faktory-blue shrink-0" />
          <span className="text-sm font-semibold text-slate-800">{task.title}</span>
        </div>
        {open ? <ChevronUp size={16} className="text-slate-400" /> : <ChevronDown size={16} className="text-slate-400" />}
      </button>

      {open && (
        <div className="border-t border-slate-100 p-4 space-y-4">
          {task.description && <p className="text-sm text-slate-500">{task.description}</p>}

          {qLoading && (
            <div className="flex items-center justify-center py-6">
              <Loader2 size={20} className="animate-spin text-slate-400" />
            </div>
          )}

          {result ? (
            <div className="rounded-lg bg-green-50 border border-green-200 p-4 text-center">
              <CheckCircle2 size={28} className="mx-auto mb-2 text-green-500" />
              <p className="text-sm font-semibold text-green-700">Enviado com sucesso!</p>
              <p className="text-xs text-slate-500 mt-1">
                Pontuação: {result.score ?? '—'}/{result.maxScore ?? '—'}
              </p>
            </div>
          ) : !attemptId ? (
            <button
              type="button"
              onClick={handleStart}
              disabled={starting || qLoading}
              className="w-full flex items-center justify-center gap-2 rounded-lg bg-faktory-blue py-2.5 text-sm font-semibold text-white hover:bg-faktory-blue/90 disabled:opacity-50 transition-all"
            >
              {starting ? <Loader2 size={16} className="animate-spin" /> : <ClipboardList size={16} />}
              {starting ? 'Iniciando...' : 'Iniciar Questionário'}
            </button>
          ) : (
            <div className="space-y-4">
              {questionnaire?.questions.map(q => (
                <div key={q.id} className="space-y-2">
                  <p className="text-sm font-medium text-slate-700">
                    {q.text}
                    {q.points > 0 && <span className="ml-1 text-xs text-slate-400">({q.points} pts)</span>}
                  </p>

                  {q.type === 'open' ? (
                    <textarea
                      className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-faktory-blue outline-none resize-y min-h-[80px]"
                      placeholder="Sua resposta..."
                      value={answers[q.id] ?? ''}
                      onChange={e => handleAnswer(q.id, e.target.value, 'open')}
                    />
                  ) : (
                    <div className="space-y-1.5">
                      {q.options?.map(opt => {
                        const selected = q.type === 'multiple_choice'
                          ? (answers[q.id] ?? []).includes(opt.id)
                          : answers[q.id]?.[0] === opt.id || answers[q.id] === opt.id;
                        return (
                          <label
                            key={opt.id}
                            className={cn(
                              'flex items-center gap-2.5 rounded-lg border px-3 py-2.5 cursor-pointer text-sm transition-all',
                              selected ? 'border-faktory-blue bg-blue-50 text-faktory-blue' : 'border-slate-200 hover:border-slate-300',
                            )}
                          >
                            <input
                              type={q.type === 'multiple_choice' ? 'checkbox' : 'radio'}
                              className="accent-faktory-blue"
                              checked={selected}
                              onChange={() => handleAnswer(q.id, opt.id, q.type)}
                            />
                            {opt.text}
                          </label>
                        );
                      })}
                    </div>
                  )}
                </div>
              ))}

              {error && <p className="text-xs text-red-600">{error}</p>}

              <button
                type="button"
                onClick={handleSubmit}
                disabled={submitting}
                className="w-full flex items-center justify-center gap-2 rounded-lg bg-faktory-blue py-2.5 text-sm font-semibold text-white hover:bg-faktory-blue/90 disabled:opacity-50 transition-all"
              >
                {submitting ? <Loader2 size={16} className="animate-spin" /> : null}
                {submitting ? 'Enviando...' : 'Enviar Respostas'}
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
