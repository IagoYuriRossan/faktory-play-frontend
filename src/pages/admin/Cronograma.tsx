import React, { useEffect, useState } from 'react';
import type { ProjectProgressResponse, ModuleProgress, QuestionnaireSummary } from '../../@types/questionnaires';
import { useAuthStore } from '../../hooks/store/useAuthStore';
import { api } from '../../utils/api';
import UsersListPaginated from '../../components/UsersListPaginated';

interface Props {
  projectId?: string;
}

const mockData: ProjectProgressResponse = {
  projectId: 'demo-project',
  totalQuestionnaires: 5,
  modules: [
    {
      moduleId: 'm1',
      title: 'Etapa 1 - Boas-vindas',
      totalQuestionnaires: 2,
      completionRate: 1,
      avgScore: 9.5,
      questionnaires: [
        { questionnaireId: 'q1', title: 'Quiz 1', completedByUser: true, userScore: 10, maxScore: 10 },
        { questionnaireId: 'q2', title: 'Quiz 2', completedByUser: true, userScore: 9, maxScore: 10 }
      ]
    },
    {
      moduleId: 'm2',
      title: 'Etapa 2 - Integração',
      totalQuestionnaires: 3,
      completionRate: 0.33,
      avgScore: 6.8,
      questionnaires: [
        { questionnaireId: 'q3', title: 'Quiz 3', completedByUser: false },
        { questionnaireId: 'q4', title: 'Quiz 4', completedByUser: false },
        { questionnaireId: 'q5', title: 'Quiz 5', completedByUser: true, userScore: 8, maxScore: 10 }
      ]
    }
  ]
};

export default function Cronograma({ projectId }: Props) {
  const [progress, setProgress] = useState<ProjectProgressResponse | null>(null);
  const [projectData, setProjectData] = useState<any | null>(null);
  const [moduleQuestionnaires, setModuleQuestionnaires] = useState<Record<string, QuestionnaireSummary[]>>({});
  const [usersProgressList, setUsersProgressList] = useState<any[] | null>(null);
  const [usersProgressAvailable, setUsersProgressAvailable] = useState<boolean | null>(null);
  const [userIdInput, setUserIdInput] = useState<string>('');
  const [userProgress, setUserProgress] = useState<any | null>(null);
  const [loadingUserProgress, setLoadingUserProgress] = useState(false);
  const [userError, setUserError] = useState<string | null>(null);
  const { user } = useAuthStore();
  const pid = projectId ?? 'demo-project';

  useEffect(() => {
    let mounted = true;
    async function load() {
      try {
        // Fetch project metadata and aggregated progress in parallel
        const [projRes, progRes] = await Promise.allSettled([
          api.get<any>(`/api/projects/${encodeURIComponent(pid)}`),
          api.get<ProjectProgressResponse>(`/api/projects/${encodeURIComponent(pid)}/progress`),
        ]);

        if (!mounted) return;
        if (projRes.status === 'fulfilled') setProjectData(projRes.value);
        if (progRes.status === 'fulfilled') setProgress(progRes.value);
        if (progRes.status !== 'fulfilled') setProgress(mockData);

        // Determine modules array to query questionnaires for
        const modulesToQuery = (projRes.status === 'fulfilled' ? projRes.value?.modules : null) || (progRes.status === 'fulfilled' ? progRes.value?.modules : []) || [];
        const moduleIds: string[] = modulesToQuery.map((m: any) => m.id || m.moduleId).filter(Boolean);

        // Fetch questionnaires per module
        const qCalls = moduleIds.map(mid =>
          api.get<QuestionnaireSummary[]>(`/api/projects/${encodeURIComponent(pid)}/questionnaires?moduleId=${encodeURIComponent(mid)}`)
            .then(list => ({ mid, list }))
            .catch(() => ({ mid, list: [] }))
        );
        const qResults = await Promise.all(qCalls);
        const mq: Record<string, QuestionnaireSummary[]> = {};
        qResults.forEach(r => { mq[r.mid] = r.list || []; });
        if (mounted) setModuleQuestionnaires(mq);

        // Try aggregated users-progress endpoint
        try {
          const up = await api.get<any[]>(`/api/projects/${encodeURIComponent(pid)}/users-progress`);
          if (mounted) { setUsersProgressList(up); setUsersProgressAvailable(true); }
        } catch (err: any) {
          if (mounted) { setUsersProgressList(null); setUsersProgressAvailable(false); }
        }
      } catch (err) {
        if (!mounted) return;
        setProgress(mockData);
        setProjectData(null);
        setModuleQuestionnaires({});
        setUsersProgressAvailable(false);
      }
    }
    load();
    // Listen to global event to refresh progress when submissions happen elsewhere
    const onProgressUpdated = () => { load(); };
    window.addEventListener('project:progress-updated', onProgressUpdated);
    return () => { mounted = false; };
  }, [pid]);

  if (!progress) {
    return <div className="p-6">Carregando cronograma...</div>;
  }

  return (
    <div className="p-6">
      <h2 className="text-xl font-bold mb-4">Cronograma — Progresso do Projeto</h2>
      <p className="text-sm text-slate-500 mb-6">Projeto: {progress.projectId} — questionários totais: {progress.totalQuestionnaires}</p>

      <div className="mb-6 flex items-center gap-3">
        <input
          placeholder={user?.id ? `Pesquisar usuário (padrão: ${user.id})` : 'Pesquisar usuário por ID'}
          value={userIdInput}
          onChange={(e) => setUserIdInput(e.target.value)}
          className="px-3 py-2 border rounded w-64"
        />
        <button
          onClick={async () => {
            const uid = userIdInput.trim() || user?.id;
            if (!uid) { setUserError('Informe um userId'); return; }
            setUserProgress(null); setUserError(null); setLoadingUserProgress(true);
            try {
              const data = await api.get<any>(`/api/projects/${encodeURIComponent(pid)}/users/${encodeURIComponent(uid)}/progress`);
              setUserProgress(data);
            } catch (err: any) {
              setUserError(err?.message || 'Erro ao buscar progresso do usuário');
            } finally { setLoadingUserProgress(false); }
          }}
          className="bg-faktory-blue text-white px-3 py-2 rounded"
        >
          Buscar progresso do usuário
        </button>
        <button onClick={() => { setUserIdInput(''); setUserProgress(null); setUserError(null); }} className="px-3 py-2 border rounded">Limpar</button>
      </div>

      {/* Users progress list (aggregated) */}
      {usersProgressAvailable && usersProgressList && (
        <div className="mb-6 bg-white border rounded p-3">
          <div className="flex items-center justify-between mb-3">
            <div className="font-bold">Usuários — Progresso</div>
            <div className="text-xs text-slate-400">{usersProgressList.length} usuários</div>
          </div>
          <div className="grid grid-cols-1 gap-2">
            {/** Simple client-side pagination: lazy render pages of 10 users */}
            <UsersListPaginated
              users={usersProgressList}
              onSelect={async (u: any) => {
                setUserIdInput(u.userId);
                setLoadingUserProgress(true); setUserError(null); setUserProgress(null);
                try {
                  const data = await api.get<any>(`/api/projects/${encodeURIComponent(pid)}/users/${encodeURIComponent(u.userId)}/progress`);
                  setUserProgress(data);
                } catch (err: any) {
                  setUserError(err?.message || 'Erro ao buscar progresso do usuário');
                } finally { setLoadingUserProgress(false); }
              }}
            />
          </div>
        </div>
      )}

      {loadingUserProgress && <div className="mb-4">Carregando progresso do usuário...</div>}
      {userError && <div className="mb-4 text-red-500">{userError}</div>}
      {userProgress && (
        <div className="mb-6 p-4 border rounded bg-white">
          <div className="font-bold">Progresso do usuário: {userProgress.userId}</div>
          <div className="text-sm text-slate-600">Concluiu {userProgress.completedQuestionnaires} de {userProgress.totalQuestionnaires} questionários — {Math.round((userProgress.completionRate ?? 0) * 100)}%</div>
        </div>
      )}

      <div className="space-y-4">
        {progress.modules.map((mod: ModuleProgress) => {
          const moduleId = mod.moduleId;
          const moduleTitle = (projectData?.modules?.find((m: any) => m.id === moduleId)?.title) || (mod as any).title || 'Módulo';
          const qList = moduleQuestionnaires[moduleId] || (mod as any).questionnaires || [];
          return (
          <div key={moduleId || mod.moduleId} className="bg-white border border-slate-200 rounded p-4">
            <div className="flex items-center justify-between">
              <div>
                <div className="text-sm font-bold">{moduleTitle}</div>
                <div className="text-xs text-slate-400">{mod.totalQuestionnaires} questionário(s)</div>
              </div>
              <div className="text-right">
                <div className="text-sm font-bold">{Math.round((mod.completionRate ?? 0) * 100)}%</div>
                <div className="text-xs text-slate-400">média: {mod.avgScore ?? '-'} pts</div>
              </div>
            </div>

            <div className="mt-3">
              <div className="w-full h-2 bg-slate-100 rounded overflow-hidden">
                <div
                  className="h-2 bg-faktory-blue"
                  style={{ width: `${Math.round((mod.completionRate ?? 0) * 100)}%` }}
                />
              </div>
            </div>

            <div className="mt-4 space-y-2">
              {qList.length > 0 ? qList.map((q: any) => {
                const qId = q.id || q.questionnaireId;
                const userMod = userProgress?.modules?.find((um: any) => um.moduleId === moduleId);
                const userQ = userMod?.questionnaires?.find((qq: any) => qq.questionnaireId === qId);
                const isCompleted = !!userQ?.completedByUser;
                const dotClass = isCompleted ? 'bg-green-500' : 'bg-slate-300';

                let scoreLabel: string;
                if (userQ) {
                  if (userQ.isCorrect !== undefined) {
                    scoreLabel = `${userQ.pointsAwarded ?? '-'} / ${userQ.maxScore ?? '-'}`;
                  } else {
                    scoreLabel = q.completedByUser ? `${q.userScore ?? '-'} / ${q.maxScore ?? '-'}` : 'Não realizado';
                  }
                } else {
                  scoreLabel = q.completedByUser ? `${q.userScore ?? '-'} / ${q.maxScore ?? '-'}` : '—';
                }

                return (
                <div key={qId} className="flex items-center justify-between p-2 bg-slate-50 rounded border border-slate-100">
                  <div className="flex items-center gap-3">
                    <div className={`w-2 h-2 rounded-full ${dotClass}`} />
                    <div className="text-sm">{q.title || q.name}</div>
                  </div>
                  <div className="text-xs text-slate-500">{scoreLabel}</div>
                </div>
                );
              }) : (
                <div className="text-sm text-slate-400">Nenhum questionário listado para este módulo</div>
              )}
            </div>
          </div>
          );
        })}
      </div>
    </div>
  );
}
