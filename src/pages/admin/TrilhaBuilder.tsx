import { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { 
  Plus, Trash2, Video, FileText, HelpCircle, 
  ChevronDown, ChevronUp, Save, Loader2, ArrowLeft,
  Layout, Image as ImageIcon, Type, Code, Layers,
  Eye, Search, Bell, User as UserIcon, Minus, Maximize2,
  RefreshCw, MousePointer2, Settings
} from 'lucide-react';
import { api } from '../../utils/api';
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
  const [editingBlockIdState, setEditingBlockIdState] = useState<string | null>(null);
  const [editingBlockHtmlState, setEditingBlockHtmlState] = useState<string>('');
  const [showPreviewModal, setShowPreviewModal] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
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
      }
    }, 2000);

    return () => clearTimeout(timeoutId);
  }, [trailData, isDirty, id, trailId, navigate]);

  useEffect(() => {
    async function fetchTrail() {
      if (!id) return;
      try {
        const data = await api.get<Trail>(`/api/trails/${id}`);
        setTrailData({
          title: data.title,
          description: data.description,
          modules: data.modules,
        });
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

  const handleSave = async () => {
    setSaving(true);
    try {
      const finalData: Trail = { id: trailId, ...trailData };
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
      console.error('Error saving trail:', error);
    } finally {
      setSaving(false);
    }
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
    try {
      await api.delete(`/api/trails/${id}`);
      showToast('Trilha removida');
      navigate('/admin/trilhas');
    } catch (err) {
      showToast('Erro ao remover trilha');
    }
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
          title: `Introdução ao ${title.split('. ')[1]}`,
          videoUrl: '',
          content: `<p>Bem-vindo à etapa de ${title.split('. ')[1]}. Aqui você aprenderá os conceitos fundamentais.</p>`,
          quiz: {
            id: `q-${Date.now()}-${index}`,
            question: 'O que aprendemos nesta aula?',
            options: ['Opção A', 'Opção B', 'Opção C', 'Opção D'],
            correctIndex: 0
          }
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
    const newModule: Module = {
      id: Date.now().toString(),
      title: `Etapa ${trailData.modules.length + 1}`,
      lessons: []
    };
    setTrailData(prev => ({ ...prev, modules: [...prev.modules, newModule] }));
    setActiveModuleId(newModule.id);
    setExpandedModules(prev => ({ ...prev, [newModule.id]: true }));
    setIsDirty(true);
    // Persistir módulo no backend
    if (id) {
      api.post(`/api/trails/${trailId}/modules`, newModule).catch(err => console.error('Erro ao criar módulo:', err));
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
    // Remover módulo no backend
    if (id) {
      api.delete(`/api/trails/${trailId}/modules/${moduleId}`).catch(err => console.error('Erro ao remover módulo:', err));
    }
  };

  const addLesson = (moduleId: string, parentLessonId?: string) => {
    const newLesson: Lesson = {
      id: Date.now().toString(),
      title: 'Nova Aula',
      videoUrl: '',
      content: '',
      quiz: {
        id: Date.now().toString() + '-quiz',
        question: '',
        options: ['', '', '', ''],
        correctIndex: 0
      }
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
      // Persistir subaula no backend
      if (id) {
        api.post(`/api/trails/${trailId}/modules/${moduleId}/lessons/${parentLessonId}/sublessons`, newLesson)
          .catch(err => console.error('Erro ao criar subaula:', err));
      }
    } else {
      setActiveLessonId(newLesson.id);
      setActiveSublessonId(null);
      // Persistir aula no backend
      if (id) {
        api.post(`/api/trails/${trailId}/modules/${moduleId}/lessons`, newLesson)
          .catch(err => console.error('Erro ao criar aula:', err));
      }
    }
    showToast('Aula criada');
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
        api.delete(`/api/trails/${trailId}/modules/${moduleId}/lessons/${parentLessonId}/sublessons/${lessonId}`)
          .catch(err => console.error('Erro ao remover subaula:', err));
      } else {
        api.delete(`/api/trails/${trailId}/modules/${moduleId}/lessons/${lessonId}`)
          .catch(err => console.error('Erro ao remover aula:', err));
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
    setTrailData(prev => ({
      ...prev,
      modules: prev.modules.map(m => {
        if (m.id !== activeModuleId) return m;
        if (!editingLessonParentId) {
          return { ...m, lessons: m.lessons.map(l => l.id === editingLessonId ? { ...l, title: editingLessonTitle } : l) };
        }
        return { ...m, lessons: m.lessons.map(l => l.id === editingLessonParentId ? { ...l, sublessons: (l.sublessons || []).map(s => s.id === editingLessonId ? { ...s, title: editingLessonTitle } : s) } : l) };
      })
    }));
    setIsDirty(true);
    // Persistir rename no backend
    if (id && activeModuleId) {
      if (editingLessonParentId) {
        api.put(`/api/trails/${trailId}/modules/${activeModuleId}/lessons/${editingLessonParentId}/sublessons/${editingLessonId}`, { title: editingLessonTitle })
          .catch(err => console.error('Erro ao renomear subaula:', err));
      } else {
        api.put(`/api/trails/${trailId}/modules/${activeModuleId}/lessons/${editingLessonId}`, { title: editingLessonTitle })
          .catch(err => console.error('Erro ao renomear aula:', err));
      }
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
    const id = `b-${Date.now()}-${Math.random().toString(36).slice(2,8)}`;
    const safe = DOMPurify.sanitize(html, { WHOLE_DOCUMENT: false });
    return `<!-- block:${type}:${id} -->\n${safe}\n<!-- /block:${type}:${id} -->`;
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
    <div className="fixed inset-0 top-14 left-64 bg-[#f4f7f9] flex flex-col overflow-hidden z-10">
      {/* Top Bar - Editor Style */}
      <div className="h-14 bg-white border-b border-slate-200 flex items-center px-6 justify-between shrink-0">
        <div className="flex items-center gap-4">
          <button onClick={() => navigate('/admin/trilhas')} className="p-2 hover:bg-slate-100 rounded-full transition-colors">
            <ArrowLeft size={18} className="text-slate-500" />
          </button>
          <div className="flex items-center gap-2">
            <h1 className="text-sm font-bold text-slate-700 uppercase tracking-wider">
              {trailData.title || 'Nova Trilha'}
            </h1>
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
                <div className="text-[13px] mb-3">Parece que você removeu o conteúdo. Deseja restaurar o template padrão Faktory One?</div>
                <div className="flex gap-2">
                  <button onClick={applyFaktoryOneTemplate} className="px-3 py-1 bg-faktory-blue text-white rounded text-xs font-bold">Restaurar Template</button>
                  <button onClick={addModule} className="px-3 py-1 border rounded text-xs">Criar etapa vazia</button>
                </div>
              </div>
            ) : (
            trailData.modules.map((module, mIndex) => (
              <div key={module.id} className="space-y-1">
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
                    <input 
                      className="text-xs font-bold text-slate-600 bg-transparent outline-none w-full"
                      value={module.title}
                      onChange={(e) => updateModuleTitle(module.id, e.target.value)}
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
                    <div key={lesson.id} className="space-y-1">
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
                            />
                            <button onClick={(e) => { e.stopPropagation(); saveEditLesson(); }} className="px-2 py-1 bg-faktory-blue text-white rounded text-xs">Salvar</button>
                            <button onClick={(e) => { e.stopPropagation(); cancelEditLesson(); }} className="px-2 py-1 border rounded text-xs">Cancelar</button>
                          </div>
                          ) : (
                          <div className="flex items-center gap-2 w-full justify-between">
                            <span className="flex-1">{mIndex + 1}.{lIndex + 1} - {lesson.title}</span>
                            <div className="flex items-center gap-2">
                              <button onClick={(e) => { e.stopPropagation(); addLesson(module.id, lesson.id); }} title="Adicionar subaula" className="text-slate-400 hover:text-faktory-blue p-1 rounded"><Plus size={14} /></button>
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
                          <div className="flex items-center gap-2 w-full justify-between">
                            <span className="flex-1 text-sm text-slate-500">{mIndex + 1}.{lIndex + 1}.{sIndex + 1} - {sub.title}</span>
                            <div className="flex items-center gap-2">
                              <button onClick={(e) => { e.stopPropagation(); startEditLesson(sub.id, sub.title, lesson.id); }} title="Renomear subaula" aria-label="Renomear subaula" className="text-slate-400 hover:text-faktory-blue p-1 rounded"><ChevronDown size={12} style={{ transform: 'rotate(-90deg)' }} /></button>
                              <button onClick={(e) => { e.stopPropagation(); removeLesson(module.id, sub.id, lesson.id); }} title="Remover subaula" aria-label="Remover subaula" className="text-slate-400 hover:text-red-500 p-1 rounded"><Trash2 size={12} /></button>
                            </div>
                          </div>
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
            <div className="p-10 flex flex-col items-center border-b border-slate-50">
              <div className="w-64 mb-10">
                <img 
                  src="https://faktorysoftwares.com.br/wp-content/uploads/2023/10/logo-faktory-softwares.png" 
                  alt="Faktory Logo" 
                  className="w-full h-auto opacity-80"
                  referrerPolicy="no-referrer"
                />
                <p className="text-[10px] text-center font-bold text-slate-400 uppercase tracking-widest mt-2">Uma empresa Esquadgroup</p>
              </div>

              {activeLesson ? (
                <input 
                  className="text-3xl font-bold text-slate-700 text-center w-full outline-none focus:border-b-2 border-faktory-blue pb-2"
                  value={activeLesson.title}
                  onChange={(e) => updateLesson({ title: e.target.value })}
                  placeholder="Título da Aula"
                />
              ) : (
                <div className="text-slate-300 italic">Selecione ou crie uma aula para começar</div>
              )}
            </div>

            {/* Preview Content */}
            <div className="flex-1 p-10 space-y-8">
              {activeLesson && (
                <>
                  {/* Video Placeholder */}
                  <div 
                    onClick={() => setShowVideoModal(true)}
                    className="aspect-video bg-slate-900 rounded-sm flex flex-col items-center justify-center text-white relative group overflow-hidden cursor-pointer border-2 border-transparent hover:border-faktory-blue transition-all"
                  >
                    {activeLesson.videoUrl ? (
                      <div className="w-full h-full relative">
                        <iframe 
                          src={getEmbedUrl(activeLesson.videoUrl)} 
                          className="w-full h-full pointer-events-none"
                          title="Video Preview"
                        />
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

                  {/* HTML Content */}
                  <div className="prose prose-slate max-w-none">
                    <textarea 
                      className="w-full min-h-[200px] p-4 bg-slate-50 border border-slate-100 rounded-md text-sm outline-none focus:ring-1 focus:ring-faktory-blue"
                      value={activeLesson.content}
                      onChange={(e) => updateLesson({ content: e.target.value })}
                      placeholder="Conteúdo da aula (HTML ou Texto)..."
                    />

                    {/* Blocks quick list */}
                    <div className="mt-4 p-3 bg-slate-50 border border-slate-100 rounded-md">
                      <h4 className="text-xs font-bold text-slate-600 mb-2">Blocos da aula</h4>
                      {parseBlocks(activeLesson.content || '').length === 0 ? (
                        <div className="text-sm text-slate-400">Nenhum bloco detectado.</div>
                      ) : (
                        <div className="space-y-2">
                          {parseBlocks(activeLesson.content || '').map((b: any) => (
                            <div key={b.id} className="flex items-center justify-between bg-white p-2 rounded border border-slate-100">
                              <div>
                                <div className="text-sm font-bold text-slate-700">{b.type}</div>
                                <div className="text-xs text-slate-400 line-clamp-2" dangerouslySetInnerHTML={{ __html: b.html }} />
                              </div>
                              <div className="flex items-center gap-2">
                                <button onClick={() => editBlockById(b.id)} className="text-[11px] px-2 py-1 bg-white border rounded text-slate-600 hover:bg-slate-50">Editar</button>
                                <button onClick={() => removeBlockById(b.id)} className="text-[11px] px-2 py-1 bg-red-600 text-white rounded hover:bg-red-700">Remover</button>
                              </div>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Quiz Section */}
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
                    </div>
                  </div>
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
                  if (!activeLesson) return;
                  const label = comp.label;
                  if (label.includes('Vídeo')) {
                    setShowVideoModal(true);
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
