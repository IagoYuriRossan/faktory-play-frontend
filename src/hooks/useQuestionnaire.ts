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

export async function startAttempt(questionnaireId: string) {
  console.debug('[useQuestionnaire] POST startAttempt', `/api/questionnaires/${questionnaireId}/attempts`);
  const res = await api.post<{ attemptId: string; questionnaireId: string; startedAt: string }>(
    `/api/questionnaires/${encodeURIComponent(questionnaireId)}/attempts`,
    {}
  );
  console.debug('[useQuestionnaire] startAttempt RESPONSE', res);
  return res;
}

export async function submitAttempt(attemptId: string, answers: any[]) {
  console.debug('[useQuestionnaire] POST submitAttempt', `/api/attempts/${attemptId}/submit`, { answers });
  const res = await api.post<{
    attemptId: string;
    submittedAt: string;
    score: number;
    maxScore: number;
    perQuestion: Array<{ questionId: string; isCorrect: boolean; pointsAwarded: number }>;
  }>(`/api/attempts/${encodeURIComponent(attemptId)}/submit`, { answers });
  console.debug('[useQuestionnaire] submitAttempt RESPONSE', res);
  return res;
}
