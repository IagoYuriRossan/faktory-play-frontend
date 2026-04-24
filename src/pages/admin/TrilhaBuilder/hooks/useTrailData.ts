import { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Module } from '../../../../@types/index';
import { trilhaBuilderApi } from '../services/trilhaBuilderApi';

export interface TrailData {
  title: string;
  description: string;
  modules: Module[];
}

export function useTrailData() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const trailId = id || '';

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [isDirty, setIsDirty] = useState(false);
  const [lastSaved, setLastSaved] = useState<Date | null>(null);
  const [activeModuleId, setActiveModuleId] = useState<string | null>(null);
  const [activeLessonId, setActiveLessonId] = useState<string | null>(null);
  const [hasLocalBackup, setHasLocalBackup] = useState(false);
  const [expandedModules, setExpandedModules] = useState<Record<string, boolean>>({});
  const [expandedLessons, setExpandedLessons] = useState<Record<string, boolean>>({});

  const [trailData, setTrailData] = useState<TrailData>({
    title: '',
    description: '',
    modules: [] as Module[],
  });

  // Toast
  const [toast, setToast] = useState<string | null>(null);
  const toastTimerRef = useRef<number | null>(null);
  const showToast = (msg: string) => {
    setToast(msg);
    if (toastTimerRef.current) window.clearTimeout(toastTimerRef.current);
    toastTimerRef.current = window.setTimeout(() => setToast(''), 3000) as unknown as number;
  };

  // ── localStorage backup ──
  const localKey = `trail-backup-${trailId}`;

  useEffect(() => {
    if (!trailData.modules.length) return;
    try {
      localStorage.setItem(localKey, JSON.stringify({ savedAt: Date.now(), data: trailData }));
    } catch (_) { /* storage full or unavailable */ }
  }, [trailData, localKey]);

  const restoreLocalBackup = () => {
    try {
      const raw = localStorage.getItem(localKey);
      if (!raw) return;
      const { data } = JSON.parse(raw);
      setTrailData(data);
      setIsDirty(true);
      showToast('Dados restaurados do backup local');
      setHasLocalBackup(false);
    } catch (_) { showToast('Erro ao restaurar backup local'); }
  };

  // ── Auto-save ──
  useEffect(() => {
    if (!isDirty) return;

    // Skip auto-save if we have local image previews that need uploading
    const hasLocalImages = JSON.stringify(trailData).includes('blob:');
    if (hasLocalImages) return;

    const timeoutId = setTimeout(async () => {
      try {
        const finalData = { id: trailId === 'nova' ? undefined : trailId, ...trailData };
        if (id && id !== 'nova') {
          await trilhaBuilderApi.updateTrail(trailId, finalData);
        } else {
          const res = await trilhaBuilderApi.createTrail(finalData);
          const returnedId = res?.id || trailId;
          navigate(`/admin/trilhas/${returnedId}`, { replace: true });
        }
        setLastSaved(new Date());
        setIsDirty(false);
      } catch (error) {
        console.error('Auto-save failed:', error);
        showToast('Auto-save falhou — verifique conexão e autenticação');
      }
    }, 2000);
    return () => clearTimeout(timeoutId);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [trailData, isDirty, id, trailId, navigate]);

  // ── Fetch trail ──
  useEffect(() => {
    async function fetchTrail() {
      if (!id || id === 'nova') {
        setLoading(false);
        return;
      }
      try {
        const data = await trilhaBuilderApi.getTrail(id);
        setTrailData({ title: data.title || '', description: data.description || '', modules: data.modules || [] });

        const allEmpty = data.modules.length > 0 && data.modules.every(m => !m.title && (!m.etapas || m.etapas.every(e => !e.title)));
        const backupRaw = localStorage.getItem(`trail-backup-${id}`);
        if (allEmpty && backupRaw) {
          try {
            const { data: backupData } = JSON.parse(backupRaw);
            const backupHasTitles = backupData?.modules?.some((m: Module) => !!m.title);
            if (backupHasTitles) setHasLocalBackup(true);
          } catch (_) { /* noop */ }
        }

        const findFirstModuleWithEtapa = (modules: Module[]): { moduleId: string; etapaId: string } | null => {
          for (const m of modules) {
            if (m.etapas && m.etapas.length > 0) return { moduleId: m.id, etapaId: m.etapas[0].id };
            if (m.submodules?.length) {
              const found = findFirstModuleWithEtapa(m.submodules);
              if (found) return found;
            }
          }
          return null;
        };

        const ensureIds = (modules: Module[], seenIds = new Set<string>()): Module[] => {
          return modules.map(m => {
            let modId = m.id;
            if (!modId || seenIds.has(modId)) modId = 'm_' + Math.random().toString(36).substr(2, 9);
            seenIds.add(modId);
            return {
              ...m,
              id: modId,
              submodules: m.submodules ? ensureIds(m.submodules, seenIds) : undefined,
              etapas: m.etapas ? m.etapas.map(e => {
                let eId = e.id;
                if (!eId || seenIds.has(eId)) eId = 'e_' + Math.random().toString(36).substr(2, 9);
                seenIds.add(eId);
                return {
                  ...e,
                  id: eId,
                  subetapas: e.subetapas ? e.subetapas.map(se => {
                    let seId = se.id;
                    if (!seId || seenIds.has(seId)) seId = 'se_' + Math.random().toString(36).substr(2, 9);
                    seenIds.add(seId);
                    return { ...se, id: seId };
                  }) : undefined
                };
              }) : undefined
            };
          });
        };

        data.modules = ensureIds(data.modules || []);

        const first = findFirstModuleWithEtapa(data.modules);
        if (first) { setActiveModuleId(first.moduleId); setActiveLessonId(first.etapaId); }

        const collectExpanded = (modules: Module[], acc: Record<string, boolean>) => {
          modules.forEach(m => {
            if (acc[m.id] === undefined) acc[m.id] = true;
            if (m.submodules?.length) collectExpanded(m.submodules, acc);
          });
        };
        setExpandedModules(prev => { const next = { ...prev }; collectExpanded(data.modules, next); return next; });
      } catch (error) {
        console.error('Error fetching trail:', error);
      } finally {
        setLoading(false);
      }
    }
    fetchTrail();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id]);

  // ── API actions ──
  const handleSave = async (dataToSave?: TrailData) => {
    setSaving(true);
    try {
      const data = dataToSave || trailData;
      const finalData = { id: trailId === 'nova' ? undefined : trailId, ...data };
      if (id && id !== 'nova') {
        try {
          await trilhaBuilderApi.updateTrail(trailId, finalData);
        } catch (err: any) {
          if (err && err.status === 404) {
            const res = await trilhaBuilderApi.createTrail(finalData);
            const returnedId = res?.id || trailId;
            navigate(`/admin/trilhas/${returnedId}`, { replace: true });
          } else { throw err; }
        }
      } else {
        const res = await trilhaBuilderApi.createTrail(finalData);
        const returnedId = res?.id || trailId;
        navigate(`/admin/trilhas/${returnedId}`, { replace: true });
      }
      setLastSaved(new Date());
      setIsDirty(false);
      showToast('Trilha salva');
    } catch (error) {
      console.error('Error saving trail:', error);
      showToast('Erro ao salvar trilha — verifique conexão e autenticação');
    } finally {
      setSaving(false);
    }
  };

  const handleRefreshFromServer = async () => {
    if (isDirty) {
      const ok = window.confirm('Existem alterações não salvas. Deseja descartar e recarregar do servidor?');
      if (!ok) return;
    }
    if (!id || id === 'nova') return;
    setLoading(true);
    try {
      const data = await trilhaBuilderApi.getTrail(id);
      setTrailData({ title: data.title, description: data.description, modules: data.modules });
      setIsDirty(false);
      showToast('Recarregado do servidor');
    } catch (_err) {
      showToast('Erro ao recarregar do servidor');
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteTrail = async () => {
    if (!id || id === 'nova') return;
    navigate('/admin/trilhas');
    showToast('Removendo trilha...');
    (async () => {
      try {
        await trilhaBuilderApi.deleteTrail(id);
        showToast('Trilha removida');
      } catch (err) {
        console.error('Erro ao remover trilha (background):', err);
        showToast('Erro ao remover trilha — verifique a conexão');
      }
    })();
  };

  return {
    id, trailId, navigate,
    loading, setLoading, saving, setSaving,
    isDirty, setIsDirty, lastSaved, setLastSaved,
    activeModuleId, setActiveModuleId,
    activeLessonId, setActiveLessonId,
    hasLocalBackup, setHasLocalBackup,
    expandedModules, setExpandedModules,
    expandedLessons, setExpandedLessons,
    trailData, setTrailData,
    toast, showToast,
    restoreLocalBackup,
    handleSave, handleRefreshFromServer, handleDeleteTrail,
  };
}
