import type { Task, TaskCompletion } from '../../@types/tasks';
import { CheckCircle2, PenLine, Image, ClipboardList, Clock, XCircle } from 'lucide-react';
import { cn } from '../../utils/utils';

interface Props {
  task: Task;
  completion?: TaskCompletion | null;
  onClick?: () => void;
}

const TYPE_LABEL: Record<string, string> = {
  questionnaire: 'Questionário',
  signature: 'Assinatura Digital',
  image_upload: 'Envio de Arquivo',
};

const TYPE_ICON: Record<string, React.ElementType> = {
  questionnaire: ClipboardList,
  signature: PenLine,
  image_upload: Image,
};

const STATUS_CONFIG = {
  completed: { label: 'Concluída', color: 'text-green-600', bg: 'bg-green-50', icon: CheckCircle2 },
  pending: { label: 'Aguardando revisão', color: 'text-amber-600', bg: 'bg-amber-50', icon: Clock },
  failed: { label: 'Reprovada', color: 'text-red-600', bg: 'bg-red-50', icon: XCircle },
  not_started: { label: 'Não iniciada', color: 'text-slate-500', bg: 'bg-slate-50', icon: null },
};

export default function TaskCard({ task, completion, onClick }: Props) {
  const Icon = TYPE_ICON[task.type] ?? ClipboardList;
  const rawStatus = completion?.status ?? 'not_started';
  const statusCfg = STATUS_CONFIG[rawStatus] ?? STATUS_CONFIG.not_started;
  const StatusIcon = statusCfg.icon;

  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        'w-full text-left flex items-start gap-3 rounded-xl border p-4 transition-all',
        'hover:border-faktory-blue hover:shadow-sm',
        completion?.status === 'completed' ? 'border-green-200 bg-green-50/40' : 'border-slate-200 bg-white',
        !onClick && 'cursor-default',
      )}
    >
      {/* Ícone tipo */}
      <div className={cn('mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-lg', statusCfg.bg)}>
        <Icon size={18} className={statusCfg.color} />
      </div>

      {/* Conteúdo */}
      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-2">
          <span className="text-xs font-medium uppercase tracking-wide text-slate-400">
            {TYPE_LABEL[task.type]}
          </span>
          {task.isRequired && (
            <span className="rounded bg-red-100 px-1.5 py-0.5 text-[10px] font-semibold text-red-600">
              Obrigatória
            </span>
          )}
        </div>
        <p className="mt-0.5 text-sm font-semibold text-slate-800 leading-snug">{task.title}</p>
        {task.description && (
          <p className="mt-1 text-xs text-slate-500 line-clamp-2">{task.description}</p>
        )}

        {/* Status */}
        <div className={cn('mt-2 flex items-center gap-1 text-xs font-medium', statusCfg.color)}>
          {StatusIcon && <StatusIcon size={12} />}
          <span>{statusCfg.label}</span>
          {completion?.status === 'completed' && completion.completionData?.score != null && (
            <span className="ml-1 text-slate-400">
              · {completion.completionData.score}/{completion.completionData.maxScore} pts
            </span>
          )}
          {completion?.status === 'pending' && completion.reviewNotes && (
            <span className="ml-1 text-slate-400">· {completion.reviewNotes}</span>
          )}
        </div>
      </div>
    </button>
  );
}
