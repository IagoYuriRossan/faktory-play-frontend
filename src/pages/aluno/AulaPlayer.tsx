import { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { api } from '../../utils/api';
import { useAuthStore } from '../../hooks/store/useAuthStore';
import { useQuestionnaire, startAttempt, submitAttempt } from '../../hooks/useQuestionnaire';
import { Trail, Lesson, Enrollment } from '../../@types';
import TaskList from '../../components/tasks/TaskList';
import {
  ArrowLeft,
  CheckCircle2,
  HelpCircle,
  ChevronDown,
  ChevronRight,
  Loader2,
  Calendar,
  Clock,
  LayoutDashboard,
  ClipboardList
} from 'lucide-react';
import { cn } from '../../utils/utils';

function QuestionnaireRunner({
  questionnaireId,
  projectId,
  userId,
  trailId,
  enrollmentId,
  moduleId,
  onClose,
  onSubmitted,
}: {
  questionnaireId: string;
  projectId?: string;
  userId?: string;
  trailId?: string;
  enrollmentId?: string;
  moduleId?: string;
  onClose: () => void;
  onSubmitted?: (res: any) => void;
}) {
  const { questionnaire, loading: qLoading, error } = useQuestionnaire(questionnaireId);
  const [localAttemptId, setLocalAttemptId] = useState<string | null>(null);
  const [localAnswers, setLocalAnswers] = useState<Record<string, any>>({});
  const [starting, setStarting] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [result, setResult] = useState<any>(null);
  const [validationError, setValidationError] = useState<string | null>(null);
  const [missingQuestions, setMissingQuestions] = useState<string[]>([]);
  const questionRefs = useRef<Record<string, HTMLDivElement | null>>({});

  const handleStart = async () => {
    setStarting(true);
    try {
      const res = await startAttempt(questionnaireId, {
        trailId,
        enrollmentId,
        moduleId,
      });
      setLocalAttemptId(res.attemptId);
      // focus first question after starting
      setTimeout(() => {
        const firstId = questionnaire?.questions?.[0]?.id;
        const el = firstId ? questionRefs.current[firstId] : null;
        if (el) {
          try { el.scrollIntoView({ behavior: 'smooth', block: 'center' }); } catch {}
          const input = el.querySelector('textarea, input[type="radio"], input[type="checkbox"]') as HTMLElement | null;
          if (input) input.focus();
        }
      }, 60);
    } catch (e) {
      console.error('start attempt error', e);
    } finally {
      setStarting(false);
    }
  };

  const handleChangeOption = (questionId: string, optionId: string, type: string) => {
    setLocalAnswers(prev => {
      const cur = { ...prev };
      if (type === 'single_choice') {
        cur[questionId] = [optionId];
      } else if (type === 'multiple_choice') {
        const arr: string[] = Array.isArray(cur[questionId]) ? [...cur[questionId]] : [];
        if (arr.includes(optionId)) {
          cur[questionId] = arr.filter(a => a !== optionId);
        } else {
          arr.push(optionId);
          cur[questionId] = arr;
        }
      }
      return cur;
    });
  };

  const handleChangeText = (questionId: string, text: string) => {
    setLocalAnswers(prev => ({ ...prev, [questionId]: text }));
  };

  const validateAllAnswered = () => {
    if (!questionnaire || !questionnaire.questions) return true;
    const missing: string[] = [];
    questionnaire.questions.forEach((q: any) => {
      const val = localAnswers[q.id];
      if (q.type === 'open') {
        if (!val || (typeof val === 'string' && val.trim() === '')) missing.push(q.id);
      } else if (q.type === 'single_choice') {
        const has = Array.isArray(val) ? val.length > 0 : !!val;
        if (!has) missing.push(q.id);
      } else if (q.type === 'multiple_choice') {
        const has = Array.isArray(val) ? val.length > 0 : !!val;
        if (!has) missing.push(q.id);
      }
    });
    setMissingQuestions(missing);
    setValidationError(missing.length ? 'Por favor responda todas as perguntas antes de enviar.' : null);
    if (missing.length) {
      setTimeout(() => {
        const first = questionRefs.current[missing[0]];
        if (first) {
          try { first.scrollIntoView({ behavior: 'smooth', block: 'center' }); } catch {}
          const input = first.querySelector('textarea, input[type="radio"], input[type="checkbox"]') as HTMLElement | null;
          if (input) input.focus();
        }
      }, 60);
    }
    return missing.length === 0;
  };

  const handleSubmit = async () => {
    if (!localAttemptId) return;
    if (!validateAllAnswered()) return;
    setSubmitting(true);
    try {
      const answers = Object.keys(localAnswers).map(qid => {
        const val = localAnswers[qid];
        if (Array.isArray(val)) return { questionId: qid, selectedOptionIds: val };
        const isString = typeof val === 'string';
        if (isString) return { questionId: qid, textAnswer: val };
        return { questionId: qid, selectedOptionIds: val };
      });
      const res = await submitAttempt(localAttemptId, answers, { enrollmentId, trailId });
      const enriched = { ...res };
      if (questionnaire && questionnaire.questions) {
        enriched.perQuestion = (enriched.perQuestion || []).map((pq: any) => {
          const q = questionnaire.questions.find((x: any) => x.id === pq.questionId);
          if (q && q.type === 'open') {
            return { ...pq, pendingCorrection: true };
          }
          return pq;
        });
      }
      setResult(enriched);
      try {
        if (projectId && userId) {
          await api.get(`/api/projects/${encodeURIComponent(projectId)}/users/${encodeURIComponent(userId)}/progress`);
          await api.get(`/api/projects/${encodeURIComponent(projectId)}/progress`);
          try { window.dispatchEvent(new CustomEvent('project:progress-updated', { detail: { projectId } })); } catch (e) { /* ignore */ }
        }
      } catch (e) {
        // ignore errors on refresh
      }
      if (onSubmitted) onSubmitted(enriched);
    } catch (e) {
      console.error('submit error', e);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="bg-white rounded-lg border border-slate-200 p-4 mt-4">
      {qLoading && <div>Carregando questionário...</div>}
      {error && <div className="text-red-500">Erro ao carregar o questionário.</div>}
      {questionnaire && (
        <div>
          <div className="flex items-center justify-between mb-3">
            <div>
              <div className="font-bold">{questionnaire.title}</div>
              <div className="text-xs text-slate-500">{questionnaire.description}</div>
            </div>
            <div className="text-xs text-slate-400">{localAttemptId ? 'Tentativa iniciada' : 'Pronto'}</div>
          </div>

          {!localAttemptId && (
            <div className="flex gap-2">
              <button onClick={handleStart} className="bg-faktory-blue text-white px-4 py-2 rounded font-bold" disabled={starting}>
                {starting ? 'Iniciando...' : 'Começar'}
              </button>
              <button onClick={onClose} className="px-4 py-2 rounded border">Fechar</button>
            </div>
          )}

          {localAttemptId && (
            <div className="mt-4 space-y-4">
              {questionnaire.questions.map((q: any) => {
                const per = result?.perQuestion?.find((p: any) => p.questionId === q.id) || null;
                const missing = missingQuestions.includes(q.id);
                const statusClass = per ? (per.isCorrect ? 'border-green-200 bg-green-50' : (per.pendingCorrection ? 'border-amber-200 bg-amber-50' : 'border-red-200 bg-red-50')) : (missing ? 'border-red-100 bg-red-50' : 'bg-slate-50');
                return (
                  <div key={q.id} ref={el => { questionRefs.current[q.id] = el; }} className={`p-3 border rounded ${statusClass}`}>
                    <div className="font-medium mb-2 flex items-center gap-2">
                      {per ? (per.isCorrect ? <span className="text-green-600">✔</span> : (per.pendingCorrection ? <span className="text-amber-600">⏳</span> : <span className="text-red-600">✖</span>)) : (missing ? <span className="text-red-500">⚠</span> : null)}
                      <div>{q.text}</div>
                    </div>
                    {q.type === 'open' && (
                      <textarea
                        className="w-full p-2 border rounded"
                        value={localAnswers[q.id] || ''}
                        onChange={e => handleChangeText(q.id, e.target.value)}
                        disabled={!!result}
                      />
                    )}
                    {(q.type === 'single_choice' || q.type === 'multiple_choice') && (
                      <div className="space-y-2">
                        {q.options?.map((opt: any) => (
                          <label key={opt.id} className="flex items-center gap-2">
                            <input
                              type={q.type === 'single_choice' ? 'radio' : 'checkbox'}
                              name={q.id}
                              checked={Array.isArray(localAnswers[q.id]) ? localAnswers[q.id].includes(opt.id) : localAnswers[q.id]?.[0] === opt.id}
                              onChange={() => handleChangeOption(q.id, opt.id, q.type)}
                              disabled={!!result}
                            />
                            <span>{opt.text}</span>
                            {per && per.selectedOptionIds && Array.isArray(per.selectedOptionIds) && (
                              <span className="ml-2 text-sm text-slate-600">{per.selectedOptionIds.includes(opt.id) ? (per.isCorrect ? '✔️' : '❌') : ''}</span>
                            )}
                          </label>
                        ))}
                      </div>
                    )}
                    {per && (
                      <div className="mt-2 text-sm">
                        {per.pendingCorrection ? <span className="text-amber-700">Pendente de correção</span> : (
                          per.isCorrect ? <span className="text-green-700">Correta — +{per.pointsAwarded} pts</span> : <span className="text-red-700">Incorreta — +{per.pointsAwarded} pts</span>
                        )}
                      </div>
                    )}
                  </div>
                );
              })}

              <div className="flex items-center gap-2">
                <div className="flex flex-col">
                  {validationError && <div className="text-red-600 text-sm mb-2">{validationError}</div>}
                  <button onClick={handleSubmit} disabled={submitting || !!result} className="bg-green-600 text-white px-4 py-2 rounded font-bold">
                    {submitting ? 'Enviando...' : (result ? 'Enviado' : 'Enviar respostas')}
                  </button>
                </div>
                <button onClick={onClose} className="px-4 py-2 rounded border">Fechar</button>
              </div>
            </div>
          )}

          {result && (
            <div className="mt-4 p-3 bg-white border rounded">
              <div className="font-bold">Resultado</div>
              <div className="text-sm">Score: {result.score} / {result.maxScore}</div>
              {result.perQuestion && Array.isArray(result.perQuestion) && (
                <div className="mt-2">
                  <div className="font-medium">Detalhes por questão:</div>
                  <ul className="text-sm list-disc ml-5">
                    {result.perQuestion.map((pq: any) => (
                      <li key={pq.questionId}>
                        Q: {pq.questionId} — {pq.isCorrect ? 'Correta' : 'Incorreta'} — {pq.pointsAwarded} pts {pq.pendingCorrection ? '(pendente de correção)' : ''}
                      </li>
                    ))}
                  </ul>
                </div>
              )}
              <div className="mt-2">
                <button onClick={onClose} className="px-4 py-2 rounded border">Fechar</button>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

export default function AlunoAulaPlayer() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { user, token } = useAuthStore();

  const [trail, setTrail] = useState<Trail | null>(null);
  const [currentLesson, setCurrentLesson] = useState<Lesson | null>(null);
  const [enrollment, setEnrollment] = useState<Enrollment | null>(null);
  const [loading, setLoading] = useState(true);
  const [needAuth, setNeedAuth] = useState(false);
  const [quizAnswer, setQuizAnswer] = useState<number | null>(null);
  const [showQuizResult, setShowQuizResult] = useState(false);
  const [showQuestionnaire, setShowQuestionnaire] = useState(false);
  const [attemptId, setAttemptId] = useState<string | null>(null);
  const [answersMap, setAnswersMap] = useState<Record<string, any>>({});
  const [submitResult, setSubmitResult] = useState<any>(null);
  const [expandedModules, setExpandedModules] = useState<string[]>([]);
  const [syncingSummary, setSyncingSummary] = useState(false);
  const [toast, setToast] = useState<{ type: 'success' | 'error'; message: string } | null>(null);

  const showToast = (type: 'success' | 'error', message: string) => {
    setToast({ type, message });
    setTimeout(() => setToast(null), 4500);
  };

  useEffect(() => {
    async function fetchData() {
      if (!id || !user) return;

      try {
        // 1. Fetch trail with silent fallbacks (avoid noisy api logs on expected 404)
        let trailData: Trail | null = null;
        const BASE = import.meta.env.VITE_API_URL || 'http://127.0.0.1:3001';
        async function tryFetchSilent<T>(path: string): Promise<T | null | 'unauth'> {
          try {
            const headers: Record<string, string> = {};
            if (token) headers['Authorization'] = `Bearer ${token}`;
            const res = await fetch(`${BASE}${path}`, { headers });
            if (res.status === 401) return 'unauth';
            if (!res.ok) return null;
            return await res.json();
          } catch {
            return null;
          }
        }

        const r1 = await tryFetchSilent<Trail>(`/api/trails/${id}`);
        if (r1 === 'unauth') {
          setNeedAuth(true);
          trailData = null;
        } else {
          trailData = r1 as Trail | null;
        }

        if (!trailData && !needAuth) {
          const r2 = await tryFetchSilent<Trail>(`/api/trails/${id}/export`);
          if (r2 === 'unauth') { setNeedAuth(true); }
          else trailData = r2 as Trail | null;
        }
        if (!trailData && !needAuth) {
          const all = await tryFetchSilent<Trail[]>(`/api/trails`);
          if (all === 'unauth') { setNeedAuth(true); }
          else if (all) trailData = all.find(t => t.id === id) || null;
        }

        if (trailData) {
          setTrail(trailData);
          // pick a sensible current lesson: prefer active lesson, fallback to first available
          const firstModule = trailData.modules && trailData.modules[0];
          const firstLesson = firstModule?.etapas && firstModule.etapas[0];
          if (firstLesson) setCurrentLesson(firstLesson);
          else {
            // try to find first sublesson
            let found: Lesson | null = null;
            for (const m of trailData.modules) {
              for (const l of m.etapas || []) {
                  if (l.subetapas && l.subetapas?.length > 0) { found = l.subetapas[0]; break; }
                }
              if (found) break;
            }
            if (found) setCurrentLesson(found);
          }
          if (trailData.modules && trailData.modules[0]) setExpandedModules([trailData.modules[0].id]);
        }

        // 2. Fetch enrollment ID real + granular progress for this trail
        // O enrollmentId real é o ID do documento userTrails (usado para vincular tentativas de questionário ao relatório do admin)
        let realEnrollmentId = `${user.id}_${id}`; // fallback convencional
        try {
          const userTrails = await api.get<any[]>(`/api/users/${user.id}/trails`);
          const match = Array.isArray(userTrails)
            ? userTrails.find((t: any) => t.trailId === id || t.id === id || t.id === `${user.id}_${id}`)
            : null;
          if (match?.id) realEnrollmentId = match.id;
        } catch {
          // silencioso — usa o fallback convencional
        }

        try {
          const progressData = await api.get<{ etapas: any[]; subetapas: any[]; tasks: any[] }>(
            `/api/users/${user.id}/progress/trail/${id}`
          );
          
          const completedLessons = progressData.etapas.filter(p => p.completed).map(p => p.id);
          const totalLessons = trailData?.modules.reduce((acc, m) => acc + (m.etapas?.length || 0), 0) || 1;
          const progressPct = Math.round((completedLessons.length / totalLessons) * 100);

          setEnrollment({
            id: realEnrollmentId,
            userId: user.id,
            trailId: id,
            progress: progressPct,
            completedLessons,
            completedTasks: progressData.tasks.filter(p => p.completed).map(p => p.id),
            status: progressPct >= 100 ? 'completed' : progressPct > 0 ? 'in-progress' : 'not-started',
            lastAccess: new Date().toISOString(),
          } as any);
        } catch (err) {
          console.warn('Error fetching progress details, using defaults:', err);
          setEnrollment({
            id: realEnrollmentId,
            userId: user.id,
            trailId: id,
            progress: 0,
            completedLessons: [],
            completedTasks: [],
            status: 'not-started',
            lastAccess: new Date().toISOString(),
          } as any);
        }
      } catch (error) {
        console.error('Error fetching aula data:', error);
      } finally {
        setLoading(false);
      }
    }

    fetchData();
  }, [id, user]);

  // Polling helper with exponential backoff and optional jitter.
  async function pollUserProgress(
    uid: string,
    maxAttempts = 5,
    initialIntervalMs = 1000,
    multiplier = 2,
    jitter = 200
  ) {
    let attempt = 0;
    while (attempt < maxAttempts) {
      try {
        const res = await api.get<any>(`/api/users/${encodeURIComponent(uid)}/progress`);
        if (res) return res;
      } catch (e) {
        // ignore and retry
      }

      attempt += 1;
      const expBackoff = initialIntervalMs * Math.pow(multiplier, attempt - 1);
      const sleepMs = Math.max(0, expBackoff + Math.floor(Math.random() * jitter));
      await new Promise(r => setTimeout(r, sleepMs));
    }

    // final failure: notify user via toast
    showToast('error', 'Não foi possível sincronizar o resumo. Tente novamente mais tarde.');
    return null;
  }

  // Apply progress API response (userTrails or legacy) to enrollment state
  function applyProgressToEnrollment(progressItems: any) {
    // If progressItems is an array (userTrails), try to find trail summary
    try {
      if (Array.isArray(progressItems)) {
        const item = progressItems.find((t: any) => t.trailId === (trail?.id || id));
        if (item) {
          setEnrollment(prev => prev ? ({
            ...prev,
            progress: item.totalProgress ?? item.totalProgress ?? prev.progress,
            completedLessons: prev?.completedLessons ?? [],
            lastAccess: item.lastActivityAt ?? prev?.lastAccess,
            status: item.status ?? prev?.status,
          } as any) : prev);
          return;
        }
      }
      // fallback: if object with etapas/subetapas/tasks
      if (progressItems && progressItems.etapas) {
        const completedLessons = (progressItems.etapas || []).filter((p: any) => p.completed).map((p: any) => p.id);
        const completedSubetapas = (progressItems.subetapas || []).filter((p: any) => p.completed).map((p: any) => p.id);
        const totalLessons = trail?.modules.reduce((acc, m) => acc + (m.etapas?.length || 0), 0) || 1;
        const progressPct = Math.round((completedLessons.length / totalLessons) * 100);
        setEnrollment(prev => prev ? ({
          ...prev,
          progress: progressPct,
          completedLessons,
          status: progressPct >= 100 ? 'completed' : progressPct > 0 ? 'in-progress' : 'not-started',
        } as any) : prev);
      }
    } catch (e) {
      // ignore mapping errors
      console.warn('applyProgressToEnrollment failed', e);
    }
  }

  const toggleModule = (moduleId: string) => {
    setExpandedModules(prev =>
      prev.includes(moduleId) ? prev.filter(id => id !== moduleId) : [...prev, moduleId]
    );
  };

  const handleToggleLessonComplete = async (lesson: Lesson) => {
    if (!user || !trail || !enrollment) return;
    
    const isCompleted = enrollment.completedLessons.includes(lesson.id);
    const newCompleted = isCompleted 
      ? enrollment.completedLessons.filter(id => id !== lesson.id)
      : [...enrollment.completedLessons, lesson.id];

    // Counts for backend auto-recalculation
    const totalLessonsInTrail = trail.modules.reduce((acc, m) => acc + (m.etapas?.length || 0), 0);
    const totalModulesInTrail = trail.modules.length;
    
    try {
      await api.put(`/api/users/${user.id}/trails/${trail.id}/lessons/${lesson.id}`, {
        completed: !isCompleted,
        source: 'ui',
        lastViewedAt: new Date().toISOString(),
        trailId: trail.id,
        moduleId: currentModule?.id,
        totalLessonsInTrail,
        totalModulesInTrail
      });

      setEnrollment(prev => prev ? {
        ...prev,
        completedLessons: newCompleted,
        progress: Math.round((newCompleted.length / totalLessonsInTrail) * 100)
      } : null);
      // start async polling to refresh the summarized enrollment (eventual consistency)
      setSyncingSummary(true);
      (async () => {
        try {
          const progressData = await pollUserProgress(user.id);
          if (progressData) applyProgressToEnrollment(progressData);
        } catch (_) {}
        setSyncingSummary(false);
      })();
    } catch (err) {
      console.error('Error toggling lesson completion:', err);
    }
  };

  const handleToggleSubetapaComplete = async (sub: any) => {
    if (!user || !trail || !enrollment || !currentLesson) return;

    const isCompleted = (enrollment as any).completedSubetapas?.includes(sub.id);
    const newCompleted = isCompleted
      ? (enrollment as any).completedSubetapas.filter((id: string) => id !== sub.id)
      : [...((enrollment as any).completedSubetapas || []), sub.id];

    try {
      await api.put(`/api/users/${user.id}/trails/${trail.id}/lessons/${currentLesson.id}/subetapas/${sub.id}`, {
        completed: !isCompleted,
        source: 'ui',
        lastViewedAt: new Date().toISOString(),
        trailId: trail.id,
        moduleId: currentModule?.id,
        totalSubetapasInEtapa: currentLesson.subetapas?.length || 1
      });

      setEnrollment(prev => prev ? {
        ...prev,
        completedSubetapas: newCompleted
      } : null);
      // trigger refresh of summarized enrollment
      setSyncingSummary(true);
      (async () => {
        try {
          const progressData = await pollUserProgress(user.id);
          if (progressData) applyProgressToEnrollment(progressData);
        } catch (_) {}
        setSyncingSummary(false);
      })();
    } catch (err) {
      console.error('Error toggling subetapa completion:', err);
    }
  };

  const getEmbedUrl = (url: string) => {
    if (!url) return '';

    // YouTube standard and unlisted
    const ytMatch = url.match(/(?:https?:\/\/)?(?:www\.)?(?:youtube\.com\/watch\?v=|youtu\.be\/)([a-zA-Z0-9_-]{11})/);
    if (ytMatch) {
      return `https://www.youtube.com/embed/${ytMatch[1]}`;
    }

    // Vimeo
    const vimeoMatch = url.match(/(?:https?:\/\/)?(?:www\.)?(?:vimeo\.com\/)([0-9]+)/);
    if (vimeoMatch) {
      return `https://player.vimeo.com/video/${vimeoMatch[1]}`;
    }

    return url;
  };

  const getVideoProvider = (url: string | undefined | null) => {
    if (!url) return null;
    const u = url.toString();
    if (u.match(/(?:youtube\.com|youtu\.be)\//)) return 'youtube';
    if (u.match(/vimeo\.com/)) return 'vimeo';
    return null;
  };

  // Progress auto-mark config (persisted in localStorage)
  const [showProgressConfig, setShowProgressConfig] = useState(false);
  type ProgressConfig = {
    enabled: boolean;
    videoPercent: number;
    requireVisibility: boolean;
    requirePlay: boolean;
    nonVideoSeconds: number;
  };
  const [progressConfig, setProgressConfig] = useState<ProgressConfig>(() => {
    try {
      const raw = localStorage.getItem('progressConfig');
      if (raw) return JSON.parse(raw) as ProgressConfig;
    } catch {}
    return {
      enabled: true,
      videoPercent: 50, // percent of video required
      requireVisibility: true,
      requirePlay: true,
      nonVideoSeconds: 10, // fallback seconds for non-video
    };
  });

  useEffect(() => { try { localStorage.setItem('progressConfig', JSON.stringify(progressConfig)); } catch {} }, [progressConfig]);

  // Auto-mark hybrid: Visibility API for non-video content + player APIs for YouTube/Vimeo.
  useEffect(() => {
    if (!user || !trail || !enrollment || !currentLesson) return;
    if (!progressConfig?.enabled) return;

    const alreadyLesson = enrollment.completedLessons.includes(currentLesson.id);
    const alreadySub = (enrollment as any).completedSubetapas?.includes(currentLesson.id);
    if (alreadyLesson || alreadySub) return;

    const findParentEtapa = () => {
      for (const m of trail.modules) {
        for (const etapa of m.etapas || []) {
          if (etapa.subetapas && etapa.subetapas.some((s: any) => s.id === currentLesson.id)) return etapa;
        }
      }
      return null;
    };

    const parent = findParentEtapa();
    const thresholdSeconds = progressConfig.nonVideoSeconds || 10; // seconds of visible/play time required
    let marked = false;

    const markCompleted = async () => {
      if (marked) return;
      marked = true;
      try {
        if (parent) {
          await api.put(`/api/users/${user.id}/trails/${trail.id}/lessons/${parent.id}/subetapas/${currentLesson.id}`, {
            completed: true,
            source: 'auto',
            lastViewedAt: new Date().toISOString(),
            trailId: trail.id,
            moduleId: currentModule?.id,
            totalSubetapasInEtapa: parent.subetapas?.length || 1,
          });

          setEnrollment(prev => prev ? ({
            ...prev,
            completedSubetapas: [...((prev as any).completedSubetapas || []), currentLesson.id]
          } as any) : prev);
        } else {
          const totalLessonsInTrail = trail.modules.reduce((acc, m) => acc + (m.etapas?.length || 0), 0);
          await api.put(`/api/users/${user.id}/trails/${trail.id}/lessons/${currentLesson.id}`, {
            completed: true,
            source: 'auto',
            lastViewedAt: new Date().toISOString(),
            trailId: trail.id,
            moduleId: currentModule?.id,
            totalLessonsInTrail,
            totalModulesInTrail: trail.modules.length,
          });

          setEnrollment(prev => prev ? ({
            ...prev,
            completedLessons: [...(prev.completedLessons || []), currentLesson.id],
            progress: Math.round(((prev.completedLessons ? prev.completedLessons.length : 0) + 1) / (totalLessonsInTrail || 1) * 100)
          } as any) : prev);
        }
      } catch (e) {
        console.error('Auto-mark progress failed:', e);
      }
    };

    // Find iframe id used for this lesson (component or fallback)
    const compVideo = currentLesson.components?.find((c: any) => (c.type === 'video' || c.type === 'iframe') && c.payload?.url);
    const iframeId = compVideo ? `lesson-comp-${compVideo.id}` : `lesson-video-${currentLesson.id}`;
    const iframeEl = document.getElementById(iframeId) as HTMLIFrameElement | null;
    const provider = iframeEl?.dataset?.provider || getVideoProvider(getEmbedUrl(currentLesson.videoUrl || ''));

    // Helpers to load external scripts
    const loadScript = (src: string) => new Promise<void>((resolve, reject) => {
      if (document.querySelector(`script[src="${src}"]`)) return resolve();
      const s = document.createElement('script');
      s.src = src;
      s.async = true;
      s.onload = () => resolve();
      s.onerror = (e) => reject(e);
      document.body.appendChild(s);
    });

    // Video providers: YouTube
    let ytPlayer: any = null;
    let ytInterval: any = null;

    const setupYouTube = async () => {
      try {
        if (!(window as any).YT) {
          (window as any).onYouTubeIframeAPIReady = () => { /* will be handled below */ };
          await loadScript('https://www.youtube.com/iframe_api');
          // wait until YT is available
          await new Promise<void>((res) => {
            const check = () => { if ((window as any).YT) res(); else setTimeout(check, 100); };
            check();
          });
        }
        ytPlayer = new (window as any).YT.Player(iframeId, {
          events: {
            onStateChange: (e: any) => {
              const YT = (window as any).YT;
              if (e.data === YT.PlayerState.PLAYING) {
                // poll currentTime
                if (ytInterval) clearInterval(ytInterval);
                ytInterval = setInterval(async () => {
                  try {
                    const t = await ytPlayer.getCurrentTime();
                    const duration = await ytPlayer.getDuration().catch(() => 0);
                    if (progressConfig.videoPercent && duration > 0) {
                      const pct = (t / duration) * 100;
                      if (pct >= (progressConfig.videoPercent || 50) && (!progressConfig.requireVisibility || document.visibilityState === 'visible')) {
                        clearInterval(ytInterval);
                        markCompleted();
                      }
                    } else if (t >= thresholdSeconds) {
                      clearInterval(ytInterval);
                      markCompleted();
                    }
                  } catch (e) {
                    // ignore
                  }
                }, 1000);
              } else {
                if (ytInterval) clearInterval(ytInterval);
              }
            }
          }
        });
      } catch (e) {
        console.error('Failed to setup YouTube player for auto-mark:', e);
      }
    };

    // Vimeo
    let vimeoPlayer: any = null;
    const setupVimeo = async () => {
      try {
        await loadScript('https://player.vimeo.com/api/player.js');
        const Player = (window as any).Vimeo?.Player;
        if (!Player || !iframeEl) return;
        vimeoPlayer = new Player(iframeEl);
        vimeoPlayer.on('timeupdate', async (data: any) => {
          try {
            const duration = await vimeoPlayer.getDuration();
            if (progressConfig.videoPercent && duration > 0) {
              const pct = (data.seconds / duration) * 100;
              if (pct >= (progressConfig.videoPercent || 50) && (!progressConfig.requireVisibility || document.visibilityState === 'visible')) {
                markCompleted();
              }
            } else if (data.seconds >= thresholdSeconds) {
              markCompleted();
            }
          } catch (e) {
            // fallback
            if (data.seconds >= thresholdSeconds) markCompleted();
          }
        });
      } catch (e) {
        console.error('Failed to setup Vimeo player for auto-mark:', e);
      }
    };

    // Non-video: use Visibility API + interval
    let visInterval: any = null;
    let visibleSeconds = 0;
    const startVisibilityCounter = () => {
      if (visInterval) return;
      visInterval = setInterval(() => {
        if (document.visibilityState === 'visible' && document.hasFocus()) {
          visibleSeconds += 1;
          if (visibleSeconds >= thresholdSeconds) {
            clearInterval(visInterval);
            markCompleted();
          }
        }
      }, 1000);
    };
    const stopVisibilityCounter = () => { if (visInterval) { clearInterval(visInterval); visInterval = null; } };

    // Setup based on provider
    const onVisibilityChange = () => {
      if (document.visibilityState !== 'visible') stopVisibilityCounter(); else startVisibilityCounter();
    };
    const onWindowBlur = () => stopVisibilityCounter();
    const onWindowFocus = () => startVisibilityCounter();

    (async () => {
      if ((provider === 'youtube' || provider === 'vimeo') && iframeEl) {
        // For videos we require play events; do not use visibility counter for video progress
        if (provider === 'youtube') await setupYouTube();
        if (provider === 'vimeo') await setupVimeo();
      } else {
        startVisibilityCounter();
        document.addEventListener('visibilitychange', onVisibilityChange);
        window.addEventListener('blur', onWindowBlur);
        window.addEventListener('focus', onWindowFocus);
      }
    })();

    return () => {
      // cleanup
      try { if (ytInterval) clearInterval(ytInterval); } catch {}
      try { if (visInterval) clearInterval(visInterval); } catch {}
      try { if (vimeoPlayer && vimeoPlayer.unload) vimeoPlayer.unload(); } catch {}
      try { document.removeEventListener('visibilitychange', onVisibilityChange); } catch {}
      try { window.removeEventListener('blur', onWindowBlur); } catch {}
      try { window.removeEventListener('focus', onWindowFocus); } catch {}
    };
  }, [currentLesson, user, trail, enrollment, progressConfig]);

  const handleQuizSubmit = async () => {
    if (quizAnswer !== null && currentLesson && enrollment && trail && user) {
      const isCorrect = quizAnswer === currentLesson.quiz?.correctIndex;
      setShowQuizResult(true);

      if (isCorrect) {
        // Save as task completion
        try {
          await api.put(`/api/users/${user.id}/trails/${trail.id}/lessons/${currentLesson.id}/tasks/quiz`, {
            completed: true,
            source: 'quiz',
            lastViewedAt: new Date().toISOString(),
            trailId: trail.id,
            moduleId: currentModule?.id,
            score: 100
          });
          
          // Also mark lesson as complete if it's primarily a quiz lesson
          await handleToggleLessonComplete(currentLesson);
        } catch (error) {
          console.error('Error saving quiz progress:', error);
        }
      }
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-screen bg-[#f4f7f9]">
        <Loader2 className="animate-spin text-faktory-blue" size={40} />
      </div>
    );
  }

  if (!trail || !currentLesson) {
    if (needAuth) {
      return (
        <div className="flex flex-col items-center justify-center h-screen bg-[#f4f7f9]">
          <h2 className="text-xl font-bold text-slate-800">Acesso negado</h2>
          <p className="text-slate-600 mt-2">Você precisa estar logado para acessar esta trilha.</p>
          <div className="mt-4 flex gap-3">
            <button onClick={() => navigate('/login')} className="text-white bg-faktory-blue px-4 py-2 rounded">Entrar</button>
            <button onClick={() => navigate('/app')} className="text-faktory-blue border border-faktory-blue px-4 py-2 rounded">Voltar ao Dashboard</button>
          </div>
        </div>
      );
    }

    return (
      <div className="flex flex-col items-center justify-center h-screen bg-[#f4f7f9]">
        <h2 className="text-xl font-bold text-slate-800">Trilha não encontrada</h2>
        <button onClick={() => navigate('/app')} className="mt-4 text-faktory-blue font-bold">Voltar ao Dashboard</button>
      </div>
    );
  }

  const currentModule = trail.modules.find(m => m.etapas?.some(l => l.id === currentLesson.id));
  const quizComponent = currentLesson.components?.find(c => c.type === 'quiz');
  const effectiveQuestionnaireId: string | undefined =
    quizComponent?.payload?.questionnaireId || currentLesson.questionnaireId;

  return (
    <div className="flex flex-col h-screen bg-white">
      {/* Top Progress Bar & Breadcrumbs */}
      <div className="bg-white border-b border-gray-100 px-4 py-2 flex flex-col gap-2 shrink-0">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <h1 className="text-[10px] font-bold text-slate-800 uppercase tracking-wider">
              {trail.title}
            </h1>
            <div className="flex items-center gap-2">
              <div className="w-32 h-1 bg-gray-100 rounded-full overflow-hidden">
                <div
                  className="h-full bg-faktory-blue transition-all duration-500"
                  style={{ width: `${enrollment?.progress || 0}%` }}
                ></div>
              </div>
              <span className="text-[9px] font-bold text-slate-400">{enrollment?.progress || 0}%</span>
              {syncingSummary && (
                <span className="text-[9px] text-amber-600 font-medium ml-2">Resumo atualizando…</span>
              )}
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2 text-[10px] text-gray-400">
          <Link to="/app" className="hover:text-faktory-blue flex items-center gap-1 uppercase font-bold">
            <ArrowLeft size={10} /> PAINEL
          </Link>
          <ChevronRight size={10} />
          <span className="uppercase font-medium">{currentModule?.title}</span>
          <ChevronRight size={10} />
          <span className="text-slate-600 font-bold uppercase">{currentLesson.title}</span>
        </div>
              <div className="ml-4">
                <button onClick={() => setShowProgressConfig(v => !v)} className="text-xs px-2 py-1 border rounded">Config progresso</button>
              </div>
              {showProgressConfig && (
                <div className="absolute right-4 top-14 bg-white border p-3 rounded shadow-md text-xs">
                  <div className="flex items-center gap-2 mb-2">
                    <input type="checkbox" id="pc-enabled" checked={progressConfig.enabled} onChange={e => setProgressConfig(p => ({ ...p, enabled: e.target.checked }))} />
                    <label htmlFor="pc-enabled">Ativar auto-mark</label>
                  </div>
                  <div className="flex items-center gap-2 mb-2">
                    <label className="w-28">Video %</label>
                    <input type="number" value={progressConfig.videoPercent} min={1} max={100} onChange={e => setProgressConfig(p => ({ ...p, videoPercent: Number(e.target.value) }))} className="w-16" />
                  </div>
                  <div className="flex items-center gap-2 mb-2">
                    <input type="checkbox" id="pc-visibility" checked={progressConfig.requireVisibility} onChange={e => setProgressConfig(p => ({ ...p, requireVisibility: e.target.checked }))} />
                    <label htmlFor="pc-visibility">Exigir visibilidade da aba</label>
                  </div>
                  <div className="flex items-center gap-2 mb-2">
                    <input type="checkbox" id="pc-play" checked={progressConfig.requirePlay} onChange={e => setProgressConfig((p: typeof progressConfig) => ({ ...p, requirePlay: e.target.checked }))} />
                    <label htmlFor="pc-play">Exigir play (vídeo)</label>
                  </div>
                  <div className="flex items-center gap-2">
                    <label className="w-28">Texto (não-vídeo s)</label>
                    <input type="number" value={progressConfig.nonVideoSeconds} min={1} onChange={e => setProgressConfig((p: typeof progressConfig) => ({ ...p, nonVideoSeconds: Number(e.target.value) }))} className="w-16" />
                  </div>
                </div>
              )}
      </div>

      <div className="flex flex-1 overflow-hidden">
        {/* Left Sidebar (Lesson List) */}
        <aside className="w-72 bg-[#f8fafc] border-r border-gray-100 flex flex-col shrink-0 overflow-y-auto">
          <div className="py-2">
            {trail.modules.map((module, mIndex) => (
              <div key={module.id} className="mb-1">
                <button
                  onClick={() => toggleModule(module.id)}
                  className={cn(
                    "w-full flex items-center gap-3 px-4 py-3 text-left transition-all hover:bg-slate-100",
                    expandedModules.includes(module.id) ? "bg-slate-100/50" : ""
                  )}
                >
                  <div className="w-6 h-6 rounded-full border border-slate-200 flex items-center justify-center text-[10px] font-bold text-slate-400 shrink-0">
                    {mIndex + 1}
                  </div>
                  <span className={cn(
                    "text-[11px] font-bold flex-1",
                    currentModule?.id === module.id ? "text-faktory-blue" : "text-slate-600"
                  )}>
                    {module.title}
                  </span>
                  <ChevronDown
                    size={14}
                    className={cn(
                      "text-slate-400 transition-transform",
                      expandedModules.includes(module.id) ? "rotate-180" : ""
                    )}
                  />
                </button>

                {expandedModules.includes(module.id) && (
                  <div className="bg-white/50 border-y border-slate-50">
                    {(module.etapas ?? []).map((lesson, lIndex) => (
                      <button
                        key={lesson.id}
                        onClick={() => {
                          setCurrentLesson(lesson);
                          setQuizAnswer(null);
                          setShowQuizResult(false);
                          window.scrollTo(0, 0);
                        }}
                        className={cn(
                          "w-full text-left px-12 py-3 transition-all flex items-start gap-3 group border-l-4",
                          currentLesson.id === lesson.id
                            ? "bg-blue-50/50 border-faktory-blue"
                            : "border-transparent hover:bg-slate-50"
                        )}
                      >
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 mb-1">
                            <Clock size={10} className="text-slate-400" />
                            <p className={cn(
                              "text-[10px] font-bold leading-tight",
                              currentLesson.id === lesson.id ? "text-faktory-blue" : "text-slate-500"
                            )}>
                              {mIndex + 1}.{lIndex + 1} - {lesson.title}
                            </p>
                          </div>
                          {enrollment?.completedLessons.includes(lesson.id) && (
                            <div className="flex items-center gap-1 text-[9px] text-green-500 font-bold">
                              <CheckCircle2 size={10} /> CONCLUÍDO
                            </div>
                          )}
                        </div>
                      </button>
                    ))}
                  </div>
                )}
              </div>
            ))}
          </div>
        </aside>

        {/* Main Content Area */}
        <main className="flex-1 overflow-y-auto bg-white p-10">
          <div className="max-w-4xl mx-auto">
            <div className="flex items-center justify-between mb-8">
              <h1 className="text-2xl font-bold text-faktory-blue">{currentLesson.title}</h1>
              <div className="flex items-center gap-2 text-gray-400 text-xs font-medium">
                <Calendar size={14} />
                <span>17/09/2025</span>
              </div>
            </div>

            {/* Dynamic Components (new system) */}
            {currentLesson.components && currentLesson.components.length > 0 ? (
              <div className="space-y-8">
                {[...currentLesson.components]
                  .sort((a, b) => (a.order ?? 0) - (b.order ?? 0))
                  .map((comp) => {
                    if (comp.type === 'text') {
                      return (
                        <div key={comp.id} className="prose prose-slate max-w-none">
                          <div
                            className="rich-text-content"
                            dangerouslySetInnerHTML={{ __html: comp.payload.html || '' }}
                          />
                        </div>
                      );
                    }
                    if ((comp.type === 'video' || comp.type === 'iframe') && comp.payload.url) {
                      const embed = getEmbedUrl(comp.payload.url);
                      const provider = getVideoProvider(embed);
                      const iframeId = `lesson-comp-${comp.id}`;
                      return (
                        <div key={comp.id} className="aspect-video bg-black rounded-2xl overflow-hidden shadow-2xl ring-1 ring-slate-200">
                          <iframe
                            id={iframeId}
                            src={embed}
                            data-provider={provider || ''}
                            className="w-full h-full"
                            allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                            allowFullScreen
                          />
                        </div>
                      );
                    }
                    if (comp.type === 'image' && comp.payload.url) {
                      return (
                        <div key={comp.id} style={{ textAlign: (comp.payload.align as any) || 'center' }}>
                          <img
                            src={comp.payload.url}
                            alt={comp.payload.alt || ''}
                            style={{ width: comp.payload.width || '100%', maxWidth: '100%' }}
                            className="rounded inline-block"
                          />
                        </div>
                      );
                    }
                    if (comp.type === 'logo' && comp.payload.url) {
                      return (
                        <div key={comp.id} className="flex justify-center">
                          <img
                            src={comp.payload.url}
                            alt={comp.payload.alt || 'Logo'}
                            style={{ maxWidth: comp.payload.width || '320px', width: '100%' }}
                            className="h-auto"
                          />
                        </div>
                      );
                    }
                    // quiz components are handled in the section below
                    return null;
                  })}
              </div>
            ) : (
              /* Fallback for old-format lessons without components[] */
              <>
                {currentLesson.videoUrl && (
                  <div className="mb-8 aspect-video bg-black rounded-2xl overflow-hidden shadow-2xl ring-1 ring-slate-200">
                    {(() => {
                      const embed = getEmbedUrl(currentLesson.videoUrl);
                      const provider = getVideoProvider(embed);
                      const iframeId = `lesson-video-${currentLesson.id}`;
                      return (
                        <iframe
                          id={iframeId}
                          src={embed}
                          data-provider={provider || ''}
                          className="w-full h-full"
                          allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                          allowFullScreen
                        />
                      );
                    })()}
                  </div>
                )}
                {currentLesson.content && (
                  <div className="prose prose-slate max-w-none">
                    <div
                      className="rich-text-content"
                      dangerouslySetInnerHTML={{ __html: currentLesson.content }}
                    />
                  </div>
                )}
              </>
            )}

            {/* Quiz Section: check quiz components first, then lesson-level questionnaireId */}
            {effectiveQuestionnaireId ? (
              <div className="mt-16 bg-slate-50 p-8 rounded-2xl border border-slate-100">
                <div className="flex items-center gap-3 mb-6">
                  <div className="w-10 h-10 bg-faktory-blue/10 text-faktory-blue rounded-xl flex items-center justify-center">
                    <HelpCircle size={20} />
                  </div>
                  <div>
                    <h3 className="font-bold text-slate-800">Avaliação</h3>
                    <p className="text-xs text-slate-500">Clique em "Fazer questionário" para iniciar</p>
                  </div>
                </div>

                {!showQuestionnaire && (
                  <div className="flex items-center justify-between">
                    <div className="text-sm text-slate-600">Questionário vinculado a esta lição</div>
                    <div className="flex gap-2">
                      <button
                        onClick={async () => {
                          setShowQuestionnaire(true);
                        }}
                        className="bg-faktory-blue text-white px-4 py-2 rounded-lg font-bold"
                      >
                        Fazer questionário
                      </button>
                    </div>
                  </div>
                )}

                {showQuestionnaire && (
                  <div className="fixed inset-0 z-50 flex items-center justify-center">
                    <div className="absolute inset-0 bg-black/40" onClick={() => { setShowQuestionnaire(false); }} />
                    <div className="relative z-60 w-[95%] max-w-4xl">
                      <div className="bg-white rounded-lg shadow-lg overflow-hidden">
                        <div className="p-4 border-b flex items-center justify-between">
                          <div className="font-bold">Questionário</div>
                          <button onClick={() => { setShowQuestionnaire(false); setAttemptId(null); setSubmitResult(null); setAnswersMap({}); }} className="text-slate-500 px-2 py-1">Fechar</button>
                        </div>
                          <div className="p-4 max-h-[80vh] overflow-auto">
                            <QuestionnaireRunner
                            questionnaireId={effectiveQuestionnaireId!}
                            projectId={trail.id}
                            userId={user?.id || ''}
                            trailId={trail?.id}
                            enrollmentId={enrollment?.id}
                            moduleId={currentModule?.id}
                            onClose={() => { setShowQuestionnaire(false); setAttemptId(null); setSubmitResult(null); setAnswersMap({}); }}
                            onSubmitted={async (res: any) => {
                              setSubmitResult(res);
                              // refresh user's progress for this trail
                              try {
                                const updated = await api.get<any>(`/api/projects/${encodeURIComponent(trail.id)}/users/${encodeURIComponent(user?.id || '')}/progress`);
                                setEnrollment(prev => prev ? { ...prev, progress: updated.completionRate * 100 } : prev);
                              } catch (e) {
                                // ignore
                              }
                            }}
                          />
                        </div>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            ) : (
              currentLesson.quiz && (
                <div className="mt-16 bg-slate-50 p-8 rounded-2xl border border-slate-100">
                  <div className="flex items-center gap-3 mb-6">
                    <div className="w-10 h-10 bg-faktory-blue/10 text-faktory-blue rounded-xl flex items-center justify-center">
                      <HelpCircle size={20} />
                    </div>
                    <div>
                      <h3 className="font-bold text-slate-800">Validação de Conhecimento</h3>
                      <p className="text-xs text-slate-500">Responda para concluir esta aula</p>
                    </div>
                  </div>

                  <div className="space-y-4">
                    <p className="text-sm font-bold text-slate-700 mb-4">{currentLesson.quiz.question}</p>
                    <div className="grid gap-3">
                      {currentLesson.quiz.options.map((option, index) => (
                        <label
                          key={index}
                          className={cn(
                            "flex items-center gap-4 p-4 rounded-xl cursor-pointer transition-all border",
                            quizAnswer === index
                              ? "bg-white border-faktory-blue ring-1 ring-faktory-blue shadow-sm"
                              : "bg-white border-slate-200 hover:border-faktory-blue/50"
                          )}
                        >
                          <div className={cn(
                            "w-5 h-5 rounded-full border-2 flex items-center justify-center transition-all",
                            quizAnswer === index ? "border-faktory-blue bg-faktory-blue" : "border-slate-300"
                          )}>
                            {quizAnswer === index && <div className="w-2 h-2 bg-white rounded-full"></div>}
                          </div>
                          <input
                            type="radio"
                            name="quiz"
                            onChange={() => setQuizAnswer(index)}
                            checked={quizAnswer === index}
                            className="hidden"
                          />
                          <span className="text-sm font-medium text-slate-700">{option}</span>
                        </label>
                      ))}
                    </div>

                    <div className="flex items-center justify-between mt-8 pt-6 border-t border-slate-200">
                      <button
                        onClick={handleQuizSubmit}
                        disabled={quizAnswer === null}
                        className="bg-faktory-blue text-white px-8 py-3 rounded-xl font-bold text-sm hover:bg-[#2c6a9a] disabled:opacity-50 transition-all shadow-lg shadow-blue-200"
                      >
                        Confirmar Resposta
                      </button>

                      {showQuizResult && (
                        <div className={cn(
                          "px-6 py-3 rounded-xl text-sm font-bold animate-in fade-in slide-in-from-bottom-2",
                          quizAnswer === currentLesson.quiz.correctIndex ? "bg-green-100 text-green-700" : "bg-red-100 text-red-700"
                        )}>
                          {quizAnswer === currentLesson.quiz.correctIndex ? "✓ Resposta correta!" : "✗ Tente novamente."}
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              )
            )}
          </div>
        </main>

        {/* Right Sidebar (Tasks) */}
        <aside className="w-64 bg-white border-l border-gray-100 flex flex-col shrink-0">
          <div className="p-4 border-b border-gray-50 flex items-center justify-between">
            <h3 className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Tarefas</h3>
          </div>
          <div className="flex-1 overflow-y-auto p-3">
            {user && currentModule && currentLesson && trail ? (
              (() => {
                // Determina se currentLesson é uma subetapa
                const parentEtapa = trail.modules
                  .flatMap(m => m.etapas ?? [])
                  .find(e => e.subetapas?.some(s => s.id === currentLesson.id));
                const isSubetapa = !!parentEtapa;
                const etapaId = isSubetapa ? parentEtapa!.id : currentLesson.id;
                const subetapaId = isSubetapa ? currentLesson.id : null;
                const taskIds = isSubetapa
                  ? (parentEtapa!.subetapas?.find(s => s.id === currentLesson.id)?.tasks ?? [])
                  : (currentLesson.tasks ?? []);

                if (!taskIds.length) {
                  return (
                    <div className="flex flex-col items-center justify-center h-full p-6 text-center">
                      <ClipboardList size={28} className="text-slate-200 mb-3" />
                      <p className="text-[10px] font-bold text-slate-400 uppercase">Sem tarefas</p>
                    </div>
                  );
                }

                return (
                  <TaskList
                    taskIds={taskIds}
                    userId={user.id}
                    projectId={trail.id}
                    moduleId={currentModule.id}
                    etapaId={etapaId}
                    subetapaId={subetapaId}
                    trailId={trail.id}
                    enrollmentId={enrollment?.id}
                    onTaskCompleted={(taskId, completion) => {
                      setEnrollment(prev => prev ? ({
                        ...prev,
                        completedTasks: [...((prev as any).completedTasks ?? []), taskId],
                      } as any) : prev);
                    }}
                  />
                );
              })()
            ) : (
              <div className="flex flex-col items-center justify-center h-full p-6 text-center">
                <ClipboardList size={28} className="text-slate-200 mb-3" />
                <p className="text-[10px] font-bold text-slate-400 uppercase">Sem tarefas</p>
              </div>
            )}
          </div>
        </aside>
      </div>
      {toast && (
        <div className={`fixed right-4 bottom-6 z-50 px-4 py-2 rounded shadow-lg ${toast.type === 'success' ? 'bg-green-600 text-white' : 'bg-red-600 text-white'}`}>
          {toast.message}
        </div>
      )}
    </div>
  );
}
