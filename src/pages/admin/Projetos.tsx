import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  Loader2, BookOpen, User, Users, X, Clock,
  BarChart2, Search, SlidersHorizontal, Building2, ChevronDown, ChevronUp,
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
const USERS_BATCH = 25;

const STATUS_BAR_COLOR: Record<UserTrailStatus, string> = {
  not_started: 'bg-slate-300',
  in_progress:  'bg-blue-500',
  completed:    'bg-green-500',
  overdue:      'bg-red-500',
};

// ── Tipo interno que associa trilha à sua empresa ──────────────────────────
interface TrailCard extends TrailWithUsers {
  companyId: string;
  companyName: string;
}

// ── TrailCard component ────────────────────────────────────────────────────
function TrailCardView({
  trail,
  companyId,
  trailCursors,
  trailUsersLoading,
  onLoadMore,
  onOpenUser,
}: {
  trail: TrailCard;
  companyId: string;
  trailCursors: Record<string, Record<string, string | null>>;
  trailUsersLoading: Record<string, Record<string, boolean>>;
  onLoadMore: (companyId: string, trailId: string) => void;
  onOpenUser: (user: TrailUser, trailTitle: string) => void;
}) {
  const [expanded, setExpanded] = useState(false);
  const progress = trail.averageProgress ?? 0;

  const statusCounts = useMemo(() => {
    const counts: Record<UserTrailStatus, number> = { not_started: 0, in_progress: 0, completed: 0, overdue: 0 };
    trail.users.forEach(u => { counts[u.userTrail.status] = (counts[u.userTrail.status] ?? 0) + 1; });
    return counts;
  }, [trail.users]);

  const progressColor =
    progress >= 75 ? 'bg-green-500' :
    progress >= 40 ? 'bg-blue-500' :
    progress > 0   ? 'bg-orange-400' :
                     'bg-slate-300';

  return (
    <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden flex flex-col">
      <div className="p-5 flex-1">
        {/* Company badge */}
        <div className="flex items-center gap-1.5 mb-3">
          <Building2 size={11} className="text-slate-400" />
          <span className="text-[11px] font-semibold text-slate-400 uppercase tracking-wide truncate">
            {trail.companyName}
          </span>
        </div>

        {/* Title */}
        <div className="flex items-start gap-2 mb-4">
          <div className="w-8 h-8 bg-orange-50 rounded-lg flex items-center justify-center shrink-0 mt-0.5">
            <BookOpen size={15} className="text-orange-400" />
          </div>
          <h3 className="text-sm font-bold text-slate-800 leading-snug">{trail.title}</h3>
        </div>

        {/* Progress bar */}
        <div className="mb-3">
          <div className="flex items-center justify-between mb-1">
            <span className="text-[11px] text-slate-400 font-medium">Progresso médio</span>
            <span className="text-[11px] font-bold text-slate-600">{progress}%</span>
          </div>
          <div className="h-2 bg-slate-100 rounded-full overflow-hidden">
            <div
              className={cn('h-full rounded-full transition-all duration-500', progressColor)}
              style={{ width: `${progress}%` }}
            />
          </div>
        </div>

        {/* Stats */}
        <div className="flex items-center gap-3 text-[11px] text-slate-500 mb-4">
          <span className="flex items-center gap-1"><Users size={11} />{trail.usersCount ?? trail.users.length} aluno(s)</span>
          <span className="text-slate-200">|</span>
          <span className="flex items-center gap-1"><BarChart2 size={11} />{trail.modulesCount} módulo(s)</span>
          <span className="text-slate-200">|</span>
          <span className="flex items-center gap-1"><Clock size={11} />{fmtDuration(trail.estimatedDurationMinutes)}</span>
        </div>

        {/* Status breakdown */}
        <div className="grid grid-cols-2 gap-1.5">
          {(Object.keys(STATUS_LABEL) as UserTrailStatus[]).map(s => (
            <div key={s} className="flex items-center gap-1.5">
              <div className={cn('w-2 h-2 rounded-full shrink-0', STATUS_BAR_COLOR[s])} />
              <span className="text-[10px] text-slate-500 truncate">{STATUS_LABEL[s]}</span>
              <span className="text-[10px] font-bold text-slate-600 ml-auto">{statusCounts[s]}</span>
            </div>
          ))}
        </div>
      </div>

      {/* Toggle alunos */}
      <button
        onClick={() => setExpanded(v => !v)}
        className="flex items-center justify-center gap-1.5 py-2.5 border-t border-slate-100 text-[11px] font-semibold text-faktory-blue hover:bg-blue-50 transition-colors w-full"
      >
        {expanded
          ? <><ChevronUp size={12} /> Ocultar alunos</>
          : <><ChevronDown size={12} /> Ver alunos ({trail.usersCount ?? trail.users.length})</>}
      </button>

      {/* Tabela de alunos */}
      {expanded && (
        <div className="border-t border-slate-100 px-4 pb-4 pt-3">
          {trail.users.length === 0 ? (
            <p className="text-sm text-slate-400 italic text-center py-3">Nenhum aluno nesta trilha.</p>
          ) : (
            <table className="w-full text-left">
              <thead>
                <tr className="border-b border-slate-100">
                  <th className="pb-2 text-[10px] font-bold text-slate-400 uppercase tracking-wider">Aluno</th>
                  <th className="pb-2 text-[10px] font-bold text-slate-400 uppercase tracking-wider">Status</th>
                  <th className="pb-2 text-[10px] font-bold text-slate-400 uppercase tracking-wider">%</th>
                  <th className="pb-2 text-[10px] font-bold text-slate-400 uppercase tracking-wider">Último acesso</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-50">
                {trail.users.map(u => (
                  <tr key={u.id} className="hover:bg-slate-50/50 transition-colors">
                    <td className="py-2 pr-3">
                      <button className="flex items-center gap-2 text-left" onClick={() => onOpenUser(u, trail.title)}>
                        {u.avatarUrl
                          ? <img src={u.avatarUrl} alt={u.name} className="w-6 h-6 rounded-full object-cover shrink-0" />
                          : <div className="w-6 h-6 bg-blue-50 rounded-full flex items-center justify-center text-faktory-blue shrink-0"><User size={11} /></div>}
                        <div>
                          <p className="text-xs font-semibold text-slate-700 hover:underline leading-tight">{u.name}</p>
                          <p className="text-[10px] text-slate-400">{u.email}</p>
                        </div>
                      </button>
                    </td>
                    <td className="py-2 pr-3">
                      <span className={cn('text-[10px] font-bold px-1.5 py-0.5 rounded-full', STATUS_COLOR[u.userTrail.status])}>
                        {STATUS_LABEL[u.userTrail.status]}
                      </span>
                    </td>
                    <td className="py-2 pr-3">
                      <div className="flex items-center gap-1.5">
                        <div className="w-12 h-1.5 bg-slate-100 rounded-full overflow-hidden">
                          <div className="h-full bg-faktory-blue rounded-full" style={{ width: `${u.userTrail.totalProgress}%` }} />
                        </div>
                        <span className="text-[10px] font-bold text-slate-500">{u.userTrail.totalProgress}%</span>
                      </div>
                    </td>
                    <td className="py-2 text-[10px] text-slate-500">{fmtDate(u.userTrail.lastAccess)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}

          {trail.users.length > 0 && (
            <div className="pt-3 flex items-center justify-between gap-3">
              {trail.usersCount != null && (
                <p className="text-[10px] text-slate-400">
                  Mostrando <strong className="text-slate-600">{trail.users.length}</strong> de{' '}
                  <strong className="text-slate-600">{trail.usersCount}</strong>
                </p>
              )}
              {trailCursors[companyId]?.[trail.id] === null ? (
                <p className="text-[10px] text-slate-400 italic ml-auto">Fim da lista</p>
              ) : trailCursors[companyId]?.[trail.id] !== undefined ? (
                <button
                  disabled={!!trailUsersLoading[companyId]?.[trail.id]}
                  onClick={() => onLoadMore(companyId, trail.id)}
                  className="flex items-center gap-1 text-xs font-bold text-faktory-blue hover:underline disabled:opacity-50 ml-auto"
                >
                  {trailUsersLoading[companyId]?.[trail.id] && <Loader2 size={11} className="animate-spin" />}
                  {trailUsersLoading[companyId]?.[trail.id] ? 'Carregando...' : 'Carregar mais'}
                </button>
              ) : null}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

// ── Main component ──────────────────────────────────────────────────────────

export default function AdminProjetos() {
  const [companies, setCompanies] = useState<Company[]>([]);
  const [loading, setLoading] = useState(true);

  const [companyData, setCompanyData] = useState<Record<string, TrailWithUsers[]>>({});
  const [companyLoading, setCompanyLoading] = useState<Record<string, boolean>>({});
  const [trailCursors, setTrailCursors] = useState<Record<string, Record<string, string | null>>>({});
  const [trailUsersLoading, setTrailUsersLoading] = useState<Record<string, Record<string, boolean>>>({});

  // Filtros
  const [searchName, setSearchName] = useState('');
  const [filterCompany, setFilterCompany] = useState('');
  const [filterMinProgress, setFilterMinProgress] = useState(0);
  const [filterMaxProgress, setFilterMaxProgress] = useState(100);
  const [filterUser, setFilterUser] = useState('');
  const [showFilters, setShowFilters] = useState(false);

  const [userModal, setUserModal] = useState<{ user: TrailUser; trailTitle: string } | null>(null);
  const [userSummary, setUserSummary] = useState<any>(null);
  const [userSummaryLoading, setUserSummaryLoading] = useState(false);

  const [toast, setToast] = useState('');
  const toastRef = useRef<number | null>(null);

  const showToast = useCallback((msg: string) => {
    setToast(msg);
    if (toastRef.current) window.clearTimeout(toastRef.current);
    toastRef.current = window.setTimeout(() => setToast(''), 3000);
  }, []);

  const loadCompanyTrails = useCallback(async (companyId: string, forceRefresh = false) => {
    if (companyData[companyId] && !forceRefresh) return;
    setCompanyLoading(prev => ({ ...prev, [companyId]: true }));
    try {
      const [res, countsRes] = await Promise.all([
        api.get<CompanyTrailsWithUsersResponse>(
          `/api/companies/${companyId}/trails-with-users?usersLimit=${USERS_BATCH}`,
        ),
        api.get<TrailsUsersCountsResponse>(
          `/api/companies/${companyId}/trails-users-counts`,
        ).catch(() => null),
      ]);

      const countMap = new Map<string, number>(
        (countsRes?.counts ?? []).map(c => [c.trailId, c.count]),
      );
      const trails: TrailWithUsers[] = (res.trails ?? []).map(t => ({
        ...t,
        usersCount: countMap.has(t.id) ? (countMap.get(t.id) ?? t.usersCount) : t.usersCount,
      }));

      setCompanyData(prev => ({ ...prev, [companyId]: trails }));
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

  useEffect(() => {
    async function fetchAll() {
      try {
        const data = await api.get<Company[]>('/api/companies');
        setCompanies(data);
        await Promise.all(data.map(c => loadCompanyTrails(c.id)));
      } catch (err) {
        console.error('Error fetching companies:', err);
        showToast('Erro ao carregar empresas');
      } finally {
        setLoading(false);
      }
    }
    fetchAll();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const loadMoreUsers = useCallback(async (companyId: string, trailId: string) => {
    setTrailUsersLoading(prev => ({
      ...prev,
      [companyId]: { ...(prev[companyId] ?? {}), [trailId]: true },
    }));

    const attempt = async () => {
      const cursor = trailCursors[companyId]?.[trailId];
      const url =
        `/api/companies/${companyId}/trails-with-users` +
        `?usersLimit=${USERS_BATCH}` +
        (cursor ? `&usersCursor=${cursor}` : '');

      const res = await api.get<CompanyTrailsWithUsersResponse>(url);
      const fetched = (res.trails ?? []).find(t => t.id === trailId);
      if (fetched) {
        setCompanyData(prev => {
          const prevTrails = prev[companyId] ?? [];
          return {
            ...prev,
            [companyId]: prevTrails.map(t => {
              if (t.id !== trailId) return t;
              const existingIds = new Set(t.users.map(u => u.id));
              return { ...t, users: [...t.users, ...fetched.users.filter(u => !existingIds.has(u.id))] };
            }),
          };
        });
        setTrailCursors(prev => ({
          ...prev,
          [companyId]: { ...(prev[companyId] ?? {}), [trailId]: fetched.usersCursor },
        }));
      }
    };

    try {
      await attempt();
    } catch {
      try {
        await new Promise(r => setTimeout(r, 500));
        await attempt();
      } catch {
        showToast('Erro ao carregar mais alunos. Tente novamente.');
      }
    } finally {
      setTrailUsersLoading(prev => ({
        ...prev,
        [companyId]: { ...(prev[companyId] ?? {}), [trailId]: false },
      }));
    }
  }, [trailCursors, showToast]);

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

  // Lista plana de cards
  const allCards: TrailCard[] = useMemo(() => {
    const companyMap = new Map(companies.map(c => [c.id, c.name]));
    return companies.flatMap(c =>
      (companyData[c.id] ?? []).map(t => ({
        ...t,
        companyId: c.id,
        companyName: companyMap.get(c.id) ?? c.id,
      }))
    );
  }, [companies, companyData]);

  // Aplica filtros
  const filtered = useMemo(() => {
    const nameLower = searchName.toLowerCase().trim();
    const userLower = filterUser.toLowerCase().trim();
    return allCards.filter(card => {
      if (filterCompany && card.companyId !== filterCompany) return false;
      if (nameLower && !card.title.toLowerCase().includes(nameLower)) return false;
      const p = card.averageProgress ?? 0;
      if (p < filterMinProgress || p > filterMaxProgress) return false;
      if (userLower) {
        const hasUser = card.users.some(
          u => u.name.toLowerCase().includes(userLower) || u.email.toLowerCase().includes(userLower)
        );
        if (!hasUser) return false;
      }
      return true;
    });
  }, [allCards, searchName, filterCompany, filterMinProgress, filterMaxProgress, filterUser]);

  const isAnyLoading = Object.values(companyLoading).some(Boolean);
  const hasActiveFilters = !!(searchName || filterCompany || filterUser || filterMinProgress > 0 || filterMaxProgress < 100);

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <Loader2 className="animate-spin text-faktory-blue" size={40} />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div>
          <h1 className="text-2xl font-bold text-slate-800">Gestão de Projetos</h1>
          <p className="text-slate-500 text-sm mt-1">
            {filtered.length} trilha(s) · {companies.length} empresa(s)
          </p>
        </div>
        {isAnyLoading && (
          <div className="flex items-center gap-2 text-xs text-slate-400">
            <Loader2 size={13} className="animate-spin" /> Carregando trilhas...
          </div>
        )}
      </div>

      {/* Barra de filtros */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-4 space-y-3">
        <div className="flex items-center gap-3 flex-wrap">
          {/* Busca por nome */}
          <div className="relative flex-1 min-w-[180px]">
            <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              placeholder="Buscar por projeto..."
              value={searchName}
              onChange={e => setSearchName(e.target.value)}
              className="w-full pl-8 pr-3 py-2 text-sm border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-faktory-blue/30"
            />
          </div>

          {/* Filtro empresa */}
          <div className="relative min-w-[180px]">
            <Building2 size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
            <select
              value={filterCompany}
              onChange={e => setFilterCompany(e.target.value)}
              className="w-full pl-8 pr-3 py-2 text-sm border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-faktory-blue/30 appearance-none bg-white"
            >
              <option value="">Todas as empresas</option>
              {companies.map(c => (
                <option key={c.id} value={c.id}>{c.name}</option>
              ))}
            </select>
          </div>

          {/* Filtros avançados toggle */}
          <button
            onClick={() => setShowFilters(v => !v)}
            className={cn(
              'flex items-center gap-2 px-3 py-2 text-sm font-medium rounded-lg border transition-colors',
              showFilters
                ? 'bg-faktory-blue text-white border-faktory-blue'
                : 'border-slate-200 text-slate-600 hover:bg-slate-50'
            )}
          >
            <SlidersHorizontal size={14} />
            Filtros avançados
          </button>

          {hasActiveFilters && (
            <button
              onClick={() => { setSearchName(''); setFilterCompany(''); setFilterUser(''); setFilterMinProgress(0); setFilterMaxProgress(100); }}
              className="text-xs text-slate-400 hover:text-slate-600 underline"
            >
              Limpar filtros
            </button>
          )}
        </div>

        {showFilters && (
          <div className="pt-3 border-t border-slate-100 flex flex-wrap gap-5 items-end">
            {/* Busca por usuário */}
            <div className="flex-1 min-w-[180px]">
              <label className="block text-[11px] font-bold text-slate-500 uppercase tracking-wide mb-1.5">
                Usuário
              </label>
              <div className="relative">
                <User size={13} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                <input
                  type="text"
                  placeholder="Nome ou e-mail..."
                  value={filterUser}
                  onChange={e => setFilterUser(e.target.value)}
                  className="w-full pl-8 pr-3 py-2 text-sm border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-faktory-blue/30"
                />
              </div>
            </div>

            {/* Range de progresso */}
            <div className="flex-1 min-w-[200px]">
              <label className="block text-[11px] font-bold text-slate-500 uppercase tracking-wide mb-1.5">
                Progresso médio: {filterMinProgress}% – {filterMaxProgress}%
              </label>
              <div className="flex items-center gap-3">
                <input
                  type="range" min={0} max={100} step={5}
                  value={filterMinProgress}
                  onChange={e => setFilterMinProgress(Math.min(Number(e.target.value), filterMaxProgress))}
                  className="flex-1 accent-faktory-blue"
                />
                <input
                  type="range" min={0} max={100} step={5}
                  value={filterMaxProgress}
                  onChange={e => setFilterMaxProgress(Math.max(Number(e.target.value), filterMinProgress))}
                  className="flex-1 accent-faktory-blue"
                />
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Grid de cards */}
      {filtered.length === 0 ? (
        <div className="p-12 text-center text-slate-400 bg-white rounded-xl border border-slate-200">
          {allCards.length === 0 ? 'Nenhuma trilha encontrada.' : 'Nenhuma trilha corresponde aos filtros.'}
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-4">
          {filtered.map(card => (
            <TrailCardView
              key={`${card.companyId}-${card.id}`}
              trail={card}
              companyId={card.companyId}
              trailCursors={trailCursors}
              trailUsersLoading={trailUsersLoading}
              onLoadMore={loadMoreUsers}
              onOpenUser={openUserModal}
            />
          ))}
        </div>
      )}

      {/* Modal de usuário */}
      {userModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl shadow-2xl w-full max-w-lg overflow-hidden">
            <div className="p-6 border-b border-slate-100 flex items-center justify-between">
              <div className="flex items-center gap-3">
                {userModal.user.avatarUrl ? (
                  <img src={userModal.user.avatarUrl} alt={userModal.user.name} className="w-10 h-10 rounded-full object-cover" />
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
              <button onClick={() => setUserModal(null)} className="text-slate-400 hover:text-slate-600 p-1">
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
                          <span className={cn('text-[10px] font-bold px-2 py-0.5 rounded-full', STATUS_COLOR[status] || 'text-slate-400 bg-slate-100')}>
                            {STATUS_LABEL[status] || status}
                          </span>
                        </div>
                        <div className="flex items-center gap-2 mb-2">
                          <div className="flex-1 h-1.5 bg-slate-200 rounded-full overflow-hidden">
                            <div className="h-full bg-faktory-blue rounded-full" style={{ width: `${t.totalProgress ?? 0}%` }} />
                          </div>
                          <span className="text-xs font-bold text-slate-500">{t.totalProgress ?? 0}%</span>
                        </div>
                        <div className="flex gap-4 text-[10px] text-slate-400">
                          <span>Início: {fmtDate(t.startedAt)}</span>
                          <span>Conclusão: {fmtDate(t.completedAt)}</span>
                          {t.currentModule && <span>Módulo atual: {t.currentModule.title}</span>}
                        </div>
                      </div>
                    );
                  })}
                </div>
              ) : (
                <p className="text-sm text-slate-400 text-center py-6">Nenhum dado disponível para este usuário.</p>
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
