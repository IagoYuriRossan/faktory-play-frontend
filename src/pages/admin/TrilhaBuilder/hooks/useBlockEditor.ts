import { Etapa, Component } from '../../../../@types/index';
import { genId } from '../utils/contentBlocks';
import type { WysiwygEditorState } from './useWysiwygEditor';

interface UseBlockEditorDeps {
  activeLesson: Etapa | null;
  updateLesson: (updates: Partial<Etapa>) => void;
  showToast: (msg: string) => void;
  wysiwyg: WysiwygEditorState;
  setShowBlockEditor: React.Dispatch<React.SetStateAction<boolean>>;
}

export function useBlockEditor(deps: UseBlockEditorDeps) {
  const { activeLesson, updateLesson, showToast, wysiwyg, setShowBlockEditor } = deps;
  const {
    setEditingBlockId, setEditingBlockType, setEditingBlockHtml,
    editingBlockId, editingBlockType, editingBlockHtml,
    useWysiwygMode, wysiwygRef, wysiwygLoadedBlockRef,
    initEditorHistory, flushEditorHistory, setUseWysiwygMode,
    editingBlockPayload, setEditingBlockPayload,
  } = wysiwyg;

  const moveBlockById = (id: string, dir: number) => {
    if (!activeLesson || !activeLesson.components) return;
    const comps = [...activeLesson.components].sort((a, b) => (a.order || 0) - (b.order || 0));
    const idx = comps.findIndex(c => c.id === id);
    if (idx === -1) return;
    const swapIdx = idx + dir;
    if (swapIdx < 0 || swapIdx >= comps.length) return;
    
    // Swap
    const tmp = comps[idx];
    comps[idx] = comps[swapIdx];
    comps[swapIdx] = tmp;

    // Re-assign order
    const reordered = comps.map((c, i) => ({ ...c, order: i }));
    updateLesson({ components: reordered });
  };

  const reorderBlock = (dragId: string, dropId: string) => {
    if (!activeLesson || !activeLesson.components) return;
    const comps = [...activeLesson.components].sort((a, b) => (a.order || 0) - (b.order || 0));
    const fromIdx = comps.findIndex(c => c.id === dragId);
    const toIdx = comps.findIndex(c => c.id === dropId);
    if (fromIdx === -1 || toIdx === -1) return;

    const [item] = comps.splice(fromIdx, 1);
    comps.splice(toIdx, 0, item);

    const reordered = comps.map((c, i) => ({ ...c, order: i }));
    updateLesson({ components: reordered });
  };

  const reorderBlockTo = (dragId: string, dropId: string, pos: 'before' | 'after') => {
    if (!activeLesson || !activeLesson.components) return;
    const comps = [...activeLesson.components].sort((a, b) => (a.order || 0) - (b.order || 0));
    const fromIdx = comps.findIndex(c => c.id === dragId);
    const toIdx = comps.findIndex(c => c.id === dropId);
    if (fromIdx === -1 || toIdx === -1) return;

    const [item] = comps.splice(fromIdx, 1);
    
    // Recalculate toIdx because array size changed
    const newToIdx = comps.findIndex(c => c.id === dropId);
    const insertAt = pos === 'before' ? newToIdx : newToIdx + 1;
    comps.splice(insertAt, 0, item);

    const reordered = comps.map((c, i) => ({ ...c, order: i }));
    updateLesson({ components: reordered });
  };

  const duplicateBlockById = (id: string) => {
    if (!activeLesson || !activeLesson.components) return;
    const comps = [...activeLesson.components].sort((a, b) => (a.order || 0) - (b.order || 0));
    const idx = comps.findIndex(c => c.id === id);
    if (idx === -1) return;

    const original = comps[idx];
    const duplicated: Component = {
      ...original,
      id: genId(),
    };

    comps.splice(idx + 1, 0, duplicated);
    const reordered = comps.map((c, i) => ({ ...c, order: i }));
    updateLesson({ components: reordered });
    showToast('Bloco duplicado');
  };

  const removeBlockById = (id: string) => {
    if (!activeLesson || !activeLesson.components) return;
    const comps = activeLesson.components.filter(c => c.id !== id).map((c, i) => ({ ...c, order: i }));
    updateLesson({ components: comps });
    showToast('Bloco removido');
  };

  const addBlock = (type: Component['type'], payload: Record<string, any>) => {
    if (!activeLesson) {
      showToast('Selecione uma aula primeiro');
      return;
    }
    const comps = [...(activeLesson.components || [])].sort((a, b) => (a.order || 0) - (b.order || 0));
    const newComp: Component = {
      id: genId(),
      type,
      payload,
      order: comps.length
    };
    comps.push(newComp);
    updateLesson({ components: comps });
    return newComp.id;
  };


  const editBlockById = (id: string) => {
    if (!activeLesson || !activeLesson.components) return;
    const comp = activeLesson.components.find(c => c.id === id);
    if (!comp) return;

    if (comp.type === 'text') {
      const html = comp.payload.html || '';
      const tagMatch = html.match(/^<([a-z0-9]+)/i);
      const isHeading = tagMatch && ['h1', 'h2', 'h3', 'h4', 'h5', 'h6'].includes(tagMatch[1].toLowerCase());
      
      setEditingBlockId(id);
      setEditingBlockType(isHeading ? 'title' : 'custom'); // maps UI state
      setEditingBlockHtml(html);
      initEditorHistory(html);
      setUseWysiwygMode(true);
      setShowBlockEditor(true);
      return;
    }
    
    if (comp.type === 'video' || comp.type === 'iframe') {
      const url = comp.payload.url || '';
      setEditingBlockId(id);
      setEditingBlockType(comp.type);
      setEditingBlockHtml(url);
      initEditorHistory(url);
      setShowBlockEditor(true);
      return;
    }

    if (comp.type === 'image') {
       setEditingBlockId(id);
       setEditingBlockType('image');
       setEditingBlockPayload(comp.payload || {});
       setShowBlockEditor(true);
       return;
    }
  };

  const saveEditedBlock = () => {
    if (!activeLesson || !editingBlockId || !activeLesson.components) return;
    flushEditorHistory();
    if (useWysiwygMode && wysiwygRef.current) {
      wysiwyg.setEditingBlockHtml(wysiwygRef.current.innerHTML);
    }
    const currentData = (useWysiwygMode && wysiwygRef.current) ? wysiwygRef.current.innerHTML : editingBlockHtml;
    
    const comps = [...activeLesson.components];
    const idx = comps.findIndex(c => c.id === editingBlockId);
    if (idx === -1) return;

    const comp = comps[idx];

    if (editingBlockType === 'title' || editingBlockType === 'custom') {
       comp.type = 'text';
       comp.payload = { ...comp.payload, html: currentData };
    } else if (editingBlockType === 'video' || editingBlockType === 'iframe' || editingBlockType === 'embed') {
       comp.type = editingBlockType === 'iframe' ? 'iframe' : 'video';
       comp.payload = { ...comp.payload, url: currentData };
    } else if (editingBlockType === 'image') {
       comp.type = 'image';
       comp.payload = { ...comp.payload, ...editingBlockPayload };
    }

    updateLesson({ components: comps });
    setShowBlockEditor(false); 
    setEditingBlockId(null); 
    setEditingBlockHtml(''); 
    setEditingBlockType('');
    setEditingBlockPayload({});
    wysiwygLoadedBlockRef.current = null;
    showToast('Bloco atualizado');
  };

  const cancelEditBlock = () => {
    setShowBlockEditor(false); 
    setEditingBlockId(null); 
    setEditingBlockHtml(''); 
    setEditingBlockType('');
    setEditingBlockPayload({});
    wysiwygLoadedBlockRef.current = null;
  };

  return {
    moveBlockById, reorderBlock, reorderBlockTo,
    duplicateBlockById, removeBlockById,
    editBlockById, saveEditedBlock, cancelEditBlock, addBlock,
  };
}
