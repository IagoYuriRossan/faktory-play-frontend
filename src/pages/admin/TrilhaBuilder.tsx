import { useState, useEffect, useRef } from 'react';
import {
  Plus, Trash2, Video, FileText, HelpCircle,
  ChevronDown, ChevronUp, Save, Loader2, ArrowLeft,
  Layout, Image as ImageIcon, Type, Code, Layers,
  Eye, Search, Bell, User as UserIcon, Minus, Maximize2,
  RefreshCw, MousePointer2, Settings,
  GripVertical, Copy, Pencil, Undo2, Redo2
} from 'lucide-react';
import { AnimatePresence, motion } from 'motion/react';
import { auth } from '../../utils/firebase';
import { cn } from '../../utils/utils';
import { Trail, Module, Lesson } from '../../@types/index';
import DOMPurify from 'dompurify';
import { useWysiwygEditor } from './TrilhaBuilder/hooks/useWysiwygEditor';
import { useTrailData } from './TrilhaBuilder/hooks/useTrailData';
import { useModuleTree } from './TrilhaBuilder/hooks/useModuleTree';
import { useEtapaTree } from './TrilhaBuilder/hooks/useEtapaTree';
import { useBlockEditor } from './TrilhaBuilder/hooks/useBlockEditor';
import { trilhaBuilderApi } from './TrilhaBuilder/services/trilhaBuilderApi';
import { ContentArea } from './TrilhaBuilder/components/ContentArea';
import { createLogoContent, genBlock, genId, getEmbedUrl, parseBlocks } from './TrilhaBuilder/utils/contentBlocks';

export default function TrilhaBuilder() {
  // ── UI-only state (not extracted to hooks) ──
  const [showBlockEditor, setShowBlockEditor] = useState(false);
  const [titleHovered, setTitleHovered] = useState(false);
  const [hoveredBlockId, setHoveredBlockId] = useState<string | null>(null);
  const [showVideoModal, setShowVideoModal] = useState(false);
  const [showPreviewModal, setShowPreviewModal] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [imageUploading, setImageUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [editingLessonId, setEditingLessonId] = useState<string | null>(null);
  const [editingLessonTitle, setEditingLessonTitle] = useState('');
  const [editingLessonParentId, setEditingLessonParentId] = useState<string | null>(null);
  const [dragLessonTargetId, setDragLessonTargetId] = useState<string | null>(null);
  const [dragLessonOnModuleId, setDragLessonOnModuleId] = useState<string | null>(null);
  const [showActionsMenu, setShowActionsMenu] = useState(false);
  const actionsMenuRef = useRef<HTMLDivElement | null>(null);

  // ── Extracted hooks ──
  const trail = useTrailData();
  const {
    id, trailId, navigate,
    loading, saving, setSaving,
    isDirty, setIsDirty, lastSaved, setLastSaved,
    activeModuleId, setActiveModuleId,
    activeLessonId, setActiveLessonId,
    hasLocalBackup,
    expandedModules, setExpandedModules,
    expandedLessons, setExpandedLessons,
    trailData, setTrailData,
    toast, showToast,
    restoreLocalBackup,
    handleSave, handleRefreshFromServer, handleDeleteTrail,
  } = trail;

  const wysiwyg = useWysiwygEditor(showBlockEditor);
  const {
    useWysiwygMode, setUseWysiwygMode,
    editingBlockHtml, setEditingBlockHtml,
    editingBlockId, setEditingBlockId,
    editingBlockType, setEditingBlockType,
    editingBlockPayload, setEditingBlockPayload,
    wysiwygRef, wysiwygLoadedBlockRef,
    initEditorHistory, flushEditorHistory,
    canUndo, canRedo,
    handleEditorValueChange, handleUndo, handleRedo,
    saveSelection, restoreSelection, handleWysiwygInput, execCommand,
  } = wysiwyg;

  const titleInputRef = useRef<HTMLTextAreaElement | null>(null);

  const moduleTree = useModuleTree({
    id, trailId, navigate, trailData, setTrailData, setIsDirty,
    activeModuleId, setActiveModuleId, setActiveLessonId,
    setExpandedModules, showToast, setSaving, setLastSaved,
  });
  const {
    reorderModule, moveModuleInto, toggleModule,
    addModule, updateModuleTitle, removeModule, moveModule,
    promoteSubmodules, applyFaktoryOneTemplate, flattenUntitledModules,
  } = moduleTree;

  const etapaTree = useEtapaTree({
    id, trailId, trailData, setTrailData, setIsDirty,
    activeModuleId, setActiveModuleId,
    activeLessonId, setActiveLessonId,
    showToast, setSaving, setLastSaved,
    setEditingLessonId, setEditingLessonTitle, setEditingLessonParentId,
    titleInputRef,
  });
  const {
    addLesson, removeLesson, moveLesson,
    moveLessonToModule, moveLessonInto,
    startEditLesson, updateLesson,
    getActiveLesson, getActiveLessonTitleHtml,
  } = etapaTree;

  // ── Block editor hook ──
  const blockEditor = useBlockEditor({
    activeLesson: getActiveLesson(),
    updateLesson,
    showToast,
    wysiwyg,
    setShowBlockEditor,
  });
  const {
    moveBlockById, reorderBlock, reorderBlockTo,
    duplicateBlockById, removeBlockById,
    editBlockById, saveEditedBlock, cancelEditBlock, addBlock,
  } = blockEditor;

  const handleOpenPreview = () => setShowPreviewModal(true);

  const setVideoPosition = (pos: 'title-top' | 'top' | 'bottom') => {
    updateLesson({ videoPosition: pos });
  };

  const insertVideoAsBlock = () => {
    const al = getActiveLesson() as Lesson | null;
    if (!al || !al.videoUrl) return;
    const embed = getEmbedUrl(al.videoUrl) || al.videoUrl;
    addBlock('iframe', { url: embed });
    updateLesson({ videoUrl: '' });
    setShowVideoModal(false);
    showToast('Vídeo movido para o conteúdo como bloco');
  };

  // ── Actions menu close handler ──
  useEffect(() => {
    function onDocClick(e: MouseEvent) {
      if (!showActionsMenu) return;
      if (!actionsMenuRef.current) return;
      if (!actionsMenuRef.current.contains(e.target as Node)) setShowActionsMenu(false);
    }
    function onKey(e: KeyboardEvent) { if (e.key === 'Escape') setShowActionsMenu(false); }
    document.addEventListener('mousedown', onDocClick);
    document.addEventListener('keydown', onKey);
    return () => { document.removeEventListener('mousedown', onDocClick); document.removeEventListener('keydown', onKey); };
  }, [showActionsMenu]);

  // ── Drag & drop refs ──
  const dragBlockIdRef = useRef<string | null>(null);
  const dragModuleIdRef = useRef<string | null>(null);
  const dragLessonIdRef = useRef<string | null>(null);
  const dragVideoRef = useRef<boolean>(false);
  const dragTitleRef = useRef<boolean>(false);
  const dragPageTitleRef = useRef<boolean>(false);
  const dragImageRef = useRef<string | null>(null);

  // ── Remaining refs ──
  const blocksAreaRef = useRef<HTMLDivElement | null>(null);
  const previewAreaRef = useRef<HTMLDivElement | null>(null);
  const imageInputRef = useRef<HTMLInputElement | null>(null);
  const blockRefs = useRef<Record<string, HTMLDivElement | null>>({});
  const [dragPreview, setDragPreview] = useState<{ type: 'none' | 'title' | 'content' | 'block'; id?: string; rect?: { top: number; left: number; width: number; height: number }; pos?: 'before' | 'after'; source?: 'list' | 'preview' }>({ type: 'none' });
  const [moduleParentMenuOpenId, setModuleParentMenuOpenId] = useState<string | null>(null);

  // Sync the inline title editor only when the active lesson changes
  useEffect(() => {
    const el = titleInputRef.current as unknown as HTMLDivElement | null;
    if (!el) return;
    const al = getActiveLesson();
    el.innerHTML = (al as any)?.titleHtml || (al?.title ? `<h2>${al.title}</h2>` : '');
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeLessonId]);

  // ── Lesson edit helpers (depend on UI state) ──
  const saveEditLesson = () => {
    if (!editingLessonId || !activeModuleId) return;
    const applyToModule = (modules: Module[], moduleId: string, fn: (m: Module) => Module): Module[] =>
      modules.map(m => {
        if (m.id === moduleId) return fn(m);
        if (m.submodules?.length) return { ...m, submodules: applyToModule(m.submodules, moduleId, fn) };
        return m;
      });
    const updated = ((): typeof trailData => {
      const modules = applyToModule(trailData.modules, activeModuleId, m => {
        if (!editingLessonParentId) {
          return { ...m, etapas: (m.etapas || []).map(l => l.id === editingLessonId ? { ...l, title: editingLessonTitle, titleHtml: undefined } as any : l) };
        }
        return { ...m, etapas: (m.etapas || []).map(l => l.id === editingLessonParentId ? { ...l, subetapas: ((l.subetapas || []) || []).map(s => s.id === editingLessonId ? { ...s, title: editingLessonTitle, titleHtml: undefined } as any : s) } : l) };
      });
      return { ...trailData, modules };
    })();
    if (editingLessonId === activeLessonId) {
      const el = titleInputRef.current as unknown as HTMLDivElement | null;
      if (el) el.innerHTML = `<h2>${editingLessonTitle}</h2>`;
    }
    setTrailData(updated);
    setIsDirty(true);
    if (id) {
      (async () => {
        setSaving(true);
        try {
          const finalData: Trail = { id: trailId, ...updated };
          await trilhaBuilderApi.updateTrail(trailId, finalData);
          setLastSaved(new Date());
          setIsDirty(false);
          showToast('Título salvo');
        } catch (err) {
          console.error('Erro salvando título imediatamente:', err);
          showToast('Erro ao salvar título — salve a trilha manualmente');
        } finally { setSaving(false); }
      })();
    }
    setEditingLessonId(null); setEditingLessonTitle(''); setEditingLessonParentId(null);
    showToast('Aula renomeada');
  };

  const cancelEditLesson = () => {
    setEditingLessonId(null); setEditingLessonTitle(''); setEditingLessonParentId(null);
  };

  // ── Image upload ──
  const handleImageFile = (file: File) => {
    if (id && activeModuleId && activeLessonId) {
      setImageUploading(true); setUploadProgress(0);
      (async () => {
        let xhr: XMLHttpRequest | null = null;
        try {
          const user = auth.currentUser;
          const token = user ? await user.getIdToken() : null;
          const form = new FormData(); form.append('image', file);
          await new Promise<void>((resolve, reject) => {
            xhr = new XMLHttpRequest();
            const url = `${import.meta.env.VITE_API_URL || 'http://127.0.0.1:3001'}/api/trails/${trailId}/modules/${activeModuleId}/lessons/${activeLessonId}/image`;
            xhr.open('POST', url, true);
            if (token) xhr.setRequestHeader('Authorization', `Bearer ${token}`);
            xhr.upload.onprogress = (e) => { if (e.lengthComputable) setUploadProgress(Math.round((e.loaded / e.total) * 100)); };
            xhr.onload = () => {
              const status = xhr!.status; let data: any = null;
              try { data = xhr!.responseText ? JSON.parse(xhr!.responseText) : null; } catch { data = xhr!.responseText; }
              if (status >= 200 && status < 300) { const imageUrl = data?.imageUrl || data?.url; if (imageUrl) { updateLesson({ imageUrl }); showToast('Imagem enviada e salva no servidor'); resolve(); return; } reject(new Error('Resposta do servidor não continha imageUrl')); return; }
              if (status === 413) { reject(new Error('Tamanho do arquivo excede o limite de 5MB (413)')); return; }
              reject(new Error((data && data.message) || `Upload failed (${status})`));
            };
            xhr.onerror = () => reject(new Error('Erro na requisição de upload'));
            xhr.onabort = () => reject(new Error('Upload abortado'));
            xhr.send(form);
          });
          setUploadProgress(100); return;
        } catch (err: any) {
          console.warn('Upload falhou, usando DataURL como fallback:', err);
          if (err?.message?.includes('5MB')) showToast('Erro: arquivo maior que 5MB');
          const reader = new FileReader();
          reader.onload = () => { updateLesson({ imageUrl: reader.result as string }); showToast('Upload falhou — imagem armazenada localmente'); };
          reader.readAsDataURL(file);
        } finally {
          setImageUploading(false); setTimeout(() => setUploadProgress(0), 700);
          try { if (xhr) { try { (xhr as any).abort(); } catch { } } } catch { }
        }
      })();
      return;
    }
    const reader = new FileReader();
    reader.onload = () => { updateLesson({ imageUrl: reader.result as string }); showToast('Imagem adicionada à aula (local)'); };
    reader.readAsDataURL(file);
  };

  const activeLesson = getActiveLesson() as Lesson | null;

  // Auto-resize title textarea
  useEffect(() => {
    const el = titleInputRef.current; if (!el) return;
    el.style.height = 'auto'; el.style.height = `${Math.max(32, el.scrollHeight)}px`;
  }, [activeLesson?.title, activeLesson?.id]);

  // Populate WYSIWYG editor when block editor opens
  useEffect(() => {
    if (!showBlockEditor || !editingBlockId) return;
    const raf = requestAnimationFrame(() => {
      if (wysiwygRef.current && wysiwygLoadedBlockRef.current !== editingBlockId) {
        wysiwygRef.current.innerHTML = editingBlockHtml;
        wysiwygLoadedBlockRef.current = editingBlockId;
        const range = document.createRange(); range.selectNodeContents(wysiwygRef.current); range.collapse(false);
        const sel = window.getSelection(); if (sel) { sel.removeAllRanges(); sel.addRange(range); }
      }
    });
    return () => cancelAnimationFrame(raf);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [showBlockEditor, editingBlockId]);



  const renderModule = (module: Module, depth: number, mIndex: number) => {
    return (
      <div key={module.id} className="space-y-1"
        draggable
        onDragStart={(e) => { dragModuleIdRef.current = module.id; e.dataTransfer.effectAllowed = 'move'; }}
        onDragOver={(e) => e.preventDefault()}
        onDrop={(e) => { e.preventDefault(); const dragId = dragModuleIdRef.current; if (dragId && dragId !== module.id) reorderModule(dragId, module.id); dragModuleIdRef.current = null; }}
      >
        <div
          className={cn(
            "flex items-center justify-between p-2 rounded-md cursor-pointer group transition-all border-l-2",
            dragLessonOnModuleId === module.id
              ? "bg-blue-50 border-l-faktory-blue"
              : activeModuleId === module.id
                ? "bg-slate-50 border-l-[#99b300]"
                : "hover:bg-slate-50 border-l-transparent hover:border-l-[#99b300]/50"
          )}
          onClick={() => setActiveModuleId(module.id)}
          onDragOver={(e) => { if (dragLessonIdRef.current) { e.preventDefault(); e.stopPropagation(); setDragLessonOnModuleId(module.id); } }}
          onDragLeave={(e) => { if (!e.currentTarget.contains(e.relatedTarget as Node)) setDragLessonOnModuleId(null); }}
          onDrop={(e) => {
            if (!dragLessonIdRef.current) return;
            e.preventDefault(); e.stopPropagation();
            setDragLessonOnModuleId(null);
            moveLessonToModule(dragLessonIdRef.current, module.id);
            dragLessonIdRef.current = null;
          }}
        >
          <div className="flex items-center gap-2 flex-1">
            <button onClick={(e) => { e.stopPropagation(); toggleModule(module.id); }} aria-expanded={!!expandedModules[module.id]} title={expandedModules[module.id] ? 'Recolher módulo' : 'Expandir módulo'} className="p-1 text-slate-400 hover:text-faktory-blue transition-transform">
              <ChevronDown size={14} style={{ transform: expandedModules[module.id] ? 'rotate(0deg)' : 'rotate(-90deg)', transition: 'transform .12s' }} />
            </button>
            <div className="w-1 h-4 bg-slate-200 rounded-full group-hover:bg-faktory-blue transition-all"></div>
            <div className="text-xs font-bold text-slate-400 mr-2">{mIndex + 1}.</div>
            <input
              className="text-xs font-bold text-slate-600 bg-transparent outline-none w-full"
              value={module.title}
              onClick={(e) => e.stopPropagation()}
              onMouseDown={(e) => e.stopPropagation()}
              onChange={(e) => updateModuleTitle(module.id, e.target.value)}
              onKeyDown={(e) => { if (e.key === 'Enter') { (e.target as HTMLInputElement).blur(); } }}
            />
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={(e) => { e.stopPropagation(); addLesson(module.id); }}
              title="Adicionar etapa"
              className="text-slate-400 hover:text-faktory-blue p-1 rounded"
            >
              <Plus size={14} />
            </button>
            {(module.submodules && module.submodules.length > 0) && (
              <button
                onClick={(e) => { e.stopPropagation(); promoteSubmodules(module.id); }}
                title="Soltar subm\u00f3dulos para o n\u00edvel superior"
                className="text-amber-400 hover:text-amber-600 p-1 rounded text-[10px] font-bold"
              >
                &#8593;&#8593;
              </button>
            )}
            <button
              onClick={(e) => { e.stopPropagation(); setModuleParentMenuOpenId(prev => prev === module.id ? null : module.id); }}
              title="Mover módulo para dentro de outro"
              className="text-slate-400 hover:text-faktory-blue p-1 rounded"
            >
              <Layers size={14} />
            </button>
            <button
              onClick={(e) => { e.stopPropagation(); moveModule(module.id, -1); }}
              title="Mover módulo para cima"
              className="text-slate-400 hover:text-faktory-blue p-1 rounded"
            >
              <ChevronUp size={14} />
            </button>
            <button
              onClick={(e) => { e.stopPropagation(); moveModule(module.id, 1); }}
              title="Mover módulo para baixo"
              className="text-slate-400 hover:text-faktory-blue p-1 rounded"
            >
              <ChevronDown size={14} />
            </button>
            <button
              onClick={(e) => { e.stopPropagation(); removeModule(module.id); }}
              title="Remover módulo"
              className="text-slate-400 hover:text-red-500 p-1 rounded"
            >
              <Trash2 size={14} />
            </button>
          </div>
        </div>

        {/* parent selection menu */}
        {moduleParentMenuOpenId === module.id && (
          <div className="pl-6">
            <div className="bg-white p-2 border rounded shadow-sm">
              <div className="text-xs text-slate-500 mb-2">Escolher módulo pai:</div>
              <div className="flex flex-col gap-1 max-h-40 overflow-auto">
                {trailData.modules.map((cand) => (
                  cand.id === module.id ? null : (
                    <button key={cand.id} onClick={() => { moveModuleInto(module.id, cand.id); setModuleParentMenuOpenId(null); }} className="text-left px-2 py-1 rounded hover:bg-slate-50">{cand.title}</button>
                  )
                ))}
              </div>
            </div>
          </div>
        )}

        {expandedModules[module.id] && (() => {
          // Recursive lesson renderer
          const renderLesson = (lesson: Lesson, path: number[], parentId?: string): React.ReactElement => {
            const lessonDepth = path.length - 1;
            const label = path.join('.');
            const isTarget = dragLessonTargetId === lesson.id;
            const isActive = activeLessonId === lesson.id;
            const hasChildren = !!(lesson.subetapas?.length);
            const isExpanded = hasChildren ? (expandedLessons[lesson.id] !== false) : false;
            return (
              <div key={lesson.id}>
                <div
                  style={{ paddingLeft: `${20 + (depth * 12) + lessonDepth * 16}px` }}
                  className={cn(
                    'flex items-center justify-between px-2 py-1.5 rounded-md cursor-pointer text-[11px] transition-all border-l-2 group',
                    isTarget
                      ? 'bg-blue-50 border-l-faktory-blue'
                      : isActive
                        ? 'bg-blue-50 border-l-faktory-blue text-faktory-blue font-bold'
                        : 'border-l-transparent text-slate-500 hover:bg-slate-50 hover:border-l-slate-300'
                  )}
                  draggable
                  onDragStart={(e) => { e.stopPropagation(); dragLessonIdRef.current = lesson.id; e.dataTransfer.effectAllowed = 'move'; }}
                  onDragEnd={() => { setDragLessonTargetId(null); }}
                  onDragOver={(e) => { e.preventDefault(); e.stopPropagation(); setDragLessonTargetId(lesson.id); }}
                  onDragLeave={(e) => { if (!e.currentTarget.contains(e.relatedTarget as Node)) setDragLessonTargetId(null); }}
                  onDrop={(e) => {
                    e.preventDefault(); e.stopPropagation();
                    setDragLessonTargetId(null);
                    const srcId = dragLessonIdRef.current;
                    if (srcId && srcId !== lesson.id) moveLessonInto(srcId, lesson.id);
                    dragLessonIdRef.current = null;
                  }}
                  onClick={() => { setActiveModuleId(module.id); setActiveLessonId(lesson.id); }}
                >
                  <div className="flex items-center gap-1.5 flex-1 min-w-0">
                    {/* Expand/collapse toggle — same visual pattern as modules */}
                    <button
                      onClick={(e) => { e.stopPropagation(); if (hasChildren) setExpandedLessons(prev => ({ ...prev, [lesson.id]: !isExpanded })); }}
                      className={cn('p-0.5 shrink-0 transition-colors', hasChildren ? 'text-slate-400 hover:text-faktory-blue' : 'text-transparent pointer-events-none')}
                      title={hasChildren ? (isExpanded ? 'Recolher' : 'Expandir') : undefined}
                    >
                      <ChevronDown size={12} style={{ transform: hasChildren && isExpanded ? 'rotate(0deg)' : 'rotate(-90deg)', transition: 'transform .12s' }} />
                    </button>
                    <span className="text-[10px] font-bold text-slate-400 shrink-0">{label}.</span>
                    {editingLessonId === lesson.id ? (
                      <div className="flex items-center gap-1 flex-1" onClick={(e) => e.stopPropagation()}>
                        <input
                          autoFocus
                          className="flex-1 text-xs px-1.5 py-0.5 border border-slate-200 rounded"
                          value={editingLessonTitle}
                          onChange={(e) => setEditingLessonTitle(e.target.value)}
                          onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); saveEditLesson(); } if (e.key === 'Escape') { e.preventDefault(); cancelEditLesson(); } }}
                          onBlur={() => saveEditLesson()}
                        />
                        <button onClick={(e) => { e.stopPropagation(); saveEditLesson(); }} className="px-1.5 py-0.5 bg-faktory-blue text-white rounded text-[10px]">OK</button>
                        <button onClick={(e) => { e.stopPropagation(); cancelEditLesson(); }} className="px-1.5 py-0.5 border rounded text-[10px]">✕</button>
                      </div>
                    ) : (
                      <span
                        className="flex-1 truncate"
                        onDoubleClick={(e) => { e.stopPropagation(); setActiveModuleId(module.id); startEditLesson(lesson.id, lesson.title, parentId); }}
                        title={lesson.title || '(Sem título)'}
                      >
                        {lesson.title || '(Sem título)'}
                      </span>
                    )}
                  </div>
                  {editingLessonId !== lesson.id && (
                    <div className="flex items-center gap-0.5 shrink-0">
                      <button onClick={(e) => { e.stopPropagation(); addLesson(module.id, lesson.id); }} title="Adicionar subetapa" className="text-slate-400 hover:text-faktory-blue p-0.5 rounded"><Plus size={12} /></button>
                      <button onClick={(e) => { e.stopPropagation(); startEditLesson(lesson.id, lesson.title, parentId); }} title="Renomear" className="text-slate-400 hover:text-faktory-blue p-0.5 rounded"><Pencil size={12} /></button>
                      <button onClick={(e) => { e.stopPropagation(); removeLesson(module.id, lesson.id, parentId); }} title="Remover" className="text-slate-300 hover:text-red-500 p-0.5 rounded"><Trash2 size={12} /></button>
                    </div>
                  )}
                </div>
                {/* drag-into hint */}
                {isTarget && (
                  <div style={{ paddingLeft: `${20 + (depth * 12) + lessonDepth * 16 + 14}px` }} className="py-0.5">
                    <div className="h-1 rounded bg-faktory-blue/40 animate-pulse" />
                  </div>
                )}
                {/* Subetapas recursively — only if expanded */}
                {hasChildren && isExpanded && (lesson.subetapas || []).map((sub, sIdx) => renderLesson(sub as any, [...path, sIdx + 1], lesson.id))}
              </div>
            );
          };

          return (
            <div className="space-y-0.5">
              {(module.etapas || []).map((lesson, lIdx) => renderLesson(lesson, [lIdx + 1]))}
              {/* render nested submodules, if any */}
              {(module.submodules || []).map((sm, idx) => renderModule(sm, depth + 1, idx))}
            </div>
          );
        })()}
      </div>
    );
  };


  const renderBlockList = () => {
    const content = activeLesson?.content || '';
    const blocks = parseBlocks(content).sort((a, b) => a.index - b.index);
    console.debug('[renderBlockList] content length=', content.length, 'blocks=', blocks.map((x: any) => ({ id: x.id, type: x.type, index: x.index })));
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
                  if (dragTitleRef.current && activeLesson) {
                    const titleHtml = getActiveLessonTitleHtml();
                    const block = genBlock(titleHtml, 'title');
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
                    updateLesson({ content: parts.join(''), title: '' } as any);
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
                  {(b.type === 'video' || b.type === 'embed' || b.type === 'title') ? (
                    <div className="w-full" dangerouslySetInnerHTML={{ __html: b.html }} />
                  ) : b.type === 'image' ? (
                    <div className="w-full flex items-center justify-center">
                      <div dangerouslySetInnerHTML={{ __html: b.html }} />
                    </div>
                  ) : (
                    <div className="text-xs text-slate-400 line-clamp-3" dangerouslySetInnerHTML={{ __html: b.html }} />
                  )}
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


  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <Loader2 className="animate-spin text-faktory-blue" size={40} />
      </div>
    );
  }

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
              className="text-sm font-bold text-slate-700 bg-transparent outline-none w-64"
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

          {hasLocalBackup && (
            <button
              onClick={restoreLocalBackup}
              className="px-3 py-1.5 text-[10px] font-bold text-white bg-amber-500 hover:bg-amber-600 border border-amber-500 rounded transition-all flex items-center gap-2 animate-pulse"
            >
              ⚠ Restaurar backup local
            </button>
          )}
          <button
            onClick={applyFaktoryOneTemplate}
            className="px-3 py-1.5 text-[10px] font-bold text-faktory-blue border border-faktory-blue rounded hover:bg-blue-50 transition-all flex items-center gap-2"
          >
            <Layers size={14} />
            Template Faktory One
          </button>
          <button
            onClick={flattenUntitledModules}
            className="px-3 py-1.5 text-[10px] font-bold text-slate-600 border border-slate-200 rounded hover:bg-slate-50 transition-all"
            title="Promover subetapas de módulos sem título para o nível superior"
          >
            Soltar subetapas
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
              Adicionar módulo
            </button>
          </div>

          <div className="flex-1 overflow-y-auto p-2 space-y-2">
            {trailData.modules.length === 0 ? (
              <div className="p-4 bg-yellow-50 border border-yellow-100 rounded text-sm text-slate-700">
                <div className="font-bold mb-2">Nenhuma etapa encontrada</div>
                <div className="text-[13px] mb-3">Use o botão "Adicionar módulo" acima para criar um novo módulo.</div>
              </div>
            ) : (
              trailData.modules.map((module, mIndex) => renderModule(module, 0, mIndex))
            )}
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
                      updateLesson({ content: (activeLesson.content || '') + '\n' + block, imageUrl: '' });
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
                      updateLesson({ content: (activeLesson.content || '') + '\n' + block });
                      setTrailData(prev => ({ ...prev, title: '' }));
                      showToast('Título da página movido para o conteúdo');
                    }
                    dragPageTitleRef.current = false;
                    setDragPreview({ type: 'none' });
                    return;
                  }
                  if (dragVideoRef.current) {
                    // move current lesson video into content as a block (append)
                    if (activeLesson && activeLesson.videoUrl) {
                      const embed = getEmbedUrl(activeLesson.videoUrl) || activeLesson.videoUrl;
                      const videoHtml = `<div class="embed"><iframe src="${embed}" width="100%" height="450" frameborder="0" allowfullscreen></iframe></div>`;
                      const block = genBlock(videoHtml, 'video');
                      updateLesson({ content: (activeLesson.content || '') + '\n' + block, videoUrl: '' });
                      showToast('Vídeo movido para o conteúdo');
                    } else {
                      setVideoPosition('title-top');
                      showToast('Vídeo movido acima do título');
                    }
                    dragVideoRef.current = false;
                  }
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
                <div className="flex items-center gap-2 w-full justify-center min-w-0" onMouseEnter={() => setTitleHovered(true)} onMouseLeave={() => setTitleHovered(false)}>
                  <div
                    draggable
                    onDragStart={(e) => { dragTitleRef.current = true; e.dataTransfer.effectAllowed = 'move'; }}
                    onDragEnd={() => { dragTitleRef.current = false; }}
                    className="cursor-grab text-slate-300 hover:text-slate-400 shrink-0"
                    title="Arrastar título para o conteúdo"
                  >
                    <GripVertical size={18} />
                  </div>

                  <div className={`flex flex-col flex-1 min-w-0 relative ${titleHovered || (showBlockEditor && editingBlockType === 'title') ? 'bg-white rounded border border-faktory-blue/30 shadow-sm p-3 ring-1 ring-faktory-blue/10' : ''}`}>
                    {(titleHovered || (showBlockEditor && editingBlockType === 'title')) && (
                      <div className="absolute -top-3 left-3">
                        <div className="inline-flex items-center gap-2 bg-faktory-blue text-white text-[11px] font-bold px-2 py-1 rounded">Título</div>
                      </div>
                    )}
                    {(titleHovered || (showBlockEditor && editingBlockType === 'title')) && (
                      <div className="flex items-center gap-2 justify-center mb-2">
                        <button type="button" className="px-2 py-1 rounded border" onMouseDown={(e) => { e.preventDefault(); document.execCommand('bold'); }} title="Negrito">B</button>
                        <button type="button" className="px-2 py-1 rounded border" onMouseDown={(e) => { e.preventDefault(); document.execCommand('italic'); }} title="Itálico">I</button>
                        <select className="px-2 py-1 rounded border" onChange={(e) => { e.preventDefault(); const val = e.target.value; const sel = window.getSelection(); if (!sel || sel.rangeCount === 0) return; const range = sel.getRangeAt(0); const frag = range.cloneContents(); const div = document.createElement('div'); div.appendChild(frag); const inner = div.innerHTML || sel.toString(); const span = `<span style="font-family:${val}">${inner}</span>`; range.deleteContents(); range.insertNode(document.createRange().createContextualFragment(span)); }} defaultValue="">Fonte</select>
                        <select className="px-2 py-1 rounded border" onChange={(e) => { e.preventDefault(); const val = e.target.value; const sel = window.getSelection(); if (!sel || sel.rangeCount === 0) return; const range = sel.getRangeAt(0); const frag = range.cloneContents(); const div = document.createElement('div'); div.appendChild(frag); const inner = div.innerHTML || sel.toString(); const span = `<span style="font-size:${val}px">${inner}</span>`; range.deleteContents(); range.insertNode(document.createRange().createContextualFragment(span)); }} defaultValue="">Tamanho</select>
                        <input type="color" className="w-8 h-8 p-0 border rounded" onChange={(e) => { e.preventDefault(); const val = e.target.value; const sel = window.getSelection(); if (!sel || sel.rangeCount === 0) return; const range = sel.getRangeAt(0); const frag = range.cloneContents(); const div = document.createElement('div'); div.appendChild(frag); const inner = div.innerHTML || sel.toString(); const span = `<span style="color:${val}">${inner}</span>`; range.deleteContents(); range.insertNode(document.createRange().createContextualFragment(span)); }} title="Cor da fonte" />
                        <div className="ml-2" />
                        <button type="button" className="px-2 py-1 rounded border" onMouseDown={(e) => { e.preventDefault(); document.execCommand('justifyLeft'); }} title="Alinhar esquerda">L</button>
                        <button type="button" className="px-2 py-1 rounded border" onMouseDown={(e) => { e.preventDefault(); document.execCommand('justifyCenter'); }} title="Centralizar">C</button>
                        <button type="button" className="px-2 py-1 rounded border" onMouseDown={(e) => { e.preventDefault(); document.execCommand('justifyRight'); }} title="Alinhar direita">R</button>
                        <button type="button" className="px-2 py-1 rounded border" onMouseDown={(e) => { e.preventDefault(); document.execCommand('justifyFull'); }} title="Justificar">J</button>
                      </div>
                    )}

                    <div
                      ref={titleInputRef as any}
                      contentEditable
                      suppressContentEditableWarning
                      className="text-3xl font-bold text-slate-700 text-center flex-1 min-w-0 w-full outline-none focus:border-b-2 border-faktory-blue pb-2 resize-none bg-transparent"
                      onInput={() => {
                        const el = titleInputRef.current as unknown as HTMLDivElement | null;
                        if (!el) return;
                        // auto-resize handled by flow; ensure no excessive height
                      }}
                      onBlur={() => {
                        const el = titleInputRef.current as unknown as HTMLDivElement | null;
                        if (!el) return;
                        const html = el.innerHTML;
                        const text = el.textContent || '';
                        updateLesson({ title: text, titleHtml: html } as any);
                      }}
                      onMouseDown={(e) => e.stopPropagation()}
                    />
                  </div>
                </div>
              ) : (
                <div className="text-slate-300 italic">Selecione ou crie uma etapa para começar</div>
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
                    updateLesson({ content: (activeLesson.content || '') + '\n' + block, imageUrl: '' });
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
                if (dragVideoRef.current) {
                  if (activeLesson && activeLesson.videoUrl) {
                    const embed = getEmbedUrl(activeLesson.videoUrl) || activeLesson.videoUrl;
                    const videoHtml = `<div class="embed"><iframe src="${embed}" width="100%" height="450" frameborder="0" allowfullscreen></iframe></div>`;
                    const block = genBlock(videoHtml, 'video');
                    updateLesson({ content: (activeLesson.content || '') + '\n' + block, videoUrl: '' });
                    showToast('Vídeo movido para o conteúdo');
                  } else {
                    setVideoPosition('top');
                    showToast('Vídeo movido acima do conteúdo');
                  }
                  dragVideoRef.current = false;
                }
                if (dragTitleRef.current && activeLesson) {
                  const titleHtml = getActiveLessonTitleHtml();
                  const block = genBlock(titleHtml, 'title');
                  updateLesson({ content: (activeLesson.content || '') + '\n' + block, title: '' } as any);
                  dragTitleRef.current = false;
                  showToast('Título movido para o conteúdo');
                }
                if (dragPageTitleRef.current) {
                  if (!activeLesson) {
                    showToast('Selecione uma aula para mover o título da página');
                  } else {
                    const block = genBlock(`<h2>${trailData.title}</h2>`, 'title');
                    updateLesson({ content: (activeLesson.content || '') + '\n' + block });
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

                  {/* Blocos da aula — área de conteúdo principal (agora usa ContentArea extraído) */}
                  <ContentArea 
                    activeLesson={activeLesson} 
                    updateLesson={updateLesson} 
                    showToast={showToast} 
                    blockEditor={blockEditor}
                  />

                  {/* Quiz Section */}
                  {activeLesson.quiz ? (
                    <div className="mt-10 pt-10 border-t border-slate-100">
                      {/* === Bloco CTA — "Fazer questionário" === */}
                      <div
                        className={`group relative rounded-lg border transition-all bg-white mb-6 ${hoveredBlockId === '__quiz_cta__' ? 'border-faktory-blue/50 shadow-sm' : 'border-slate-200'}`}
                        onMouseEnter={() => setHoveredBlockId('__quiz_cta__')}
                        onMouseLeave={() => setHoveredBlockId(null)}
                      >
                        {hoveredBlockId === '__quiz_cta__' && (
                          <div className="absolute top-0 left-0 right-0 z-30 flex items-center justify-between px-2 py-1 bg-white/95 backdrop-blur-sm border-b border-faktory-blue/20 shadow-sm rounded-t-lg">
                            <div className="flex items-center gap-1 bg-faktory-blue text-white text-[10px] font-bold px-2 py-0.5 rounded select-none">
                              <HelpCircle size={11} />
                              Botão — Fazer Questionário
                            </div>
                            <div className="flex items-center gap-0.5">
                              <button
                                onClick={() => updateLesson({ quiz: undefined })}
                                className="p-1.5 rounded hover:bg-red-50 text-slate-400 hover:text-red-600 transition-colors"
                                title="Remover questionário"
                              ><Trash2 size={13} /></button>
                            </div>
                          </div>
                        )}
                        <div className={`p-6 flex flex-col items-center gap-3 ${hoveredBlockId === '__quiz_cta__' ? 'pt-10' : ''}`}>
                          <p className="text-sm text-slate-500 text-center">O questionário de fixação será exibido ao aluno após clicar no botão abaixo:</p>
                          <button className="px-6 py-2.5 bg-faktory-blue text-white rounded-lg font-bold text-sm pointer-events-none select-none shadow">
                            Fazer questionário
                          </button>
                        </div>
                      </div>

                      {/* === Bloco de edição do quiz === */}
                      <div
                        className={`group relative rounded-lg border transition-all bg-white ${hoveredBlockId === '__quiz__' ? 'border-faktory-blue/50 shadow-sm' : 'border-slate-200'}`}
                        onMouseEnter={() => setHoveredBlockId('__quiz__')}
                        onMouseLeave={() => setHoveredBlockId(null)}
                      >
                        {hoveredBlockId === '__quiz__' && (
                          <div className="absolute top-0 left-0 right-0 z-30 flex items-center justify-between px-2 py-1 bg-white/95 backdrop-blur-sm border-b border-faktory-blue/20 shadow-sm rounded-t-lg">
                            <div className="flex items-center gap-1 bg-faktory-blue text-white text-[10px] font-bold px-2 py-0.5 rounded select-none">
                              <HelpCircle size={11} />
                              Questionário de Fixação
                            </div>
                            <div className="flex items-center gap-0.5">
                              <button
                                onClick={() => {
                                  const opts = [...(activeLesson.quiz?.options || []), ''];
                                  updateLesson({ quiz: { ...activeLesson.quiz!, options: opts } });
                                }}
                                className="p-1.5 rounded hover:bg-slate-100 text-slate-500 hover:text-faktory-blue transition-colors"
                                title="Adicionar opção"
                              ><Plus size={13} /></button>
                              <button
                                onClick={() => updateLesson({ quiz: undefined })}
                                className="p-1.5 rounded hover:bg-red-50 text-slate-400 hover:text-red-600 transition-colors"
                                title="Remover questionário"
                              ><Trash2 size={13} /></button>
                            </div>
                          </div>
                        )}
                        <div className={`p-6 space-y-4 ${hoveredBlockId === '__quiz__' ? 'pt-10' : ''}`}>
                          <input
                            className="w-full p-3 bg-white border border-slate-200 rounded-md font-bold text-slate-600 outline-none focus:border-faktory-blue"
                            placeholder="Digite a pergunta do questionário..."
                            value={activeLesson.quiz?.question}
                            onChange={(e) => updateLesson({ quiz: { ...activeLesson.quiz!, question: e.target.value } })}
                          />
                          <div className="space-y-2">
                            {activeLesson.quiz?.options.map((option, idx) => (
                              <div key={idx} className="flex items-center gap-2 bg-slate-50 p-3 rounded-md border border-slate-100 group/opt">
                                <input
                                  type="radio"
                                  checked={activeLesson.quiz?.correctIndex === idx}
                                  onChange={() => updateLesson({ quiz: { ...activeLesson.quiz!, correctIndex: idx } })}
                                  title="Marcar como resposta correta"
                                />
                                <input
                                  className="bg-transparent text-sm w-full outline-none"
                                  value={option}
                                  onChange={(e) => {
                                    const newOptions = [...activeLesson.quiz!.options];
                                    newOptions[idx] = e.target.value;
                                    updateLesson({ quiz: { ...activeLesson.quiz!, options: newOptions } });
                                  }}
                                  placeholder={`Opção ${idx + 1}`}
                                />
                                {(activeLesson.quiz?.options.length ?? 0) > 2 && (
                                  <button
                                    onClick={() => {
                                      const newOptions = activeLesson.quiz!.options.filter((_, i) => i !== idx);
                                      const correctIndex = activeLesson.quiz!.correctIndex >= newOptions.length ? 0 : activeLesson.quiz!.correctIndex;
                                      updateLesson({ quiz: { ...activeLesson.quiz!, options: newOptions, correctIndex } });
                                    }}
                                    className="opacity-0 group-hover/opt:opacity-100 p-1 text-slate-300 hover:text-red-500 transition-all"
                                    title="Remover opção"
                                  ><Trash2 size={12} /></button>
                                )}
                              </div>
                            ))}
                          </div>
                          <p className="text-[10px] text-slate-400">Selecione o rádio ao lado da opção correta. Passe o mouse sobre uma opção para removê-la.</p>
                        </div>
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
                    imageInputRef.current?.click();
                    return;
                  }

                  if (label.includes('Título')) {
                    const titleHtml = getActiveLessonTitleHtml() || '<h2>Título de seção</h2>';
                    addBlock('text', { html: titleHtml });
                    showToast('Título inserido');
                    return;
                  }

                  if (label.includes('Texto') || label.includes('HTML')) {
                    addBlock('text', { html: '<p>Novo parágrafo...</p>' });
                    showToast('Texto inserido');
                    return;
                  }

                  if (label.includes('destaque')) {
                    addBlock('text', { html: '<div style="background: #f0f9ff; border-left: 4px solid #0ea5e9; padding: 1rem; margin-bottom: 1rem;"><strong>Texto em destaque</strong></div>' });
                    showToast('Texto em destaque inserido');
                    return;
                  }

                  if (label.includes('painéis')) {
                    addBlock('text', { html: '<div style="display: grid; grid-template-columns: 1fr 1fr; gap: 1rem;"><div style="padding: 1rem; border: 1px solid #e2e8f0; border-radius: 0.5rem;">Painel 1</div><div style="padding: 1rem; border: 1px solid #e2e8f0; border-radius: 0.5rem;">Painel 2</div></div>' });
                    showToast('Grupo de painéis inserido');
                    return;
                  }

                  if (label.includes('embed')) {
                    addBlock('iframe', { url: '' });
                    showToast('Embed inserido');
                    return;
                  }

                  if (label.includes('Questionário')) {
                    addBlock('quiz', { questionnaireId: '' });
                    showToast('Questionário inserido');
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

              <div className="p-4 bg-slate-50 border-t border-slate-100 flex items-center justify-between gap-3">
                <button
                  type="button"
                  onClick={() => { updateLesson({ videoUrl: '' }); setShowVideoModal(false); }}
                  className="flex items-center gap-2 px-4 py-2 bg-red-600 text-white rounded-lg font-bold text-sm hover:bg-red-700 transition-all"
                >
                  <Trash2 size={14} />
                  Remover Vídeo
                </button>
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => insertVideoAsBlock()}
                    className="px-4 py-2 bg-white border border-slate-200 rounded-lg font-medium text-sm hover:bg-slate-50 transition-all"
                  >
                    Inserir como bloco
                  </button>
                  <button
                    onClick={() => setShowVideoModal(false)}
                    className="px-4 py-2 bg-white border border-slate-200 rounded-lg font-medium text-sm hover:bg-slate-50 transition-all"
                  >
                    Cancelar
                  </button>
                  <button
                    onClick={() => setShowVideoModal(false)}
                    className="px-6 py-2 bg-faktory-blue text-white rounded-lg font-bold text-sm hover:bg-[#2c6a9a] transition-all"
                  >
                    Confirmar
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
                        {(m.etapas || []).map(l => <li key={l.id}>{l.title}</li>)}
                      </ul>
                      {(m.submodules || []).map(sm => (
                        <div key={sm.id} className="mt-3 ml-4 p-3 border rounded bg-slate-50">
                          <h5 className="font-semibold">{sm.title}</h5>
                          <ul className="list-disc pl-6 mt-2">
                            {(sm.etapas || []).map(l => <li key={l.id}>{l.title}</li>)}
                          </ul>
                        </div>
                      ))}
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
        {showBlockEditor && editingBlockId && (
          <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-[120] p-4">
            <motion.div
              initial={{ opacity: 0, scale: 0.98, y: 10 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.98, y: 10 }}
              className="bg-white rounded-xl shadow-2xl w-full max-w-5xl flex flex-col overflow-hidden"
              style={{ height: '88vh' }}
            >
              {/* Header */}
              <div className="px-5 py-3 border-b border-slate-100 flex items-center justify-between shrink-0">
                <h3 className="text-base font-bold text-slate-800">Editar Bloco</h3>
                <button onClick={cancelEditBlock} className="p-2 text-slate-400 hover:text-slate-600 rounded-full hover:bg-slate-100"><Minus size={18} /></button>
              </div>

              {/* Body */}
              <div className="flex-1 overflow-y-auto p-5 flex flex-col gap-4">

                {/* ── Título ── */}
                {editingBlockType === 'title' && (
                  <>
                    <div className="text-xs text-slate-500 font-semibold uppercase tracking-wide">Texto do título</div>
                    <div className="border border-slate-200 rounded-lg overflow-hidden">
                      <div className="flex items-center gap-1 px-2 py-1.5 bg-slate-50 border-b border-slate-200" onMouseDown={(e) => { if ((e.target as HTMLElement).tagName === 'BUTTON') e.preventDefault(); }}>
                        <button type="button" title="Negrito" onMouseDown={(e) => e.preventDefault()} onClick={() => execCommand('bold')} className="h-7 w-7 flex items-center justify-center border border-slate-200 rounded bg-white font-bold">B</button>
                        <button type="button" title="Itálico" onMouseDown={(e) => e.preventDefault()} onClick={() => execCommand('italic')} className="h-7 w-7 flex items-center justify-center border border-slate-200 rounded bg-white italic">I</button>
                        <select className="h-7 text-xs border border-slate-200 rounded px-1 bg-white" defaultValue="inherit"
                          onMouseDown={(e) => e.stopPropagation()}
                          onChange={(e) => { restoreSelection(); execCommand('fontName', e.target.value); }}>
                          <option value="inherit">Fonte</option>
                          <option value="Arial">Arial</option>
                          <option value="Georgia">Georgia</option>
                          <option value="Times New Roman">Times New Roman</option>
                        </select>
                        <select className="h-7 text-xs border border-slate-200 rounded px-1 bg-white" defaultValue="3"
                          onMouseDown={(e) => e.stopPropagation()}
                          onChange={(e) => { restoreSelection(); execCommand('fontSize', e.target.value); }}>
                          <option value="1">10px</option>
                          <option value="2">12px</option>
                          <option value="3">14px</option>
                          <option value="4">18px</option>
                          <option value="5">24px</option>
                          <option value="6">32px</option>
                          <option value="7">48px</option>
                        </select>
                        <input type="color" className="w-8 h-8 p-0 border rounded cursor-pointer" title="Cor da fonte"
                          onMouseDown={(e) => { saveSelection(); e.stopPropagation(); }}
                          onChange={(e) => { restoreSelection(); execCommand('foreColor', e.target.value); }} />
                        <div className="w-px h-5 bg-slate-200 mx-1" />
                        <button type="button" title="Alinhar esquerda" onMouseDown={(e) => e.preventDefault()} onClick={() => execCommand('justifyLeft')} className="h-7 w-7 flex items-center justify-center border border-slate-200 rounded bg-white">L</button>
                        <button type="button" title="Centralizar" onMouseDown={(e) => e.preventDefault()} onClick={() => execCommand('justifyCenter')} className="h-7 w-7 flex items-center justify-center border border-slate-200 rounded bg-white">C</button>
                        <button type="button" title="Alinhar direita" onMouseDown={(e) => e.preventDefault()} onClick={() => execCommand('justifyRight')} className="h-7 w-7 flex items-center justify-center border border-slate-200 rounded bg-white">R</button>
                        <div className="ml-auto" />
                      </div>
                      <div
                        ref={wysiwygRef}
                        contentEditable
                        suppressContentEditableWarning
                        onMouseUp={() => saveSelection()}
                        onKeyUp={() => saveSelection()}
                        onInput={(e) => { handleWysiwygInput((e.currentTarget as HTMLDivElement).innerHTML); saveSelection(); }}
                        className="w-full p-4 text-slate-700 outline-none bg-white rich-text-editor"
                        style={{ minHeight: 120 }}
                        dir="ltr"
                      />
                    </div>
                  </>
                )}

                {/* ── Vídeo / Embed ── */}
                {(editingBlockType === 'video' || editingBlockType === 'embed') && (
                  <>
                    <div className="text-xs text-slate-500 font-semibold uppercase tracking-wide">URL do vídeo</div>
                    <input
                      autoFocus
                      value={editingBlockHtml}
                      onChange={(e) => handleEditorValueChange(e.target.value)}
                      className="w-full p-3 border border-slate-200 rounded-lg text-sm outline-none focus:ring-2 focus:ring-faktory-blue/30"
                      placeholder="https://www.youtube.com/watch?v=..."
                      dir="ltr"
                    />
                    <p className="text-[10px] text-slate-400 italic">Cole o link do YouTube, Vimeo ou URL de embed direta.</p>
                    {editingBlockHtml && (
                      <div className="rounded-lg overflow-hidden border border-slate-100 flex-1">
                        <iframe
                          src={getEmbedUrl(editingBlockHtml) || editingBlockHtml}
                          width="100%"
                          height="100%"
                          style={{ minHeight: 360 }}
                          frameBorder="0"
                          allowFullScreen
                          title="Preview do vídeo"
                        />
                      </div>
                    )}
                  </>
                )}

                {/* ── Image Edit ── */}
                {editingBlockType === 'image' && (
                  <div className="flex-1 overflow-auto space-y-6">
                    <div>
                      <div className="text-xs text-slate-500 font-semibold uppercase tracking-wide mb-2">URL da Imagem</div>
                      <input
                        autoFocus
                        value={editingBlockPayload?.url || ''}
                        onChange={(e) => setEditingBlockPayload(prev => ({ ...prev, url: e.target.value }))}
                        className="w-full p-3 border border-slate-200 rounded-lg text-sm outline-none focus:ring-2 focus:ring-faktory-blue/30"
                        placeholder="https://exemplo.com/imagem.jpg"
                      />
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <div className="text-xs text-slate-500 font-semibold uppercase tracking-wide mb-2">Largura (ex: 100%, 500px)</div>
                        <input
                          value={editingBlockPayload?.width || ''}
                          onChange={(e) => setEditingBlockPayload(prev => ({ ...prev, width: e.target.value }))}
                          className="w-full p-3 border border-slate-200 rounded-lg text-sm outline-none focus:ring-2 focus:ring-faktory-blue/30"
                          placeholder="Ex: 500px ou 100%"
                        />
                      </div>
                      <div>
                        <div className="text-xs text-slate-500 font-semibold uppercase tracking-wide mb-2">Alinhamento</div>
                        <select
                          value={editingBlockPayload?.align || 'center'}
                          onChange={(e) => setEditingBlockPayload(prev => ({ ...prev, align: e.target.value }))}
                          className="w-full p-3 border border-slate-200 rounded-lg text-sm outline-none focus:ring-2 focus:ring-faktory-blue/30"
                        >
                          <option value="left">Esquerda</option>
                          <option value="center">Centro</option>
                          <option value="right">Direita</option>
                        </select>
                      </div>
                    </div>
                    {editingBlockPayload?.url && (
                      <div className="mt-4 p-4 border border-slate-200 rounded-lg bg-slate-50 flex items-center justify-center">
                        <img src={editingBlockPayload.url} alt="Preview" style={{ maxWidth: '100%', maxHeight: '300px' }} />
                      </div>
                    )}
                  </div>
                )}

                {/* ── WYSIWYG / Custom ── */}
                {editingBlockType !== 'title' && editingBlockType !== 'video' && editingBlockType !== 'embed' && editingBlockType !== 'image' && (
                  <>
                    {/* Toolbar */}
                    <div className="border border-slate-200 rounded-lg overflow-hidden shrink-0">
                      {/* Linha 1: fonte, tamanho, cor, formatação básica */}
                      <div className="flex flex-wrap items-center gap-1 px-2 py-1.5 bg-slate-50 border-b border-slate-200" onMouseDown={(e) => { if ((e.target as HTMLElement).tagName !== 'SELECT' && (e.target as HTMLElement).tagName !== 'INPUT') e.preventDefault(); }}>
                        {/* Tipo de fonte */}
                        <select
                          className="h-7 text-xs border border-slate-200 rounded px-1 bg-white"
                          defaultValue="inherit"
                          onChange={(e) => { execCommand('fontName', e.target.value); }}
                        >
                          <option value="inherit">Fonte padrão</option>
                          <option value="Arial">Arial</option>
                          <option value="Georgia">Georgia</option>
                          <option value="Times New Roman">Times New Roman</option>
                          <option value="Courier New">Courier New</option>
                          <option value="Verdana">Verdana</option>
                          <option value="Trebuchet MS">Trebuchet MS</option>
                        </select>

                        {/* Tamanho */}
                        <select
                          className="h-7 text-xs border border-slate-200 rounded px-1 bg-white"
                          defaultValue="3"
                          onChange={(e) => { execCommand('fontSize', e.target.value); }}
                        >
                          <option value="1">8px</option>
                          <option value="2">10px</option>
                          <option value="3">12px</option>
                          <option value="4">14px</option>
                          <option value="5">18px</option>
                          <option value="6">24px</option>
                          <option value="7">36px</option>
                        </select>

                        <div className="w-px h-5 bg-slate-200 mx-0.5" />

                        {/* Cor da fonte */}
                        <label className="flex items-center gap-1 text-xs text-slate-600 cursor-pointer h-7 px-1.5 border border-slate-200 rounded bg-white hover:bg-slate-50">
                          <span className="font-bold text-sm" style={{ textShadow: '0 1px 0 rgba(0,0,0,.1)' }}>A</span>
                          <span className="text-[10px]">Cor</span>
                          <input
                            type="color"
                            className="w-0 h-0 opacity-0 absolute"
                            onChange={(e) => { execCommand('foreColor', e.target.value); }}
                          />
                        </label>

                        {/* Cor de fundo */}
                        <label className="flex items-center gap-1 text-xs text-slate-600 cursor-pointer h-7 px-1.5 border border-slate-200 rounded bg-white hover:bg-slate-50">
                          <span className="text-sm">🖊</span>
                          <span className="text-[10px]">Destaque</span>
                          <input
                            type="color"
                            className="w-0 h-0 opacity-0 absolute"
                            onChange={(e) => { execCommand('hiliteColor', e.target.value); }}
                          />
                        </label>

                        <div className="w-px h-5 bg-slate-200 mx-0.5" />

                        {/* Negrito */}
                        <button type="button" title="Negrito (Ctrl+B)" onMouseDown={(e) => e.preventDefault()} onClick={() => { execCommand('bold'); }}
                          className="h-7 w-7 flex items-center justify-center border border-slate-200 rounded bg-white hover:bg-faktory-blue/10 font-bold text-sm">B</button>
                        {/* Itálico */}
                        <button type="button" title="Itálico (Ctrl+I)" onMouseDown={(e) => e.preventDefault()} onClick={() => { execCommand('italic'); }}
                          className="h-7 w-7 flex items-center justify-center border border-slate-200 rounded bg-white hover:bg-faktory-blue/10 italic text-sm">I</button>
                        {/* Sublinhado */}
                        <button type="button" title="Sublinhado (Ctrl+U)" onMouseDown={(e) => e.preventDefault()} onClick={() => { execCommand('underline'); }}
                          className="h-7 w-7 flex items-center justify-center border border-slate-200 rounded bg-white hover:bg-faktory-blue/10 underline text-sm">U</button>
                        {/* Tachado */}
                        <button type="button" title="Tachado" onMouseDown={(e) => e.preventDefault()} onClick={() => { execCommand('strikethrough'); }}
                          className="h-7 w-7 flex items-center justify-center border border-slate-200 rounded bg-white hover:bg-faktory-blue/10 line-through text-sm">S</button>

                        <div className="w-px h-5 bg-slate-200 mx-0.5" />

                        {/* Alinhamentos */}
                        <button type="button" title="Alinhar à esquerda" onMouseDown={(e) => e.preventDefault()} onClick={() => { execCommand('justifyLeft'); }}
                          className="h-7 w-7 flex items-center justify-center border border-slate-200 rounded bg-white hover:bg-faktory-blue/10 text-sm">⬱</button>
                        <button type="button" title="Centralizar" onMouseDown={(e) => e.preventDefault()} onClick={() => { execCommand('justifyCenter'); }}
                          className="h-7 w-7 flex items-center justify-center border border-slate-200 rounded bg-white hover:bg-faktory-blue/10 text-sm">≡</button>
                        <button type="button" title="Alinhar à direita" onMouseDown={(e) => e.preventDefault()} onClick={() => { execCommand('justifyRight'); }}
                          className="h-7 w-7 flex items-center justify-center border border-slate-200 rounded bg-white hover:bg-faktory-blue/10 text-sm">⬰</button>
                        <button type="button" title="Justificado" onMouseDown={(e) => e.preventDefault()} onClick={() => { execCommand('justifyFull'); }}
                          className="h-7 px-1.5 flex items-center justify-center border border-slate-200 rounded bg-white hover:bg-faktory-blue/10 text-[10px]">Justif.</button>

                        <div className="w-px h-5 bg-slate-200 mx-0.5" />

                        {/* Listas */}
                        <button
                          type="button"
                          title="Lista com marcadores"
                          onMouseDown={(e) => {
                            e.preventDefault();
                            execCommand('insertUnorderedList');
                          }}
                          className="h-7 px-1.5 flex items-center justify-center border border-slate-200 rounded bg-white hover:bg-faktory-blue/10 text-xs gap-1">• Lista</button>
                        <button
                          type="button"
                          title="Lista numerada"
                          onMouseDown={(e) => {
                            e.preventDefault();
                            execCommand('insertOrderedList');
                          }}
                          className="h-7 px-1.5 flex items-center justify-center border border-slate-200 rounded bg-white hover:bg-faktory-blue/10 text-xs gap-1">1. Lista</button>

                        <div className="w-px h-5 bg-slate-200 mx-0.5" />

                        {/* Recuo */}
                        <button type="button" title="Aumentar recuo" onMouseDown={(e) => e.preventDefault()} onClick={() => { execCommand('indent'); }}
                          className="h-7 w-7 flex items-center justify-center border border-slate-200 rounded bg-white hover:bg-faktory-blue/10 text-sm">→</button>
                        <button type="button" title="Diminuir recuo" onMouseDown={(e) => e.preventDefault()} onClick={() => { execCommand('outdent'); }}
                          className="h-7 w-7 flex items-center justify-center border border-slate-200 rounded bg-white hover:bg-faktory-blue/10 text-sm">←</button>

                        <div className="w-px h-5 bg-slate-200 mx-0.5" />

                        {/* Link */}
                        <button type="button" title="Inserir link" onMouseDown={(e) => e.preventDefault()} onClick={() => { const url = window.prompt('URL do link:'); if (url) { execCommand('createLink', url); } }}
                          className="h-7 px-1.5 flex items-center justify-center border border-slate-200 rounded bg-white hover:bg-faktory-blue/10 text-xs">🔗 Link</button>
                        <button type="button" title="Remover link" onMouseDown={(e) => e.preventDefault()} onClick={() => { execCommand('unlink'); }}
                          className="h-7 px-1.5 flex items-center justify-center border border-slate-200 rounded bg-white hover:bg-faktory-blue/10 text-xs">✂ Link</button>

                        <div className="w-px h-5 bg-slate-200 mx-0.5" />

                        {/* Desfazer / Refazer */}
                        <button
                          type="button"
                          title="Desfazer (Ctrl+Z)"
                          onMouseDown={(e) => e.preventDefault()}
                          onClick={handleUndo}
                          disabled={!canUndo()}
                          className="h-7 w-7 flex items-center justify-center border border-slate-200 rounded bg-white hover:bg-faktory-blue/10 text-slate-600 disabled:opacity-40 disabled:cursor-not-allowed"
                        >
                          <Undo2 size={14} />
                        </button>
                        <button
                          type="button"
                          title="Refazer (Ctrl+Y / Ctrl+Shift+Z)"
                          onMouseDown={(e) => e.preventDefault()}
                          onClick={handleRedo}
                          disabled={!canRedo()}
                          className="h-7 w-7 flex items-center justify-center border border-slate-200 rounded bg-white hover:bg-faktory-blue/10 text-slate-600 disabled:opacity-40 disabled:cursor-not-allowed"
                        >
                          <Redo2 size={14} />
                        </button>

                        {/* Limpar formatação */}
                        <button type="button" title="Limpar formatação" onMouseDown={(e) => e.preventDefault()} onClick={() => { execCommand('removeFormat'); }}
                          className="h-7 px-1.5 flex items-center justify-center border border-slate-200 rounded bg-white hover:bg-red-50 text-red-400 text-xs ml-1">✕ Form.</button>

                        {/* Toggle fonte */}
                        <button type="button" onClick={() => {
                          // Sync WYSIWYG content to state before switching to source view
                          if (useWysiwygMode && wysiwygRef.current) {
                            setEditingBlockHtml(wysiwygRef.current.innerHTML);
                          }
                          setUseWysiwygMode(prev => !prev);
                        }}
                          className="h-7 px-1.5 flex items-center justify-center border border-slate-200 rounded bg-white hover:bg-slate-100 text-xs text-slate-500 ml-auto">
                          {useWysiwygMode ? '</> Fonte' : '📝 Visual'}
                        </button>
                      </div>

                      {/* Área editável */}
                      {useWysiwygMode ? (
                        <div
                          ref={wysiwygRef}
                          contentEditable
                          suppressContentEditableWarning
                          onMouseUp={() => saveSelection()}
                          onKeyUp={() => saveSelection()}
                          onInput={(e) => {
                            handleWysiwygInput((e.currentTarget as HTMLDivElement).innerHTML);
                            saveSelection();
                          }}
                          className="w-full p-5 text-sm outline-none bg-white rich-text-editor"
                          style={{ minHeight: 380, lineHeight: 1.7 }}
                          dir="ltr"
                        />
                      ) : (
                        <textarea
                          value={editingBlockHtml}
                          onChange={(e) => handleEditorValueChange(e.target.value)}
                          className="w-full p-4 font-mono text-sm outline-none bg-white resize-none"
                          style={{ minHeight: 380 }}
                          dir="ltr"
                          spellCheck={false}
                        />
                      )}
                    </div>
                  </>
                )}
              </div>

              <div className="px-5 py-3 bg-slate-50 border-t border-slate-100 flex justify-end gap-2 shrink-0">
                <button onClick={cancelEditBlock} className="px-4 py-2 bg-white border border-slate-200 rounded hover:bg-slate-50">Cancelar</button>
                <button onClick={saveEditedBlock} className="px-4 py-2 bg-faktory-blue text-white rounded font-bold hover:bg-faktory-blue/90">Salvar</button>
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
