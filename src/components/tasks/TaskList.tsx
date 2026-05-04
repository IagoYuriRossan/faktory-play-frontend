import { useEffect, useState, useCallback } from 'react';
import type { Task, TaskCompletion } from '../../@types/tasks';
import taskService from '../../services/taskService';
import TaskCard from './TaskCard';
import SignatureTask from './SignatureTask';
import QuestionnaireTask from './QuestionnaireTask';
import ImageUploadTask from './ImageUploadTask';
import { Loader2 } from 'lucide-react';

interface Props {
  taskIds: string[];
  userId: string;
  projectId: string;
  moduleId: string;
  etapaId: string;
  subetapaId?: string | null;
  trailId?: string;
  enrollmentId?: string;
  /** Se true, mostra só o card resumido sem o formulário de completamento */
  readOnly?: boolean;
  onTaskCompleted?: (taskId: string, completion: TaskCompletion) => void;
}

export default function TaskList({
  taskIds,
  userId,
  projectId,
  moduleId,
  etapaId,
  subetapaId,
  trailId,
  enrollmentId,
  readOnly = false,
  onTaskCompleted,
}: Props) {
  const [tasks, setTasks] = useState<Task[]>([]);
  const [completions, setCompletions] = useState<Record<string, TaskCompletion>>({});
  const [loading, setLoading] = useState(false);
  const [activeTaskId, setActiveTaskId] = useState<string | null>(null);

  const loadData = useCallback(async () => {
    if (!taskIds.length) return;
    setLoading(true);
    try {
      // Carrega todas as tarefas e seus status em paralelo
      const [fetchedTasks, userTaskCompletions] = await Promise.all([
        taskService.getTasksByLocation({ projectId, moduleId, etapaId, subetapaId }),
        taskService.getUserTasks(userId, { projectId }),
      ]);

      // Filtra apenas as tarefas dessa etapa/subetapa
      const filtered = fetchedTasks.filter(t => taskIds.includes(t.id));
      filtered.sort((a, b) => a.order - b.order);
      setTasks(filtered);

      // Mapeia completamentos por taskId
      const map: Record<string, TaskCompletion> = {};
      for (const c of userTaskCompletions) {
        map[c.taskId] = c;
      }
      setCompletions(map);
    } catch (e) {
      console.error('[TaskList] error loading tasks', e);
    } finally {
      setLoading(false);
    }
  }, [taskIds.join(','), userId, projectId, moduleId, etapaId, subetapaId]);

  useEffect(() => { loadData(); }, [loadData]);

  const handleCompleted = (task: Task, completion: TaskCompletion) => {
    setCompletions(prev => ({ ...prev, [task.id]: completion }));
    setActiveTaskId(null);
    onTaskCompleted?.(task.id, completion);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-6">
        <Loader2 size={18} className="animate-spin text-slate-400" />
      </div>
    );
  }

  if (!tasks.length) return null;

  return (
    <div className="space-y-3 mt-4">
      <p className="text-xs font-semibold uppercase tracking-widest text-slate-400">Tarefas</p>

      {tasks.map(task => {
        const completion = completions[task.id] ?? null;
        const isActive = activeTaskId === task.id;

        if (!readOnly && isActive) {
          // Exibe o formulário de completamento inline
          return (
            <div key={task.id}>
              {task.type === 'signature' && (
                <SignatureTask
                  task={task}
                  userId={userId}
                  existingCompletion={completion}
                  onCompleted={c => handleCompleted(task, c)}
                />
              )}
              {task.type === 'image_upload' && (
                <ImageUploadTask
                  task={task}
                  userId={userId}
                  existingCompletion={completion}
                  onSubmitted={c => handleCompleted(task, c)}
                />
              )}
              {task.type === 'questionnaire' && (
                <QuestionnaireTask
                  task={task}
                  userId={userId}
                  trailId={trailId}
                  enrollmentId={enrollmentId}
                  existingCompletion={completion}
                  onCompleted={c => handleCompleted(task, c)}
                />
              )}
            </div>
          );
        }

        return (
          <TaskCard
            key={task.id}
            task={task}
            completion={completion}
            onClick={
              !readOnly && completion?.status !== 'completed'
                ? () => setActiveTaskId(task.id)
                : undefined
            }
          />
        );
      })}
    </div>
  );
}
