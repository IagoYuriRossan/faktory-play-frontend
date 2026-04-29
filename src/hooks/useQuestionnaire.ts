import { useEffect, useState, useCallback } from 'react';
import { api } from '../utils/api';
import type { QuestionDTO } from '../@types/questionnaires';

interface QuestionnaireDTO {
  id: string;
  title: string;
  description?: string;
  questions: QuestionDTO[];
}

export function useQuestionnaire(questionnaireId?: string) {
  const [questionnaire, setQuestionnaire] = useState<QuestionnaireDTO | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<any>(null);

  const load = useCallback(async () => {
    if (!questionnaireId) return;
    setLoading(true);
    setError(null);
    try {
      console.debug('[useQuestionnaire] GET', `/api/questionnaires/${questionnaireId}`);
      const data = await api.get<QuestionnaireDTO>(`/api/questionnaires/${encodeURIComponent(questionnaireId)}`);
      console.debug('[useQuestionnaire] RESPONSE', data);
      setQuestionnaire(data);
    } catch (err) {
      console.error('[useQuestionnaire] ERROR', err);
      setError(err);
    } finally {
      setLoading(false);
    }
  }, [questionnaireId]);

  useEffect(() => {
    load();
  }, [load]);

  return { questionnaire, loading, error, reload: load };
}

export async function startAttempt(
  questionnaireId: string,
  params?: { trailId?: string; enrollmentId?: string; moduleId?: string }
) {
  console.debug('[useQuestionnaire] POST startAttempt', `/api/questionnaires/${questionnaireId}/attempts`, params);
  const body = params || {};
  const res = await api.post<{ attemptId: string; questionnaireId: string; startedAt: string }>(
    `/api/questionnaires/${encodeURIComponent(questionnaireId)}/attempts`,
    body
  );
  console.debug('[useQuestionnaire] startAttempt RESPONSE', res);
  return res;
}

export async function submitAttempt(
  attemptId: string,
  answers: any[],
  params?: { enrollmentId?: string; trailId?: string }
) {
  console.debug('[useQuestionnaire] POST submitAttempt', `/api/attempts/${attemptId}/submit`, { answers, params });
  const body: any = { answers };
  if (params?.enrollmentId) body.enrollmentId = params.enrollmentId;
  if (params?.trailId) body.trailId = params.trailId;
  try {
    const res = await api.post<{
      attemptId: string;
      submittedAt: string;
      score: number;
      maxScore: number;
      perQuestion: Array<{ questionId: string; isCorrect: boolean; pointsAwarded: number }>;
    }>(`/api/attempts/${encodeURIComponent(attemptId)}/submit`, body);
    console.debug('[useQuestionnaire] submitAttempt RESPONSE', res);
    return res;
  } catch (e: any) {
    // If backend reports conflict (already submitted), try to fetch the attempt state and return it
    try {
      if (e && (e.status === 409 || (e.serverMessage && /already submitted/i.test(String(e.serverMessage))))) {
        const existing = await api.get<any>(`/api/attempts/${encodeURIComponent(attemptId)}`);
        console.debug('[useQuestionnaire] submitAttempt already submitted, fetched existing', existing);
        return existing;
      }
    } catch (inner) {
      console.warn('Failed to recover attempt after submit conflict:', inner);
    }
    throw e;
  }
}
