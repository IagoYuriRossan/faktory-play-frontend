import React, { useCallback, useEffect, useRef, useState } from 'react';
import {
  ChevronDown, ChevronUp, Loader2, BookOpen,
  User, Users, X, Clock, BarChart2,
} from 'lucide-react';
import { api } from '../../utils/api';
import {
  Company,
  CompanyTrailsWithUsersResponse,
  TrailsUsersCountsResponse,
  TrailWithUsers,
  TrailUser,
  UserTrailStatus,
} from '../../@types';
import { cn } from '../../utils/utils';

// ── helpers ────────────────────────────────────────────────────────────────

const STATUS_LABEL: Record<UserTrailStatus, string> = {
  not_started: 'Não iniciado',
  in_progress:  'Em progresso',
  completed:    'Concluído',
  overdue:      'Atrasado',
};

const STATUS_COLOR: Record<UserTrailStatus, string> = {
  not_started: 'text-slate-500 bg-slate-100',
  in_progress:  'text-blue-600  bg-blue-50',
  completed:    'text-green-600 bg-green-50',
  overdue:      'text-red-600   bg-red-50',
};

function fmtDuration(minutes: number) {
  if (!minutes) return '--';
  const h = Math.floor(minutes / 60);
  if (h < 24) return `${h}h`;
  return `${Math.round(h / 24)}d`;
}

function fmtDate(iso: string | null | undefined) {
  if (!iso) return '--';
  return new Date(iso).toLocaleDateString('pt-BR');
}

// ── config ────────────────────────────────────────────────────────────────

/** Quantos alunos carregar por página. Mantenha entre 25–50 para equilibrar
 *  custo de leitura no Firestore e fluidez de render. */
const USERS_BATCH = 25;

// ── component ──────────────────────────────────────────────────────────────

export default function AdminProjetos() {
  const [companies, setCompanies] = useState<Company[]>([]);
  const [loading, setLoading] = useState(true);

  const [companyData, setCompanyData] = useState<Record<string, TrailWithUsers[]>>({});
  const [companyLoading, setCompanyLoading] = useState<Record<string, boolean>>({});
  const [trailCursors, setTrailCursors] = useState<Record<string, Record<string, string | null>>>({});
  const [trailUsersLoading, setTrailUsersLoading] = useState<Record<string, Record<string, boolean>>>({});
  const [expandedCompanies, setExpandedCompanies] = useState<Record<string, boolean>>({});
  const [expandedTrail, setExpandedTrail] = useState<{ companyId: string; trailId: string } | null>(null);

  const [userModal, setUserModal] = useState<{ user: TrailUser; trailTitle: string } | null>(null);
  const [userSummary, setUserSummary] = useState<any>(null);
  const [userSummaryLoading, setUserSummaryLoading] = useState(false);

  const [toast, setToast] = useState('');
  const toastRef = useRef<number | null>(null);
  // Estável: só usa setter (estável) e ref (estável) — deps []
  const showToast = useCallback((msg: string) => {
    setToast(msg);
    if (toastRef.current) window.clearTimeout(toastRef.current);
    toastRef.current = window.setTimeout(() => setToast(''), 3000);
  }, []);

  useEffect(() => {
    async function fetchCompanies() {
      try {
        const data = await api.get<Company[]>('/api/companies');
        setCompanies(data);
      } catch (err) {
        console.error('Error fetching companies:', err);
        showToast('Erro ao carregar empresas');
      } finally {
        setLoading(false);
      }
    }
    fetchCompanies();
  }, []);

  // Recria quando companyData muda (leitura direta para early-return) ou showToast muda
  const loadCompanyTrails = useCallback(async (companyId: string, forceRefresh = false, usersLimit = USERS_BATCH) => {
    if (companyData[companyId] && !forceRefresh) return;
    setCompanyLoading(prev => ({ ...prev, [companyId]: true }));
    try {
      // Busca trilhas+usuários e contagens em paralelo para reduzir latência
      const [res, countsRes] = await Promise.all([
        api.get<CompanyTrailsWithUsersResponse>(
          `/api/companies/${companyId}/trails-with-users?usersLimit=${usersLimit}`,
        ),
        api.get<TrailsUsersCountsResponse>(
          `/api/companies/${companyId}/trails-users-counts`,
        ).catch(() => null), // counts é opcional — não bloqueia se falhar
      ]);

      // Monta mapa trailId → count para merge rápido O(1)
      const countMap = new Map<string, number>(
        (countsRes?.counts ?? []).map(c => [c.trailId, c.count]),
      );

      // Merge: aplica usersCount do endpoint de contagens quando disponível
      const trails: TrailWithUsers[] = (res.trails ?? []).map(t => ({
        ...t,
        usersCount: countMap.has(t.id) ? (countMap.get(t.id) ?? t.usersCount) : t.usersCount,
      }));

      setCompanyData(prev => ({ ...prev, [companyId]: trails }));

      // Registra o cursor inicial por trilha (tipado — sem cast)
      setTrailCursors(prev => {
        const byCompany = { ...(prev[companyId] || {}) };
        trails.forEach(t => { byCompany[t.id] = t.usersCursor; });
        return { ...prev, [companyId]: byCompany };
      });
    } catch (err) {
      console.error('Error loading company trails:', err);
      showToast('Erro ao carregar trilhas da empresa');
      setCompanyData(prev => ({ ...prev, [companyId]: [] }));
    } finally {
      setCompanyLoading(prev => ({ ...prev, [companyId]: false }));
    }
  }, [companyData, showToast]);

  // Recria quando trailCursors muda (leitura dentro de attempt) ou showToast muda
  const loadMoreUsers = useCallback(async (companyId: string, trailId: string) => {
    setTrailUsersLoading(prev => ({
      ...prev,
      [companyId]: { ...(prev[companyId] ?? {}), [trailId]: true },
    }));

    // Função interna de fetch — reutilizada pelo retry
    const attempt = async () => {
      const cursor = trailCursors[companyId]?.[trailId];
      // Não envia trailId — o backend não suporta esse param;
      // o cursor já é único por trilha pois é o último uid retornado
      const url =
        `/api/companies/${companyId}/trails-with-users` +
        `?usersLimit=${USERS_BATCH}` +
        (cursor ? `&usersCursor=${cursor}` : '');

      const res = await api.get<CompanyTrailsWithUsersResponse>(url);

      // Localiza a trilha correta pelo id (não assume index 0)
      const fetched = (res.trails ?? []).find(t => t.id === trailId);
      if (fetched) {
        setCompanyData(prev => {
          const prevTrails = prev[companyId] ?? [];
          const nextTrails = prevTrails.map(t => {
            if (t.id !== trailId) return t;
            const existingIds = new Set(t.users.map(u => u.id));
            const newUsers = fetched.users.filter(u => !existingIds.has(u.id));
            return { ...t, users: [...t.users, ...newUsers] };
          });
          return { ...prev, [companyId]: nextTrails };
        });
        // Atualiza cursor (tipado — sem cast)
        setTrailCursors(prev => ({
          ...prev,
          [companyId]: { ...(prev[companyId] ?? {}), [trailId]: fetched.usersCursor },
        }));
      }
    };

    try {
      await attempt();
    } catch (firstErr) {
      // 1 retry automático após 500 ms para falhas transitórias (rede, timeout)
      console.warn('loadMoreUsers: primeira tentativa falhou, retentando em 500ms…', firstErr);
      try {
        await new Promise(resolve => setTimeout(resolve, 500));
        await attempt();
      } catch (retryErr) {
        console.error('loadMoreUsers: retry também falhou', retryErr);
        showToast('Erro ao carregar mais alunos. Tente novamente.');
      }
    } finally {
      setTrailUsersLoading(prev => ({
        ...prev,
        [companyId]: { ...(prev[companyId] ?? {}), [trailId]: false },
      }));
    }
  }, [trailCursors, showToast]);

  const toggleCompany = useCallback((companyId: string) => {
    const isOpen = !!expandedCompanies[companyId];
    setExpandedCompanies(prev => ({ ...prev, [companyId]: !isOpen }));
    if (!isOpen) loadCompanyTrails(companyId);
  }, [expandedCompanies, loadCompanyTrails]);

  const toggleTrail = useCallback((companyId: string, trailId: string) => {
    const same =
      expandedTrail?.companyId === companyId && expandedTrail?.trailId === trailId;
    setExpandedTrail(same ? null : { companyId, trailId });
  }, [expandedTrail]);

  // Só usa setters estáveis — deps []
  const openUserModal = useCallback(async (user: TrailUser, trailTitle: string) => {
    setUserModal({ user, trailTitle });
    setUserSummary(null);
    setUserSummaryLoading(true);
    try {
      const summary = await api.get<any>(`/api/reports/user/${user.id}/trails-summary`);
      setUserSummary(summary);
    } catch (err) {
      console.error('Error fetching user summary:', err);
    } finally {
      setUserSummaryLoading(false);
    }
  }, []);

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <Loader2 className="animate-spin text-faktory-blue" size={40} />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-slate-800">Gestão de Projetos</h1>
        <p className="text-slate-500 text-sm mt-1">
          Empresas, trilhas ativas e progresso dos usuários.
        </p>
      </div>

      <div className="space-y-4">
        {companies.length === 0 ? (
          <div className="p-12 text-center text-slate-400 bg-white rounded-xl border border-slate-200">
            Nenhuma empresa cadastrada.
          </div>
        ) : (
          companies.map(company => {
            const trails = companyData[company.id] || [];
            const isOpen = !!expandedCompanies[company.id];

            return (
              <div
                key={company.id}
                className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden"
              >
                <button
                  className="w-full flex items-center justify-between px-6 py-4 hover:bg-slate-50 transition-colors text-left"
                  onClick={() => toggleCompany(company.id)}
                >
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 bg-blue-50 rounded-lg flex items-center justify-center text-faktory-blue">
                      <Users size={18} />
                    </div>
                    <div>
                      <p className="text-sm font-bold text-slate-800">{company.name}</p>
                      <p className="text-xs text-slate-400">
                        {company.allowedTrails.length} trilha(s) permitida(s)
                      </p>
                    </div>
                  </div>
                  {isOpen
                    ? <ChevronUp size={16} className="text-slate-400" />
                    : <ChevronDown size={16} className="text-slate-400" />}
                </button>

                {isOpen && (
                  <div className="border-t border-slate-100">
                    {companyLoading[company.id] ? (
                      <div className="p-8 flex justify-center">
                        <Loader2 className="animate-spin text-faktory-blue" />
                      </div>
                    ) : trails.length === 0 ? (
                      <div className="p-6 text-sm text-slate-400 text-center">
                        Nenhuma trilha ativa para esta empresa.
                      </div>
                    ) : (
                      trails.map(trail => {
                        const isTrailOpen =
                          expandedTrail?.companyId === company.id &&
                          expandedTrail?.trailId === trail.id;

                        return (
                          <div key={trail.id} className="border-b border-slate-100 last:border-0">
                            <div
                              className="px-6 py-4 flex items-center justify-between cursor-pointer hover:bg-slate-50/60 transition-colors"
                              onClick={() => toggleTrail(company.id, trail.id)}
                            >
                              <div className="flex items-center gap-3">
                                <BookOpen size={15} className="text-orange-400 shrink-0" />
                                <div>
                                  <p className="text-sm font-bold text-slate-700">{trail.title}</p>
                                  <p className="text-xs text-slate-400 flex items-center gap-2 mt-0.5">
                                    <span className="flex items-center gap-1">
                                      <BarChart2 size={10} />
                                      {trail.modulesCount} módulo(s)
                                    </span>
                                    <span>·</span>
                                    <span className="flex items-center gap-1">
                                      <Clock size={10} />
                                      {fmtDuration(trail.estimatedDurationMinutes)}
                                    </span>
                                    <span>·</span>
                                    <span className="flex items-center gap-1">
                                      <Users size={10} />
                                      {trail.usersCount} aluno(s)
                                    </span>
                                  </p>
                                </div>
                              </div>

                              <div className="flex items-center gap-6">
                                <div className="flex items-center gap-2 min-w-[130px]">
                                  <div className="flex-1 h-1.5 bg-slate-100 rounded-full overflow-hidden">
                                    <div
                                      className="h-full bg-faktory-blue rounded-full transition-all"
                                      style={{ width: `${trail.averageProgress}%` }}
                                    />
                                  </div>
                                  <span className="text-xs font-bold text-slate-500 w-9 text-right">
                                    {trail.averageProgress}%
                                  </span>
                                </div>
                                {isTrailOpen
                                  ? <ChevronUp size={14} className="text-slate-400" />
                                  : <ChevronDown size={14} className="text-slate-400" />}
                              </div>
                            </div>

                            {isTrailOpen && (
                              <div className="px-6 pb-5">
                                {trail.users.length === 0 ? (
                                  <p className="text-sm text-slate-400 italic py-2">
                                    Nenhum aluno nesta trilha.
                                  </p>
                                ) : (
                                  <table className="w-full text-left mt-1">
                                    <thead>
                                      <tr className="border-b border-slate-100">
                                        <th className="pb-2 text-[10px] font-bold text-slate-400 uppercase tracking-wider">Aluno</th>
                                        <th className="pb-2 text-[10px] font-bold text-slate-400 uppercase tracking-wider">Status</th>
                                        <th className="pb-2 text-[10px] font-bold text-slate-400 uppercase tracking-wider">Progresso</th>
                                        <th className="pb-2 text-[10px] font-bold text-slate-400 uppercase tracking-wider">Último acesso</th>
                                        <th className="pb-2 text-[10px] font-bold text-slate-400 uppercase tracking-wider">Início</th>
                                      </tr>
                                    </thead>
                                    <tbody className="divide-y divide-slate-50">
                                      {trail.users.map(u => (
                                        <tr key={u.id} className="hover:bg-slate-50/50 transition-colors">
                                          <td className="py-2.5 pr-4">
                                            <button
                                              className="flex items-center gap-2 text-left"
                                              onClick={() => openUserModal(u, trail.title)}
                                            >
                                              {u.avatarUrl ? (
                                                <img
                                                  src={u.avatarUrl}
                                                  alt={u.name}
                                                  className="w-7 h-7 rounded-full object-cover shrink-0"
                                                />
                                              ) : (
                                                <div className="w-7 h-7 bg-blue-50 rounded-full flex items-center justify-center text-faktory-blue shrink-0">
                                                  <User size={12} />
                                                </div>
                                              )}
                                              <div>
                                                <p className="text-sm font-semibold text-slate-700 hover:underline leading-tight">
                                                  {u.name}
                                                </p>
                                                <p className="text-[10px] text-slate-400">{u.email}</p>
                                              </div>
                                            </button>
                                          </td>

                                          <td className="py-2.5 pr-4">
                                            <span
                                              className={cn(
                                                'text-[10px] font-bold px-2 py-0.5 rounded-full',
                                                STATUS_COLOR[u.userTrail.status],
                                              )}
                                            >
                                              {STATUS_LABEL[u.userTrail.status]}
                                            </span>
                                          </td>

                                          <td className="py-2.5 pr-4">
                                            <div className="flex items-center gap-2">
                                              <div className="w-16 h-1.5 bg-slate-100 rounded-full overflow-hidden">
                                                <div
                                                  className="h-full bg-faktory-blue rounded-full"
                                                  style={{ width: `${u.userTrail.totalProgress}%` }}
                                                />
                                              </div>
                                              <span className="text-xs font-bold text-slate-500">
                                                {u.userTrail.totalProgress}%
                                              </span>
                                            </div>
                                          </td>

                                          <td className="py-2.5 pr-4 text-xs text-slate-500">
                                            {fmtDate(u.userTrail.lastAccess)}
                                          </td>

                                          <td className="py-2.5 text-xs text-slate-500">
                                            {fmtDate(u.userTrail.startedAt)}
                                          </td>
                                        </tr>
                                      ))}
                                    </tbody>
                                  </table>
                                )}

                                {/* footer: contador "Mostrando X de Y" + paginação */}
                                {trail.users.length > 0 && (
                                  <div className="pt-3 flex items-center justify-between gap-4">
                                    {trail.usersCount != null && (
                                      <p className="text-xs text-slate-400">
                                        Mostrando{' '}
                                        <strong className="text-slate-600">{trail.users.length}</strong>
                                        {' '}de{' '}
                                        <strong className="text-slate-600">{trail.usersCount}</strong>
                                        {' '}aluno(s)
                                      </p>
                                    )}

                                    {/* cursor === null → fim real confirmado pelo backend */}
                                    {trailCursors[company.id]?.[trail.id] === null ? (
                                      <p className="text-xs text-slate-400 italic ml-auto">
                                        Fim da lista
                                      </p>
                                    ) : trailCursors[company.id]?.[trail.id] !== undefined ? (
                                      <button
                                        disabled={!!trailUsersLoading[company.id]?.[trail.id]}
                                        onClick={() => loadMoreUsers(company.id, trail.id)}
                                        className="flex items-center gap-1.5 text-sm font-bold text-faktory-blue hover:underline disabled:opacity-50 disabled:cursor-not-allowed ml-auto"
                                      >
                                        {!!trailUsersLoading[company.id]?.[trail.id] && (
                                          <Loader2 size={12} className="animate-spin" />
                                        )}
                                        {trailUsersLoading[company.id]?.[trail.id]
                                          ? 'Carregando...'
                                          : 'Carregar mais alunos'}
                                      </button>
                                    ) : null}
                                  </div>
                                )}
                              </div>
                            )}
                          </div>
                        );
                      })
                    )}
                  </div>
                )}
              </div>
            );
          })
        )}
      </div>

      {userModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl shadow-2xl w-full max-w-lg overflow-hidden">
            <div className="p-6 border-b border-slate-100 flex items-center justify-between">
              <div className="flex items-center gap-3">
                {userModal.user.avatarUrl ? (
                  <img
                    src={userModal.user.avatarUrl}
                    alt={userModal.user.name}
                    className="w-10 h-10 rounded-full object-cover"
                  />
                ) : (
                  <div className="w-10 h-10 bg-blue-50 rounded-full flex items-center justify-center text-faktory-blue">
                    <User size={18} />
                  </div>
                )}
                <div>
                  <h2 className="text-base font-bold text-slate-800">{userModal.user.name}</h2>
                  <p className="text-xs text-slate-400">{userModal.user.email}</p>
                </div>
              </div>
              <button
                onClick={() => setUserModal(null)}
                className="text-slate-400 hover:text-slate-600 p-1"
              >
                <X size={18} />
              </button>
            </div>

            <div className="p-6 max-h-[60vh] overflow-y-auto">
              {userSummaryLoading ? (
                <div className="flex justify-center p-8">
                  <Loader2 className="animate-spin text-faktory-blue" />
                </div>
              ) : userSummary ? (
                <div className="space-y-3">
                  {(userSummary.trails || []).map((t: any) => {
                    const status: UserTrailStatus = t.status || 'not_started';
                    return (
                      <div key={t.id || t.trailId} className="p-4 bg-slate-50 rounded-lg">
                        <div className="flex items-center justify-between mb-2">
                          <p className="text-sm font-bold text-slate-700">{t.title}</p>
                          <span
                            className={cn(
                              'text-[10px] font-bold px-2 py-0.5 rounded-full',
                              STATUS_COLOR[status] || 'text-slate-400 bg-slate-100',
                            )}
                          >
                            {STATUS_LABEL[status] || status}
                          </span>
                        </div>
                        <div className="flex items-center gap-2 mb-2">
                          <div className="flex-1 h-1.5 bg-slate-200 rounded-full overflow-hidden">
                            <div
                              className="h-full bg-faktory-blue rounded-full"
                              style={{ width: `${t.totalProgress ?? 0}%` }}
                            />
                          </div>
                          <span className="text-xs font-bold text-slate-500">
                            {t.totalProgress ?? 0}%
                          </span>
                        </div>
                        <div className="flex gap-4 text-[10px] text-slate-400">
                          <span>Início: {fmtDate(t.startedAt)}</span>
                          <span>Conclusão: {fmtDate(t.completedAt)}</span>
                          {t.currentModule && (
                            <span>Módulo atual: {t.currentModule.title}</span>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              ) : (
                <p className="text-sm text-slate-400 text-center py-6">
                  Nenhum dado disponível para este usuário.
                </p>
              )}
            </div>
          </div>
        </div>
      )}

      {toast && (
        <div className="fixed bottom-6 left-1/2 -translate-x-1/2 bg-slate-800 text-white text-sm font-bold px-5 py-3 rounded-full shadow-xl z-50">
          {toast}
        </div>
      )}
    </div>
  );
}
