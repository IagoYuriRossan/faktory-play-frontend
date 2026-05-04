import { api } from '../utils/api';

export async function createProjectQuestionnaire(projectId: string, payload: any) {
  return api.post<any>(`/api/projects/${encodeURIComponent(projectId)}/questionnaires`, payload);
}

export async function updateQuestionnaire(questionnaireId: string, payload: any) {
  await api.put<any>(`/api/questionnaires/${encodeURIComponent(questionnaireId)}`, payload);
  return getQuestionnaire(questionnaireId);
}

export async function deleteQuestionnaire(questionnaireId: string) {
  return api.delete<any>(`/api/questionnaires/${encodeURIComponent(questionnaireId)}`);
}

export async function getQuestionnaire(questionnaireId: string) {
  return api.get<any>(`/api/questionnaires/${encodeURIComponent(questionnaireId)}?t=${Date.now()}`);
}

export async function getTrailQuestionnaire(trailId: string, questionnaireId: string) {
  return api.get<any>(`/api/trails/${encodeURIComponent(trailId)}/questionnaires/${encodeURIComponent(questionnaireId)}?t=${Date.now()}`);
}

export async function updateTrailQuestionnaire(trailId: string, questionnaireId: string, payload: any) {
  await api.put<any>(`/api/trails/${encodeURIComponent(trailId)}/questionnaires/${encodeURIComponent(questionnaireId)}`, payload);
  return getTrailQuestionnaire(trailId, questionnaireId);
}

/**
 * Lista questionários acessíveis pelo usuário.
 * @param filters - Filtros opcionais (projectId, trailId, limit)
 */
export async function listQuestionnaires(filters?: {
  projectId?: string;
  trailId?: string;
  limit?: number;
}) {
  const params = new URLSearchParams();
  if (filters?.projectId) params.append('projectId', filters.projectId);
  if (filters?.trailId) params.append('trailId', filters.trailId);
  if (filters?.limit) params.append('limit', String(filters.limit));
  
  const qs = params.toString() ? `?${params}` : '';
  return api.get<Array<{
    id: string;
    title: string;
    description?: string;
    projectId?: string;
    trailId?: string;
    moduleId?: string | null;
    questionCount: number;
  }>>(`/api/questionnaires${qs}`);
}

/**
 * Duplica um questionário existente.
 * @param questionnaireId - ID do questionário a duplicar
 * @param options - Opções para o novo questionário (title, description, moduleId)
 */
export async function duplicateQuestionnaire(
  questionnaireId: string,
  options?: {
    title?: string;
    description?: string;
    moduleId?: string | null;
  }
) {
  return api.post<{ id: string; message: string; title: string }>(
    `/api/questionnaires/${encodeURIComponent(questionnaireId)}/duplicate`,
    options ?? {}
  );
}

export default { 
  createProjectQuestionnaire, 
  updateQuestionnaire, 
  deleteQuestionnaire, 
  getQuestionnaire,
  getTrailQuestionnaire,
  updateTrailQuestionnaire,
  listQuestionnaires,
  duplicateQuestionnaire
};
