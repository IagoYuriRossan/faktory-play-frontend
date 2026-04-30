import { api } from '../utils/api';

function normalizeQuestions(questions: any[]) {
  if (!Array.isArray(questions)) return questions;
  return questions.map(q => {
    const copy: any = { ...q };
    if (copy.points !== undefined && copy.points !== null) {
      // accept number, numeric string, or object { value }
      if (typeof copy.points === 'number') {
        // ok
      } else if (typeof copy.points === 'string' && !isNaN(Number(copy.points))) {
        copy.points = Number(copy.points);
      } else if (typeof copy.points === 'object' && copy.points !== null && !isNaN(Number(copy.points.value))) {
        copy.points = Number(copy.points.value);
      } else {
        // fallback: remove invalid points to let backend apply default/validation
        delete copy.points;
      }
    }
    return copy;
  });
}

export async function createProjectQuestionnaire(projectId: string, payload: any) {
  const body = { ...payload, questions: normalizeQuestions(payload.questions || []) };
  return api.post<any>(`/api/projects/${encodeURIComponent(projectId)}/questionnaires`, body);
}

export async function updateQuestionnaire(questionnaireId: string, payload: any) {
  const body = { ...payload, questions: normalizeQuestions(payload.questions || []) };
  return api.put<any>(`/api/questionnaires/${encodeURIComponent(questionnaireId)}`, body);
}

export async function deleteQuestionnaire(questionnaireId: string) {
  return api.delete<any>(`/api/questionnaires/${encodeURIComponent(questionnaireId)}`);
}

export default { createProjectQuestionnaire, updateQuestionnaire, deleteQuestionnaire };
