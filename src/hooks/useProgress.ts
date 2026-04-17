import { useEffect, useState, useCallback } from 'react';
import { api } from '../utils/api';
import type { ProjectProgressResponse } from '../@types/questionnaires';
import { useAuthStore } from './store/useAuthStore';

export function useProjectProgress(projectId?: string) {
  const [progress, setProgress] = useState<ProjectProgressResponse | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<any>(null);

  const load = useCallback(async () => {
    if (!projectId) return;
    setLoading(true);
    setError(null);
    try {
      console.debug('[useProjectProgress] GET', `/api/projects/${projectId}/progress`);
      const data = await api.get<ProjectProgressResponse>(`/api/projects/${encodeURIComponent(projectId)}/progress`);
      console.debug('[useProjectProgress] RESPONSE', data);

      // If modules don't have titles, try to fetch project metadata to map module titles
      const modulesMissingTitle = data.modules && data.modules.some(m => !('title' in m) || !m.title);
      if (modulesMissingTitle) {
        try {
          console.debug('[useProjectProgress] GET project metadata', `/api/projects/${projectId}`);
          const project = await api.get<any>(`/api/projects/${encodeURIComponent(projectId)}`);
          console.debug('[useProjectProgress] project metadata RESPONSE', project);
          const modulesMap: Record<string, string> = {};
          (project.modules || []).forEach((mod: any) => { if (mod.id) modulesMap[mod.id] = mod.title; });
          const mapped = { ...data, modules: data.modules.map(m => ({ ...m, title: (m.title || modulesMap[m.moduleId] || '') })) };
          setProgress(mapped as ProjectProgressResponse);
        } catch (e) {
          // fallback to raw data if project metadata not available
          setProgress(data);
        }
      } else {
        setProgress(data);
      }
    } catch (err) {
      console.error('[useProjectProgress] ERROR', err);
      setError(err);
    } finally {
      setLoading(false);
    }
  }, [projectId]);

  useEffect(() => {
    load();
  }, [load]);

  return { progress, loading, error, reload: load };
}

export async function fetchUserProgress(projectId: string, userId?: string) {
  const uid = userId ?? useAuthStore.getState().user?.id;
  if (!uid) throw new Error('user-id-missing');
  console.debug('[fetchUserProgress] GET', `/api/projects/${projectId}/users/${uid}/progress`);
  return api.get<any>(`/api/projects/${encodeURIComponent(projectId)}/users/${encodeURIComponent(uid)}/progress`);
}
