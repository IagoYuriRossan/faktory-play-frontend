import { Module, Etapa, Subetapa } from '../../../../@types/index';
import { genId } from '../utils/contentBlocks';
import { trilhaBuilderApi } from '../services/trilhaBuilderApi';
import type { TrailData } from './useTrailData';

interface UseEtapaTreeDeps {
  id: string | undefined;
  trailId: string;
  trailData: TrailData;
  setTrailData: React.Dispatch<React.SetStateAction<TrailData>>;
  setIsDirty: React.Dispatch<React.SetStateAction<boolean>>;
  activeModuleId: string | null;
  setActiveModuleId: React.Dispatch<React.SetStateAction<string | null>>;
  activeLessonId: string | null;
  setActiveLessonId: React.Dispatch<React.SetStateAction<string | null>>;
  showToast: (msg: string) => void;
  setSaving: React.Dispatch<React.SetStateAction<boolean>>;
  setLastSaved: React.Dispatch<React.SetStateAction<Date | null>>;
  setEditingLessonId: React.Dispatch<React.SetStateAction<string | null>>;
  setEditingLessonTitle: React.Dispatch<React.SetStateAction<string>>;
  setEditingLessonParentId: React.Dispatch<React.SetStateAction<string | null>>;
  titleInputRef: React.RefObject<HTMLTextAreaElement | null>;
}

// ── Pure tree helpers ──
const applyToModuleInTree = (modules: Module[], moduleId: string, fn: (m: Module) => Module): Module[] =>
  modules.map(m => {
    if (m.id === moduleId) return fn(m);
    if (m.submodules?.length) return { ...m, submodules: applyToModuleInTree(m.submodules, moduleId, fn) };
    return m;
  });

export const removeEtapaFromTree = (etapas: Etapa[], id: string): { removed?: Etapa; etapas: Etapa[] } => {
  for (let i = 0; i < etapas.length; i++) {
    if (etapas[i].id === id) {
      const copy = [...etapas];
      const [removed] = copy.splice(i, 1);
      return { removed, etapas: copy };
    }
    if (etapas[i].subetapas?.length) {
      const res = removeEtapaFromTree(etapas[i].subetapas! as Etapa[], id);
      if (res.removed) {
        const copy = etapas.map((e, idx) => idx === i ? { ...e, subetapas: res.etapas as Subetapa[] } : e);
        return { removed: res.removed, etapas: copy };
      }
    }
  }
  return { etapas };
};

export const removeEtapaFromAllModules = (modules: Module[], etapaId: string): { removed?: Etapa; modules: Module[] } => {
  let removed: Etapa | undefined;
  const updated = modules.map(m => {
    const res = removeEtapaFromTree(m.etapas || [], etapaId);
    if (res.removed) { removed = res.removed; return { ...m, etapas: res.etapas }; }
    if (m.submodules) {
      const sub = removeEtapaFromAllModules(m.submodules, etapaId);
      if (sub.removed) { removed = sub.removed; return { ...m, submodules: sub.modules }; }
    }
    return m;
  });
  return { removed, modules: updated };
};

export const addEtapaAsSubetapa = (etapas: Etapa[], targetId: string, toAdd: Etapa): Etapa[] =>
  etapas.map(e => {
    if (e.id === targetId) return { ...e, subetapas: [...(e.subetapas || []), toAdd as Subetapa] };
    if (e.subetapas?.length) return { ...e, subetapas: addEtapaAsSubetapa(e.subetapas as Etapa[], targetId, toAdd) as Subetapa[] };
    return e;
  });

export const findEtapaInTree = (etapas: Etapa[], id: string): Etapa | undefined => {
  for (const e of etapas) {
    if (e.id === id) return e;
    if (e.subetapas?.length) {
      const found = findEtapaInTree(e.subetapas as Etapa[], id);
      if (found) return found;
    }
  }
  return undefined;
};

export function useEtapaTree(deps: UseEtapaTreeDeps) {
  const {
    id, trailId, trailData, setTrailData, setIsDirty,
    activeModuleId, setActiveModuleId,
    activeLessonId, setActiveLessonId,
    showToast, setSaving, setLastSaved,
    setEditingLessonId, setEditingLessonTitle, setEditingLessonParentId,
    titleInputRef,
  } = deps;

  const addLesson = (moduleId: string, parentEtapaId?: string) => {
    setActiveModuleId(moduleId);
    const newEtapaId = genId();
    const newEtapa: Etapa = { id: newEtapaId, title: '' };

    setTrailData(prev => ({
      ...prev,
      modules: applyToModuleInTree(prev.modules, moduleId, m => {
        if (!parentEtapaId) return { ...m, etapas: [...(m.etapas || []), newEtapa] };
        return { ...m, etapas: (m.etapas || []).map(e => e.id === parentEtapaId ? { ...e, subetapas: [...(e.subetapas || []), newEtapa as Subetapa] } : e) };
      }),
    }));
    setIsDirty(true);

    if (parentEtapaId) {
      setActiveLessonId(parentEtapaId);
    } else {
      setActiveLessonId(newEtapa.id);
    }
    setEditingLessonId(newEtapa.id);
    setEditingLessonTitle(newEtapa.title || '');
    setEditingLessonParentId(parentEtapaId || null);

    if (id) {
      (async () => {
        try { await trilhaBuilderApi.createEtapa(trailId, moduleId, newEtapa); }
        catch (err) { console.warn('POST etapa failed, rely on PUT /api/trails to persist:', err); }
      })();
    }
    showToast('Etapa criada');
  };

  const removeLesson = (moduleId: string, etapaId: string, parentEtapaId?: string) => {
    const ok = window.confirm('Remover esta etapa? Esta ação não pode ser desfeita.');
    if (!ok) return;
    setTrailData(prev => ({
      ...prev,
      modules: applyToModuleInTree(prev.modules, moduleId, m => {
        if (!parentEtapaId) return { ...m, etapas: (m.etapas || []).filter(e => e.id !== etapaId) };
        return { ...m, etapas: (m.etapas || []).map(e => e.id === parentEtapaId ? { ...e, subetapas: (e.subetapas || []).filter(s => s.id !== etapaId) } : e) };
      }),
    }));
    setIsDirty(true);
    if (activeLessonId === etapaId) setActiveLessonId(null);
    showToast('Etapa removida');
  };

  const moveLesson = (moduleId: string, etapaId: string, dir: number, parentEtapaId?: string) => {
    setTrailData(prev => ({
      ...prev,
      modules: applyToModuleInTree(prev.modules, moduleId, m => {
        if (!parentEtapaId) {
          const etapas = [...(m.etapas || [])];
          const idx = etapas.findIndex(e => e.id === etapaId);
          const newIdx = idx + dir;
          if (idx === -1 || newIdx < 0 || newIdx >= etapas.length) return m;
          const item = etapas.splice(idx, 1)[0];
          etapas.splice(newIdx, 0, item);
          return { ...m, etapas };
        }
        return {
          ...m,
          etapas: (m.etapas || []).map(e => {
            if (e.id !== parentEtapaId) return e;
            const sub = [...(e.subetapas || [])];
            const idx = sub.findIndex(s => s.id === etapaId);
            const newIdx = idx + dir;
            if (idx === -1 || newIdx < 0 || newIdx >= sub.length) return e;
            const item = sub.splice(idx, 1)[0];
            sub.splice(newIdx, 0, item);
            return { ...e, subetapas: sub };
          }),
        };
      }),
    }));
    setIsDirty(true);
  };

  const moveLessonToModule = (srcId: string, targetModuleId: string) => {
    setTrailData(prev => {
      const { removed, modules: withoutSrc } = removeEtapaFromAllModules(prev.modules, srcId);
      if (!removed) return prev;
      const addToMod = (mods: Module[]): Module[] =>
        mods.map(m => {
          if (m.id === targetModuleId) return { ...m, etapas: [...(m.etapas || []), removed!] };
          return { ...m, submodules: m.submodules ? addToMod(m.submodules) : m.submodules };
        });
      return { ...prev, modules: addToMod(withoutSrc) };
    });
    setIsDirty(true);
    showToast('Etapa movida para o módulo');
  };

  const moveLessonInto = (srcId: string, targetId: string) => {
    if (srcId === targetId) return;
    setTrailData(prev => {
      const { removed, modules: withoutSrc } = removeEtapaFromAllModules(prev.modules, srcId);
      if (!removed) return prev;
      const addToTarget = (mods: Module[]): Module[] =>
        mods.map(m => ({
          ...m,
          etapas: addEtapaAsSubetapa(m.etapas || [], targetId, removed!),
          submodules: m.submodules ? addToTarget(m.submodules) : m.submodules,
        }));
      return { ...prev, modules: addToTarget(withoutSrc) };
    });
    setIsDirty(true);
    showToast('Etapa movida para dentro de outra');
  };

  const startEditLesson = (etapaId: string, title: string, parentEtapaId?: string) => {
    setEditingLessonId(etapaId);
    setEditingLessonTitle(title);
    setEditingLessonParentId(parentEtapaId || null);
  };

  // Aceita qualquer campo (legado ou novo) durante a migração
  const updateLesson = (updates: Record<string, any>) => {
    if (!activeLessonId) return;
    const updateEtapaInTree = (etapas: Etapa[]): Etapa[] =>
      etapas.map(e => {
        if (e.id === activeLessonId) return { ...e, ...updates };
        if (e.subetapas?.length) return { ...e, subetapas: updateEtapaInTree(e.subetapas as Etapa[]) as Subetapa[] };
        return e;
      });
    const updateInModules = (modules: Module[]): Module[] =>
      modules.map(m => ({
        ...m,
        etapas: updateEtapaInTree(m.etapas || []),
        submodules: m.submodules ? updateInModules(m.submodules) : m.submodules,
      }));
    setTrailData(prev => ({ ...prev, modules: updateInModules(prev.modules) }));
    setIsDirty(true);
  };

  const getActiveLesson = (): Etapa | null => {
    if (!activeLessonId) return null;
    const searchModules = (mods: Module[]): Etapa | null => {
      for (const m of mods) {
        const found = findEtapaInTree(m.etapas || [], activeLessonId);
        if (found) return found;
        if (m.submodules?.length) { const sub = searchModules(m.submodules); if (sub) return sub; }
      }
      return null;
    };
    return searchModules(trailData.modules);
  };

  const getActiveLessonTitleHtml = () => {
    const al = getActiveLesson();
    if (!al) return '';
    return (al as any).titleHtml || (al.title ? `<h2>${al.title}</h2>` : '');
  };

  return {
    addLesson, removeLesson, moveLesson,
    moveLessonToModule, moveLessonInto,
    startEditLesson, updateLesson,
    getActiveLesson, getActiveLessonTitleHtml,
  };
}
