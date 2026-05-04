import { useState } from 'react';
import type { Task, TaskCompletion } from '../../@types/tasks';
import { PenLine, CheckCircle2, Loader2 } from 'lucide-react';
import { cn } from '../../utils/utils';
import taskService from '../../services/taskService';

interface Props {
  task: Task;
  userId: string;
  existingCompletion?: TaskCompletion | null;
  onCompleted: (completion: TaskCompletion) => void;
}

export default function SignatureTask({ task, userId, existingCompletion, onCompleted }: Props) {
  const [typed, setTyped] = useState('');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const { signatureText, requireTypedConfirmation, confirmationPhrase = 'CONFIRMO' } = task.config;

  const alreadyDone = existingCompletion?.status === 'completed';

  const canConfirm = requireTypedConfirmation
    ? typed.trim().toUpperCase() === confirmationPhrase.toUpperCase()
    : true;

  const handleSign = async () => {
    if (!canConfirm) return;
    setSaving(true);
    setError(null);
    try {
      // Inicia a tarefa (ou reutiliza se já existe)
      let completion: TaskCompletion;
      try {
        completion = await taskService.startTask(task.id);
      } catch (e: any) {
        if (e?.status === 409) {
          // já foi iniciada, busca o status atual
          const existing = await taskService.getTaskStatus(userId, task.id);
          if (existing?.status === 'completed') { onCompleted(existing); return; }
          completion = existing!;
        } else throw e;
      }

      // Completa com a assinatura
      const finished = await taskService.completeTask(task.id, {
        signedText: requireTypedConfirmation ? typed.trim() : confirmationPhrase,
      });
      onCompleted(finished);
    } catch (e: any) {
      console.error('[SignatureTask] error', e);
      setError(e?.serverMessage ?? 'Erro ao registrar assinatura. Tente novamente.');
    } finally {
      setSaving(false);
    }
  };

  if (alreadyDone) {
    return (
      <div className="rounded-xl border border-green-200 bg-green-50 p-5 text-center">
        <CheckCircle2 size={32} className="mx-auto mb-2 text-green-500" />
        <p className="text-sm font-semibold text-green-700">Assinatura registrada</p>
        {existingCompletion?.completedAt && (
          <p className="mt-1 text-xs text-slate-400">
            Em {new Date(existingCompletion.completedAt).toLocaleString('pt-BR')}
          </p>
        )}
      </div>
    );
  }

  return (
    <div className="rounded-xl border border-slate-200 bg-white p-5 space-y-4">
      <div className="flex items-center gap-2 text-slate-700">
        <PenLine size={18} className="text-faktory-blue" />
        <span className="font-semibold text-sm">{task.title}</span>
      </div>

      {task.description && (
        <p className="text-sm text-slate-500">{task.description}</p>
      )}

      {/* Texto da declaração */}
      {signatureText && (
        <div className="rounded-lg bg-slate-50 border border-slate-200 p-4 text-sm text-slate-700 leading-relaxed whitespace-pre-wrap">
          {signatureText}
        </div>
      )}

      {/* Confirmação por digitação */}
      {requireTypedConfirmation && (
        <div>
          <label className="text-xs font-semibold text-slate-500 mb-1 block">
            Digite <span className="text-faktory-blue font-bold">{confirmationPhrase}</span> para confirmar
          </label>
          <input
            type="text"
            className={cn(
              'w-full rounded-lg border px-3 py-2 text-sm outline-none transition-colors',
              canConfirm && typed.length > 0
                ? 'border-green-400 bg-green-50/50'
                : 'border-slate-300 focus:border-faktory-blue',
            )}
            placeholder={confirmationPhrase}
            value={typed}
            onChange={e => setTyped(e.target.value)}
            disabled={saving}
          />
        </div>
      )}

      {error && <p className="text-xs text-red-600">{error}</p>}

      <button
        type="button"
        onClick={handleSign}
        disabled={!canConfirm || saving}
        className={cn(
          'w-full flex items-center justify-center gap-2 rounded-lg py-2.5 text-sm font-semibold transition-all',
          canConfirm
            ? 'bg-faktory-blue text-white hover:bg-faktory-blue/90'
            : 'bg-slate-100 text-slate-400 cursor-not-allowed',
        )}
      >
        {saving ? <Loader2 size={16} className="animate-spin" /> : <PenLine size={16} />}
        {saving ? 'Registrando...' : 'Confirmar Assinatura'}
      </button>
    </div>
  );
}
