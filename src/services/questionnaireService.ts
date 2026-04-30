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

export default { 
  createProjectQuestionnaire, 
  updateQuestionnaire, 
  deleteQuestionnaire, 
  getQuestionnaire,
  getTrailQuestionnaire,
  updateTrailQuestionnaire
};
