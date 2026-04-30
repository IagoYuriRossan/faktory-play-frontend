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
import { api } from '../../utils/api';
import { createProjectQuestionnaire } from '../../services/questionnaireService';
import { useWysiwygEditor } from './TrilhaBuilder/hooks/useWysiwygEditor';
import { useTrailData } from './TrilhaBuilder/hooks/useTrailData';
import { useModuleTree } from './TrilhaBuilder/hooks/useModuleTree';
import { useEtapaTree } from './TrilhaBuilder/hooks/useEtapaTree';
import { useBlockEditor } from './TrilhaBuilder/hooks/useBlockEditor';
import { PreviewModal } from './TrilhaBuilder/components/PreviewModal';
import { VideoSettingsModal } from './TrilhaBuilder/components/VideoSettingsModal';
import { BlockEditorModal } from './TrilhaBuilder/components/BlockEditorModal';
import { trilhaBuilderApi } from './TrilhaBuilder/services/trilhaBuilderApi';
import { ContentArea } from './TrilhaBuilder/components/ContentArea';
import { createLogoContent, genBlock, genId, getEmbedUrl, parseBlocks } from './TrilhaBuilder/utils/contentBlocks';

export default function TrilhaBuilder() {
  // -- UI-only state (not extracted to hooks) --
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
  const [pendingFiles, setPendingFiles] = useState<Record<string, { file: File; moduleId: string; etapaId: string }>>({});
  const isMainImageUploadRef = useRef(false);

  // -- Extracted hooks --
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

  // -- Block editor hook --
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

  // Create questionnaire on server and insert a quiz block linked to it
  const createAndAddQuizBlock = async () => {
    const al = getActiveLesson();
    if (!al) { 
      showToast('Selecione uma aula antes de adicionar o Questionário'); 
      return; 
    }
    
    try {
      setSaving(true);
      const payload = {
        title: `${trailData.title || 'Trilha'} - ${al.title || 'Questionário'}`,
        description: 'Questionário criado pelo editor',
        trailId: (id && id !== 'nova') ? id : (trailId || undefined),
        moduleId: activeModuleId,
        lessonId: al.id,
        questions: [
          {
            type: 'open',
            text: 'Pergunta de exemplo (edite)',
            points: 1,
          },
        ] as any[]
      };

      const projectId = (id && id !== 'nova') ? id : (trailId || undefined);
      
      if (!projectId) {
        const fallbackId = `local-${Date.now()}`;
        addBlock('quiz', { questionnaireId: fallbackId });
        showToast('Projeto não identificado. Bloco local criado.');
        return;
      }

      const res = await createProjectQuestionnaire(projectId, payload);
      const qid = res?.id || res?.questionnaireId || `q-${Date.now()}`;

      addBlock('quiz', { questionnaireId: qid });
      showToast('Questionário vinculado com sucesso!');
    } catch (err) {
      console.error('Erro criando questionnaire:', err);
      const fallbackId = `local-${Date.now()}`;
      addBlock('quiz', { questionnaireId: fallbackId });
      showToast('Erro na API - Bloco local criado para edição');
    } finally {
      setSaving(false);
    }
  };

  

  // -- Actions menu close handler --
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

  // -- Drag and drop refs --
  const dragBlockIdRef = useRef<string | null>(null);
  const dragModuleIdRef = useRef<string | null>(null);
  const dragLessonIdRef = useRef<string | null>(null);
  const dragVideoRef = useRef<boolean>(false);
  const dragTitleRef = useRef<boolean>(false);
  const dragPageTitleRef = useRef<boolean>(false);
  const dragImageRef = useRef<string | null>(null);

  // -- Remaining refs --
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

  // -- Lesson edit helpers (depend on UI state) --
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

  const handleManualSave = async () => {
    if (saving) return;
    
    let currentData = { ...trailData };
    const filesToUpload = Object.entries(pendingFiles);
    
    if (filesToUpload.length > 0) {
      setSaving(true);
      setImageUploading(true);
      showToast(`Enviando ${filesToUpload.length} imagens...`);
      
      try {
        for (const [blockId, info] of filesToUpload) {
          const { imageUrl, publicId } = await trilhaBuilderApi.uploadEtapaImage(
            trailId,
            info.moduleId,
            info.etapaId,
            info.file,
            (pct) => setUploadProgress(pct)
          );
          
          if (blockId === 'MAIN_IMAGE') {
            currentData = updateMainImageUrl(currentData, info.etapaId, imageUrl, publicId);
          } else {
            currentData = replaceUrlInContent(currentData, blockId, imageUrl, publicId);
          }
        }
        setPendingFiles({});
        setTrailData(currentData);
        setImageUploading(false);
      } catch (err) {
        console.error('Upload failed during save:', err);
        showToast('Erro no upload das imagens. Tente salvar novamente.');
        setSaving(false);
        setImageUploading(false);
        return;
      }
    }
    
    await handleSave(currentData);
  };

  const replaceUrlInContent = (data: typeof trailData, blockId: string, newUrl: string, publicId?: string) => {
    const updateEtapas = (etapas: Lesson[]): Lesson[] => etapas.map(e => {
      let newLesson = { ...e };
      if (e.content) {
        const blocks = parseBlocks(e.content);
        const b = blocks.find(x => x.id === blockId);
        if (b) {
          let newHtml = b.html.replace(/src=\"[^\"]*\"/, `src="${newUrl}"`);
          if (publicId) {
            if (newHtml.includes('data-public-id=')) {
              newHtml = newHtml.replace(/data-public-id=\"[^\"]*\"/, `data-public-id="${publicId}"`);
            } else {
              newHtml = newHtml.replace('<img ', `<img data-public-id="${publicId}" `);
            }
          }
          const newBlockMarkup = `<!-- block:${b.type}:${b.id} -->\n${newHtml}\n<!-- /block:${b.type}:${b.id} -->`;
          newLesson.content = e.content.slice(0, b.index) + newBlockMarkup + e.content.slice(b.index + b.length);
        }
      }
      if (e.components) {
        newLesson.components = e.components.map(c => {
          if (c.id === blockId) {
            return { ...c, payload: { ...c.payload, url: newUrl, publicId } };
          }
          return c;
        });
      }
      if (e.subetapas) {
        newLesson.subetapas = updateEtapas(e.subetapas as any);
      }
      return newLesson;
    });

    const updateModule = (m: Module): Module => ({
      ...m,
      etapas: m.etapas ? (updateEtapas(m.etapas as any) as any) : undefined,
      submodules: m.submodules ? m.submodules.map(updateModule) : undefined
    });

    return {
      ...data,
      modules: data.modules.map(updateModule)
    };
  };

  const updateMainImageUrl = (data: typeof trailData, etapaId: string, newUrl: string, publicId: string) => {
    const updateInTree = (etapas: Lesson[]): Lesson[] => etapas.map(e => {
      if (e.id === etapaId) return { ...e, imageUrl: newUrl, imagePublicId: publicId } as any;
      if (e.subetapas) return { ...e, subetapas: updateInTree(e.subetapas as any) } as any;
      return e;
    });
    const updateInModules = (modules: Module[]): Module[] => modules.map(m => ({
      ...m,
      etapas: m.etapas ? (updateInTree(m.etapas as any) as any) : undefined,
      submodules: m.submodules ? updateInModules(m.submodules) : undefined
    }));
    return { ...data, modules: updateInModules(data.modules) };
  };

  const cancelEditLesson = () => {
    setEditingLessonId(null); setEditingLessonTitle(''); setEditingLessonParentId(null);
  };

  // ── Image upload ──
  const handleImageFile = async (file: File) => {
    if (id && activeModuleId && activeLessonId) {
      const localUrl = URL.createObjectURL(file);

      if (isMainImageUploadRef.current) {
        // Se já tinha imagem, poderíamos apagar aqui, mas vamos apenas trocar a referência
        updateLesson({ imageUrl: localUrl });
        setPendingFiles(prev => ({
          ...prev,
          ['MAIN_IMAGE']: { file, moduleId: activeModuleId, etapaId: activeLessonId }
        }));
        setIsDirty(true);
        showToast('Capa da aula alterada (será enviada ao salvar)');
        isMainImageUploadRef.current = false;
        return;
      }

      let blockId: string | null = null;

      if (wysiwyg.editingBlockId && wysiwyg.editingBlockType === 'image') {
        blockId = wysiwyg.editingBlockId;
        
        // Se o bloco já tinha um publicId, vamos apagar no Cloudinary antes de trocar
        const al = getActiveLesson();
        const comp = al?.components?.find(c => c.id === blockId);
        const oldPublicId = comp?.payload?.publicId;
        
        if (oldPublicId) {
          const ok = window.confirm('Deseja excluir a imagem antiga do servidor para substituir por esta nova?');
          if (ok) {
            try {
              await trilhaBuilderApi.deleteCloudinaryImage(oldPublicId, {
                kind: 'etapa', trailId, moduleId: activeModuleId, etapaId: activeLessonId
              });
            } catch (err) {
              console.warn('Falha ao apagar imagem antiga, continuando...', err);
            }
          }
        }

        // Atualiza a UI imediatamente com o blob local
        if (al && al.components) {
          const comps = al.components.map(c => 
            c.id === blockId ? { ...c, payload: { ...c.payload, url: localUrl, publicId: undefined } } : c
          );
          updateLesson({ components: comps });
        }
        
        wysiwyg.setEditingBlockPayload(prev => ({ ...prev, url: localUrl }));
      } else {
        blockId = addBlock('image', { url: localUrl, width: '100%', align: 'center' }) || null;
      }

      if (blockId) {
        setPendingFiles(prev => ({
          ...prev,
          [blockId!]: { file, moduleId: activeModuleId, etapaId: activeLessonId }
        }));
        setIsDirty(true);
        showToast('Imagem adicionada (será enviada ao salvar)');
      }
      return;
    }
    showToast('Erro: Nenhuma aula selecionada para upload.');
  };

  const handleRemoveBlockWithCloudinary = async (blockId: string) => {
    if (!activeLesson) return;
    
    const content = activeLesson.content || '';
    const blocks = parseBlocks(content);
    const b = blocks.find(x => x.id === blockId);
    const comp = activeLesson.components?.find(c => c.id === blockId);
    
    if (b || comp) {
      const type = comp?.type || b?.type || 'text';
      let publicId: string | null = null;
      
      // ONLY try Cloudinary for images
      if (type === 'image') {
        if (comp && comp.payload?.publicId) {
          publicId = comp.payload.publicId;
        } else if (b) {
          const attrMatch = b.html.match(/data-public-id=["']([^"']+)["']/);
          if (attrMatch) publicId = attrMatch[1];
        }

        if (!publicId) {
          const url = comp?.payload?.url || (b ? b.html.match(/src=["']?([^"'\s>]+)["']?/)?.[1] : null);
          if (url && url.includes('cloudinary.com')) {
            const parts = url.split('/upload/');
            if (parts.length > 1) {
              let path = parts[1].replace(/^v\d+\//, ''); 
              const lastDot = path.lastIndexOf('.');
              publicId = lastDot > -1 ? path.substring(0, lastDot) : path;
            }
          }
        }
      }

      if (publicId) {
        const ok = window.confirm(`Deseja excluir esta imagem permanentemente do servidor?`);
        if (ok) {
          try {
            setSaving(true);
            await trilhaBuilderApi.deleteCloudinaryImage(publicId, {
              kind: 'etapa', trailId, moduleId: activeModuleId!, etapaId: activeLessonId!
            });
            showToast('Imagem removida do servidor');
          } catch (err) {
            console.warn('[Cloudinary] Erro na deleção (prosseguindo localmente):', err);
          } finally {
            setSaving(false);
          }
        }
      }
    }
    
    // Clean up pending uploads and remove from UI
    if (pendingFiles[blockId]) {
      setPendingFiles(prev => {
        const next = { ...prev };
        delete next[blockId];
        return next;
      });
    }

    removeBlockById(blockId);
  };

  const handleReplaceImage = (blockId: string) => {
    wysiwyg.setEditingBlockId(blockId);
    wysiwyg.setEditingBlockType('image');
    imageInputRef.current?.click();
  };

  const handleRemoveMainImage = async () => {
    if (!activeLesson || !activeLesson.imageUrl) return;

    // Check if it has a publicId (might be stored in a field or we extract from URL)
    let publicId = (activeLesson as any).imagePublicId;
    if (!publicId && activeLesson.imageUrl.includes('cloudinary.com')) {
      const parts = activeLesson.imageUrl.split('/upload/');
      if (parts.length > 1) {
        let path = parts[1].replace(/^v\d+\//, '');
        publicId = path.split('.')[0];
      }
    }

    if (publicId) {
      const ok = window.confirm('Excluir imagem de capa da aula permanentemente?');
      if (!ok) return;

      try {
        setSaving(true);
        await trilhaBuilderApi.deleteCloudinaryImage(publicId, {
          kind: 'etapa',
          trailId,
          moduleId: activeModuleId!,
          etapaId: activeLessonId!
        });
        showToast('Capa removida');
      } catch (err) {
        showToast('Erro ao remover no servidor');
        setSaving(false);
        return;
      } finally {
        setSaving(false);
      }
    }

    updateLesson({ imageUrl: '', imagePublicId: '' } as any);
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
                title="Soltar submdulos para o n1vel superior"
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
                        onDoubleClick={(e) => { e.stopPropagation(); setActiveModuleId(module.id); startEditLesson(lesson.id, lesson.title || '', parentId); }}
                        title={lesson.title || '(Sem título)'}
                      >
                        {lesson.title || '(Sem título)'}
                      </span>
                    )}
                  </div>
                  {editingLessonId !== lesson.id && (
                    <div className="flex items-center gap-0.5 shrink-0">
                      <button onClick={(e) => { e.stopPropagation(); addLesson(module.id, lesson.id); }} title="Adicionar subetapa" className="text-slate-400 hover:text-faktory-blue p-0.5 rounded"><Plus size={12} /></button>
                      <button onClick={(e) => { e.stopPropagation(); startEditLesson(lesson.id, lesson.title || '', parentId); }} title="Renomear" className="text-slate-400 hover:text-faktory-blue p-0.5 rounded"><Pencil size={12} /></button>
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
                    setDragPreview({ type: 'block', id: b.id, rect: { top: relTop, left: relLeft, width: rect.width, height: rect.height }, pos: (e.clientY - rect.top) < (rect.height / 2) ? 'before' : 'after', source: 'list' });
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
                  /* handling omitted for brevity */
                }}
              >
                {/* toolbar & preview omitted for brevity */}
              </div>
            </div>
          ))}
        </div>
      </div>
    );
  };

  const removeBlockMarkupById = (id: string) => {
    if (!activeLesson) return;
    const content = activeLesson.content || '';
    const re = /<!-- block:([a-zA-Z0-9_-]+):([a-zA-Z0-9_-]+) -->([\s\S]*?)<!-- \/block:\1:\2 -->/g;
    const newContent = content.replace(re, '');
    updateLesson({ content: newContent });
    showToast('Bloco removido');
  };

  const editBlockMarkupById = (id: string) => {
    if (!activeLesson) return;
    const content = activeLesson.content || '';
    const re = new RegExp('(<!-- block:([a-zA-Z0-9_-]+):' + id + ' -->)([\\s\\S]*?)(<!-- /block:\\2:' + id + ' -->)', 'g');
    const m = re.exec(content);
    if (!m) return;
    const blockType = m[2];
    const currentHtml = m[3].trim();

    if (blockType === 'title') {
      const headingTags = ['h1','h2','h3','h4','h5','h6'];
      const tagMatch = currentHtml.match(/^<([a-z0-9]+)/i);
      const htmlForEditor = (tagMatch && headingTags.includes(tagMatch[1].toLowerCase()))
        ? currentHtml
        : `<h2>${currentHtml}</h2>`;
      setEditingBlockId(id);
      setEditingBlockType(blockType);
      setEditingBlockHtml(htmlForEditor);
      initEditorHistory(htmlForEditor);
      setUseWysiwygMode(true);
      setShowBlockEditor(true);
      return;
    }

    if (blockType === 'video' || blockType === 'embed') {
      const srcMatch = currentHtml.match(/src=["']([^"']+)["']/);
      const url = srcMatch ? srcMatch[1] : '';
      setEditingBlockId(id);
      setEditingBlockType(blockType);
      setEditingBlockHtml(url);
      initEditorHistory(url);
      setShowBlockEditor(true);
      return;
    }
    if (blockType === 'image' || blockType === 'text') {
        const htmlForEditor = blockType === 'image' ? currentHtml
          : `<div>${currentHtml}</div>`;
        const srcMatch = currentHtml.match(/src=["']([^"']+)["']/);
        const url = srcMatch ? srcMatch[1] : '';
        setEditingBlockId(id);
        setEditingBlockType(blockType);
        setEditingBlockHtml(htmlForEditor);
        initEditorHistory(htmlForEditor);
        setShowBlockEditor(true);
    }
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
                <span className="text-[10px] font-bold text-slate-400 uppercase">Salvo as {lastSaved.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
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
              Acoes
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
            onClick={handleManualSave}
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
                      onClick={() => { isMainImageUploadRef.current = true; imageInputRef.current?.click(); }}
                      className="px-2 py-1 bg-white border rounded text-xs font-bold hover:bg-slate-50 transition-colors"
                      title="Substituir imagem"
                    >Substituir</button>

                    <button
                      onClick={handleRemoveMainImage}
                      className="px-2 py-1 bg-white border border-red-100 text-red-500 rounded text-xs font-bold hover:bg-red-50 transition-colors"
                      title="Remover imagem"
                    >Remover</button>

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
                    const videoHtml = `<div class="embed"><iframe src=\"${embed}\" width=\"100%\" height=\"450\" frameborder=\"0\" allowfullscreen></iframe></div>`;
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
                          <div className="absolute top-0 left-0 right-0 p-3 flex justify-between items-start z-10 bg-gradient-to-b from-black/80 to-transparent opacity-0 group-hover:opacity-100 transition-opacity">
                            <div className="flex gap-2">
                              <span className="bg-yellow-500/20 text-yellow-300 text-[10px] font-bold px-2 py-1 rounded border border-yellow-500/30">Vídeo Legado</span>
                              <span className="text-xs text-white/80 self-center">Converta para bloco para reordenar livremente.</span>
                            </div>
                            <div className="flex gap-2">
                              <button onClick={(e) => { e.stopPropagation(); insertVideoAsBlock(); }} className="bg-faktory-blue hover:bg-blue-600 text-white text-xs font-bold px-3 py-1.5 rounded flex items-center gap-1 shadow-lg transition-colors">
                                <Layers size={14} /> Converter em Bloco
                              </button>
                              <button onClick={(e) => { e.stopPropagation(); updateLesson({ videoUrl: '' }); showToast('Vídeo removido'); }} title="Remover vídeo" className="bg-red-500/80 hover:bg-red-600 text-white p-1.5 rounded transition-colors">
                                <Trash2 size={14} />
                              </button>
                            </div>
                          </div>
                          <div className="absolute inset-0 bg-black/10 group-hover:bg-black/30 transition-all flex items-center justify-center pointer-events-none">
                            <div className="bg-white/10 backdrop-blur-md p-4 rounded-full border border-white/20 opacity-0 group-hover:opacity-100 transition-all pointer-events-auto">
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

                  {/* Blocos da aula - área de conteúdo principal (agora usa ContentArea extraído) */}
                  <ContentArea 
                    activeLesson={activeLesson} 
                    updateLesson={updateLesson} 
                    showToast={showToast} 
                  blockEditor={blockEditor}
                    handleRemoveBlock={handleRemoveBlockWithCloudinary}
                    handleReplaceImage={handleReplaceImage}
                  />

                  {/* Quiz - adicionado como bloco de componente */}
                  {!activeLesson.components?.some(c => c.type === 'quiz') && (
                    <div className="mt-12 pt-10 border-t border-slate-100">
                      <div className="bg-slate-50 border-2 border-dashed border-slate-200 rounded-2xl p-8 flex flex-col items-center text-center gap-4">
                        <div className="w-16 h-16 rounded-full bg-white shadow-sm flex items-center justify-center text-faktory-blue">
                          <HelpCircle size={32} />
                        </div>
                        <div>
                          <h4 className="font-bold text-slate-800">Nenhum questionário nesta etapa</h4>
                          <p className="text-sm text-slate-500 max-w-sm mx-auto mt-1">
                            Adicione um questionário de fixação para testar o conhecimento dos alunos após esta aula.
                          </p>
                        </div>
                        <button
                          onClick={() => createAndAddQuizBlock()}
                          className="mt-2 px-6 py-2.5 bg-faktory-blue text-white rounded-full font-bold text-sm hover:bg-faktory-blue/90 transition-all shadow-md hover:shadow-lg flex items-center gap-2"
                        >
                          <Plus size={18} />
                          Criar Questionário Agora
                        </button>
                      </div>
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
                  if (label.includes('Questionário')) {
                    createAndAddQuizBlock();
                    return;
                  }
                  if (label.includes('Vídeo')) {
                    const newId = addBlock('video', { url: '' });
                    if (newId) editBlockById(newId);
                    showToast('Vídeo adicionado! Insira a URL no painel.');
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

                  if (label.includes('paineis')) {
                    addBlock('text', { html: '<div style="display: grid; grid-template-columns: 1fr 1fr; gap: 1rem;"><div style="padding: 1rem; border: 1px solid #e2e8f0; border-radius: 0.5rem;">Painel 1</div><div style="padding: 1rem; border: 1px solid #e2e8f0; border-radius: 0.5rem;">Painel 2</div></div>' });
                    showToast('Grupo de paineis inserido');
                    return;
                  }

                  if (label.includes('embed')) {
                    addBlock('iframe', { url: '' });
                    showToast('Embed inserido');
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
      <VideoSettingsModal
        show={showVideoModal}
        onClose={() => setShowVideoModal(false)}
        activeLesson={activeLesson || null}
        updateLesson={updateLesson}
        insertVideoAsBlock={insertVideoAsBlock}
      />

      <PreviewModal
        show={showPreviewModal}
        onClose={() => setShowPreviewModal(false)}
        onRefresh={handleRefreshFromServer}
        trailData={trailData}
      />

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
      <BlockEditorModal
        show={showBlockEditor}
        wysiwyg={wysiwyg}
        cancelEditBlock={cancelEditBlock}
        saveEditedBlock={saveEditedBlock}
        getEmbedUrl={getEmbedUrl}
        triggerImageUpload={() => imageInputRef.current?.click()}
        showToast={showToast}
        projectId={id}
      />
      {/* Toast */}
      {toast && (
        <div className="fixed bottom-6 right-6 bg-slate-800 text-white px-4 py-2 rounded shadow-lg z-50">{toast}</div>
      )}
    </div>
  );
}