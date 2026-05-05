import { useEffect, useState, useCallback } from 'react';
import { useParams, useSearchParams } from 'react-router-dom';
import { api } from '../../utils/api';
import { useAuthStore } from '../../hooks/store/useAuthStore';
import {
  Users, Layers, Loader2, Plus, Trash2,
  KeyRound, ChevronDown, ChevronUp, ArrowLeft,
  AlertCircle, Check, Clock, BookOpen, X,
  Building2, Calendar, ExternalLink, BarChart2, Lock, Unlock,
} from 'lucide-react';
import { cn } from '../../utils/utils';

/* ─────────────────────────── Types ─────────────────────────── */
interface CompanyData {
  id: string;
  name: string;
  cnpj?: string;
  city?: string;
  uf?: string;
  createdAt?: string;
  allowedTrails?: string[];
}

interface Member {
  id: string;
  name: string;
  email: string;
  role: string;
  status?: 'active' | 'pending' | 'inactive';
}

interface PendingInvite {
  token: string;
  email?: string;
  invitedEmail?: string; // fallback campo legado
  name?: string;
  invitedName?: string;  // fallback campo legado
  expiresAt: string;
}

interface TrailCard {
  id: string;
  title: string;
  description?: string;
  usersCursor?: string | null;
  usersCount?: number | null;
  users?: TrailUser[];
  avgProgress?: number;
  statusCounts?: {
    not_started: number;
    in_progress: number;
    completed: number;
    overdue: number;
  };
}

interface TrailUser {
  userId: string;
  name: string;
  email: string;
  status: 'not_started' | 'in_progress' | 'completed' | 'overdue';
  totalProgress: number;
  lastAccess: string | null;
  startedAt: string | null;
  completedAt: string | null;
  moduleProgress: {
    moduleId: string;
    title: string;
    progress: number;
    completedLessons: number;
    totalLessons: number;
  }[];
}

interface TrailReport {
  trailTitle: string;
  generatedAt: string;
  users: TrailUser[];
}

interface UserDetailEtapa {
  etapaId: string;
  title: string;
  completed: boolean;
  completedAt: string | null;
  lastAccessAt: string | null;
  subetapas?: {
    subetapaId: string;
    title: string;
    completed: boolean;
    completedAt: string | null;
    lastAccessAt: string | null;
  }[];
}

interface UserDetailModule {
  moduleId: string;
  title: string;
  progress: number;
  etapas: UserDetailEtapa[];
}

interface UserDetailResponse {
  userId: string;
  name: string;
  email: string;
  status: 'not_started' | 'in_progress' | 'completed' | 'overdue';
  totalProgress: number;
  startedAt: string | null;
  completedAt: string | null;
  lastAccess: string | null;
  modules: UserDetailModule[];
}

interface QuestionnaireResult {
  id: string;
  title: string;
  totalAttempts: number;
  avgScore: number;
  questions: {
    questionId: string;
    text: string;
    correctRate: number;
  }[];
}

/* ─────────────────────────── Helpers ─────────────────────────── */
const statusConfig = {
  not_started: { label: 'Não iniciado', color: 'bg-slate-100 text-slate-600' },
  in_progress: { label: 'Em andamento', color: 'bg-blue-100 text-blue-700' },
  completed: { label: 'Concluído', color: 'bg-green-100 text-green-700' },
  overdue: { label: 'Atrasado', color: 'bg-red-100 text-red-700' },
};

function ProgressBar({ value, className }: { value: number; className?: string }) {
  return (
    <div className={cn('w-full bg-slate-100 rounded-full h-2', className)}>
      <div
        className="bg-faktory-blue h-2 rounded-full transition-all"
        style={{ width: `${Math.min(100, Math.max(0, value))}%` }}
      />
    </div>
  );
}

function fmtDate(iso: string | null) {
  if (!iso) return '—';
  return new Date(iso).toLocaleDateString('pt-BR');
}

/* ════════════════════ UserDetailDrawer ════════════════════ */
function UserDetailDrawer({
  companyId,
  trailId,
  userId,
  userName,
  onClose,
}: {
  companyId: string;
  trailId: string;
  userId: string;
  userName: string;
  onClose: () => void;
}) {
  const [detail, setDetail] = useState<UserDetailResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [expandedModules, setExpandedModules] = useState<Set<string>>(new Set());

  useEffect(() => {
    api
      .get<UserDetailResponse>(
        `/api/companies/${companyId}/trails/${trailId}/users/${userId}/detail`
      )
      .then(d => {
        setDetail(d);
        // auto-expand primeiro módulo
        if (d.modules?.[0]) setExpandedModules(new Set([d.modules[0].moduleId]));
      })
      .catch(console.error)
      .finally(() => setLoading(false));
  }, [companyId, trailId, userId]);

  const toggleModule = (id: string) => {
    setExpandedModules(prev => {
      const n = new Set(prev);
      n.has(id) ? n.delete(id) : n.add(id);
      return n;
    });
  };

  return (
    <>
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-black/40 z-40"
        onClick={onClose}
      />
      {/* Drawer */}
      <div className="fixed right-0 top-0 h-full w-full max-w-md bg-white z-50 shadow-2xl flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-200">
          <div>
            <h2 className="font-bold text-slate-800">{userName}</h2>
            {detail && (
              <p className="text-xs text-slate-400 mt-0.5">{detail.email}</p>
            )}
          </div>
          <button onClick={onClose} className="p-1.5 rounded hover:bg-slate-100 text-slate-400">
            <X size={18} />
          </button>
        </div>

        {loading ? (
          <div className="flex-1 flex justify-center items-center">
            <Loader2 className="animate-spin text-faktory-blue" size={28} />
          </div>
        ) : detail ? (
          <div className="flex-1 overflow-y-auto p-6 space-y-5">
            {/* Summary row */}
            <div className="grid grid-cols-2 gap-3">
              {[
                { label: 'Status', value: statusConfig[detail.status]?.label ?? detail.status },
                { label: 'Progresso geral', value: `${detail.totalProgress}%` },
                { label: 'Iniciado em', value: fmtDate(detail.startedAt) },
                { label: 'Último acesso', value: fmtDate(detail.lastAccess) },
                { label: 'Concluído em', value: fmtDate(detail.completedAt) },
              ].map(item => (
                <div key={item.label} className="bg-slate-50 rounded-lg p-3">
                  <p className="text-[10px] font-bold text-slate-400 uppercase">{item.label}</p>
                  <p className="text-sm font-semibold text-slate-700 mt-0.5">{item.value}</p>
                </div>
              ))}
            </div>

            {/* Progress bar */}
            <ProgressBar value={detail.totalProgress} />

            {/* Modules accordion */}
            <div>
              <p className="text-xs font-bold text-slate-500 uppercase mb-3">Módulos</p>
              <div className="space-y-2">
                {detail.modules.map(mod => {
                  const open = expandedModules.has(mod.moduleId);
                  return (
                    <div key={mod.moduleId} className="border border-slate-200 rounded-lg overflow-hidden">
                      <button
                        onClick={() => toggleModule(mod.moduleId)}
                        className="w-full flex items-center justify-between px-4 py-3 bg-slate-50 hover:bg-slate-100 transition-colors text-left"
                      >
                        <div className="flex items-center gap-3 min-w-0">
                          <BarChart2 size={14} className="text-faktory-blue shrink-0" />
                          <span className="text-sm font-medium text-slate-700 truncate">{mod.title}</span>
                        </div>
                        <div className="flex items-center gap-2 shrink-0 ml-2">
                          <span className="text-xs text-slate-500">{mod.progress}%</span>
                          {open ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
                        </div>
                      </button>

                      {open && (
                        <div className="divide-y divide-slate-100">
                          {mod.etapas.map(etapa => (
                            <div key={etapa.etapaId} className="px-4 py-2.5">
                              <div className="flex items-center gap-2">
                                <span className={cn(
                                  'w-4 h-4 rounded-full flex items-center justify-center shrink-0 text-[10px] font-bold',
                                  etapa.completed
                                    ? 'bg-green-100 text-green-600'
                                    : 'bg-slate-100 text-slate-400'
                                )}>
                                  {etapa.completed ? '✓' : '○'}
                                </span>
                                <span className="text-sm text-slate-700 flex-1 truncate">{etapa.title}</span>
                                {etapa.completedAt && (
                                  <span className="text-[10px] text-slate-400 shrink-0">{fmtDate(etapa.completedAt)}</span>
                                )}
                              </div>

                              {etapa.subetapas && etapa.subetapas.length > 0 && (
                                <div className="mt-1.5 ml-6 space-y-1">
                                  {etapa.subetapas.map(sub => (
                                    <div key={sub.subetapaId} className="flex items-center gap-2 text-xs text-slate-500">
                                      <span className={sub.completed ? 'text-green-500' : 'text-slate-300'}>
                                        {sub.completed ? '✓' : '○'}
                                      </span>
                                      <span className="flex-1 truncate">{sub.title}</span>
                                      {sub.lastAccessAt && (
                                        <span className="text-[10px] text-slate-300">{fmtDate(sub.lastAccessAt)}</span>
                                      )}
                                    </div>
                                  ))}
                                </div>
                              )}
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        ) : (
          <div className="flex-1 flex justify-center items-center text-slate-400 text-sm">
            Não foi possível carregar os detalhes.
          </div>
        )}
      </div>
    </>
  );
}

/* ════════════════════ QuestionnaireResultsSection ════════════════════ */
function QuestionnaireResultsSection({ trailId }: { trailId: string }) {
  const [questionnaires, setQuestionnaires] = useState<{ id: string; title: string }[]>([]);
  const [results, setResults] = useState<Record<string, QuestionnaireResult>>({});
  const [loading, setLoading] = useState(true);
  const [expanded, setExpanded] = useState<string | null>(null);

  useEffect(() => {
    api
      .get<{ questionnaires?: { id: string; title: string }[] } | { id: string; title: string }[]>(
        `/api/questionnaires?trailId=${trailId}&limit=50`
      )
      .then(data => {
        const list = Array.isArray(data) ? data : (data as any).questionnaires ?? [];
        setQuestionnaires(list);
      })
      .catch(console.error)
      .finally(() => setLoading(false));
  }, [trailId]);

  const loadResults = async (qId: string) => {
    if (results[qId]) { setExpanded(qId === expanded ? null : qId); return; }
    try {
      const r = await api.get<QuestionnaireResult>(`/api/questionnaires/${qId}/results`);
      setResults(prev => ({ ...prev, [qId]: r }));
      setExpanded(qId);
    } catch (e) {
      console.error(e);
    }
  };

  if (loading || questionnaires.length === 0) return null;

  return (
    <div className="mt-6">
      <h3 className="text-sm font-bold text-slate-500 uppercase mb-3 flex items-center gap-2">
        <BarChart2 size={14} /> Questionários da trilha
      </h3>
      <div className="space-y-2">
        {questionnaires.map(q => {
          const r = results[q.id];
          const isOpen = expanded === q.id;
          return (
            <div key={q.id} className="border border-slate-200 rounded-xl overflow-hidden bg-white">
              <button
                onClick={() => loadResults(q.id)}
                className="w-full flex items-center justify-between px-5 py-3 hover:bg-slate-50 transition-colors text-left"
              >
                <span className="text-sm font-medium text-slate-700">{q.title}</span>
                <div className="flex items-center gap-3 shrink-0 ml-2">
                  {r && (
                    <span className="text-xs text-slate-500">
                      {r.totalAttempts} tentativas · Média {r.avgScore.toFixed(1)}
                    </span>
                  )}
                  {isOpen ? <ChevronUp size={14} className="text-slate-400" /> : <ChevronDown size={14} className="text-slate-400" />}
                </div>
              </button>

              {isOpen && r && (
                <div className="px-5 pb-4 border-t border-slate-100 space-y-3 pt-3">
                  <div className="grid grid-cols-2 gap-3 text-xs">
                    <div className="bg-slate-50 rounded-lg p-3">
                      <p className="text-slate-400 uppercase font-bold text-[10px]">Total de tentativas</p>
                      <p className="text-lg font-bold text-slate-800 mt-0.5">{r.totalAttempts}</p>
                    </div>
                    <div className="bg-slate-50 rounded-lg p-3">
                      <p className="text-slate-400 uppercase font-bold text-[10px]">Score médio</p>
                      <p className="text-lg font-bold text-slate-800 mt-0.5">{r.avgScore.toFixed(1)}</p>
                    </div>
                  </div>

                  {r.questions.length > 0 && (
                    <div>
                      <p className="text-[10px] font-bold text-slate-400 uppercase mb-2">Taxa de acerto por questão</p>
                      <div className="space-y-2">
                        {r.questions.map((q, i) => (
                          <div key={q.questionId}>
                            <div className="flex items-center justify-between text-xs mb-0.5">
                              <span className="text-slate-600 truncate flex-1 pr-2">Q{i + 1}. {q.text}</span>
                              <span className={cn(
                                'font-bold shrink-0',
                                q.correctRate >= 0.7 ? 'text-green-600' : q.correctRate >= 0.4 ? 'text-yellow-600' : 'text-red-600'
                              )}>
                                {Math.round(q.correctRate * 100)}%
                              </span>
                            </div>
                            <div className="w-full bg-slate-100 rounded-full h-1.5">
                              <div
                                className={cn(
                                  'h-1.5 rounded-full',
                                  q.correctRate >= 0.7 ? 'bg-green-400' : q.correctRate >= 0.4 ? 'bg-yellow-400' : 'bg-red-400'
                                )}
                                style={{ width: `${Math.round(q.correctRate * 100)}%` }}
                              />
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}

/* ════════════════════ TrailDetailView ════════════════════ */
function TrailDetailView({
  companyId,
  trailId,
  onBack,
}: {
  companyId: string;
  trailId: string;
  onBack: () => void;
}) {
  const { user: currentUser } = useAuthStore();
  const [report, setReport] = useState<TrailReport | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [expandedRows, setExpandedRows] = useState<Set<string>>(new Set());
  const [selectedUser, setSelectedUser] = useState<{ userId: string; name: string } | null>(null);

  // Enroll state
  const [showEnrollModal, setShowEnrollModal] = useState(false);
  const [companyMembers, setCompanyMembers] = useState<{ id: string; name: string; email: string }[]>([]);
  const [enrollUid, setEnrollUid] = useState('');
  const [enrolling, setEnrolling] = useState(false);
  const [enrollToast, setEnrollToast] = useState<{ type: 'success' | 'error'; message: string } | null>(null);

  const canManage = currentUser?.role === 'superadmin' || currentUser?.role === 'company_admin';

  const showEnrollToast = (type: 'success' | 'error', message: string) => {
    setEnrollToast({ type, message });
    setTimeout(() => setEnrollToast(null), 3500);
  };

  const fetchReport = useCallback(() => {
    setLoading(true);
    setError(null);
    api
      .get<TrailReport>(`/api/companies/${companyId}/trails/${trailId}/users-report`)
      .then(setReport)
      .catch(() => setError('Não foi possível carregar o relatório.'))
      .finally(() => setLoading(false));
  }, [companyId, trailId]);

  useEffect(() => {
    fetchReport();
  }, [fetchReport]);

  const openEnrollModal = () => {
    api.get<{ members: { id: string; name: string; email: string }[] }>(`/api/companies/${companyId}/members`)
      .then(data => {
        const enrolled = new Set((report?.users ?? []).map(u => u.userId));
        const available = (data.members ?? []).filter(m => !enrolled.has(m.id));
        setCompanyMembers(available);
        setEnrollUid(available[0]?.id ?? '');
        setShowEnrollModal(true);
      })
      .catch(() => showEnrollToast('error', 'Erro ao carregar membros.'));
  };

  const handleEnroll = async () => {
    if (!enrollUid) return;
    setEnrolling(true);
    try {
      const res = await api.post<{ alreadyEnrolled?: boolean }>(
        `/api/companies/${companyId}/users/${enrollUid}/enroll`,
        { trailId }
      );
      if (res.alreadyEnrolled) {
        showEnrollToast('error', 'Usuário já está matriculado nesta trilha.');
      } else {
        showEnrollToast('success', 'Usuário matriculado com sucesso!');
        setShowEnrollModal(false);
        fetchReport();
      }
    } catch {
      showEnrollToast('error', 'Erro ao matricular usuário.');
    } finally {
      setEnrolling(false);
    }
  };

  const toggleRow = (userId: string) => {
    setExpandedRows(prev => {
      const next = new Set(prev);
      next.has(userId) ? next.delete(userId) : next.add(userId);
      return next;
    });
  };

  return (
    <div className="space-y-4">
      {/* Toast */}
      {enrollToast && (
        <div className={cn(
          'fixed top-4 right-4 z-50 px-4 py-3 rounded-lg text-sm font-medium shadow-lg flex items-center gap-2',
          enrollToast.type === 'success' ? 'bg-green-600 text-white' : 'bg-red-600 text-white'
        )}>
          {enrollToast.type === 'success' ? <Check size={16} /> : <AlertCircle size={16} />}
          {enrollToast.message}
        </div>
      )}

      <div className="flex items-center justify-between gap-3 flex-wrap">
        <button
          onClick={onBack}
          className="flex items-center gap-1.5 text-sm text-slate-500 hover:text-slate-800 transition-colors"
        >
          <ArrowLeft size={16} /> Voltar para trilhas
        </button>
        {canManage && (
          <button
            onClick={openEnrollModal}
            className="flex items-center gap-1.5 bg-faktory-blue text-white text-sm font-medium px-4 py-2 rounded-lg hover:opacity-90 transition-opacity"
          >
            <Plus size={16} /> Matricular usuário
          </button>
        )}
      </div>

      {/* Enroll Modal */}
      {showEnrollModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-md p-6 space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-bold text-slate-800">Matricular usuário</h2>
              <button onClick={() => setShowEnrollModal(false)} className="text-slate-400 hover:text-slate-600">✕</button>
            </div>
            {companyMembers.length === 0 ? (
              <p className="text-sm text-slate-500">Todos os membros já estão matriculados nesta trilha.</p>
            ) : (
              <>
                <p className="text-sm text-slate-600">Selecione o usuário para matricular nesta trilha:</p>
                <select
                  value={enrollUid}
                  onChange={e => setEnrollUid(e.target.value)}
                  className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-faktory-blue"
                >
                  {companyMembers.map(m => (
                    <option key={m.id} value={m.id}>{m.name} — {m.email}</option>
                  ))}
                </select>
              </>
            )}
            <div className="flex gap-3 pt-1">
              <button
                onClick={() => setShowEnrollModal(false)}
                className="flex-1 border border-slate-200 text-slate-600 rounded-lg py-2 text-sm hover:bg-slate-50"
              >
                Cancelar
              </button>
              {companyMembers.length > 0 && (
                <button
                  onClick={handleEnroll}
                  disabled={!enrollUid || enrolling}
                  className="flex-1 bg-faktory-blue text-white rounded-lg py-2 text-sm font-medium hover:opacity-90 disabled:opacity-50"
                >
                  {enrolling ? 'Matriculando…' : 'Matricular'}
                </button>
              )}
            </div>
          </div>
        </div>
      )}

      {loading && (
        <div className="flex justify-center py-20">
          <Loader2 className="animate-spin text-faktory-blue" size={32} />
        </div>
      )}

      {error && (
        <div className="flex items-center gap-2 text-red-600 bg-red-50 rounded-lg p-4 text-sm">
          <AlertCircle size={16} /> {error}
        </div>
      )}

      {report && (
        <>
          <div>
            <h2 className="text-xl font-bold text-slate-800">{report.trailTitle}</h2>
            <p className="text-xs text-slate-400 mt-0.5">
              Relatório gerado em {fmtDate(report.generatedAt)}
            </p>
          </div>

          {report.users.length === 0 ? (
            <div className="bg-white rounded-xl border border-slate-200 p-12 text-center">
              <Users size={40} className="mx-auto text-slate-300 mb-3" />
              <p className="text-slate-500 font-medium">Nenhum usuário nessa trilha.</p>
            </div>
          ) : (
            <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
              <table className="w-full text-sm">
                <thead className="bg-slate-50 border-b border-slate-200">
                  <tr>
                    <th className="text-left px-5 py-3 text-xs font-bold text-slate-500 uppercase">Nome</th>
                    <th className="text-left px-5 py-3 text-xs font-bold text-slate-500 uppercase hidden md:table-cell">Último acesso</th>
                    <th className="text-left px-5 py-3 text-xs font-bold text-slate-500 uppercase">Status</th>
                    <th className="text-left px-5 py-3 text-xs font-bold text-slate-500 uppercase">Progresso</th>
                    <th className="px-5 py-3 w-10" />
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {report.users.map(u => {
                    const expanded = expandedRows.has(u.userId);
                    const cfg = statusConfig[u.status] ?? statusConfig.not_started;
                    return (
                      <>
                        <tr
                          key={u.userId}
                          className="hover:bg-slate-50 transition-colors cursor-pointer"
                          onClick={() => toggleRow(u.userId)}
                        >
                          <td className="px-5 py-3">
                            <button
                              className="font-medium text-faktory-blue hover:underline text-left"
                              onClick={e => { e.stopPropagation(); setSelectedUser({ userId: u.userId, name: u.name }); }}
                            >
                              {u.name}
                            </button>
                            <p className="text-xs text-slate-400">{u.email}</p>
                          </td>
                          <td className="px-5 py-3 text-slate-500 hidden md:table-cell">{fmtDate(u.lastAccess)}</td>
                          <td className="px-5 py-3">
                            <span className={cn('px-2 py-0.5 rounded-full text-xs font-medium', cfg.color)}>
                              {cfg.label}
                            </span>
                          </td>
                          <td className="px-5 py-3">
                            <div className="flex items-center gap-2">
                              <ProgressBar value={u.totalProgress} className="w-24" />
                              <span className="text-xs text-slate-500 w-8 text-right">{u.totalProgress}%</span>
                            </div>
                          </td>
                          <td className="px-5 py-3 text-slate-400">
                            {expanded ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
                          </td>
                        </tr>

                        {expanded && (
                          <tr key={`${u.userId}-detail`} className="bg-slate-50">
                            <td colSpan={5} className="px-8 py-3">
                              <p className="text-xs font-bold text-slate-500 uppercase mb-2">Progresso por módulo</p>
                              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                                {u.moduleProgress.map(m => (
                                  <div key={m.moduleId} className="bg-white rounded-lg border border-slate-200 p-3">
                                    <p className="text-xs font-medium text-slate-700 mb-1 truncate">{m.title}</p>
                                    <ProgressBar value={m.progress} />
                                    <p className="text-xs text-slate-400 mt-1">
                                      {m.completedLessons}/{m.totalLessons} aulas · {m.progress}%
                                    </p>
                                  </div>
                                ))}
                              </div>
                              <div className="flex gap-4 mt-3 text-xs text-slate-400">
                                <span>Iniciado: {fmtDate(u.startedAt)}</span>
                                <span>Concluído: {fmtDate(u.completedAt)}</span>
                              </div>
                            </td>
                          </tr>
                        )}
                      </>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
          <QuestionnaireResultsSection trailId={trailId} />
        </>
      )}

      {selectedUser && (
        <UserDetailDrawer
          companyId={companyId}
          trailId={trailId}
          userId={selectedUser.userId}
          userName={selectedUser.name}
          onClose={() => setSelectedUser(null)}
        />
      )}
    </div>
  );
}
function ProjetosTab({ companyId }: { companyId: string }) {
  const [trails, setTrails] = useState<TrailCard[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedTrailId, setSelectedTrailId] = useState<string | null>(null);

  useEffect(() => {
    api
      .get<{ trails: TrailCard[] }>(`/api/companies/${companyId}/trails-with-users`)
      .then(data => {
        const mapped = (data.trails ?? []).map(t => {
          const users = t.users ?? [];
          const avgProgress =
            users.length > 0
              ? Math.round(users.reduce((sum, u) => sum + ((u as any).totalProgress ?? 0), 0) / users.length)
              : 0;
          const statusCounts = {
            not_started: users.filter(u => (u as any).status === 'not_started').length,
            in_progress: users.filter(u => (u as any).status === 'in_progress').length,
            completed: users.filter(u => (u as any).status === 'completed').length,
            overdue: users.filter(u => (u as any).status === 'overdue').length,
          };
          return { ...t, avgProgress, statusCounts };
        });
        setTrails(mapped);
      })
      .catch(console.error)
      .finally(() => setLoading(false));
  }, [companyId]);

  if (selectedTrailId) {
    return (
      <TrailDetailView
        companyId={companyId}
        trailId={selectedTrailId}
        onBack={() => setSelectedTrailId(null)}
      />
    );
  }

  if (loading) {
    return (
      <div className="flex justify-center py-20">
        <Loader2 className="animate-spin text-faktory-blue" size={32} />
      </div>
    );
  }

  if (trails.length === 0) {
    return (
      <div className="bg-white rounded-xl border border-slate-200 p-12 text-center">
        <BookOpen size={40} className="mx-auto text-slate-300 mb-3" />
        <p className="text-slate-500 font-medium">Nenhuma trilha com alunos matriculados.</p>
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-5">
      {trails.map(trail => (
        <div
          key={trail.id}
          className="bg-white rounded-xl border border-slate-200 p-5 flex flex-col gap-4 hover:shadow-md transition-shadow"
        >
          <div>
            <h3 className="font-semibold text-slate-800 leading-snug">{trail.title}</h3>
            {trail.description && (
              <p className="text-xs text-slate-400 mt-1 line-clamp-2">{trail.description}</p>
            )}
          </div>
          <div className="space-y-1">
            <div className="flex justify-between text-xs text-slate-500">
              <span>Progresso médio</span>
              <span>{trail.avgProgress ?? 0}%</span>
            </div>
            <ProgressBar value={trail.avgProgress ?? 0} />
          </div>
          {trail.statusCounts && (
            <div className="grid grid-cols-2 gap-2 text-xs">
              {(
                [
                  ['not_started', 'Não iniciados'],
                  ['in_progress', 'Em andamento'],
                  ['completed', 'Concluídos'],
                  ['overdue', 'Atrasados'],
                ] as const
              ).map(([key, label]) => (
                <div key={key} className={cn('rounded-lg px-3 py-2 font-medium', statusConfig[key].color)}>
                  <span className="text-lg font-bold">{trail.statusCounts![key]}</span>
                  <p className="opacity-80">{label}</p>
                </div>
              ))}
            </div>
          )}
          <button
            onClick={() => setSelectedTrailId(trail.id)}
            className="mt-auto w-full text-center text-sm font-medium text-faktory-blue border border-faktory-blue rounded-lg py-2 hover:bg-faktory-blue hover:text-white transition-colors"
          >
            Ver detalhes
          </button>
        </div>
      ))}
    </div>
  );
}

/* ════════════════════ TrilhasLiberadasTab ════════════════════ */
function TrilhasLiberadasTab({ companyId }: { companyId: string }) {
  const { user: currentUser } = useAuthStore();
  const canManage = currentUser?.role === 'superadmin';

  const [allowedTrailIds, setAllowedTrailIds] = useState<string[]>([]);
  const [allowedTrails, setAllowedTrails] = useState<{ id: string; title: string; description?: string; moduleCount?: number }[]>([]);
  const [loading, setLoading] = useState(true);

  const [showAddModal, setShowAddModal] = useState(false);
  const [allTrails, setAllTrails] = useState<{ id: string; title: string }[]>([]);
  const [loadingAll, setLoadingAll] = useState(false);
  const [addingTrail, setAddingTrail] = useState<string | null>(null);
  const [removingTrail, setRemovingTrail] = useState<string | null>(null);
  const [toast, setToast] = useState<{ type: 'success' | 'error'; message: string } | null>(null);

  const showToast = (type: 'success' | 'error', message: string) => {
    setToast({ type, message });
    setTimeout(() => setToast(null), 3500);
  };

  const fetchAllowed = useCallback(async () => {
    setLoading(true);
    try {
      const [company, allT] = await Promise.all([
        api.get<any>(`/api/companies/${companyId}`),
        api.get<any[]>('/api/trails'),
      ]);
      const ids: string[] = Array.isArray(company.allowedTrails) ? company.allowedTrails : [];
      setAllowedTrailIds(ids);
      const trailMap = new Map((allT ?? []).map((t: any) => [t.id, t]));
      setAllowedTrails(ids.map(id => {
        const t = trailMap.get(id) as any;
        return t ? { id, title: t.title, description: t.description, moduleCount: t.moduleCount } : { id, title: id };
      }));
      setAllTrails((allT ?? []).map((t: any) => ({ id: t.id, title: t.title })));
    } catch {
      showToast('error', 'Erro ao carregar trilhas.');
    } finally {
      setLoading(false);
    }
  }, [companyId]);

  useEffect(() => { fetchAllowed(); }, [fetchAllowed]);

  const openAddModal = async () => {
    setShowAddModal(true);
    if (allTrails.length === 0) {
      setLoadingAll(true);
      try {
        const data = await api.get<any[]>('/api/trails');
        setAllTrails((data ?? []).map((t: any) => ({ id: t.id, title: t.title })));
      } catch {
        showToast('error', 'Erro ao carregar trilhas.');
      } finally {
        setLoadingAll(false);
      }
    }
  };

  const handleAddTrail = async (trailId: string) => {
    setAddingTrail(trailId);
    try {
      const newAllowed = [...allowedTrailIds, trailId];
      await api.patch(`/api/companies/${companyId}`, { allowedTrails: newAllowed });
      showToast('success', 'Trilha liberada para a empresa.');
      setShowAddModal(false);
      fetchAllowed();
    } catch {
      showToast('error', 'Erro ao liberar trilha.');
    } finally {
      setAddingTrail(null);
    }
  };

  const handleRemoveTrail = async (trailId: string, trailTitle: string) => {
    if (!confirm(`Remover acesso à trilha "${trailTitle}" desta empresa?\n\nOs alunos perderão acesso, mas o histórico de progresso é preservado.`)) return;
    setRemovingTrail(trailId);
    try {
      const newAllowed = allowedTrailIds.filter(id => id !== trailId);
      await api.patch(`/api/companies/${companyId}`, { allowedTrails: newAllowed });
      showToast('success', 'Trilha removida.');
      fetchAllowed();
    } catch {
      showToast('error', 'Erro ao remover trilha.');
    } finally {
      setRemovingTrail(null);
    }
  };

  const availableToAdd = allTrails.filter(t => !allowedTrailIds.includes(t.id));

  return (
    <>
      {toast && (
        <div className={cn('fixed top-4 right-4 z-50 px-4 py-3 rounded-lg text-sm font-medium shadow-lg flex items-center gap-2', toast.type === 'success' ? 'bg-green-600 text-white' : 'bg-red-600 text-white')}>
          {toast.type === 'success' ? <Check size={16} /> : <AlertCircle size={16} />}
          {toast.message}
        </div>
      )}

      {canManage && (
        <div className="flex justify-end mb-4">
          <button
            onClick={openAddModal}
            className="flex items-center gap-1.5 bg-faktory-blue text-white text-sm font-medium px-4 py-2 rounded-lg hover:opacity-90 transition-opacity"
          >
            <Unlock size={14} /> Liberar trilha
          </button>
        </div>
      )}

      {loading ? (
        <div className="flex justify-center py-16"><Loader2 className="animate-spin text-faktory-blue" size={28} /></div>
      ) : allowedTrails.length === 0 ? (
        <div className="bg-white rounded-xl border border-slate-200 p-12 text-center">
          <Lock size={40} className="mx-auto text-slate-300 mb-3" />
          <p className="text-slate-500 font-medium">Nenhuma trilha liberada para esta empresa.</p>
          {canManage && (
            <button onClick={openAddModal} className="mt-4 text-sm text-faktory-blue underline">
              Liberar primeira trilha
            </button>
          )}
        </div>
      ) : (
        <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-slate-50 border-b border-slate-200">
              <tr>
                <th className="text-left px-5 py-3 text-xs font-bold text-slate-500 uppercase">Trilha</th>
                <th className="text-left px-5 py-3 text-xs font-bold text-slate-500 uppercase hidden sm:table-cell">Módulos</th>
                {canManage && <th className="px-5 py-3 w-20" />}
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {allowedTrails.map(t => (
                <tr key={t.id} className="hover:bg-slate-50 transition-colors">
                  <td className="px-5 py-3">
                    <p className="font-medium text-slate-800">{t.title}</p>
                    {t.description && <p className="text-xs text-slate-400 mt-0.5 line-clamp-1">{t.description}</p>}
                  </td>
                  <td className="px-5 py-3 hidden sm:table-cell text-slate-500 text-xs">
                    {t.moduleCount != null ? `${t.moduleCount} módulo(s)` : '—'}
                  </td>
                  {canManage && (
                    <td className="px-5 py-3 text-right">
                      <button
                        onClick={() => handleRemoveTrail(t.id, t.title)}
                        disabled={removingTrail === t.id}
                        title="Remover acesso"
                        className="p-1.5 rounded hover:bg-red-50 text-slate-400 hover:text-red-600 transition-colors"
                      >
                        {removingTrail === t.id ? <Loader2 size={14} className="animate-spin" /> : <Trash2 size={14} />}
                      </button>
                    </td>
                  )}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {showAddModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-md p-6 space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-bold text-slate-800">Liberar trilha para a empresa</h2>
              <button onClick={() => setShowAddModal(false)} className="text-slate-400 hover:text-slate-600"><X size={18} /></button>
            </div>
            {loadingAll ? (
              <div className="flex justify-center py-8"><Loader2 className="animate-spin text-faktory-blue" size={24} /></div>
            ) : availableToAdd.length === 0 ? (
              <p className="text-sm text-slate-500 text-center py-6">Todas as trilhas disponíveis já estão liberadas para esta empresa.</p>
            ) : (
              <div className="space-y-2 max-h-80 overflow-y-auto">
                {availableToAdd.map(t => (
                  <div key={t.id} className="flex items-center justify-between gap-3 p-3 rounded-lg border border-slate-200 hover:bg-slate-50">
                    <div className="flex items-center gap-2">
                      <BookOpen size={14} className="text-faktory-blue shrink-0" />
                      <span className="text-sm text-slate-700">{t.title}</span>
                    </div>
                    <button
                      onClick={() => handleAddTrail(t.id)}
                      disabled={!!addingTrail}
                      className="shrink-0 flex items-center gap-1 text-xs bg-faktory-blue text-white px-3 py-1.5 rounded-lg hover:opacity-90 disabled:opacity-50"
                    >
                      {addingTrail === t.id ? <Loader2 size={11} className="animate-spin" /> : <Unlock size={11} />}
                      Liberar
                    </button>
                  </div>
                ))}
              </div>
            )}
            <button onClick={() => setShowAddModal(false)} className="w-full border border-slate-200 text-slate-600 rounded-lg py-2 text-sm hover:bg-slate-50">Fechar</button>
          </div>
        </div>
      )}
    </>
  );
}

/* ════════════════════ MembrosTab ════════════════════ */
function MembrosTab({
  companyId,
  readOnly,
}: {
  companyId: string;
  readOnly: boolean;
}) {
  const { user: currentUser } = useAuthStore();
  const [members, setMembers] = useState<Member[]>([]);
  const [pendingInvites, setPendingInvites] = useState<PendingInvite[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');

  // Invite modal state
  const [inviteEmail, setInviteEmail] = useState('');
  const [inviteName, setInviteName] = useState('');
  const [inviteRole, setInviteRole] = useState('student');
  const [showInviteModal, setShowInviteModal] = useState(false);
  const [inviting, setInviting] = useState(false);
  const [inviteUrl, setInviteUrl] = useState<string | null>(null);
  const [toast, setToast] = useState<{ type: 'success' | 'error'; message: string } | null>(null);

  const showToast = (type: 'success' | 'error', message: string) => {
    setToast({ type, message });
    setTimeout(() => setToast(null), 3500);
  };

  const fetchMembers = useCallback(async () => {
    setLoading(true);
    try {
      const data = await api.get<{ members: Member[]; pendingInvites: PendingInvite[] }>(
        `/api/companies/${companyId}/members`
      );
      setMembers(data.members ?? []);
      setPendingInvites(data.pendingInvites ?? []);
    } catch {
      showToast('error', 'Erro ao carregar membros.');
    } finally {
      setLoading(false);
    }
  }, [companyId]);

  useEffect(() => {
    fetchMembers();
  }, [fetchMembers]);

  const filtered = members.filter(
    m =>
      m.name.toLowerCase().includes(search.toLowerCase()) ||
      m.email.toLowerCase().includes(search.toLowerCase())
  );

  const statusBadge = (status?: string) => {
    if (status === 'pending') return 'bg-yellow-100 text-yellow-700';
    if (status === 'inactive') return 'bg-slate-100 text-slate-500';
    return 'bg-green-100 text-green-700';
  };
  const statusLabel = (status?: string) => {
    if (status === 'pending') return 'Pendente';
    if (status === 'inactive') return 'Inativo';
    return 'Ativo';
  };

  const handleInvite = async () => {
    if (!inviteEmail) return;
    setInviting(true);
    setInviteUrl(null);
    try {
      const res = await api.post<{ inviteToken: string; expiresAt: string; inviteUrl?: string; emailSent: boolean }>(
        `/api/companies/${companyId}/invite`,
        { email: inviteEmail, name: inviteName || undefined }
      );
      if (res.emailSent === false && res.inviteUrl) {
        setInviteUrl(res.inviteUrl);
        showToast('success', 'Convite criado! Copie o link abaixo.');
      } else {
        showToast('success', 'Convite enviado por e-mail!');
        setShowInviteModal(false);
      }
      setInviteEmail('');
      setInviteName('');
      setInviteRole('student');
      fetchMembers();
    } catch (err: any) {
      if (err?.status === 409) {
        showToast('error', 'Já existe um convite pendente para este e-mail. Copie o link na tabela abaixo.');
        fetchMembers();
      } else {
        showToast('error', 'Erro ao enviar convite.');
      }
    } finally {
      setInviting(false);
    }
  };

  const handleDeleteMember = async (uid: string) => {
    if (!confirm('Tem certeza que deseja remover este membro?')) return;
    try {
      await api.delete(`/api/users/${uid}`);
      showToast('success', 'Membro removido.');
      fetchMembers();
    } catch {
      showToast('error', 'Erro ao remover membro.');
    }
  };

  const handleResetPassword = async (email: string) => {
    try {
      await api.post('/api/auth/forgot-password', { email });
      showToast('success', 'E-mail de redefinição enviado.');
    } catch {
      showToast('error', 'Erro ao enviar e-mail.');
    }
  };

  const handleChangeRole = async (uid: string, newRole: string) => {
    try {
      await api.put(`/api/users/${uid}`, { role: newRole });
      showToast('success', 'Papel atualizado.');
      fetchMembers();
    } catch {
      showToast('error', 'Erro ao atualizar papel.');
    }
  };

  const isSuperAdmin = currentUser?.role === 'superadmin';
  const isCompanyAdmin = currentUser?.role === 'company_admin';
  const canManageMembers = isSuperAdmin || isCompanyAdmin;

  return (
    <div className="space-y-5">
      {/* Toast */}
      {toast && (
        <div
          className={cn(
            'fixed top-4 right-4 z-50 px-4 py-3 rounded-lg text-sm font-medium shadow-lg flex items-center gap-2',
            toast.type === 'success' ? 'bg-green-600 text-white' : 'bg-red-600 text-white'
          )}
        >
          {toast.type === 'success' ? <Check size={16} /> : <AlertCircle size={16} />}
          {toast.message}
        </div>
      )}

      {/* Header */}
      <div className="flex items-center justify-between gap-3 flex-wrap">
        <input
          type="text"
          placeholder="Buscar membro…"
          value={search}
          onChange={e => setSearch(e.target.value)}
          className="flex-1 min-w-[200px] max-w-xs border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-faktory-blue"
        />
        <button
          onClick={() => setShowInviteModal(true)}
          className="flex items-center gap-1.5 bg-faktory-blue text-white text-sm font-medium px-4 py-2 rounded-lg hover:opacity-90 transition-opacity"
        >
          <Plus size={16} /> Convidar membro
        </button>
      </div>

      {/* Members table */}
      {loading ? (
        <div className="flex justify-center py-16">
          <Loader2 className="animate-spin text-faktory-blue" size={28} />
        </div>
      ) : (
        <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-slate-50 border-b border-slate-200">
              <tr>
                <th className="text-left px-5 py-3 text-xs font-bold text-slate-500 uppercase">Membro</th>
                <th className="text-left px-5 py-3 text-xs font-bold text-slate-500 uppercase hidden sm:table-cell">Papel</th>
                <th className="text-left px-5 py-3 text-xs font-bold text-slate-500 uppercase hidden md:table-cell">Status</th>
                {canManageMembers && (
                  <th className="text-right px-5 py-3 text-xs font-bold text-slate-500 uppercase">Ações</th>
                )}
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filtered.map(member => (
                <tr key={member.id} className="hover:bg-slate-50 transition-colors">
                  <td className="px-5 py-3">
                    <p className="font-medium text-slate-800">{member.name}</p>
                    <p className="text-xs text-slate-400">{member.email}</p>
                  </td>
                  <td className="px-5 py-3 hidden sm:table-cell">
                    {isSuperAdmin ? (
                      <select
                        value={member.role}
                        onChange={e => handleChangeRole(member.id, e.target.value)}
                        className="text-xs border border-slate-200 rounded px-2 py-1 focus:outline-none focus:ring-1 focus:ring-faktory-blue"
                      >
                        <option value="student">Aluno</option>
                        <option value="company_admin">Admin</option>
                        <option value="superadmin">Superadmin</option>
                      </select>
                    ) : (
                      <span className="text-slate-600">{member.role}</span>
                    )}
                  </td>
                  <td className="px-5 py-3 hidden md:table-cell">
                    <span className={cn('px-2 py-0.5 rounded-full text-xs font-medium', statusBadge(member.status))}>
                      {statusLabel(member.status)}
                    </span>
                  </td>
                  {canManageMembers && (
                    <td className="px-5 py-3">
                      <div className="flex items-center justify-end gap-2">
                        <button
                          onClick={() => handleResetPassword(member.email)}
                          title="Redefinir senha"
                          className="p-1.5 rounded hover:bg-slate-100 text-slate-500 hover:text-faktory-blue transition-colors"
                        >
                          <KeyRound size={15} />
                        </button>
                        {isSuperAdmin && (
                          <button
                            onClick={() => handleDeleteMember(member.id)}
                            title="Remover membro"
                            className="p-1.5 rounded hover:bg-red-50 text-slate-500 hover:text-red-600 transition-colors"
                          >
                            <Trash2 size={15} />
                          </button>
                        )}
                      </div>
                    </td>
                  )}
                </tr>
              ))}
              {filtered.length === 0 && (
                <tr>
                  <td colSpan={canManageMembers ? 4 : 3} className="px-5 py-10 text-center text-slate-400 text-sm">
                    Nenhum membro encontrado.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      )}

      {/* Pending invites */}
      {pendingInvites.length > 0 && (
        <div>
          <h3 className="text-sm font-bold text-slate-500 uppercase mb-3 flex items-center gap-2">
            <Clock size={14} /> Convites pendentes
          </h3>
          <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
            <table className="w-full text-sm">
              <thead className="bg-slate-50 border-b border-slate-200">
                <tr>
                  <th className="text-left px-5 py-3 text-xs font-bold text-slate-500 uppercase">E-mail</th>
                  <th className="text-left px-5 py-3 text-xs font-bold text-slate-500 uppercase hidden md:table-cell">Nome</th>
                  <th className="text-left px-5 py-3 text-xs font-bold text-slate-500 uppercase">Expira em</th>
                  <th className="px-5 py-3"></th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {pendingInvites.map(invite => (
                  <tr key={invite.token} className="hover:bg-slate-50">
                    <td className="px-5 py-3 text-slate-700">{invite.email ?? invite.invitedEmail ?? '—'}</td>
                    <td className="px-5 py-3 text-slate-500 hidden md:table-cell">{invite.name ?? invite.invitedName ?? '—'}</td>
                    <td className="px-5 py-3 text-slate-500">{fmtDate(invite.expiresAt)}</td>
                    <td className="px-5 py-3 text-right">
                      <div className="flex items-center justify-end gap-3">
                        <button
                          onClick={() => {
                            const url = `${window.location.origin}/cadastro?invite=${invite.token}`;
                            navigator.clipboard.writeText(url);
                            showToast('success', 'Link de convite copiado!');
                          }}
                          className="text-xs text-faktory-blue hover:underline font-medium"
                        >
                          Copiar link
                        </button>
                        <button
                          onClick={async () => {
                            if (!confirm(`Cancelar convite para ${invite.email ?? invite.invitedEmail ?? 'este e-mail'}?`)) return;
                            try {
                              await api.delete(`/api/invites/${invite.token}`);
                              showToast('success', 'Convite cancelado.');
                              fetchMembers();
                            } catch {
                              showToast('error', 'Erro ao cancelar convite.');
                            }
                          }}
                          className="text-xs text-red-500 hover:underline font-medium"
                        >
                          Cancelar
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Invite Modal */}
      {showInviteModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-md p-6 space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-bold text-slate-800">Convidar membro</h2>
              <button
                onClick={() => setShowInviteModal(false)}
                className="text-slate-400 hover:text-slate-600"
              >
                ✕
              </button>
            </div>
            <div className="space-y-3">
              <div>
                <label className="block text-xs font-medium text-slate-600 mb-1">E-mail *</label>
                <input
                  type="email"
                  value={inviteEmail}
                  onChange={e => setInviteEmail(e.target.value)}
                  className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-faktory-blue"
                  placeholder="email@empresa.com"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-slate-600 mb-1">Nome</label>
                <input
                  type="text"
                  value={inviteName}
                  onChange={e => setInviteName(e.target.value)}
                  className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-faktory-blue"
                  placeholder="Nome completo"
                />
              </div>
              {isSuperAdmin && (
                <div>
                  <label className="block text-xs font-medium text-slate-600 mb-1">Papel</label>
                  <select
                    value={inviteRole}
                    onChange={e => setInviteRole(e.target.value)}
                    className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-faktory-blue"
                  >
                    <option value="student">Aluno</option>
                    <option value="company_admin">Admin da empresa</option>
                  </select>
                </div>
              )}
            </div>
            {inviteUrl && (
              <div className="bg-slate-50 border border-slate-200 rounded-lg p-3 space-y-1">
                <p className="text-xs font-bold text-slate-500 uppercase">E-mail não enviado — copie o link:</p>
                <div className="flex items-center gap-2">
                  <input
                    readOnly
                    value={inviteUrl}
                    className="flex-1 text-xs bg-white border border-slate-200 rounded px-2 py-1.5 text-slate-700 font-mono truncate"
                    onClick={e => (e.target as HTMLInputElement).select()}
                  />
                  <button
                    onClick={() => { navigator.clipboard.writeText(inviteUrl); showToast('success', 'Link copiado!'); }}
                    className="shrink-0 text-xs bg-faktory-blue text-white px-3 py-1.5 rounded hover:opacity-90"
                  >
                    Copiar
                  </button>
                </div>
              </div>
            )}
            <div className="flex gap-3 pt-1">
              <button
                onClick={() => { setShowInviteModal(false); setInviteUrl(null); }}
                className="flex-1 border border-slate-200 text-slate-600 rounded-lg py-2 text-sm hover:bg-slate-50"
              >
                {inviteUrl ? 'Fechar' : 'Cancelar'}
              </button>
              {!inviteUrl && (
                <button
                  onClick={handleInvite}
                  disabled={!inviteEmail || inviting}
                  className="flex-1 bg-faktory-blue text-white rounded-lg py-2 text-sm font-medium hover:opacity-90 disabled:opacity-50"
                >
                  {inviting ? 'Enviando…' : 'Enviar convite'}
                </button>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

/* ════════════════════ ClienteDetail (main) ════════════════════ */
interface ClienteDetailProps {
  companyId?: string;
  readOnly?: boolean;
}

export default function ClienteDetail({ companyId: companyIdProp, readOnly = false }: ClienteDetailProps) {
  const { id: idParam } = useParams<{ id: string }>();
  const companyId = companyIdProp ?? idParam ?? '';

  const [company, setCompany] = useState<CompanyData | null>(null);

  useEffect(() => {
    if (!companyId) return;
    api.get<CompanyData>(`/api/companies/${companyId}`)
      .then(setCompany)
      .catch(console.error);
  }, [companyId]);

  const [searchParams, setSearchParams] = useSearchParams();
  const activeTab = (searchParams.get('tab') ?? 'membros') as 'membros' | 'projetos' | 'trilhas';

  const setTab = (tab: 'membros' | 'projetos' | 'trilhas') => {
    setSearchParams({ tab });
  };

  if (!companyId) {
    return (
      <div className="text-center py-20 text-slate-400 text-sm">ID da empresa não encontrado.</div>
    );
  }

  const tabs = [
    { key: 'membros' as const, label: 'Membros', icon: Users },
    { key: 'projetos' as const, label: 'Projetos', icon: Layers },
    { key: 'trilhas' as const, label: 'Trilhas Liberadas', icon: BookOpen },
  ];

  return (
    <div className="space-y-6">
      {/* Company header */}
      {company && (
        <div className="bg-white rounded-xl border border-slate-200 px-6 py-5 flex items-center gap-5">
          <div className="w-12 h-12 bg-blue-50 rounded-xl flex items-center justify-center text-faktory-blue shrink-0">
            <Building2 size={22} />
          </div>
          <div className="flex-1 min-w-0">
            <h1 className="text-xl font-bold text-slate-800 truncate">{company.name}</h1>
            <div className="flex flex-wrap gap-x-4 gap-y-1 mt-1 text-xs text-slate-400">
              {company.cnpj && <span>CNPJ: {company.cnpj}</span>}
              {company.city && company.uf && <span>{company.city} — {company.uf}</span>}
              {company.createdAt && (
                <span className="flex items-center gap-1">
                  <Calendar size={11} /> Cliente desde {fmtDate(company.createdAt)}
                </span>
              )}
              {company.allowedTrails && (
                <span className="flex items-center gap-1">
                  <BookOpen size={11} /> {company.allowedTrails.length} trilha(s) liberada(s)
                </span>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Tab bar */}
      <div className="border-b border-slate-200">
        <nav className="flex gap-1">
          {tabs.map(tab => {
            const Icon = tab.icon;
            const active = activeTab === tab.key;
            return (
              <button
                key={tab.key}
                onClick={() => setTab(tab.key)}
                className={cn(
                  'flex items-center gap-2 px-5 py-3 text-sm font-medium border-b-2 transition-colors',
                  active
                    ? 'border-faktory-blue text-faktory-blue'
                    : 'border-transparent text-slate-500 hover:text-slate-800'
                )}
              >
                <Icon size={16} />
                {tab.label}
              </button>
            );
          })}
        </nav>
      </div>

      {/* Tab content */}
      {activeTab === 'membros' && (
        <MembrosTab companyId={companyId} readOnly={readOnly} />
      )}
      {activeTab === 'projetos' && (
        <ProjetosTab companyId={companyId} />
      )}
      {activeTab === 'trilhas' && (
        <TrilhasLiberadasTab companyId={companyId} />
      )}
    </div>
  );
}
