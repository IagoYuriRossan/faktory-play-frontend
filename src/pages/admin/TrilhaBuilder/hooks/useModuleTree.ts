import { Module, Lesson, Trail, Etapa } from '../../../../@types/index';
import { genId } from '../utils/contentBlocks';
import { trilhaBuilderApi } from '../services/trilhaBuilderApi';
import type { TrailData } from './useTrailData';

interface UseModuleTreeDeps {
  id: string | undefined;
  trailId: string;
  navigate: (path: string, opts?: any) => void;
  trailData: TrailData;
  setTrailData: React.Dispatch<React.SetStateAction<TrailData>>;
  setIsDirty: React.Dispatch<React.SetStateAction<boolean>>;
  activeModuleId: string | null;
  setActiveModuleId: React.Dispatch<React.SetStateAction<string | null>>;
  setActiveLessonId: React.Dispatch<React.SetStateAction<string | null>>;
  setExpandedModules: React.Dispatch<React.SetStateAction<Record<string, boolean>>>;
  showToast: (msg: string) => void;
  setSaving: React.Dispatch<React.SetStateAction<boolean>>;
  setLastSaved: React.Dispatch<React.SetStateAction<Date | null>>;
}

// ── Pure tree helpers ──
export const findAndRemoveModule = (modules: Module[], id: string): { removed?: Module; modules: Module[] } => {
  for (let i = 0; i < modules.length; i++) {
    const m = modules[i];
    if (m.id === id) {
      const copy = [...modules];
      const [removed] = copy.splice(i, 1);
      return { removed, modules: copy };
    }
    if (m.submodules && m.submodules.length) {
      const res = findAndRemoveModule(m.submodules, id);
      if (res.removed) {
        const copy = modules.map(x => x.id === m.id ? { ...m, submodules: res.modules } : x);
        return { removed: res.removed, modules: copy };
      }
    }
  }
  return { modules };
};

export const findModuleById = (modules: Module[], id: string): Module | undefined => {
  for (const m of modules) {
    if (m.id === id) return m;
    if (m.submodules) {
      const found = findModuleById(m.submodules, id);
      if (found) return found;
    }
  }
  return undefined;
};

export const findModuleDeep = findModuleById;

export function useModuleTree(deps: UseModuleTreeDeps) {
  const {
    id, trailId, navigate,
    trailData, setTrailData, setIsDirty,
    activeModuleId, setActiveModuleId, setActiveLessonId,
    setExpandedModules, showToast, setSaving, setLastSaved,
  } = deps;

  const reorderModule = (dragId: string, dropId: string) => {
    setTrailData(prev => {
      const modules = [...prev.modules];
      const fromIdx = modules.findIndex(m => m.id === dragId);
      const toIdx = modules.findIndex(m => m.id === dropId);
      if (fromIdx === -1 || toIdx === -1) return prev;
      const [item] = modules.splice(fromIdx, 1);
      modules.splice(toIdx, 0, item);
      return { ...prev, modules };
    });
    setIsDirty(true);
  };

  const moveModuleInto = (moduleId: string, parentId: string) => {
    if (moduleId === parentId) return;
    setTrailData(prev => {
      const cloned = JSON.parse(JSON.stringify(prev.modules)) as Module[];
      const { removed, modules: without } = findAndRemoveModule(cloned, moduleId);
      if (!removed) return prev;
      const parent = findModuleById(without, parentId);
      if (!parent) {
        const topIdx = without.findIndex(m => m.id === parentId);
        if (topIdx !== -1) {
          const copy = [...without];
          copy[topIdx].submodules = [...(copy[topIdx].submodules || []), removed];
          return { ...prev, modules: copy };
        }
        return prev;
      }
      const attach = (ms: Module[]): Module[] => ms.map(x => {
        if (x.id === parent.id) return { ...x, submodules: [...(x.submodules || []), removed] };
        return { ...x, submodules: x.submodules ? attach(x.submodules) : x.submodules };
      });
      return { ...prev, modules: attach(without) };
    });
    setIsDirty(true);
    showToast('Módulo movido para dentro do módulo selecionado');
  };

  const toggleModule = (moduleId: string) => {
    setExpandedModules(prev => ({ ...prev, [moduleId]: !prev[moduleId] }));
  };

  const addModule = () => {
    const newEtapaId = genId();
    const newModuleId = genId();
    const newModule: Module = {
      id: newModuleId,
      title: '',
      etapas: [{ id: newEtapaId, title: '' }],
    };
    setTrailData(prev => ({ ...prev, modules: [...prev.modules, newModule] }));
    setActiveModuleId(newModule.id);
    setActiveLessonId(newEtapaId);
    setExpandedModules(prev => ({ ...prev, [newModule.id]: true }));
    showToast('Módulo criado');

    if (id) {
      (async () => {
        try {
          const payload = { id: newModule.id, title: newModule.title, etapas: newModule.etapas };
          const res = await trilhaBuilderApi.createModule(trailId, payload);
          if (res && res.id) {
            setTrailData(prev => ({ ...prev, modules: prev.modules.map(m => m.id === newModule.id ? { ...m, id: res.id! } : m) }));
          }
        } catch (err) {
          console.warn('POST /modules failed, will rely on PUT /api/trails to persist:', err);
        }
      })();
    }
  };

  const updateModuleTitle = (moduleId: string, title: string) => {
    const updateInList = (list: Module[]): Module[] =>
      list.map(m =>
        m.id === moduleId
          ? { ...m, title }
          : { ...m, submodules: m.submodules ? updateInList(m.submodules) : m.submodules }
      );
    setTrailData(prev => ({ ...prev, modules: updateInList(prev.modules) }));
    setIsDirty(true);
  };

  const removeModule = (moduleId: string) => {
    setTrailData(prev => ({ ...prev, modules: prev.modules.filter(m => m.id !== moduleId) }));
    setIsDirty(true);
    if (activeModuleId === moduleId) setActiveModuleId(null);
  };

  const moveModule = (moduleId: string, dir: number) => {
    setTrailData(prev => {
      const modules = [...prev.modules];
      const idx = modules.findIndex(m => m.id === moduleId);
      const newIdx = idx + dir;
      if (idx === -1 || newIdx < 0 || newIdx >= modules.length) return prev;
      const item = modules.splice(idx, 1)[0];
      modules.splice(newIdx, 0, item);
      return { ...prev, modules };
    });
    setIsDirty(true);
  };

  const promoteSubmodules = (moduleId: string) => {
    setTrailData(prev => {
      const idx = prev.modules.findIndex(m => m.id === moduleId);
      if (idx === -1) return prev;
      const parent = prev.modules[idx];
      if (!parent.submodules?.length) return prev;
      const sub = parent.submodules;
      const updated = [...prev.modules.slice(0, idx), { ...parent, submodules: [] }, ...sub, ...prev.modules.slice(idx + 1)];
      return { ...prev, modules: updated };
    });
    setIsDirty(true);
    showToast('Submódulos promovidos para o nível superior');
  };

  const applyFaktoryOneTemplate = () => {
    const stages = ['1. Boas vindas', '2. Novos usuários CEM', '3. Novos usuários Pref', '4. Vendas', '5. Faturamento', '6. Financeiro'];
    const newModules: Module[] = stages.map((title, index) => ({
      id: `m-${Date.now()}-${index}`,
      title,
      etapas: [{ id: `e-${Date.now()}-${index}-1`, title: '' }],
    }));
    setTrailData(prev => ({ ...prev, title: 'Faktory One - Implantação', description: 'Estrutura completa de implantação do ERP Faktory One.', modules: newModules }));
    setIsDirty(true);
    if (newModules.length > 0) { setActiveModuleId(newModules[0].id); setActiveLessonId(newModules[0].etapas![0].id); }
    (async () => {
      try {
        const finalData: Trail = { id: trailId, title: 'Faktory One - Implantação', description: 'Estrutura completa de implantação do ERP Faktory One.', modules: newModules };
        if (id) { await trilhaBuilderApi.updateTrail(trailId, finalData); }
        else { const res = await trilhaBuilderApi.createTrail(finalData); const returnedId = res?.id || trailId; navigate(`/admin/trilhas/${returnedId}`, { replace: true }); }
        setLastSaved(new Date());
        setIsDirty(false);
        showToast('Template Faktory One restaurado e salvo');
      } catch (err) {
        console.error('Erro ao salvar template:', err);
        showToast('Template aplicado localmente. Faça login e salve para persistir');
      }
    })();
  };

  const flattenUntitledModules = () => {
    setTrailData(prev => {
      const modules = prev.modules || [];
      const newModules: Module[] = [];
      modules.forEach(m => {
        if ((!m.title || m.title.trim() === '') && m.submodules && m.submodules.length > 0) {
          newModules.push(...m.submodules);
        } else { newModules.push(m); }
      });
      return { ...prev, modules: newModules };
    });
    setIsDirty(true);
    showToast('Subetapas soltadas');
  };

  return {
    reorderModule, moveModuleInto, toggleModule,
    addModule, updateModuleTitle, removeModule, moveModule,
    promoteSubmodules, applyFaktoryOneTemplate, flattenUntitledModules,
  };
}
