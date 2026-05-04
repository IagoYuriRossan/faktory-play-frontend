import { api } from '../utils/api';
import type {
  Task,
  TaskCompletion,
  TaskStatus,
  TaskType,
  SignatureCompletionPayload,
  ImageUploadCompletionPayload,
  TaskReviewPayload,
} from '../@types/tasks';

// ── Admin — CRUD de Tarefas ──────────────────────────────────────────────────

/**
 * Cria uma tarefa vinculada a uma etapa ou subetapa.
 * Quando subetapaId for fornecido, a tarefa fica dentro da subetapa.
 */
export async function createTask(params: {
  projectId: string;
  moduleId: string;
  etapaId: string;
  subetapaId?: string | null;
  task: Omit<Task, 'id' | 'projectId' | 'moduleId' | 'etapaId' | 'subetapaId' | 'createdBy' | 'createdAt' | 'updatedAt'>;
}): Promise<Task> {
  const { projectId, moduleId, etapaId, subetapaId, task } = params;
  const base = `/api/projects/${encodeURIComponent(projectId)}/modules/${encodeURIComponent(moduleId)}/etapas/${encodeURIComponent(etapaId)}`;
  const url = subetapaId
    ? `${base}/subetapas/${encodeURIComponent(subetapaId)}/tasks`
    : `${base}/tasks`;
  return api.post<Task>(url, task);
}

/** Atualiza campos de uma tarefa existente. */
export async function updateTask(taskId: string, updates: Partial<Omit<Task, 'id' | 'createdBy' | 'createdAt'>>): Promise<Task> {
  return api.put<Task>(`/api/tasks/${encodeURIComponent(taskId)}`, updates);
}

/** Remove uma tarefa. */
export async function deleteTask(taskId: string): Promise<void> {
  await api.delete<void>(`/api/tasks/${encodeURIComponent(taskId)}`);
}

/** Lista as tarefas de uma etapa (ou subetapa). */
export async function getTasksByLocation(params: {
  projectId: string;
  moduleId: string;
  etapaId: string;
  subetapaId?: string | null;
}): Promise<Task[]> {
  const { projectId, moduleId, etapaId, subetapaId } = params;
  const base = `/api/projects/${encodeURIComponent(projectId)}/modules/${encodeURIComponent(moduleId)}/etapas/${encodeURIComponent(etapaId)}`;
  const url = subetapaId
    ? `${base}/subetapas/${encodeURIComponent(subetapaId)}/tasks`
    : `${base}/tasks`;
  return api.get<Task[]>(url);
}

/** Busca uma tarefa pelo ID. */
export async function getTask(taskId: string): Promise<Task> {
  return api.get<Task>(`/api/tasks/${encodeURIComponent(taskId)}`);
}

// ── Aluno — Completar Tarefas ────────────────────────────────────────────────

/**
 * Inicia uma tarefa para o usuário logado.
 * Retorna o registro de completamento inicial (status: pending).
 */
export async function startTask(taskId: string, params?: {
  trailId?: string;
  enrollmentId?: string;
}): Promise<TaskCompletion> {
  return api.post<TaskCompletion>(`/api/tasks/${encodeURIComponent(taskId)}/start`, params ?? {});
}

/**
 * Completa uma tarefa auto-corrigida (questionário ou assinatura).
 * Para questionários, o backend linka com o attempt correspondente.
 */
export async function completeTask(
  taskId: string,
  completionData: SignatureCompletionPayload | { attemptId: string; score?: number; maxScore?: number }
): Promise<TaskCompletion> {
  return api.post<TaskCompletion>(`/api/tasks/${encodeURIComponent(taskId)}/complete`, completionData);
}

/**
 * Submete uma tarefa que requer revisão manual (image_upload).
 * O status ficará 'pending' até o admin revisar.
 */
export async function submitTask(
  taskId: string,
  completionData: ImageUploadCompletionPayload
): Promise<TaskCompletion> {
  return api.post<TaskCompletion>(`/api/tasks/${encodeURIComponent(taskId)}/submit`, completionData);
}

/** Retorna o status atual de uma tarefa para um usuário específico. */
export async function getTaskStatus(userId: string, taskId: string): Promise<TaskCompletion | null> {
  try {
    return await api.get<TaskCompletion>(`/api/users/${encodeURIComponent(userId)}/tasks/${encodeURIComponent(taskId)}/status`);
  } catch (e: any) {
    if (e?.status === 404) return null;
    throw e;
  }
}

/**
 * Lista os completamentos de tarefas de um usuário, com filtros opcionais.
 */
export async function getUserTasks(
  userId: string,
  filters?: {
    projectId?: string;
    status?: TaskStatus;
    type?: TaskType;
  }
): Promise<TaskCompletion[]> {
  const params = new URLSearchParams();
  if (filters?.projectId) params.append('projectId', filters.projectId);
  if (filters?.status) params.append('status', filters.status);
  if (filters?.type) params.append('type', filters.type);
  const qs = params.toString() ? `?${params}` : '';
  return api.get<TaskCompletion[]>(`/api/users/${encodeURIComponent(userId)}/tasks${qs}`);
}

// ── Admin — Revisão de Tarefas ───────────────────────────────────────────────

/** Lista tarefas de imagem/upload aguardando revisão de um projeto. */
export async function getPendingTaskCompletions(projectId: string): Promise<TaskCompletion[]> {
  return api.get<TaskCompletion[]>(`/api/projects/${encodeURIComponent(projectId)}/tasks/pending`);
}

/**
 * Aprova ou reprova o completamento de uma tarefa.
 * Usado por admins para tarefas do tipo image_upload.
 */
export async function reviewTaskCompletion(
  taskId: string,
  completionId: string,
  review: TaskReviewPayload
): Promise<TaskCompletion> {
  return api.put<TaskCompletion>(
    `/api/tasks/${encodeURIComponent(taskId)}/completions/${encodeURIComponent(completionId)}/review`,
    review
  );
}

/** Histórico de completamentos de uma tarefa. */
export async function getTaskCompletions(taskId: string): Promise<TaskCompletion[]> {
  return api.get<TaskCompletion[]>(`/api/tasks/${encodeURIComponent(taskId)}/completions`);
}

const taskService = {
  // Admin CRUD
  createTask,
  updateTask,
  deleteTask,
  getTasksByLocation,
  getTask,
  // Aluno
  startTask,
  completeTask,
  submitTask,
  getTaskStatus,
  getUserTasks,
  // Admin revisão
  getPendingTaskCompletions,
  reviewTaskCompletion,
  getTaskCompletions,
};

export default taskService;
