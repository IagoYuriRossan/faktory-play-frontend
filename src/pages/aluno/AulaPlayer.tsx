import { useState, useEffect } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { api } from '../../utils/api';
import { useAuthStore } from '../../hooks/store/useAuthStore';
import { useQuestionnaire, startAttempt, submitAttempt } from '../../hooks/useQuestionnaire';
import { Trail, Lesson, Enrollment } from '../../@types';
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
              for (const l of m.etapas) {
                if (l.subetapas && l.subetapas?.length > 0) { found = l.subetapas[0]; break; }
              }
              if (found) break;
            }
            if (found) setCurrentLesson(found);
          }
          if (trailData.modules && trailData.modules[0]) setExpandedModules([trailData.modules[0].id]);
        }

        // 2. Fetch granular progress for this trail
        try {
          const progressData = await api.get<{ etapas: any[]; subetapas: any[]; tasks: any[] }>(
            `/api/users/${user.id}/progress/trail/${id}`
          );
          
          const completedLessons = progressData.etapas.filter(p => p.completed).map(p => p.id);
          const totalLessons = trailData?.modules.reduce((acc, m) => acc + (m.etapas?.length || 0), 0) || 1;
          const progressPct = Math.round((completedLessons.length / totalLessons) * 100);

          setEnrollment({
            id: `enrollment-${id}`,
            userId: user.id,
            trailId: id,
            progress: progressPct,
            completedLessons,
            completedSubetapas: progressData.subetapas.filter(p => p.completed).map(p => p.id),
            completedTasks: progressData.tasks.filter(p => p.completed).map(p => p.id),
            status: progressPct >= 100 ? 'completed' : progressPct > 0 ? 'in-progress' : 'not-started',
            lastAccess: new Date().toISOString(),
          } as any);
        } catch (err) {
          console.warn('Error fetching progress details, using defaults:', err);
          setEnrollment({
            id: `enrollment-${id}`,
            userId: user.id,
            trailId: id,
            progress: 0,
            completedLessons: [],
            completedSubetapas: [],
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
      await api.put(`/api/users/${user.id}/progress/${lesson.id}`, {
        completed: !isCompleted,
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
      await api.put(`/api/users/${user.id}/progress/${currentLesson.id}/subetapas/${sub.id}`, {
        completed: !isCompleted,
        trailId: trail.id,
        moduleId: currentModule?.id,
        totalSubetapasInEtapa: currentLesson.subetapas?.length || 1
      });

      setEnrollment(prev => prev ? {
        ...prev,
        completedSubetapas: newCompleted
      } : null);
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

  const handleQuizSubmit = async () => {
    if (quizAnswer !== null && currentLesson && enrollment && trail && user) {
      const isCorrect = quizAnswer === currentLesson.quiz?.correctIndex;
      setShowQuizResult(true);

      if (isCorrect) {
        // Save as task completion
        try {
          await api.put(`/api/users/${user.id}/progress/${currentLesson.id}/tasks/quiz`, {
            completed: true,
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

  // Inline component to run backend questionnaire flows
  function QuestionnaireRunner({
    questionnaireId,
    projectId,
    userId,
    onClose,
    onSubmitted,
  }: {
    questionnaireId: string;
    projectId?: string;
    userId?: string;
    onClose: () => void;
    onSubmitted?: (res: any) => void;
  }) {
    const { questionnaire, loading: qLoading, error, reload } = useQuestionnaire(questionnaireId);
    const [localAttemptId, setLocalAttemptId] = useState<string | null>(null);
    const [localAnswers, setLocalAnswers] = useState<Record<string, any>>({});
    const [starting, setStarting] = useState(false);
    const [submitting, setSubmitting] = useState(false);
    const [result, setResult] = useState<any>(null);

    const handleStart = async () => {
      setStarting(true);
      try {
        const res = await startAttempt(questionnaireId);
        setLocalAttemptId(res.attemptId);
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

    const handleSubmit = async () => {
      if (!localAttemptId) return;
      setSubmitting(true);
      try {
        const answers = Object.keys(localAnswers).map(qid => {
          const val = localAnswers[qid];
          if (Array.isArray(val)) return { questionId: qid, selectedOptionIds: val };
          const isString = typeof val === 'string';
          if (isString) return { questionId: qid, textAnswer: val };
          return { questionId: qid, selectedOptionIds: val };
        });
        const res = await submitAttempt(localAttemptId, answers);
        // mark open questions as pending in UI if any
        const enriched = { ...res };
        if (questionnaire && questionnaire.questions) {
          enriched.perQuestion = (enriched.perQuestion || []).map((pq: any) => {
            const q = questionnaire.questions.find(x => x.id === pq.questionId);
            if (q && q.type === 'open') {
              return { ...pq, pendingCorrection: true };
            }
            return pq;
          });
        }
        setResult(enriched);
        // After submission, refresh user and project progress and notify listeners
        try {
          if (projectId && userId) {
            await api.get(`/api/projects/${encodeURIComponent(projectId)}/users/${encodeURIComponent(userId)}/progress`);
            await api.get(`/api/projects/${encodeURIComponent(projectId)}/progress`);
            // notify other components (Cronograma) to reload
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

            {localAttemptId && !result && (
              <div className="mt-4 space-y-4">
                {questionnaire.questions.map(q => (
                  <div key={q.id} className="p-3 border rounded bg-slate-50">
                    <div className="font-medium mb-2">{q.text}</div>
                    {q.type === 'open' && (
                      <textarea
                        className="w-full p-2 border rounded"
                        value={localAnswers[q.id] || ''}
                        onChange={e => handleChangeText(q.id, e.target.value)}
                      />
                    )}
                    {(q.type === 'single_choice' || q.type === 'multiple_choice') && (
                      <div className="space-y-2">
                        {q.options?.map(opt => (
                          <label key={opt.id} className="flex items-center gap-2">
                            <input
                              type={q.type === 'single_choice' ? 'radio' : 'checkbox'}
                              name={q.id}
                              checked={Array.isArray(localAnswers[q.id]) ? localAnswers[q.id].includes(opt.id) : localAnswers[q.id]?.[0] === opt.id}
                              onChange={() => handleChangeOption(q.id, opt.id, q.type)}
                            />
                            <span>{opt.text}</span>
                          </label>
                        ))}
                      </div>
                    )}
                  </div>
                ))}

                <div className="flex items-center gap-2">
                  <button onClick={handleSubmit} disabled={submitting} className="bg-green-600 text-white px-4 py-2 rounded font-bold">
                    {submitting ? 'Enviando...' : 'Enviar respostas'}
                  </button>
                  <button onClick={onClose} className="px-4 py-2 rounded border">Fechar</button>
                </div>
              </div>
            )}

            {result && (
              <div className="mt-4 p-3 bg-white border rounded">
                <div className="font-bold">Resultado</div>
                <div className="text-sm">Score: {result.score} / {result.maxScore}</div>
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

  const currentModule = trail.modules.find(m => m.etapas.some(l => l.id === currentLesson.id));
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
                    {module.etapas.map((lesson, lIndex) => (
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
                      return (
                        <div key={comp.id} className="aspect-video bg-black rounded-2xl overflow-hidden shadow-2xl ring-1 ring-slate-200">
                          <iframe
                            src={getEmbedUrl(comp.payload.url)}
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
                    <iframe
                      src={getEmbedUrl(currentLesson.videoUrl)}
                      className="w-full h-full"
                      allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                      allowFullScreen
                    />
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
                    <div className="relative z-60 w-[95%] max-w-3xl">
                      <div className="bg-white rounded-lg shadow-lg overflow-hidden">
                        <div className="p-4 border-b flex items-center justify-between">
                          <div className="font-bold">Questionário</div>
                          <button onClick={() => { setShowQuestionnaire(false); setAttemptId(null); setSubmitResult(null); setAnswersMap({}); }} className="text-slate-500 px-2 py-1">Fechar</button>
                        </div>
                        <div className="p-4">
                          <QuestionnaireRunner
                            questionnaireId={effectiveQuestionnaireId!}
                            projectId={trail.id}
                            userId={user.id}
                            onClose={() => { setShowQuestionnaire(false); setAttemptId(null); setSubmitResult(null); setAnswersMap({}); }}
                            onSubmitted={async (res: any) => {
                              setSubmitResult(res);
                              // refresh user's progress for this trail
                              try {
                                const updated = await api.get<any>(`/api/projects/${encodeURIComponent(trail.id)}/users/${encodeURIComponent(user.id)}/progress`);
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
          <div className="flex-1 flex flex-col items-center justify-center p-8 text-center">
            <ClipboardList size={32} className="text-slate-200 mb-4" />
            <p className="text-[10px] font-bold text-slate-400 uppercase">Sem tarefas</p>
          </div>
        </aside>
      </div>
    </div>
  );
}
