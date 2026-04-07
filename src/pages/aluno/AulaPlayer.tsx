import { useState, useEffect } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { api } from '../../utils/api';
import { useAuthStore } from '../../hooks/store/useAuthStore';
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
import { MOCK_TRAILS } from '../../mocks/data';

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
          if (!trailData) {
            const mockTrail = MOCK_TRAILS.find(t => t.id === id);
            if (mockTrail) trailData = mockTrail;
          }

        if (trailData) {
          setTrail(trailData);
          // pick a sensible current lesson: prefer active lesson, fallback to first available
          const firstModule = trailData.modules && trailData.modules[0];
          const firstLesson = firstModule?.lessons && firstModule.lessons[0];
          if (firstLesson) setCurrentLesson(firstLesson);
          else {
            // try to find first sublesson
            let found: Lesson | null = null;
            for (const m of trailData.modules) {
              for (const l of m.lessons) {
                if (l.sublessons && l.sublessons.length > 0) { found = l.sublessons[0]; break; }
              }
              if (found) break;
            }
            if (found) setCurrentLesson(found);
          }
          if (trailData.modules && trailData.modules[0]) setExpandedModules([trailData.modules[0].id]);
        }

        // 2. Fetch lesson progress
        try {
          const progress = await api.get<any[]>(`/api/users/${user.id}/progress`);
          const completedLessons = progress.filter(p => p.completed).map(p => p.lessonId);
          const totalLessons = trailData?.modules.reduce((acc, m) => acc + m.lessons.length, 0) || 1;
          const progressPct = Math.round((completedLessons.length / totalLessons) * 100);
          setEnrollment({
            id: `${user.id}-${id}`,
            userId: user.id,
            trailId: id,
            progress: progressPct,
            completedLessons,
            status: progressPct >= 100 ? 'completed' : progressPct > 0 ? 'in-progress' : 'not-started',
            lastAccess: new Date().toISOString(),
          });
        } catch {
          setEnrollment({
            id: `${user.id}-${id}`,
            userId: user.id,
            trailId: id,
            progress: 0,
            completedLessons: [],
            status: 'not-started',
            lastAccess: new Date().toISOString(),
          });
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
        const isAlreadyCompleted = enrollment.completedLessons.includes(currentLesson.id);
        const newCompletedLessons = isAlreadyCompleted
          ? enrollment.completedLessons
          : [...enrollment.completedLessons, currentLesson.id];

        const totalLessons = trail.modules.reduce((acc, m) => acc + m.lessons.length, 0);
        const newProgress = Math.round((newCompletedLessons.length / totalLessons) * 100);

        try {
          await api.put(`/api/users/${user.id}/progress/${currentLesson.id}`, {
            completed: true,
          });
          setEnrollment(prev => prev ? {
            ...prev,
            progress: newProgress,
            completedLessons: newCompletedLessons,
          } : null);
        } catch (error) {
          console.error('Error saving progress:', error);
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

  const currentModule = trail.modules.find(m => m.lessons.some(l => l.id === currentLesson.id));

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
                    {module.lessons.map((lesson, lIndex) => (
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

            {/* Video Section */}
            {currentLesson.videoUrl && (
              <div className="mb-12 aspect-video bg-black rounded-2xl overflow-hidden shadow-2xl ring-1 ring-slate-200">
                <iframe 
                  src={getEmbedUrl(currentLesson.videoUrl)} 
                  className="w-full h-full"
                  allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                  allowFullScreen
                />
              </div>
            )}

            {/* Main Image (Faktory Logo) */}
            <div className="mb-12 flex justify-center">
              <div className="max-w-xl w-full">
                <img 
                  src="https://faktory.com.br/wp-content/uploads/2023/06/Logo-Faktory-Softwares-Horizontal.png" 
                  alt="Faktory Softwares" 
                  className="w-full h-auto"
                  referrerPolicy="no-referrer"
                />
                <div className="mt-4 text-center">
                  <h2 className="text-xl font-bold text-slate-500 uppercase tracking-widest">Uma empresa <span className="text-slate-800">Esquadgroup</span></h2>
                </div>
              </div>
            </div>

            <div className="prose prose-slate max-w-none">
              <div 
                className="text-slate-600 text-sm leading-relaxed space-y-6"
                dangerouslySetInnerHTML={{ __html: currentLesson.content }}
              />
            </div>

            {/* Quiz Section */}
            {currentLesson.quiz && (
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
