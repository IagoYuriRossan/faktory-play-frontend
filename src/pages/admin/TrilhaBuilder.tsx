import { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { 
  Plus, Trash2, Video, FileText, HelpCircle, 
  ChevronDown, ChevronUp, Save, Loader2, ArrowLeft,
  Layout, Image as ImageIcon, Type, Code, Layers,
  Eye, Search, Bell, User as UserIcon, Minus, Maximize2,
  RefreshCw, MousePointer2, Settings,
  GripVertical, Copy, Pencil
} from 'lucide-react';
import { api } from '../../utils/api';
import { auth } from '../../utils/firebase';
import DOMPurify from 'dompurify';
import { Trail, Module, Lesson } from '../../@types';
import { cn } from '../../utils/utils';
import { motion, AnimatePresence } from 'motion/react';

export default function AdminTrilhaBuilder() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [trailId] = useState(() => id || `trail-${Date.now()}`);
  const [loading, setLoading] = useState(!!id);
  const [saving, setSaving] = useState(false);
  const [activeModuleId, setActiveModuleId] = useState<string | null>(null);
  const [activeLessonId, setActiveLessonId] = useState<string | null>(null);
  const [showVideoModal, setShowVideoModal] = useState(false);
  const [lastSaved, setLastSaved] = useState<Date | null>(null);
  const [isDirty, setIsDirty] = useState(false);
  const [toast, setToast] = useState('');
  const toastTimerRef = useRef<number | null>(null);
  const [showBlockEditor, setShowBlockEditor] = useState(false);
  const [hoveredBlockId, setHoveredBlockId] = useState<string | null>(null);
  const [editingBlockIdState, setEditingBlockIdState] = useState<string | null>(null);
  const [editingBlockHtmlState, setEditingBlockHtmlState] = useState<string>('');
  const [showPreviewModal, setShowPreviewModal] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [imageUploading, setImageUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [editingLessonId, setEditingLessonId] = useState<string | null>(null);
  const [editingLessonTitle, setEditingLessonTitle] = useState('');
  const [editingLessonParentId, setEditingLessonParentId] = useState<string | null>(null);
  const [activeSublessonId, setActiveSublessonId] = useState<string | null>(null);
  const [showActionsMenu, setShowActionsMenu] = useState(false);
  const actionsMenuRef = useRef<HTMLDivElement | null>(null);
  const [expandedModules, setExpandedModules] = useState<Record<string, boolean>>({});
  
  const [trailData, setTrailData] = useState({
    title: '',
    description: '',
    modules: [] as Module[]
  });

  // Auto-save logic
  useEffect(() => {
    if (!isDirty) return;

    const timeoutId = setTimeout(async () => {
      try {
        const finalData = { id: trailId, ...trailData };
        if (id) {
          await api.put(`/api/trails/${trailId}`, finalData);
        } else {
          const res = await api.post<any>('/api/trails', finalData);
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
  }, [trailData, isDirty, id, trailId, navigate]);

  useEffect(() => {
    async function fetchTrail() {
      if (!id) return;
      try {
        const data = await api.get<Trail>(`/api/trails/${id}`);
        // If this is the Faktory One template and the user asked to start fresh,
        // clear all modules so they can re-add items from scratch.
            if (data.title === 'Faktory One - Implantação') {
              const cleared = { title: data.title, description: data.description, modules: [] as Module[] };
          setTrailData(cleared);
          setIsDirty(true);
          try {
            const finalData: Trail = { id: trailId, ...cleared };
            await api.put(`/api/trails/${trailId}`, finalData);
            showToast('Conteúdo da trilha Faktory One apagado');
          } catch (err) {
            console.error('Erro ao persistir limpeza da trilha:', err);
            showToast('Trilha limpa localmente; salve para persistir');
          }
        } else {
          setTrailData({
            title: data.title,
            description: data.description,
            modules: data.modules,
          });
        }
        if (data.modules.length > 0) {
          setActiveModuleId(data.modules[0].id);
          if (data.modules[0].lessons.length > 0) {
            setActiveLessonId(data.modules[0].lessons[0].id);
          }
        }
        setExpandedModules(prev => {
          const next = { ...prev };
          data.modules.forEach(m => { if (next[m.id] === undefined) next[m.id] = true; });
          return next;
        });
      } catch (error) {
        console.error('Error fetching trail:', error);
      } finally {
        setLoading(false);
      }
    }
    fetchTrail();
  }, [id]);

  // helper to create block-wrapped content so prefilled items get the same controls
  const makeBlock = (html: string, type = 'custom') => {
    const id = `b-${Date.now()}-${Math.random().toString(36).slice(2,8)}`;
    const safe = DOMPurify.sanitize(html, { WHOLE_DOCUMENT: false });
    return `<!-- block:${type}:${id} -->\n${safe}\n<!-- /block:${type}:${id} -->`;
  };

  const welcomeContent = makeBlock('<p>Bem-vindo à primeira aula.</p>');

  const createLogoContent = () => {
    const logoHtml = `<div class="faktory-logo"><img src="/logo.png" alt="Faktory Logo" style="max-width:320px;"/></div>`;
    const logoBlockId = `b-${Date.now()}-${Math.random().toString(36).slice(2,8)}`;
    return `<!-- block:logo:${logoBlockId} -->\n${DOMPurify.sanitize(logoHtml, { WHOLE_DOCUMENT: false })}\n<!-- /block:logo:${logoBlockId} -->`;
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      const finalData: Trail = { id: trailId, ...trailData };
      if (id) {
        try {
          await api.put(`/api/trails/${trailId}`, finalData);
        } catch (err: any) {
          // If backend responds that document doesn't exist, try creating it (fallback)
          if (err && err.status === 404) {
            const res = await api.post<any>('/api/trails', finalData);
            const returnedId = res?.id || trailId;
            navigate(`/admin/trilhas/${returnedId}`, { replace: true });
          } else {
            throw err;
          }
        }
      } else {
        const res = await api.post<any>('/api/trails', finalData);
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

  const testSaveAndReload = async () => {
    setSaving(true);
    try {
      const finalData: Trail = { id: trailId, ...trailData };
      console.debug('[TEST] enviando PUT /api/trails', finalData);
      if (id) {
        const resp = await api.put(`/api/trails/${trailId}`, finalData);
        console.debug('[TEST] PUT response:', resp);
      } else {
        const res = await api.post<any>('/api/trails', finalData);
        console.debug('[TEST] POST response:', res);
      }
      // imediatamente buscar do servidor
      const fetched = await api.get<Trail>(`/api/trails/${trailId}`);
      console.debug('[TEST] GET after save:', fetched);
      showToast('Teste concluído — verifique console para detalhes');
    } catch (err) {
      console.error('[TEST] Erro no teste de salvar+recarregar:', err);
      showToast('Teste falhou — veja console');
    } finally {
      setSaving(false);
    }
  };

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

  const reorderLesson = (moduleId: string, dragId: string, dropId: string) => {
    setTrailData(prev => {
      const modules = prev.modules.map(m => {
        if (m.id !== moduleId) return m;
        const lessons = [...m.lessons];
        const fromIdx = lessons.findIndex(l => l.id === dragId);
        const toIdx = lessons.findIndex(l => l.id === dropId);
        if (fromIdx === -1 || toIdx === -1) return m;
        const [item] = lessons.splice(fromIdx, 1);
        lessons.splice(toIdx, 0, item);
        return { ...m, lessons };
      });
      return { ...prev, modules };
    });
    setIsDirty(true);
  };

  const toggleModule = (moduleId: string) => {
    setExpandedModules(prev => ({ ...prev, [moduleId]: !prev[moduleId] }));
  };

  const handleRefreshFromServer = async () => {
    if (isDirty) {
      const ok = window.confirm('Existem alterações não salvas. Deseja descartar e recarregar do servidor?');
      if (!ok) return;
    }
    if (!id) return;
    setLoading(true);
    try {
      const data = await api.get<Trail>(`/api/trails/${id}`);
      setTrailData({ title: data.title, description: data.description, modules: data.modules });
      setIsDirty(false);
      setShowPreviewModal(false);
      showToast('Recarregado do servidor');
    } catch (err) {
      showToast('Erro ao recarregar do servidor');
    } finally {
      setLoading(false);
    }
  };

  const handleOpenPreview = () => {
    setShowPreviewModal(true);
  };

  const handleDeleteTrail = async () => {
    if (!id) return;
    // Optimistic UX: navigate immediately so the user sees the list fast,
    // then perform deletion in background. If deletion fails, notify the user.
    navigate('/admin/trilhas');
    showToast('Removendo trilha...');
    (async () => {
      try {
        await api.delete(`/api/trails/${id}`);
        // Success — inform user (list already shows navigated view)
        showToast('Trilha removida');
      } catch (err) {
        console.error('Erro ao remover trilha (background):', err);
        showToast('Erro ao remover trilha — verifique a conexão');
      }
    })();
  };

  useEffect(() => {
    function onDocClick(e: MouseEvent) {
      if (!showActionsMenu) return;
      if (!actionsMenuRef.current) return;
      const el = actionsMenuRef.current;
      if (!el.contains(e.target as Node)) setShowActionsMenu(false);
    }

    function onKey(e: KeyboardEvent) {
      if (e.key === 'Escape') setShowActionsMenu(false);
    }

    document.addEventListener('mousedown', onDocClick);
    document.addEventListener('keydown', onKey);
    return () => {
      document.removeEventListener('mousedown', onDocClick);
      document.removeEventListener('keydown', onKey);
    };
  }, [showActionsMenu]);

  const applyFaktoryOneTemplate = () => {
    const stages = [
      '1. Boas vindas',
      '2. Novos usuários CEM',
      '3. Novos usuários Pref',
      '4. Vendas',
      '5. Faturamento',
      '6. Financeiro'
    ];
    

    const newModules: Module[] = stages.map((title, index) => ({
      id: `m-${Date.now()}-${index}`,
      title,
      lessons: [
        {
          id: `l-${Date.now()}-${index}-1`,
          title: '',
          videoUrl: '',
          videoPosition: 'top',
          content: '',
        }
      ]
    }));

    setTrailData(prev => ({
      ...prev,
      title: 'Faktory One - Implantação',
      description: 'Estrutura completa de implantação do ERP Faktory One.',
      modules: newModules
    }));
    setIsDirty(true);
    
    if (newModules.length > 0) {
      setActiveModuleId(newModules[0].id);
      setActiveLessonId(newModules[0].lessons[0].id);
    }
    // Tenta salvar imediatamente no backend (se possível)
    (async () => {
      try {
        const finalData: Trail = { id: trailId, title: 'Faktory One - Implantação', description: 'Estrutura completa de implantação do ERP Faktory One.', modules: newModules };
        if (id) {
          await api.put(`/api/trails/${trailId}`, finalData);
        } else {
          const res = await api.post<any>('/api/trails', finalData);
          const returnedId = res?.id || trailId;
          navigate(`/admin/trilhas/${returnedId}`, { replace: true });
        }
        setLastSaved(new Date());
        setIsDirty(false);
        showToast('Template Faktory One restaurado e salvo');
      } catch (err) {
        console.error('Erro ao salvar template:', err);
        showToast('Template aplicado localmente. Faça login e salve para persistir');
      }
    })();
  };

  const addModule = () => {
    const newLessonId = genId();
    const newModuleId = genId();
    const newModule: Module = {
      id: newModuleId,
      title: '',
      lessons: [
        {
          id: newLessonId,
          title: '',
          videoUrl: '',
          videoPosition: 'top',
          content: '',
        }
      ]
    };

    // optimistic local update
    setTrailData(prev => ({ ...prev, modules: [...prev.modules, newModule] }));
    setActiveModuleId(newModule.id);
    setActiveLessonId(newLessonId);
    setExpandedModules(prev => ({ ...prev, [newModule.id]: true }));

    console.debug('addModule: created', newModule);
    showToast('Etapa criada');

    // If trail exists on server, try creating module via nested POST; fallback to global PUT
    if (id) {
      (async () => {
        try {
          const payload = { id: newModule.id, title: newModule.title, lessons: newModule.lessons };
          const res = await api.post<any>(`/api/trails/${trailId}/modules`, payload);
          if (res && res.id) {
            // replace local module id if server returned canonical id
            setTrailData(prev => ({ ...prev, modules: prev.modules.map(m => m.id === newModule.id ? { ...m, id: res.id } : m) }));
          }
        } catch (err) {
          console.warn('POST /modules failed, will rely on PUT /api/trails to persist:', err);
        }
      })();
    }
  };

  const updateModuleTitle = (moduleId: string, title: string) => {
    setTrailData(prev => ({
      ...prev,
      modules: prev.modules.map(m => m.id === moduleId ? { ...m, title } : m)
    }));
    setIsDirty(true);
  };

  const removeModule = (moduleId: string) => {
    setTrailData(prev => ({
      ...prev,
      modules: prev.modules.filter(m => m.id !== moduleId)
    }));
    setIsDirty(true);
    if (activeModuleId === moduleId) setActiveModuleId(null);
    // Não chamar endpoint de remoção por-item; rely no PUT global para persistência.
    if (id) {
      console.warn('Backend não expõe endpoint de remoção de módulo; salve a trilha para persistir a remoção.');
    }
  };

  const addLesson = (moduleId: string, parentLessonId?: string) => {
    // ensure active module is set so subsequent edits/saves work
    setActiveModuleId(moduleId);
    const newLessonId = genId();
    const newLesson: Lesson = {
      id: newLessonId,
      title: '',
      videoUrl: '',
      videoPosition: 'top',
      content: '',
    };
    setTrailData(prev => ({
      ...prev,
      modules: prev.modules.map(m => {
        if (m.id !== moduleId) return m;
        if (!parentLessonId) {
          return { ...m, lessons: [...m.lessons, newLesson] };
        }
        return {
          ...m,
          lessons: m.lessons.map(l => l.id === parentLessonId ? { ...l, sublessons: [...(l.sublessons || []), newLesson] } : l)
        };
      })
    }));
    setIsDirty(true);
    if (parentLessonId) {
      setActiveSublessonId(newLesson.id);
      setActiveLessonId(parentLessonId);
      // open edit mode for new sublesson
      setEditingLessonId(newLesson.id);
      setEditingLessonTitle(newLesson.title);
      setEditingLessonParentId(parentLessonId);
      // Backend não tem endpoint para criar sublessons individualmente; salvar a trilha completa.
      if (id) {
        (async () => {
          try {
            await api.post(`/api/trails/${trailId}/modules/${moduleId}/lessons`, newLesson);
          } catch (err) {
            console.warn('POST sublesson failed, rely on PUT /api/trails to persist:', err);
          }
        })();
      }
    } else {
      setActiveLessonId(newLesson.id);
      setActiveSublessonId(null);
      // open edit mode for new lesson
      setEditingLessonId(newLesson.id);
      setEditingLessonTitle(newLesson.title);
      setEditingLessonParentId(null);
      // Backend não tem endpoint para criar aulas individualmente; salvar a trilha completa.
        if (id) {
          (async () => {
            try {
              await api.post(`/api/trails/${trailId}/modules/${moduleId}/lessons`, newLesson);
            } catch (err) {
              console.warn('POST lesson failed, rely on PUT /api/trails to persist:', err);
            }
          })();
        }
    }
    showToast('Aula criada');
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

  const moveLesson = (moduleId: string, lessonId: string, dir: number, parentLessonId?: string) => {
    setTrailData(prev => {
      const modules = prev.modules.map(m => {
        if (m.id !== moduleId) return m;
        if (!parentLessonId) {
          const lessons = [...m.lessons];
          const idx = lessons.findIndex(l => l.id === lessonId);
          const newIdx = idx + dir;
          if (idx === -1 || newIdx < 0 || newIdx >= lessons.length) return m;
          const item = lessons.splice(idx, 1)[0];
          lessons.splice(newIdx, 0, item);
          return { ...m, lessons };
        }
        return {
          ...m,
          lessons: m.lessons.map(l => {
            if (l.id !== parentLessonId) return l;
            const sub = [...(l.sublessons || [])];
            const idx = sub.findIndex(s => s.id === lessonId);
            const newIdx = idx + dir;
            if (idx === -1 || newIdx < 0 || newIdx >= sub.length) return l;
            const item = sub.splice(idx, 1)[0];
            sub.splice(newIdx, 0, item);
            return { ...l, sublessons: sub };
          })
        };
      });
      return { ...prev, modules };
    });
    setIsDirty(true);
  };

  const moveBlockById = (id: string, dir: number) => {
    if (!activeLesson) return;
    const content = activeLesson.content || '';
    const blocks = parseBlocks(content);
    if (blocks.length === 0) return;
    const sorted = [...blocks].sort((a, b) => a.index - b.index);
    const idx = sorted.findIndex(b => b.id === id);
    if (idx === -1) return;
    const swapIdx = idx + dir;
    if (swapIdx < 0 || swapIdx >= sorted.length) return;

    const parts: string[] = [];
    let last = 0;
    for (const b of sorted) {
      parts.push(content.slice(last, b.index));
      parts.push(content.slice(b.index, b.index + b.length));
      last = b.index + b.length;
    }
    parts.push(content.slice(last));

    const partIndex = idx * 2 + 1;
    const swapPartIndex = swapIdx * 2 + 1;
    const newParts = [...parts];
    const tmp = newParts[partIndex];
    newParts[partIndex] = newParts[swapPartIndex];
    newParts[swapPartIndex] = tmp;
    const newContent = newParts.join('');
    updateLesson({ content: newContent });
  };

  const setVideoPosition = (pos: 'title-top' | 'top' | 'bottom') => {
    updateLesson({ videoPosition: pos });
  };

  const insertVideoAsBlock = () => {
    if (!activeLesson || !activeLesson.videoUrl) return;
    const embed = getEmbedUrl(activeLesson.videoUrl) || activeLesson.videoUrl;
    const html = `<div class="embed"><iframe src="${embed}" width="100%" height="450" frameborder="0" allowfullscreen></iframe></div>`;
    const block = genBlock(html, 'video');
    updateLesson({ content: (activeLesson.content || '') + '\n' + block, videoUrl: '' });
    setShowVideoModal(false);
    showToast('Vídeo movido para o conteúdo como bloco');
  };

  // Drag & drop refs and handlers
  const dragBlockIdRef = useRef<string | null>(null);
  const dragModuleIdRef = useRef<string | null>(null);
  const dragLessonIdRef = useRef<string | null>(null);
  const dragVideoRef = useRef<boolean>(false);
  const dragTitleRef = useRef<boolean>(false);
  const dragPageTitleRef = useRef<boolean>(false);
  const dragImageRef = useRef<string | null>(null);
  const blocksAreaRef = useRef<HTMLDivElement | null>(null);
  const previewAreaRef = useRef<HTMLDivElement | null>(null);
  const imageInputRef = useRef<HTMLInputElement | null>(null);
  const blockRefs = useRef<Record<string, HTMLDivElement | null>>({});
  const [dragPreview, setDragPreview] = useState<{ type: 'none' | 'title' | 'content' | 'block'; id?: string; rect?: { top: number; left: number; width: number; height: number }; pos?: 'before' | 'after'; source?: 'list' | 'preview' }>({ type: 'none' });

  const reorderBlock = (dragId: string, dropId: string) => {
    if (!activeLesson) return;
    const content = activeLesson.content || '';
    const blocks = parseBlocks(content).sort((a, b) => a.index - b.index);
    const fromIdx = blocks.findIndex(b => b.id === dragId);
    const toIdx = blocks.findIndex(b => b.id === dropId);
    if (fromIdx === -1 || toIdx === -1) return;

    const parts: string[] = [];
    let last = 0;
    for (const b of blocks) {
      parts.push(content.slice(last, b.index));
      parts.push(content.slice(b.index, b.index + b.length));
      last = b.index + b.length;
    }
    parts.push(content.slice(last));

    const element = parts.splice(fromIdx * 2 + 1, 1)[0];
    parts.splice(toIdx * 2 + 1, 0, element);
    const newContent = parts.join('');
    updateLesson({ content: newContent });
  };

  const reorderBlockTo = (dragId: string, dropId: string, pos: 'before' | 'after') => {
    if (!activeLesson) return;
    const content = activeLesson.content || '';
    const blocks = parseBlocks(content).sort((a, b) => a.index - b.index);
    const fromIdx = blocks.findIndex(b => b.id === dragId);
    const toIdx = blocks.findIndex(b => b.id === dropId);
    if (fromIdx === -1 || toIdx === -1) return;

    // Build parts array [prefix, block, prefix, block, ...]
    const parts: string[] = [];
    let last = 0;
    for (const b of blocks) {
      parts.push(content.slice(last, b.index));
      parts.push(content.slice(b.index, b.index + b.length));
      last = b.index + b.length;
    }
    parts.push(content.slice(last));

    const element = parts.splice(fromIdx * 2 + 1, 1)[0];

    // Calculate insertion index in parts for before/after
    const insertAt = pos === 'before' ? (toIdx * 2) : (toIdx * 2 + 2);
    parts.splice(insertAt, 0, element);

    const newContent = parts.join('');
    updateLesson({ content: newContent });
  };

  const duplicateBlockById = (id: string) => {
    if (!activeLesson) return;
    const content = activeLesson.content || '';
    const blocks = parseBlocks(content).sort((a, b) => a.index - b.index);
    const idx = blocks.findIndex(b => b.id === id);
    if (idx === -1) return;
    const newBlock = genBlock(blocks[idx].html, blocks[idx].type);
    // insert after
    const parts: string[] = [];
    let last = 0;
    for (const b of blocks) {
      parts.push(content.slice(last, b.index));
      parts.push(content.slice(b.index, b.index + b.length));
      last = b.index + b.length;
    }
    parts.push(content.slice(last));
    parts.splice(idx * 2 + 2, 0, newBlock);
    updateLesson({ content: parts.join('') });
    showToast('Bloco duplicado');
  };
  

  const removeLesson = (moduleId: string, lessonId: string, parentLessonId?: string) => {
    const ok = window.confirm('Remover esta aula? Esta ação não pode ser desfeita.');
    if (!ok) return;
    setTrailData(prev => ({
      ...prev,
      modules: prev.modules.map(m => {
        if (m.id !== moduleId) return m;
        if (!parentLessonId) {
          return { ...m, lessons: m.lessons.filter(l => l.id !== lessonId) };
        }
        return { ...m, lessons: m.lessons.map(l => l.id === parentLessonId ? { ...l, sublessons: (l.sublessons || []).filter(s => s.id !== lessonId) } : l) };
      })
    }));
    setIsDirty(true);
    if (activeLessonId === lessonId) setActiveLessonId(null);
    if (activeSublessonId === lessonId) setActiveSublessonId(null);
    // Remover no backend
    if (id) {
      if (parentLessonId) {
        // Não chamar endpoint de remoção de subaula (não existe no backend). Persistir via PUT /api/trails/{id}.
        console.warn('Backend não expõe endpoint para remover subaula; salve a trilha para persistir a remoção.');
      } else {
        // Não chamar endpoint de remoção de aula; usar PUT global.
        console.warn('Backend não expõe endpoint para remover aula; salve a trilha para persistir a remoção.');
      }
    }
    showToast('Aula removida');
  };

  const startEditLesson = (lessonId: string, title: string, parentLessonId?: string) => {
    setEditingLessonId(lessonId);
    setEditingLessonTitle(title);
    setEditingLessonParentId(parentLessonId || null);
  };

  const saveEditLesson = () => {
    if (!editingLessonId || !activeModuleId) return;

    // Compute updated trail data with the edited title so we can both update state and persist immediately
    const updated = ((): typeof trailData => {
      const modules = trailData.modules.map(m => {
        if (m.id !== activeModuleId) return m;
        if (!editingLessonParentId) {
          return { ...m, lessons: m.lessons.map(l => l.id === editingLessonId ? { ...l, title: editingLessonTitle } : l) };
        }
        return { ...m, lessons: m.lessons.map(l => l.id === editingLessonParentId ? { ...l, sublessons: (l.sublessons || []).map(s => s.id === editingLessonId ? { ...s, title: editingLessonTitle } : s) } : l) };
      });
      return { ...trailData, modules };
    })();

    setTrailData(updated);
    setIsDirty(true);

    // If this trail exists on the server, try to persist immediately to avoid relying only on autosave
    if (id) {
      (async () => {
        setSaving(true);
        try {
          const finalData: Trail = { id: trailId, ...updated };
          await api.put(`/api/trails/${trailId}`, finalData);
          setLastSaved(new Date());
          setIsDirty(false);
          showToast('Título salvo');
        } catch (err) {
          console.error('Erro salvando título imediatamente:', err);
          showToast('Erro ao salvar título — salve a trilha manualmente');
        } finally {
          setSaving(false);
        }
      })();
    } else {
      console.warn('Renomeio aplicado localmente. Salve a trilha para persistir o novo título no backend.');
      showToast('Título atualizado localmente — salve a trilha para persistir');
    }

    setEditingLessonId(null);
    setEditingLessonTitle('');
    setEditingLessonParentId(null);
    showToast('Aula renomeada');
  };

  const cancelEditLesson = () => {
    setEditingLessonId(null);
    setEditingLessonTitle('');
    setEditingLessonParentId(null);
  };

  const updateLesson = (updates: Partial<Lesson>) => {
    if (!activeModuleId || !activeLessonId) return;
    setTrailData(prev => ({
      ...prev,
      modules: prev.modules.map(m => {
        if (m.id !== activeModuleId) return m;
        // update top-level lesson
        const top = m.lessons.find(l => l.id === activeLessonId);
        if (top) {
          return { ...m, lessons: m.lessons.map(l => l.id === activeLessonId ? { ...l, ...updates } : l) };
        }
        // otherwise try sublessons
        return { ...m, lessons: m.lessons.map(l => ({ ...l, sublessons: (l.sublessons || []).map(s => s.id === activeSublessonId ? { ...s, ...updates } : s) })) };
      })
    }));
    setIsDirty(true);
  };

  const getActiveLesson = () => {
    if (!activeModuleId || !activeLessonId) return null;
    const module = trailData.modules.find(m => m.id === activeModuleId);
    if (!module) return null;
    if (activeSublessonId) {
      for (const l of module.lessons) {
        const s = (l.sublessons || []).find(x => x.id === activeSublessonId);
        if (s) return s;
      }
    }
    return module.lessons.find(l => l.id === activeLessonId) || null;
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

  const showToast = (msg: string) => {
    setToast(msg);
    if (toastTimerRef.current) window.clearTimeout(toastTimerRef.current);
    toastTimerRef.current = window.setTimeout(() => setToast(''), 3000);
  };

  const genBlock = (html: string, type = 'custom') => {
    const id = `b-${genId()}`;
    const safe = DOMPurify.sanitize(html, { WHOLE_DOCUMENT: false });
    return `<!-- block:${type}:${id} -->\n${safe}\n<!-- /block:${type}:${id} -->`;
  };

  const genId = () => {
    try { return crypto.randomUUID(); } catch { return `${Date.now()}-${Math.random().toString(36).slice(2,8)}`; }
  };

  const handleImageFile = (file: File) => {
    // If trail exists on server and lesson/module ids are available, try uploading
    if (id && activeModuleId && activeLessonId) {
      setImageUploading(true);
      setUploadProgress(0);
      (async () => {
        let xhr: XMLHttpRequest | null = null;
        try {
          const user = auth.currentUser;
          const token = user ? await user.getIdToken() : null;
          const form = new FormData();
          form.append('image', file);

          await new Promise<void>((resolve, reject) => {
            xhr = new XMLHttpRequest();
            const url = `${import.meta.env.VITE_API_URL || 'http://127.0.0.1:3001'}/api/trails/${trailId}/modules/${activeModuleId}/lessons/${activeLessonId}/image`;
            xhr.open('POST', url, true);
            if (token) xhr.setRequestHeader('Authorization', `Bearer ${token}`);
            xhr.upload.onprogress = (e) => {
              if (e.lengthComputable) {
                const pct = Math.round((e.loaded / e.total) * 100);
                setUploadProgress(pct);
              }
            };
            xhr.onload = () => {
              const status = xhr!.status;
              const text = xhr!.responseText;
              let data: any = null;
              try { data = text ? JSON.parse(text) : null; } catch { data = text; }
              if (status >= 200 && status < 300) {
                const imageUrl = data?.imageUrl || data?.url;
                if (imageUrl) {
                  updateLesson({ imageUrl });
                  showToast('Imagem enviada e salva no servidor');
                  resolve();
                  return;
                }
                reject(new Error('Resposta do servidor não continha imageUrl'));
                return;
              }
              if (status === 413) {
                reject(new Error('Tamanho do arquivo excede o limite de 5MB (413)'));
                return;
              }
              reject(new Error((data && data.message) || `Upload failed (${status})`));
            };
            xhr.onerror = () => reject(new Error('Erro na requisição de upload'));
            xhr.onabort = () => reject(new Error('Upload abortado'));
            xhr.send(form);
          });
          setUploadProgress(100);
          return;
        } catch (err: any) {
          console.warn('Upload falhou, usando DataURL como fallback:', err);
          if (err && err.message && err.message.includes('5MB')) showToast('Erro: arquivo maior que 5MB');
          const reader = new FileReader();
          reader.onload = () => {
            const dataUrl = reader.result as string;
            updateLesson({ imageUrl: dataUrl });
            showToast('Upload falhou — imagem armazenada localmente (salve para persistir)');
          };
          reader.readAsDataURL(file);
        } finally {
          setImageUploading(false);
          setTimeout(() => setUploadProgress(0), 700);
          // abort XHR if still open
          try {
            if (xhr) {
              try { (xhr as any).abort(); } catch (e) { /* noop */ }
            }
          } catch (e) { /* noop */ }
        }
      })();
      return;
    }

    // Fallback: read as DataURL and attach locally
    const reader = new FileReader();
    reader.onload = () => {
      const dataUrl = reader.result as string;
      updateLesson({ imageUrl: dataUrl });
      showToast('Imagem adicionada à aula (local) — salve para persistir');
    };
    reader.readAsDataURL(file);
  };

  const parseBlocks = (content: string) => {
    const re = /<!-- block:([a-zA-Z0-9_-]+):([a-zA-Z0-9_-]+) -->([\s\S]*?)<!-- \/block:\1:\2 -->/g;
    const blocks: Array<any> = [];
    let m;
    while ((m = re.exec(content)) !== null) {
      blocks.push({ type: m[1], id: m[2], html: m[3], index: m.index, length: m[0].length });
    }
    return blocks;
  };

  const renderBlockList = () => {
    const content = activeLesson?.content || '';
    const blocks = parseBlocks(content).sort((a, b) => a.index - b.index);
    if (blocks.length === 0) {
      return (
        <div className="text-center p-8 text-slate-400">
          <div dangerouslySetInnerHTML={{ __html: createLogoContent() }} />
          <div className="mt-4">
            <button
              className="px-4 py-2 bg-faktory-blue text-white rounded"
              onClick={() => {
                // open block editor so user can add components
                setEditingLessonId(activeLesson?.id || null);
                setShowBlockEditor(true);
              }}
            >
              Clique para adicionar conteúdo
            </button>
          </div>
        </div>
      );
    }

    return (
      <div className="relative">
        <div className="space-y-2">
          {blocks.map((b: any) => (
            <div key={b.id} className="relative">
              <div
                ref={(el) => { blockRefs.current[b.id] = el; }}
                className={`bg-white rounded border transition-all relative ${dragPreview.type === 'block' && dragPreview.id === b.id ? 'opacity-80 shadow-lg ring-2 ring-faktory-blue' : hoveredBlockId === b.id ? 'ring-2 ring-faktory-blue/50 border-faktory-blue/30' : 'border-slate-100'}`}
                draggable
                onDragStart={(e) => { dragBlockIdRef.current = b.id; e.dataTransfer.effectAllowed = 'move'; }}
                onDragOver={(e) => {
                  e.preventDefault();
                  const el = blockRefs.current[b.id];
                  const container = blocksAreaRef.current;
                  if (el && container) {
                    const rect = el.getBoundingClientRect();
                    const containerRect = container.getBoundingClientRect();
                    const relTop = rect.top - containerRect.top + container.scrollTop;
                    const relLeft = rect.left - containerRect.left + container.scrollLeft;
                    const pos = (e.clientY - rect.top) < (rect.height / 2) ? 'before' : 'after';
                    setDragPreview({ type: 'block', id: b.id, rect: { top: relTop, left: relLeft, width: rect.width, height: rect.height }, pos, source: 'list' });
                  } else {
                    setDragPreview({ type: 'block', id: b.id, source: 'list' });
                  }
                }}
                onDragLeave={() => { setDragPreview({ type: 'none' }); }}
                onMouseEnter={() => {
                  if (dragBlockIdRef.current) return;
                  setHoveredBlockId(b.id);
                  const el = blockRefs.current[b.id];
                  const container = blocksAreaRef.current;
                  if (el && container) {
                    const rect = el.getBoundingClientRect();
                    const containerRect = container.getBoundingClientRect();
                    const relTop = rect.top - containerRect.top + container.scrollTop;
                    const relLeft = rect.left - containerRect.left + container.scrollLeft;
                    setDragPreview({ type: 'block', id: b.id, rect: { top: relTop, left: relLeft, width: rect.width, height: rect.height } });
                  } else {
                    setDragPreview({ type: 'block', id: b.id });
                  }
                }}
                onMouseMove={(e) => {
                  if (dragBlockIdRef.current) return;
                  const el = blockRefs.current[b.id];
                  if (!el) return;
                  const rect = el.getBoundingClientRect();
                  const pos = (e.clientY - rect.top) < (rect.height / 2) ? 'before' : 'after';
                  setDragPreview(prev => ({ ...(prev.type === 'block' && prev.id === b.id ? prev : { type: 'block', id: b.id }), pos }));
                }}
                onMouseLeave={() => {
                  if (!dragBlockIdRef.current) setDragPreview({ type: 'none' });
                  setHoveredBlockId(null);
                }}
                onDrop={(e) => {
                  e.preventDefault();
                  const file = e.dataTransfer?.files?.[0];
                  if (dragImageRef.current) {
                    if (!activeLesson) {
                      showToast('Selecione uma aula para mover a imagem');
                    } else {
                      const imgSrc = dragImageRef.current;
                      const imgBlock = genBlock(`<img src="${imgSrc}" alt=\"Imagem da aula\" />`, 'image');
                      const content = activeLesson.content || '';
                      const parsed = parseBlocks(content).sort((a: any, b: any) => a.index - b.index);
                      const idx = parsed.findIndex((x: any) => x.id === b.id);
                      const parts: string[] = [];
                      let last = 0;
                      for (const bl of parsed) {
                        parts.push(content.slice(last, bl.index));
                        parts.push(content.slice(bl.index, bl.index + bl.length));
                        last = bl.index + bl.length;
                      }
                      parts.push(content.slice(last));
                      const insertAt = (dragPreview.pos === 'after' ? (idx * 2 + 2) : (idx * 2));
                      parts.splice(insertAt, 0, imgBlock);
                      updateLesson({ content: parts.join(''), imageUrl: '' });
                      showToast('Imagem movida para o conteúdo (no local do drop)');
                    }
                    dragImageRef.current = null;
                    setDragPreview({ type: 'none' });
                    return;
                  }
                  if (file && file.type && file.type.startsWith('image/')) {
                    handleImageFile(file);
                    return;
                  }
                  const pos = dragPreview.pos || 'before';
                  if (dragPageTitleRef.current && trailData.title) {
                    if (!activeLesson) {
                      showToast('Selecione uma aula para mover o título da página');
                    } else {
                      const block = genBlock(`<h2>${trailData.title}</h2>`, 'title');
                      const content = activeLesson.content || '';
                      const parsed = parseBlocks(content).sort((a: any, b: any) => a.index - b.index);
                      const idx = parsed.findIndex((x: any) => x.id === b.id);
                      const parts: string[] = [];
                      let last = 0;
                      for (const bl of parsed) {
                        parts.push(content.slice(last, bl.index));
                        parts.push(content.slice(bl.index, bl.index + bl.length));
                        last = bl.index + bl.length;
                      }
                      parts.push(content.slice(last));
                      const insertAt = pos === 'before' ? (idx * 2) : (idx * 2 + 2);
                      parts.splice(insertAt, 0, block);
                      updateLesson({ content: parts.join('') });
                      setTrailData(prev => ({ ...prev, title: '' }));
                      showToast('Título da página movido para o conteúdo');
                    }
                    dragPageTitleRef.current = false;
                    setDragPreview({ type: 'none' });
                    return;
                  }
                  if (dragTitleRef.current && activeLesson && activeLesson.title) {
                    const block = genBlock(`<h2>${activeLesson.title}</h2>`, 'title');
                    const content = activeLesson.content || '';
                    const parsed = parseBlocks(content).sort((a: any, b: any) => a.index - b.index);
                    const idx = parsed.findIndex((x: any) => x.id === b.id);
                    const parts: string[] = [];
                    let last = 0;
                    for (const bl of parsed) {
                      parts.push(content.slice(last, bl.index));
                      parts.push(content.slice(bl.index, bl.index + bl.length));
                      last = bl.index + bl.length;
                    }
                    parts.push(content.slice(last));
                    const insertAt = pos === 'before' ? (idx * 2) : (idx * 2 + 2);
                    parts.splice(insertAt, 0, block);
                    updateLesson({ content: parts.join(''), title: '' });
                    dragTitleRef.current = false;
                    setDragPreview({ type: 'none' });
                    showToast('Título movido para o conteúdo');
                    return;
                  }
                  const dragId = dragBlockIdRef.current;
                  if (dragId && dragId !== b.id) reorderBlockTo(dragId, b.id, pos);
                  dragBlockIdRef.current = null;
                  setDragPreview({ type: 'none' });
                }}
              >
                {/* ── Toolbar dentro do bloco — aparece ao passar o mouse ── */}
                {hoveredBlockId === b.id && (
                  <div className="flex items-center justify-between px-1.5 py-1 bg-white border-b border-faktory-blue/20 rounded-t">
                    <div className="flex items-center gap-1 bg-faktory-blue text-white text-[9px] font-bold px-1.5 py-0.5 rounded cursor-grab select-none">
                      <GripVertical size={10} />
                      {b.type === 'custom' ? 'Texto/HTML' :
                       b.type === 'title' ? 'Título' :
                       b.type === 'image' ? 'Imagem' :
                       b.type === 'video' ? 'Vídeo' :
                       b.type === 'highlight' ? 'Destaque' :
                       b.type === 'group' ? 'Grupo' :
                       b.type === 'embed' ? 'Embed' :
                       b.type === 'logo' ? 'Logo' :
                       b.type}
                    </div>
                    <div className="flex items-center gap-0.5">
                      <button onClick={(e) => { e.stopPropagation(); editBlockById(b.id); }} className="p-1 rounded hover:bg-slate-100 text-slate-500 hover:text-faktory-blue" title="Editar"><Pencil size={11} /></button>
                      <button onClick={(e) => { e.stopPropagation(); duplicateBlockById(b.id); }} className="p-1 rounded hover:bg-slate-100 text-slate-500 hover:text-faktory-blue" title="Duplicar"><Copy size={11} /></button>
                      <div className="w-px h-3 bg-slate-200" />
                      <button onClick={(e) => { e.stopPropagation(); moveBlockById(b.id, -1); }} className="p-1 rounded hover:bg-slate-100 text-slate-500 hover:text-faktory-blue" title="Mover para cima"><ChevronUp size={11} /></button>
                      <button onClick={(e) => { e.stopPropagation(); moveBlockById(b.id, 1); }} className="p-1 rounded hover:bg-slate-100 text-slate-500 hover:text-faktory-blue" title="Mover para baixo"><ChevronDown size={11} /></button>
                      <div className="w-px h-3 bg-slate-200" />
                      <button onClick={(e) => { e.stopPropagation(); removeBlockById(b.id); }} className="p-1 rounded hover:bg-red-50 text-slate-400 hover:text-red-600" title="Remover"><Trash2 size={11} /></button>
                    </div>
                  </div>
                )}
                {/* ── Preview do conteúdo ── */}
                <div className="p-3">
                  <div className="text-xs text-slate-400 line-clamp-3" dangerouslySetInnerHTML={{ __html: b.html }} />
                </div>
              </div>
            </div>
          ))}
        </div>

        {/* overlay for area (list) */}
        {dragPreview.type === 'block' && dragPreview.rect && dragPreview.source === 'list' && (
          <>
            <div
              className="pointer-events-none absolute rounded border-2 border-dashed border-faktory-blue bg-faktory-blue/8"
              style={{ top: dragPreview.rect.top, left: dragPreview.rect.left, width: dragPreview.rect.width, height: dragPreview.rect.height }}
            />
            {/* insertion indicator line */}
            <div
              className="pointer-events-none absolute bg-faktory-blue"
              style={{
                top: (dragPreview.pos === 'after' ? (dragPreview.rect.top + dragPreview.rect.height - 2) : (dragPreview.rect.top - 2)),
                left: dragPreview.rect.left,
                width: dragPreview.rect.width,
                height: 4,
                borderRadius: 2,
                opacity: 0.95
              }}
            />
          </>
        )}
      </div>
    );
  };

  const removeBlockById = (id: string) => {
    if (!activeLesson) return;
    const content = activeLesson.content || '';
    const re = new RegExp(`<!-- block:([a-zA-Z0-9_-]+):${id} -->([\\s\\S]*?)<!-- \\/block:\\1:${id} -->`, 'g');
    const newContent = content.replace(re, '');
    updateLesson({ content: newContent });
    showToast('Bloco removido');
  };

  const editBlockById = (id: string) => {
    if (!activeLesson) return;
    const content = activeLesson.content || '';
    const re = new RegExp(`(<!-- block:([a-zA-Z0-9_-]+):${id} -->)([\\s\\S]*?)(<!-- \\/block:\\2:${id} -->)`, 'g');
    const m = re.exec(content);
    if (!m) return;
    const currentHtml = m[3];
    setEditingBlockIdState(id);
    setEditingBlockHtmlState(currentHtml);
    setShowBlockEditor(true);
  };

  const saveEditedBlock = () => {
    if (!activeLesson || !editingBlockIdState) return;
    const id = editingBlockIdState;
    const newHtml = editingBlockHtmlState;
    const content = activeLesson.content || '';
    const re = new RegExp(`(<!-- block:([a-zA-Z0-9_-]+):${id} -->)([\\s\\S]*?)(<!-- \\/block:\\2:${id} -->)`, 'g');
    const m = re.exec(content);
    if (!m) return;
    const safeHtml = DOMPurify.sanitize(newHtml, { WHOLE_DOCUMENT: false });
    const replaced = content.replace(re, `${m[1]}\n${safeHtml}\n${m[4]}`);
    updateLesson({ content: replaced });
    setShowBlockEditor(false);
    setEditingBlockIdState(null);
    setEditingBlockHtmlState('');
    showToast('Bloco atualizado');
  };

  const cancelEditBlock = () => {
    setShowBlockEditor(false);
    setEditingBlockIdState(null);
    setEditingBlockHtmlState('');
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <Loader2 className="animate-spin text-faktory-blue" size={40} />
      </div>
    );
  }

  const activeLesson = getActiveLesson();

  return (
    <div className="fixed inset-0 bg-[#f4f7f9] flex flex-col overflow-hidden z-10" style={{ top: '3.5rem', left: 'var(--sidebar-width)', right: 0, bottom: 0 }}>
      {/* Top Bar - Editor Style */}
      <div className="h-14 bg-white border-b border-slate-200 flex items-center px-6 justify-between shrink-0">
        <div className="flex items-center gap-4">
          <button onClick={() => navigate('/admin/trilhas')} className="p-2 hover:bg-slate-100 rounded-full transition-colors">
            <ArrowLeft size={18} className="text-slate-500" />
          </button>
          <div className="flex items-center gap-2">
            <input
              className="text-sm font-bold text-slate-700 uppercase tracking-wider bg-transparent outline-none w-64"
              value={trailData.title}
              placeholder="Nova Trilha"
              draggable
              onDragStart={(e) => { dragPageTitleRef.current = true; e.dataTransfer.effectAllowed = 'move'; }}
              onDragEnd={() => { dragPageTitleRef.current = false; }}
              onChange={(e) => {
                const title = e.target.value;
                setTrailData(prev => ({ ...prev, title }));
                setIsDirty(true);
              }}
              onKeyDown={(e) => { if (e.key === 'Enter') { (e.target as HTMLInputElement).blur(); } }}
            />
            <span className="text-slate-300">|</span>
            <div className="flex items-center gap-2">
              <span className="text-[10px] font-bold text-slate-400 uppercase">Tipo da página:</span>
              <div className="flex bg-slate-100 p-0.5 rounded-md">
                <button className="px-3 py-1 text-[10px] font-bold bg-faktory-blue text-white rounded shadow-sm">Principal</button>
                <button className="px-3 py-1 text-[10px] font-bold text-slate-500 hover:bg-white rounded transition-all">Saiba mais</button>
              </div>
            </div>
          </div>
        </div>

          <div className="flex items-center gap-3">
          {/* Auto-save status */}
          <div className="flex items-center gap-2 px-3 py-1 bg-slate-50 rounded-full border border-slate-100">
            {isDirty ? (
              <>
                <div className="w-1.5 h-1.5 bg-orange-400 rounded-full animate-pulse"></div>
                <span className="text-[10px] font-bold text-slate-400 uppercase">Salvando...</span>
              </>
            ) : lastSaved ? (
              <>
                <div className="w-1.5 h-1.5 bg-green-400 rounded-full"></div>
                <span className="text-[10px] font-bold text-slate-400 uppercase">Salvo às {lastSaved.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
              </>
            ) : null}
          </div>

          <button 
            onClick={applyFaktoryOneTemplate}
            className="px-3 py-1.5 text-[10px] font-bold text-faktory-blue border border-faktory-blue rounded hover:bg-blue-50 transition-all flex items-center gap-2"
          >
            <Layers size={14} />
            Template Faktory One
          </button>
          {/* Actions menu (Visualizar / Editar / Excluir) */}
          <div className="relative" ref={actionsMenuRef}>
            <button
              onClick={() => setShowActionsMenu(prev => !prev)}
              aria-haspopup="true"
              aria-expanded={showActionsMenu}
              className="px-3 py-1 text-[13px] border rounded flex items-center gap-2 bg-white"
              title="Ações"
            >
              Ações
              <ChevronDown size={14} />
            </button>

            {showActionsMenu && (
              <div className="absolute right-0 mt-2 w-44 bg-white border rounded shadow-lg z-50">
                <button onClick={() => { setShowActionsMenu(false); handleOpenPreview(); }} className="w-full text-left px-3 py-2 hover:bg-slate-50">Visualizar</button>
                <button onClick={() => { setShowActionsMenu(false); setShowPreviewModal(false); document.querySelector('main')?.scrollIntoView({ behavior: 'smooth' }); showToast('Modo edição'); }} className="w-full text-left px-3 py-2 hover:bg-slate-50">Editar</button>
                <button onClick={() => { setShowActionsMenu(false); setShowDeleteConfirm(true); }} className="w-full text-left px-3 py-2 text-red-600 hover:bg-slate-50">Excluir</button>
              </div>
            )}
          </div>
          <button 
            onClick={handleSave}
            disabled={saving}
            className="px-6 py-1.5 bg-faktory-blue text-white rounded font-bold text-xs hover:bg-[#2c6a9a] transition-all flex items-center gap-2 disabled:opacity-50"
          >
            {saving ? <Loader2 className="animate-spin" size={14} /> : <Save size={14} />}
            {id ? 'Salvar' : 'Publicar'}
          </button>
        </div>
      </div>

      <div className="flex-1 flex overflow-hidden">
        {/* hidden file input for image selection */}
        <input ref={imageInputRef} type="file" accept="image/*" className="hidden" onChange={(e) => {
          const f = e.target.files?.[0];
          if (f) handleImageFile(f);
          // reset so same file can be selected again
          (e.target as HTMLInputElement).value = '';
        }} />
        {/* Left Sidebar - Structure */}
        <aside className="w-72 bg-white border-r border-slate-200 flex flex-col shrink-0">
          <div className="p-4 border-b border-slate-100">
            <button 
              onClick={addModule}
              className="w-full py-2 bg-[#99b300] hover:bg-[#88a000] text-white rounded font-bold text-xs flex items-center justify-center gap-2 transition-all"
            >
              <Plus size={16} />
              Adicionar etapa
            </button>
          </div>

          <div className="flex-1 overflow-y-auto p-2 space-y-2">
            {trailData.modules.length === 0 ? (
                <div className="p-4 bg-yellow-50 border border-yellow-100 rounded text-sm text-slate-700">
                  <div className="font-bold mb-2">Nenhuma etapa encontrada</div>
                  <div className="text-[13px] mb-3">Use o botão "Adicionar etapa" acima para criar uma nova etapa.</div>
                </div>
            ) : (
            trailData.modules.map((module, mIndex) => (
              <div key={module.id} className="space-y-1"
                draggable
                onDragStart={(e) => { dragModuleIdRef.current = module.id; e.dataTransfer.effectAllowed = 'move'; }}
                onDragOver={(e) => e.preventDefault()}
                onDrop={(e) => { e.preventDefault(); const dragId = dragModuleIdRef.current; if (dragId && dragId !== module.id) reorderModule(dragId, module.id); dragModuleIdRef.current = null; }}
              >
                <div 
                  className={cn(
                    "flex items-center justify-between p-2 rounded-md cursor-pointer group transition-all",
                    activeModuleId === module.id ? "bg-slate-50" : "hover:bg-slate-50"
                  )}
                  onClick={() => setActiveModuleId(module.id)}
                >
                  <div className="flex items-center gap-2 flex-1">
                    <button onClick={(e) => { e.stopPropagation(); toggleModule(module.id); }} aria-expanded={!!expandedModules[module.id]} title={expandedModules[module.id] ? 'Recolher etapa' : 'Expandir etapa'} className="p-1 text-slate-400 hover:text-faktory-blue transition-transform">
                      <ChevronDown size={14} style={{ transform: expandedModules[module.id] ? 'rotate(0deg)' : 'rotate(-90deg)', transition: 'transform .12s' }} />
                    </button>
                    <div className="w-1 h-4 bg-slate-200 rounded-full group-hover:bg-faktory-blue transition-all"></div>
                    <div className="text-xs font-bold text-slate-400 mr-2">{mIndex + 1}.</div>
                    <input 
                      className="text-xs font-bold text-slate-600 bg-transparent outline-none w-full"
                      value={module.title}
                      onChange={(e) => updateModuleTitle(module.id, e.target.value)}
                      onKeyDown={(e) => { if (e.key === 'Enter') { (e.target as HTMLInputElement).blur(); } }}
                    />
                  </div>
                  <div className="flex items-center gap-2">
                          <button 
                        onClick={(e) => { e.stopPropagation(); addLesson(module.id); }}
                        title="Adicionar aula"
                        className="text-slate-400 hover:text-faktory-blue p-1 rounded"
                      >
                        <Plus size={14} />
                      </button>
                          {imageUploading && activeModuleId === module.id && (
                            <div className="flex items-center gap-2 px-2">
                              <div className="text-xs text-slate-400">Enviando imagem... {uploadProgress}%</div>
                              <div className="w-24 h-2 bg-slate-200 rounded overflow-hidden">
                                <div className="bg-faktory-blue h-2 rounded" style={{ width: `${uploadProgress}%` }} />
                              </div>
                            </div>
                          )}
                      <button
                        onClick={(e) => { e.stopPropagation(); moveModule(module.id, -1); }}
                        title="Mover etapa para cima"
                        className="text-slate-400 hover:text-faktory-blue p-1 rounded"
                      >
                        <ChevronUp size={14} />
                      </button>
                      <button
                        onClick={(e) => { e.stopPropagation(); moveModule(module.id, 1); }}
                        title="Mover etapa para baixo"
                        className="text-slate-400 hover:text-faktory-blue p-1 rounded"
                      >
                        <ChevronDown size={14} />
                      </button>
                      <button 
                        onClick={(e) => { e.stopPropagation(); removeModule(module.id); }}
                        title="Remover etapa"
                        className="text-slate-400 hover:text-red-500 p-1 rounded"
                      >
                        <Trash2 size={14} />
                      </button>
                  </div>
                </div>

                  {expandedModules[module.id] && (
                <div className="pl-6 space-y-1">
                  {module.lessons.map((lesson, lIndex) => (
                    <div key={lesson.id} className="space-y-1"
                      draggable
                      onDragStart={(e) => { dragLessonIdRef.current = lesson.id; e.dataTransfer.effectAllowed = 'move'; }}
                      onDragOver={(e) => e.preventDefault()}
                      onDrop={(e) => { e.preventDefault(); const dragId = dragLessonIdRef.current; if (dragId && dragId !== lesson.id) reorderLesson(module.id, dragId, lesson.id); dragLessonIdRef.current = null; }}
                    >
                      <div 
                        className={cn(
                          "flex items-center justify-between p-2 rounded-md cursor-pointer text-[11px] transition-all",
                          activeLessonId === lesson.id ? "bg-blue-50 text-faktory-blue font-bold" : "text-slate-500 hover:bg-slate-50"
                        )}
                        onClick={() => {
                          setActiveModuleId(module.id);
                          setActiveLessonId(lesson.id);
                          setActiveSublessonId(null);
                        }}
                      >
                        {editingLessonId === lesson.id ? (
                          <div className="flex items-center gap-2 w-full">
                            <input
                              autoFocus
                              className="w-full text-sm px-2 py-1 border border-slate-200 rounded"
                              value={editingLessonTitle}
                              onChange={(e) => setEditingLessonTitle(e.target.value)}
                              onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); saveEditLesson(); } }}
                            />
                            <button onClick={(e) => { e.stopPropagation(); saveEditLesson(); }} className="px-2 py-1 bg-faktory-blue text-white rounded text-xs">Salvar</button>
                            <button onClick={(e) => { e.stopPropagation(); cancelEditLesson(); }} className="px-2 py-1 border rounded text-xs">Cancelar</button>
                          </div>
                          ) : (
                          <div className="flex items-center gap-2 w-full justify-between">
                            <span className="flex-1" onDoubleClick={(e) => { e.stopPropagation(); setActiveModuleId(module.id); startEditLesson(lesson.id, lesson.title); }}>{mIndex + 1}.{lIndex + 1} - {lesson.title}</span>
                            <div className="flex items-center gap-2">
                              <button onClick={(e) => { e.stopPropagation(); addLesson(module.id, lesson.id); }} title="Adicionar subaula" className="text-slate-400 hover:text-faktory-blue p-1 rounded"><Plus size={14} /></button>
                              <button onClick={(e) => { e.stopPropagation(); moveLesson(module.id, lesson.id, -1); }} title="Mover aula para cima" className="text-slate-400 hover:text-faktory-blue p-1 rounded"><ChevronUp size={14} /></button>
                              <button onClick={(e) => { e.stopPropagation(); moveLesson(module.id, lesson.id, 1); }} title="Mover aula para baixo" className="text-slate-400 hover:text-faktory-blue p-1 rounded"><ChevronDown size={14} /></button>
                              <button onClick={(e) => { e.stopPropagation(); startEditLesson(lesson.id, lesson.title); }} title="Renomear aula" className="text-slate-400 hover:text-faktory-blue p-1 rounded"><ChevronDown size={14} style={{ transform: 'rotate(-90deg)' }} /></button>
                              <button onClick={(e) => { e.stopPropagation(); removeLesson(module.id, lesson.id); }} title="Remover aula" className="text-slate-300 hover:text-red-500 p-1 rounded"><Trash2 size={14} /></button>
                            </div>
                          </div>
                        )}
                      </div>

                      {/* Sublessons */}
                      {(lesson.sublessons || []).map((sub, sIndex) => (
                        <div key={sub.id} className={cn(
                          "flex items-center justify-between p-1 rounded cursor-pointer text-[11px] transition-all ml-4",
                          activeSublessonId === sub.id ? "bg-blue-50 text-faktory-blue font-semibold" : "text-slate-400 hover:bg-slate-50"
                        )} onClick={() => { setActiveModuleId(module.id); setActiveLessonId(lesson.id); setActiveSublessonId(sub.id); }}>
                          {editingLessonId === sub.id ? (
                            <div className="flex items-center gap-2 w-full">
                              <input
                                autoFocus
                                className="w-full text-sm px-2 py-1 border border-slate-200 rounded"
                                value={editingLessonTitle}
                                onChange={(e) => setEditingLessonTitle(e.target.value)}
                                onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); saveEditLesson(); } }}
                              />
                              <button onClick={(e) => { e.stopPropagation(); saveEditLesson(); }} className="px-2 py-1 bg-faktory-blue text-white rounded text-xs">Salvar</button>
                              <button onClick={(e) => { e.stopPropagation(); cancelEditLesson(); }} className="px-2 py-1 border rounded text-xs">Cancelar</button>
                            </div>
                          ) : (
                            <div className="flex items-center gap-2 w-full justify-between">
                              <span className="flex-1 text-sm text-slate-500" onDoubleClick={(e) => { e.stopPropagation(); setActiveModuleId(module.id); startEditLesson(sub.id, sub.title, lesson.id); }}>{mIndex + 1}.{lIndex + 1}.{sIndex + 1} - {sub.title}</span>
                              <div className="flex items-center gap-2">
                                  <button onClick={(e) => { e.stopPropagation(); moveLesson(module.id, sub.id, -1, lesson.id); }} title="Mover subaula para cima" aria-label="Mover subaula para cima" className="text-slate-400 hover:text-faktory-blue p-1 rounded"><ChevronUp size={12} /></button>
                                  <button onClick={(e) => { e.stopPropagation(); moveLesson(module.id, sub.id, 1, lesson.id); }} title="Mover subaula para baixo" aria-label="Mover subaula para baixo" className="text-slate-400 hover:text-faktory-blue p-1 rounded"><ChevronDown size={12} /></button>
                                  <button onClick={(e) => { e.stopPropagation(); setActiveModuleId(module.id); startEditLesson(sub.id, sub.title, lesson.id); }} title="Renomear subaula" aria-label="Renomear subaula" className="text-slate-400 hover:text-faktory-blue p-1 rounded"><ChevronDown size={12} style={{ transform: 'rotate(-90deg)' }} /></button>
                                  <button onClick={(e) => { e.stopPropagation(); removeLesson(module.id, sub.id, lesson.id); }} title="Remover subaula" aria-label="Remover subaula" className="text-slate-400 hover:text-red-500 p-1 rounded"><Trash2 size={12} /></button>
                              </div>
                            </div>
                          )}
                        </div>
                      ))}
                    </div>
                  ))}
                  <button 
                    onClick={() => addLesson(module.id)}
                    className="flex items-center gap-2 p-2 text-[10px] text-slate-400 hover:text-faktory-blue transition-all"
                  >
                    <Plus size={12} />
                    Nova aula
                  </button>
                </div>
                )}
              </div>
            )))}
          </div>
        </aside>

        {/* Center - Preview/Editor */}
        <main className="flex-1 bg-[#f4f7f9] overflow-y-auto p-10 relative">
          <div className="max-w-4xl mx-auto bg-white shadow-2xl rounded-sm min-h-[800px] flex flex-col border border-slate-200">
            {/* Preview Header */}
                  <div className="p-10 flex flex-col items-center border-b border-slate-50"
                    onDragOver={(e) => e.preventDefault()}
                    onDrop={(e) => {
                      e.preventDefault();
                      const file = e.dataTransfer?.files?.[0];
                      if (file && file.type && file.type.startsWith('image/')) {
                        handleImageFile(file);
                        return;
                      }
                      if (dragVideoRef.current) { setVideoPosition('title-top'); dragVideoRef.current = false; showToast('Vídeo movido acima do título'); }
                    }}
                  >
              <div className="w-64 mb-10"
                onDragOver={(e) => {
                  e.preventDefault();
                  if (dragVideoRef.current || dragBlockIdRef.current) setDragPreview({ type: 'title' });
                }}
                onDragLeave={() => { setDragPreview({ type: 'none' }); }}
                onDrop={(e) => {
                  e.preventDefault();
                  const file = e.dataTransfer?.files?.[0];
                  if (dragImageRef.current) {
                    if (!activeLesson) {
                      showToast('Selecione uma aula para mover a imagem');
                    } else {
                      const imgSrc = dragImageRef.current;
                      const block = genBlock(`<img src=\"${imgSrc}\" alt=\\\"Imagem da aula\\\" />`, 'image');
                      updateLesson({ content: block + '\n' + (activeLesson.content || ''), imageUrl: '' });
                      showToast('Imagem movida para o conteúdo');
                    }
                    dragImageRef.current = null;
                    setDragPreview({ type: 'none' });
                    return;
                  }
                  if (file && file.type && file.type.startsWith('image/')) {
                    handleImageFile(file);
                    return;
                  }
                  if (dragPageTitleRef.current) {
                    if (!activeLesson) {
                      showToast('Selecione uma aula para mover o título da página');
                    } else {
                      const block = genBlock(`<h2>${trailData.title}</h2>`, 'title');
                      updateLesson({ content: block + '\n' + (activeLesson.content || '') });
                      setTrailData(prev => ({ ...prev, title: '' }));
                      showToast('Título da página movido para o conteúdo');
                    }
                    dragPageTitleRef.current = false;
                    setDragPreview({ type: 'none' });
                    return;
                  }
                  if (dragVideoRef.current) { setVideoPosition('title-top'); dragVideoRef.current = false; showToast('Vídeo movido acima do título'); }
                  if (dragBlockIdRef.current) { const dragId = dragBlockIdRef.current; const blocks = parseBlocks(activeLesson?.content || ''); if (blocks.length) reorderBlock(dragId, blocks[0].id); dragBlockIdRef.current = null; }
                  setDragPreview({ type: 'none' });
                }}
              >
                <img
                  src="/logo.png"
                  alt="Faktory Logo"
                  className="w-full h-auto opacity-80"
                  referrerPolicy="no-referrer"
                  onError={(e) => { (e.currentTarget as HTMLImageElement).src = '/logo-faktory.svg'; }}
                />
                <p className="text-[10px] text-center font-bold text-slate-400 uppercase tracking-widest mt-2">Uma empresa Esquadgroup</p>
              </div>

              {/* Aula image preview (se houver imagem da aula) */}
              {activeLesson?.imageUrl && (
                <div className="w-full mb-6 relative">
                  {/* image preview with overlay controls and dragging */}
                  <img
                    src={activeLesson.imageUrl}
                    alt="Imagem da aula"
                    className="rounded mx-auto cursor-grab"
                    draggable
                    onDragStart={(e) => { dragImageRef.current = activeLesson.imageUrl || null; e.dataTransfer.effectAllowed = 'move'; }}
                    onDragEnd={() => { dragImageRef.current = null; }}
                    style={{
                      width: activeLesson.imageOptions?.size === 'small' ? 320 : activeLesson.imageOptions?.size === 'medium' ? 640 : '100%'
                    }}
                  />

                  <div className="absolute top-2 right-2 flex gap-2 z-20">
                    <button
                      onClick={() => imageInputRef.current?.click()}
                      className="px-2 py-1 bg-white border rounded text-xs"
                      title="Substituir imagem"
                    >Substituir</button>

                    <button
                      onClick={() => {
                        // Enter image-move mode: set dragImageRef so next drop inserts at exact location
                        if (!activeLesson || !activeLesson.imageUrl) return;
                        dragImageRef.current = activeLesson.imageUrl;
                        showToast('Arraste e solte a imagem no local desejado para inserir');
                      }}
                      className="px-2 py-1 bg-white border rounded text-xs"
                      title="Mover para conteúdo"
                    >Mover</button>

                    <button
                      onClick={() => {
                        const current = activeLesson?.imageOptions?.size || 'full';
                        const next = current === 'full' ? 'medium' : current === 'medium' ? 'small' : 'full';
                        updateLesson({ imageOptions: { ...(activeLesson?.imageOptions || {}), size: next } });
                        showToast(`Tamanho: ${next}`);
                      }}
                      className="px-2 py-1 bg-white border rounded text-xs"
                      title="Alternar tamanho"
                    >Tamanho</button>

                    <button
                      onClick={() => { updateLesson({ imageUrl: '' }); showToast('Imagem removida'); }}
                      className="px-2 py-1 bg-white border rounded text-xs text-red-600"
                      title="Remover imagem"
                    >Remover</button>
                  </div>

                  {imageUploading && (
                    <div className="absolute inset-0 flex items-center justify-center bg-white/60">
                      <div className="w-2/3 bg-slate-100 rounded overflow-hidden">
                        <div style={{ width: `${uploadProgress}%` }} className="h-2 bg-faktory-blue transition-all" />
                      </div>
                    </div>
                  )}
                </div>
              )}

              {activeLesson && activeLesson.videoPosition === 'title-top' && activeLesson.videoUrl && (
                <div className="w-full mb-6">
                  <div className="w-full">
                    {/* preview when videoPosition === title-top */}
                    {dragPreview.type === 'title' && (dragVideoRef.current || dragBlockIdRef.current) ? (
                      <div className="p-4 mb-4 border-2 border-dashed border-faktory-blue rounded bg-white/60 text-center">Pré-visualização de inserção</div>
                    ) : (
                      <div 
                        onClick={() => setShowVideoModal(true)}
                        onMouseEnter={(e) => {
                          const el = e.currentTarget as HTMLDivElement;
                          const container = previewAreaRef.current || blocksAreaRef.current || document.body;
                          const rect = el.getBoundingClientRect();
                          const containerRect = (container as HTMLElement).getBoundingClientRect ? (container as HTMLElement).getBoundingClientRect() : { top: 0, left: 0 };
                          const relTop = rect.top - containerRect.top + (container as HTMLElement).scrollTop || 0;
                          const relLeft = rect.left - containerRect.left + (container as HTMLElement).scrollLeft || 0;
                          setDragPreview({ type: 'block', id: 'video-main', rect: { top: relTop, left: relLeft, width: rect.width, height: rect.height }, source: 'preview' });
                        }}
                        onMouseMove={(e) => {
                          const el = e.currentTarget as HTMLDivElement;
                          const rect = el.getBoundingClientRect();
                          const pos = (e.clientY - rect.top) < (rect.height / 2) ? 'before' : 'after';
                          setDragPreview(prev => ({ ...(prev.type === 'block' && prev.id === 'video-main' ? prev : { type: 'block', id: 'video-main' }), pos, source: 'preview' }));
                        }}
                        onMouseLeave={() => { if (!dragVideoRef.current) setDragPreview({ type: 'none' }); }}
                        className="aspect-video bg-slate-900 rounded-sm flex flex-col items-center justify-center text-white relative group overflow-hidden cursor-pointer border-2 border-transparent hover:border-faktory-blue transition-all"
                      >
                        {activeLesson.videoUrl ? (
                          <iframe src={getEmbedUrl(activeLesson.videoUrl)} className="w-full h-full pointer-events-none" title="Video Preview" />
                        ) : (
                          <>
                            <Video size={48} className="text-slate-700 mb-4" />
                            <p className="text-sm font-bold text-slate-500">Clique para configurar o vídeo</p>
                          </>
                        )}
                      </div>
                    )}
                  </div>
                </div>
              )}

              {activeLesson ? (
                <div
                  draggable
                  onDragStart={(e) => { dragTitleRef.current = true; e.dataTransfer.effectAllowed = 'move'; }}
                  onDragEnd={() => { dragTitleRef.current = false; }}
                >
                  <input 
                    className="text-3xl font-bold text-slate-700 text-center w-full outline-none focus:border-b-2 border-faktory-blue pb-2"
                    value={activeLesson.title}
                    onChange={(e) => updateLesson({ title: e.target.value })}
                    placeholder="Título da Aula"
                  />
                </div>
              ) : (
                <div className="text-slate-300 italic">Selecione ou crie uma aula para começar</div>
              )}
            </div>

            {/* Preview Content */}
              <div className="flex-1 p-10 space-y-8"
                onDragOver={(e) => {
                  e.preventDefault();
                  if (dragVideoRef.current || dragBlockIdRef.current) setDragPreview({ type: 'content' });
                }}
                onDragLeave={() => { setDragPreview({ type: 'none' }); }}
                onDrop={(e) => {
                  e.preventDefault();
                  const file = e.dataTransfer?.files?.[0];
                  if (dragImageRef.current) {
                    if (!activeLesson) {
                      showToast('Selecione uma aula para mover a imagem');
                    } else {
                      const imgSrc = dragImageRef.current;
                      const block = genBlock(`<img src=\"${imgSrc}\" alt=\\\"Imagem da aula\\\" />`, 'image');
                      updateLesson({ content: block + '\n' + (activeLesson.content || ''), imageUrl: '' });
                      showToast('Imagem movida para o conteúdo');
                    }
                    dragImageRef.current = null;
                    setDragPreview({ type: 'none' });
                    return;
                  }
                  if (file && file.type && file.type.startsWith('image/')) {
                    handleImageFile(file);
                    return;
                  }
                  if (dragVideoRef.current) { setVideoPosition('top'); dragVideoRef.current = false; showToast('Vídeo movido acima do conteúdo'); }
                  if (dragTitleRef.current && activeLesson && activeLesson.title) {
                    const block = genBlock(`<h2>${activeLesson.title}</h2>`, 'title');
                    updateLesson({ content: block + '\n' + (activeLesson.content || ''), title: '' });
                    dragTitleRef.current = false;
                    showToast('Título movido para o conteúdo');
                  }
                  if (dragPageTitleRef.current) {
                    if (!activeLesson) {
                      showToast('Selecione uma aula para mover o título da página');
                    } else {
                      const block = genBlock(`<h2>${trailData.title}</h2>`, 'title');
                      updateLesson({ content: block + '\n' + (activeLesson.content || '') });
                      setTrailData(prev => ({ ...prev, title: '' }));
                      showToast('Título da página movido para o conteúdo');
                    }
                    dragPageTitleRef.current = false;
                  }
                  if (dragBlockIdRef.current) { const dragId = dragBlockIdRef.current; const blocks = parseBlocks(activeLesson?.content || ''); if (blocks.length) reorderBlock(dragId, blocks[0].id); dragBlockIdRef.current = null; }
                  setDragPreview({ type: 'none' });
                }}
              >
              {activeLesson && (
                <>
                  {/* Video Placeholder */}
                  {(activeLesson.videoPosition !== 'title-top' && activeLesson.videoPosition !== 'bottom') && activeLesson.videoUrl && (
                      <div 
                        draggable
                        onDragStart={(e) => { dragVideoRef.current = true; e.dataTransfer.effectAllowed = 'move'; }}
                        onDragEnd={() => { dragVideoRef.current = false; }}
                        onClick={() => setShowVideoModal(true)}
                        onMouseEnter={(e) => {
                          const el = e.currentTarget as HTMLDivElement;
                          const container = previewAreaRef.current || blocksAreaRef.current || document.body;
                          const rect = el.getBoundingClientRect();
                          const containerRect = (container as HTMLElement).getBoundingClientRect ? (container as HTMLElement).getBoundingClientRect() : { top: 0, left: 0 };
                          const relTop = rect.top - containerRect.top + (container as HTMLElement).scrollTop || 0;
                          const relLeft = rect.left - containerRect.left + (container as HTMLElement).scrollLeft || 0;
                          setDragPreview({ type: 'block', id: 'video-main', rect: { top: relTop, left: relLeft, width: rect.width, height: rect.height }, source: 'preview' });
                        }}
                        onMouseMove={(e) => {
                          const el = e.currentTarget as HTMLDivElement;
                          const rect = el.getBoundingClientRect();
                          const pos = (e.clientY - rect.top) < (rect.height / 2) ? 'before' : 'after';
                          setDragPreview(prev => ({ ...(prev.type === 'block' && prev.id === 'video-main' ? prev : { type: 'block', id: 'video-main' }), pos, source: 'preview' }));
                        }}
                        onMouseLeave={() => { if (!dragVideoRef.current) setDragPreview({ type: 'none' }); }}
                        className="aspect-video bg-slate-900 rounded-sm flex flex-col items-center justify-center text-white relative group overflow-hidden cursor-pointer border-2 border-transparent hover:border-faktory-blue transition-all"
                      >
                        {activeLesson.videoUrl ? (
                          <div className="w-full h-full relative">
                            <iframe 
                              src={getEmbedUrl(activeLesson.videoUrl)} 
                              className="w-full h-full pointer-events-none"
                              title="Video Preview"
                            />
                            <div className="absolute top-3 right-3 flex gap-2 z-10 opacity-0 group-hover:opacity-100 transition-opacity">
                              <button onClick={(e) => { e.stopPropagation(); setVideoPosition('title-top'); }} title="Acima do título" className="bg-white/10 text-white p-2 rounded"> <ChevronUp size={14} /> </button>
                              <button onClick={(e) => { e.stopPropagation(); setVideoPosition('top'); }} title="Acima do conteúdo" className="bg-white/10 text-white p-2 rounded"> <ChevronUp size={14} /> </button>
                              <button onClick={(e) => { e.stopPropagation(); setVideoPosition('bottom'); }} title="Abaixo do conteúdo" className="bg-white/10 text-white p-2 rounded"> <ChevronDown size={14} /> </button>
                              <button onClick={(e) => { e.stopPropagation(); insertVideoAsBlock(); }} title="Inserir como bloco" className="bg-white/10 text-white p-2 rounded"> <Layers size={14} /> </button>
                              <button onClick={(e) => { e.stopPropagation(); updateLesson({ videoUrl: '' }); showToast('Vídeo removido'); }} title="Remover vídeo" className="bg-white/10 text-white p-2 rounded"> <Trash2 size={14} /> </button>
                            </div>
                            <div className="absolute inset-0 bg-black/20 group-hover:bg-black/40 transition-all flex items-center justify-center">
                              <div className="bg-white/10 backdrop-blur-md p-4 rounded-full border border-white/20 opacity-0 group-hover:opacity-100 transition-all">
                                <Settings className="text-white" size={32} />
                              </div>
                            </div>
                            <div className="absolute bottom-4 left-4 flex gap-2">
                              {activeLesson.videoOptions?.subtitlesUrl && (
                                <span className="bg-faktory-blue text-white text-[10px] font-bold px-2 py-1 rounded">Legenda Ativa</span>
                              )}
                              {activeLesson.videoOptions?.autoplay && (
                                <span className="bg-green-500 text-white text-[10px] font-bold px-2 py-1 rounded">Autoplay</span>
                              )}
                            </div>
                          </div>
                        ) : (
                          <>
                            <Video size={48} className="text-slate-700 mb-4" />
                            <p className="text-sm font-bold text-slate-500">Clique para configurar o vídeo</p>
                          </>
                        )}
                      </div>
                  )}

                  {/* Blocos da aula — área de conteúdo principal */}
                  <div className="prose prose-slate max-w-none">
                    {dragPreview.type === 'content' && (dragVideoRef.current || dragBlockIdRef.current) && (
                      <div className="mb-4 p-4 border-2 border-dashed border-faktory-blue rounded bg-white/60 text-center">Solte aqui para inserir</div>
                    )}
                    <div ref={blocksAreaRef} />
                    <div ref={previewAreaRef} className="space-y-4 relative min-h-[120px]">
                        {parseBlocks(activeLesson?.content || '').sort((a,b) => a.index - b.index).map((b: any) => (
                          <div
                            key={b.id}
                            ref={(el) => { blockRefs.current[b.id] = el; }}
                            className={`relative rounded transition-all ${
                              dragPreview.type === 'block' && dragPreview.id === b.id
                                ? 'shadow-lg ring-2 ring-faktory-blue ring-offset-2'
                                : hoveredBlockId === b.id
                                  ? 'ring-2 ring-faktory-blue/50 ring-offset-1'
                                  : ''
                            } bg-white`}
                            draggable
                            onDragStart={(e) => { dragBlockIdRef.current = b.id; e.dataTransfer.effectAllowed = 'move'; }}
                            onDragOver={(e) => {
                              e.preventDefault();
                              const el = blockRefs.current[b.id];
                              const container = blocksAreaRef.current;
                              if (el && container) {
                                const rect = el.getBoundingClientRect();
                                const containerRect = container.getBoundingClientRect();
                                const relTop = rect.top - containerRect.top + container.scrollTop;
                                const relLeft = rect.left - containerRect.left + container.scrollLeft;
                                const pos = (e.clientY - rect.top) < (rect.height / 2) ? 'before' : 'after';
                                setDragPreview({ type: 'block', id: b.id, rect: { top: relTop, left: relLeft, width: rect.width, height: rect.height }, pos, source: 'preview' });
                              } else {
                                setDragPreview({ type: 'block', id: b.id, source: 'preview' });
                              }
                            }}
                            onDragLeave={() => setDragPreview({ type: 'none' })}
                            onMouseEnter={() => {
                              if (dragBlockIdRef.current) return;
                              setHoveredBlockId(b.id);
                              const el = blockRefs.current[b.id];
                              const container = blocksAreaRef.current;
                              if (el && container) {
                                const rect = el.getBoundingClientRect();
                                const containerRect = container.getBoundingClientRect();
                                const relTop = rect.top - containerRect.top + container.scrollTop;
                                const relLeft = rect.left - containerRect.left + container.scrollLeft;
                                setDragPreview({ type: 'block', id: b.id, rect: { top: relTop, left: relLeft, width: rect.width, height: rect.height } });
                              } else {
                                setDragPreview({ type: 'block', id: b.id });
                              }
                            }}
                            onMouseMove={(e) => {
                              if (dragBlockIdRef.current) return;
                              const el = blockRefs.current[b.id];
                              if (!el) return;
                              const rect = el.getBoundingClientRect();
                              const pos = (e.clientY - rect.top) < (rect.height / 2) ? 'before' : 'after';
                              setDragPreview(prev => ({ ...(prev.type === 'block' && prev.id === b.id ? prev : { type: 'block', id: b.id }), pos }));
                            }}
                            onMouseLeave={() => {
                              if (!dragBlockIdRef.current) setDragPreview({ type: 'none' });
                              setHoveredBlockId(null);
                            }}
                            onDrop={(e) => {
                              e.preventDefault();
                              const pos = dragPreview.pos || 'before';
                              const dragId = dragBlockIdRef.current;
                              if (dragTitleRef.current && activeLesson && activeLesson.title) {
                                const block = genBlock(`<h2>${activeLesson.title}</h2>`, 'title');
                                const content = activeLesson.content || '';
                                const parsed = parseBlocks(content).sort((a: any, b: any) => a.index - b.index);
                                const idx = parsed.findIndex((x: any) => x.id === b.id);
                                const parts: string[] = [];
                                let last = 0;
                                for (const bl of parsed) {
                                  parts.push(content.slice(last, bl.index));
                                  parts.push(content.slice(bl.index, bl.index + bl.length));
                                  last = bl.index + bl.length;
                                }
                                parts.push(content.slice(last));
                                const insertAt = pos === 'before' ? (idx * 2) : (idx * 2 + 2);
                                parts.splice(insertAt, 0, block);
                                updateLesson({ content: parts.join(''), title: '' });
                                dragTitleRef.current = false;
                                setDragPreview({ type: 'none' });
                                showToast('Título movido para o conteúdo');
                                return;
                              }
                              if (dragId && dragId !== b.id) reorderBlockTo(dragId, b.id, pos);
                              dragBlockIdRef.current = null;
                              setDragPreview({ type: 'none' });
                            }}
                          >
                            {/* ── Toolbar overlay — aparece ao passar o mouse ── */}
                            {hoveredBlockId === b.id && (
                              <div className="absolute top-0 left-0 right-0 z-30 flex items-center justify-between px-2 py-1 bg-white/95 backdrop-blur-sm border-b border-faktory-blue/20 shadow-sm rounded-t">
                                {/* esquerda: badge de tipo + handle */}
                                <div
                                  className="flex items-center gap-1 bg-faktory-blue text-white text-[10px] font-bold px-2 py-0.5 rounded cursor-grab select-none"
                                  title="Arrastar bloco"
                                >
                                  <GripVertical size={11} />
                                  {b.type === 'custom' ? 'Texto/HTML' :
                                   b.type === 'title' ? 'Título' :
                                   b.type === 'image' ? 'Imagem' :
                                   b.type === 'video' ? 'Vídeo' :
                                   b.type === 'highlight' ? 'Destaque' :
                                   b.type === 'group' ? 'Grupo' :
                                   b.type === 'embed' ? 'Embed' :
                                   b.type === 'logo' ? 'Logo' :
                                   b.type}
                                </div>
                                {/* direita: botões de ação */}
                                <div className="flex items-center gap-0.5">
                                  <button
                                    onClick={(e) => { e.stopPropagation(); editBlockById(b.id); }}
                                    className="p-1.5 rounded hover:bg-slate-100 text-slate-500 hover:text-faktory-blue transition-colors"
                                    title="Editar"
                                  ><Pencil size={13} /></button>
                                  <button
                                    onClick={(e) => { e.stopPropagation(); duplicateBlockById(b.id); }}
                                    className="p-1.5 rounded hover:bg-slate-100 text-slate-500 hover:text-faktory-blue transition-colors"
                                    title="Duplicar"
                                  ><Copy size={13} /></button>
                                  <div className="w-px h-4 bg-slate-200 mx-0.5" />
                                  <button
                                    onClick={(e) => { e.stopPropagation(); moveBlockById(b.id, -1); }}
                                    className="p-1.5 rounded hover:bg-slate-100 text-slate-500 hover:text-faktory-blue transition-colors"
                                    title="Mover para cima"
                                  ><ChevronUp size={13} /></button>
                                  <button
                                    onClick={(e) => { e.stopPropagation(); moveBlockById(b.id, 1); }}
                                    className="p-1.5 rounded hover:bg-slate-100 text-slate-500 hover:text-faktory-blue transition-colors"
                                    title="Mover para baixo"
                                  ><ChevronDown size={13} /></button>
                                  <div className="w-px h-4 bg-slate-200 mx-0.5" />
                                  <button
                                    onClick={(e) => { e.stopPropagation(); removeBlockById(b.id); }}
                                    className="p-1.5 rounded hover:bg-red-50 text-slate-400 hover:text-red-600 transition-colors"
                                    title="Remover"
                                  ><Trash2 size={13} /></button>
                                </div>
                              </div>
                            )}
                            {/* ── Conteúdo do bloco ── */}
                            <div className={`relative ${hoveredBlockId === b.id ? 'pt-8' : ''}`}>
                              <div className="absolute inset-0 z-10" />
                              <div className="p-4" dangerouslySetInnerHTML={{ __html: b.html }} />
                            </div>
                          </div>
                        ))}

                        {dragPreview.type === 'block' && dragPreview.rect && dragPreview.source === 'preview' && (
                          <>
                            <div
                              className="pointer-events-none absolute rounded border-2 border-dashed border-faktory-blue bg-faktory-blue/8"
                              style={{ top: dragPreview.rect.top, left: dragPreview.rect.left, width: dragPreview.rect.width, height: dragPreview.rect.height }}
                            />
                            <div
                              className="pointer-events-none absolute bg-faktory-blue"
                              style={{
                                top: (dragPreview.pos === 'after' ? (dragPreview.rect.top + dragPreview.rect.height - 2) : (dragPreview.rect.top - 2)),
                                left: dragPreview.rect.left,
                                width: dragPreview.rect.width,
                                height: 4,
                                borderRadius: 2,
                                opacity: 0.95
                              }}
                            />
                          </>
                        )}
                      </div>
                  </div>

                  {/* Quiz Section — só exibe quando a aula já tem quiz definido */}
                  {activeLesson.quiz ? (
                  <div className="mt-10 pt-10 border-t border-slate-100">
                    <h3 className="text-lg font-bold text-slate-700 mb-6 flex items-center gap-2">
                      <HelpCircle className="text-faktory-blue" size={20} />
                      Questionário de Fixação
                    </h3>
                    <div className="space-y-4">
                      <input 
                        className="w-full p-3 bg-white border border-slate-200 rounded-md font-bold text-slate-600 outline-none focus:border-faktory-blue"
                        placeholder="Pergunta do quiz..."
                        value={activeLesson.quiz?.question}
                        onChange={(e) => updateLesson({ quiz: { ...activeLesson.quiz!, question: e.target.value } })}
                      />
                      <div className="grid grid-cols-2 gap-4">
                        {activeLesson.quiz?.options.map((option, idx) => (
                          <div key={idx} className="flex items-center gap-2 bg-slate-50 p-3 rounded-md border border-slate-100">
                            <input 
                              type="radio" 
                              checked={activeLesson.quiz?.correctIndex === idx}
                              onChange={() => updateLesson({ quiz: { ...activeLesson.quiz!, correctIndex: idx } })}
                            />
                            <input 
                              className="bg-transparent text-xs w-full outline-none"
                              value={option}
                              onChange={(e) => {
                                const newOptions = [...activeLesson.quiz!.options];
                                newOptions[idx] = e.target.value;
                                updateLesson({ quiz: { ...activeLesson.quiz!, options: newOptions } });
                              }}
                              placeholder={`Opção ${idx + 1}`}
                            />
                          </div>
                        ))}
                      </div>
                      <button
                        onClick={() => updateLesson({ quiz: undefined })}
                        className="text-xs text-red-500 hover:underline"
                      >
                        Remover questionário
                      </button>
                    </div>
                  </div>
                  ) : (
                  <div className="mt-10 pt-10 border-t border-slate-100">
                    <button
                      onClick={() => updateLesson({ quiz: { id: genId(), question: '', options: ['', '', '', ''], correctIndex: 0 } })}
                      className="flex items-center gap-2 text-sm text-slate-400 hover:text-faktory-blue transition-colors"
                    >
                      <HelpCircle size={16} />
                      Adicionar questionário de fixação
                    </button>
                  </div>
                  )}
                </>
              )}
            </div>
          </div>
        </main>

        {/* Right Sidebar - Components */}
        <aside className="w-64 bg-white border-l border-slate-200 flex flex-col shrink-0">
          <div className="flex border-b border-slate-100">
            <button className="flex-1 py-3 text-[10px] font-bold text-faktory-blue border-b-2 border-faktory-blue flex items-center justify-center gap-2">
              <Layers size={14} />
              Componentes
            </button>
            <button className="flex-1 py-3 text-[10px] font-bold text-slate-400 hover:text-slate-600 flex items-center justify-center gap-2">
              <Layout size={14} />
              Layout
            </button>
          </div>

          <div className="p-4 grid grid-cols-2 gap-2">
            {[
              { icon: Type, label: 'Título de seção' },
              { icon: FileText, label: 'Texto ou HTML' },
              { icon: ImageIcon, label: 'Imagem' },
              { icon: Video, label: 'Vídeo' },
              { icon: HelpCircle, label: 'Texto em destaque' },
              { icon: Layers, label: 'Grupo de painéis' },
              { icon: Code, label: 'Código embed' },
              { icon: HelpCircle, label: 'Questionário' },
            ].map((comp, idx) => (
              <button 
                key={idx}
                onClick={() => {
                  // insert or open component depending on type
                  if (!activeLesson) {
                    showToast('Selecione uma aula antes de inserir componentes');
                    return;
                  }
                  const label = comp.label;
                  if (label.includes('Vídeo')) {
                    setShowVideoModal(true);
                    return;
                  }

                  if (label.includes('Imagem')) {
                    // open file picker to attach image to lesson (do not paste into content)
                    imageInputRef.current?.click();
                    return;
                  }

                  if (label.includes('Título')) {
                    const block = genBlock(`<h2>${activeLesson.title}</h2>`, 'title');
                    updateLesson({ content: block + '\n' + activeLesson.content });
                    showToast('Título inserido');
                    return;
                  }

                  if (label.includes('Texto') || label.includes('HTML')) {
                    const block = genBlock('<p>Novo parágrafo...</p>', 'text');
                    updateLesson({ content: activeLesson.content + '\n' + block });
                    showToast('Texto inserido');
                    return;
                  }

                  if (label.includes('Imagem')) {
                    const block = genBlock('<img src="https://via.placeholder.com/800x400" alt="Imagem" />', 'image');
                    updateLesson({ content: activeLesson.content + '\n' + block });
                    showToast('Imagem inserida');
                    return;
                  }

                  if (label.includes('destaque')) {
                    const block = genBlock('<p class="highlight"><strong>Texto em destaque</strong></p>', 'highlight');
                    updateLesson({ content: activeLesson.content + '\n' + block });
                    showToast('Texto em destaque inserido');
                    return;
                  }

                  if (label.includes('painéis')) {
                    const block = genBlock('<div class="panel-group">\n  <div class="panel">Painel 1</div>\n  <div class="panel">Painel 2</div>\n</div>', 'panels');
                    updateLesson({ content: activeLesson.content + '\n' + block });
                    showToast('Grupo de painéis inserido');
                    return;
                  }

                  if (label.includes('embed')) {
                    const block = genBlock('<div class="embed"><!-- Cole o código embed aqui --></div>', 'embed');
                    updateLesson({ content: activeLesson.content + '\n' + block });
                    showToast('Embed inserido');
                    return;
                  }

                  if (label.includes('Questionário')) {
                    if (!activeLesson.quiz) {
                      updateLesson({ quiz: { id: Date.now().toString() + '-quiz', question: 'Nova pergunta', options: ['',''], correctIndex: 0 } });
                    }
                    return;
                  }
                }}
                className="flex flex-col items-center justify-center p-3 border border-slate-100 rounded-md hover:border-faktory-blue hover:text-faktory-blue transition-all group"
              >
                <comp.icon size={20} className="text-slate-400 group-hover:text-faktory-blue mb-2" />
                <span className="text-[9px] font-bold text-slate-500 group-hover:text-faktory-blue text-center leading-tight">{comp.label}</span>
              </button>
            ))}
          </div>

          <div className="mt-auto p-4 border-t border-slate-100 bg-slate-50/50">
            <button className="w-full py-2 bg-slate-800 text-white rounded font-bold text-[10px] uppercase tracking-wider hover:bg-slate-900 transition-all">
              Limpar previsões
            </button>
          </div>
        </aside>
      </div>

      {/* Video Settings Modal */}
      <AnimatePresence>
        {showVideoModal && activeLesson && (
          <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-[100] p-4">
            <motion.div 
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              className="bg-white rounded-xl shadow-2xl w-full max-w-xl overflow-hidden"
            >
              <div className="p-6 border-b border-slate-100 flex items-center justify-between bg-slate-50">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 bg-faktory-blue rounded-lg flex items-center justify-center text-white">
                    <Video size={20} />
                  </div>
                  <div>
                    <h2 className="text-lg font-bold text-slate-800">Configurações de Vídeo</h2>
                    <p className="text-xs text-slate-500 font-medium uppercase tracking-wider">Aula: {activeLesson.title}</p>
                  </div>
                </div>
                <button 
                  onClick={() => setShowVideoModal(false)}
                  className="p-2 hover:bg-slate-200 rounded-full transition-colors"
                >
                  <Minus size={20} className="text-slate-400" />
                </button>
              </div>

              <div className="p-8 space-y-6">
                <div>
                  <label className="block text-xs font-bold text-slate-500 uppercase mb-2">URL do Vídeo (YouTube, Vimeo, etc.)</label>
                  <div className="relative">
                    <input 
                      className="w-full p-3 bg-slate-50 border border-slate-200 rounded-lg text-sm outline-none focus:ring-2 focus:ring-faktory-blue transition-all"
                      placeholder="https://www.youtube.com/embed/..."
                      value={activeLesson.videoUrl}
                      onChange={(e) => updateLesson({ videoUrl: e.target.value })}
                    />
                    <div className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-300">
                      <MousePointer2 size={16} />
                    </div>
                  </div>
                  <p className="text-[10px] text-slate-400 mt-2 italic">* Use o link de incorporação (embed) para melhor compatibilidade.</p>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-500 uppercase mb-2">URL da Legenda (VTT/SRT)</label>
                  <input 
                    className="w-full p-3 bg-slate-50 border border-slate-200 rounded-lg text-sm outline-none focus:ring-2 focus:ring-faktory-blue transition-all"
                    placeholder="https://exemplo.com/legendas.vtt"
                    value={activeLesson.videoOptions?.subtitlesUrl || ''}
                    onChange={(e) => updateLesson({ 
                      videoOptions: { ...activeLesson.videoOptions, subtitlesUrl: e.target.value } 
                    })}
                  />
                </div>

                <div className="grid grid-cols-2 gap-6 pt-2">
                  <label className="flex items-center gap-3 cursor-pointer group">
                    <div className="relative">
                      <input 
                        type="checkbox" 
                        className="sr-only"
                        checked={activeLesson.videoOptions?.autoplay || false}
                        onChange={(e) => updateLesson({ 
                          videoOptions: { ...activeLesson.videoOptions, autoplay: e.target.checked } 
                        })}
                      />
                      <div className={cn(
                        "w-10 h-5 rounded-full transition-all",
                        activeLesson.videoOptions?.autoplay ? "bg-faktory-blue" : "bg-slate-200"
                      )}></div>
                      <div className={cn(
                        "absolute top-1 left-1 w-3 h-3 bg-white rounded-full transition-all",
                        activeLesson.videoOptions?.autoplay ? "translate-x-5" : ""
                      )}></div>
                    </div>
                    <span className="text-xs font-bold text-slate-600 group-hover:text-faktory-blue transition-colors">Reprodução Automática</span>
                  </label>

                  <label className="flex items-center gap-3 cursor-pointer group">
                    <div className="relative">
                      <input 
                        type="checkbox" 
                        className="sr-only"
                        checked={activeLesson.videoOptions?.loop || false}
                        onChange={(e) => updateLesson({ 
                          videoOptions: { ...activeLesson.videoOptions, loop: e.target.checked } 
                        })}
                      />
                      <div className={cn(
                        "w-10 h-5 rounded-full transition-all",
                        activeLesson.videoOptions?.loop ? "bg-faktory-blue" : "bg-slate-200"
                      )}></div>
                      <div className={cn(
                        "absolute top-1 left-1 w-3 h-3 bg-white rounded-full transition-all",
                        activeLesson.videoOptions?.loop ? "translate-x-5" : ""
                      )}></div>
                    </div>
                    <span className="text-xs font-bold text-slate-600 group-hover:text-faktory-blue transition-colors">Repetir Vídeo (Loop)</span>
                  </label>

                  <label className="flex items-center gap-3 cursor-pointer group">
                    <div className="relative">
                      <input 
                        type="checkbox" 
                        className="sr-only"
                        checked={activeLesson.videoOptions?.controls !== false}
                        onChange={(e) => updateLesson({ 
                          videoOptions: { ...activeLesson.videoOptions, controls: e.target.checked } 
                        })}
                      />
                      <div className={cn(
                        "w-10 h-5 rounded-full transition-all",
                        activeLesson.videoOptions?.controls !== false ? "bg-faktory-blue" : "bg-slate-200"
                      )}></div>
                      <div className={cn(
                        "absolute top-1 left-1 w-3 h-3 bg-white rounded-full transition-all",
                        activeLesson.videoOptions?.controls !== false ? "translate-x-5" : ""
                      )}></div>
                    </div>
                    <span className="text-xs font-bold text-slate-600 group-hover:text-faktory-blue transition-colors">Exibir Controles</span>
                  </label>
                </div>
              </div>

                <div className="p-6 bg-slate-50 border-t border-slate-100 flex justify-between">
                <button 
                  type="button"
                  onClick={() => { updateLesson({ videoUrl: '' }); setShowVideoModal(false); }}
                  className="px-4 py-2 bg-red-600 text-white rounded font-bold text-sm hover:bg-red-700 transition-all"
                >
                  Remover Vídeo
                </button>
                <button
                  type="button"
                  onClick={() => insertVideoAsBlock()}
                  className="ml-3 px-4 py-2 bg-white border rounded font-medium text-sm hover:bg-slate-50 transition-all"
                >
                  Inserir vídeo como bloco
                </button>
                <div>
                  <button 
                    onClick={() => setShowVideoModal(false)}
                    className="mr-3 px-4 py-2 bg-white border border-slate-200 rounded font-medium text-sm hover:bg-slate-50 transition-all"
                  >
                    Cancelar
                  </button>
                  <button 
                    onClick={() => setShowVideoModal(false)}
                    className="px-8 py-2.5 bg-faktory-blue text-white rounded-lg font-bold text-sm hover:bg-[#2c6a9a] transition-all shadow-lg shadow-blue-100"
                  >
                    Confirmar Alterações
                  </button>
                </div>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
      {/* Preview Modal */}
      <AnimatePresence>
        {showPreviewModal && (
          <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-[110] p-4">
            <motion.div initial={{ opacity: 0, scale: 0.98 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.98 }} className="bg-white rounded-xl shadow-2xl w-full max-w-4xl overflow-auto">
              <div className="p-4 border-b flex items-center justify-between">
                <h3 className="font-bold text-lg">Visualização da Trilha</h3>
                <div className="flex items-center gap-2">
                  <button onClick={handleRefreshFromServer} className="px-3 py-1 text-sm border rounded">Recarregar</button>
                  <button onClick={() => setShowPreviewModal(false)} className="px-3 py-1 bg-faktory-blue text-white rounded">Fechar</button>
                </div>
              </div>
              <div className="p-6">
                <h2 className="text-2xl font-bold mb-2">{trailData.title}</h2>
                <p className="text-slate-500 mb-6">{trailData.description}</p>
                <div className="space-y-4">
                  {trailData.modules.map((m) => (
                    <div key={m.id} className="p-4 border rounded">
                      <h4 className="font-bold">{m.title}</h4>
                      <ul className="list-disc pl-6 mt-2">
                        {m.lessons.map(l => <li key={l.id}>{l.title}</li>)}
                      </ul>
                    </div>
                  ))}
                </div>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Delete Confirm Modal */}
      <AnimatePresence>
        {showDeleteConfirm && (
          <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-[120] p-4">
            <motion.div initial={{ opacity: 0, scale: 0.98 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.98 }} className="bg-white rounded-xl shadow-2xl w-full max-w-sm p-6">
              <h3 className="text-lg font-bold mb-2">Confirmar exclusão</h3>
              <p className="text-slate-600 mb-4">Tem certeza que deseja excluir esta trilha? Essa ação é irreversível.</p>
              <div className="flex justify-end gap-3">
                <button onClick={() => setShowDeleteConfirm(false)} className="px-4 py-2 border rounded">Cancelar</button>
                <button onClick={handleDeleteTrail} className="px-4 py-2 bg-red-600 text-white rounded">Excluir</button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
      {/* Block Editor Modal */}
      <AnimatePresence>
        {showBlockEditor && editingBlockIdState && (
          <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-[120] p-4">
            <motion.div
              initial={{ opacity: 0, scale: 0.98, y: 10 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.98, y: 10 }}
              className="bg-white rounded-xl shadow-2xl w-full max-w-3xl overflow-hidden"
            >
              <div className="p-4 border-b border-slate-100 flex items-center justify-between">
                <h3 className="text-lg font-bold text-slate-800">Editar Bloco</h3>
                <button onClick={cancelEditBlock} className="p-2 text-slate-400 hover:text-slate-600"><Minus size={18} /></button>
              </div>
              <div className="p-6">
                <div className="mb-3 text-xs text-slate-500">Edição HTML (WYSIWYG simples)</div>
                <div
                  contentEditable
                  suppressContentEditableWarning
                  onInput={(e: any) => setEditingBlockHtmlState(e.currentTarget.innerHTML)}
                  className="min-h-[200px] p-4 border border-slate-100 rounded prose max-w-none"
                  dangerouslySetInnerHTML={{ __html: editingBlockHtmlState }}
                />
              </div>
              <div className="p-4 bg-slate-50 border-t flex justify-end gap-2">
                <button onClick={cancelEditBlock} className="px-4 py-2 bg-white border rounded">Cancelar</button>
                <button onClick={saveEditedBlock} className="px-4 py-2 bg-faktory-blue text-white rounded font-bold">Salvar</button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
      {/* Toast */}
      {toast && (
        <div className="fixed bottom-6 right-6 bg-slate-800 text-white px-4 py-2 rounded shadow-lg z-50">{toast}</div>
      )}
    </div>
  );
}
