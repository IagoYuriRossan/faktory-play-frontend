import { useRef, useState, useEffect } from 'react';

export interface WysiwygEditorState {
  useWysiwygMode: boolean;
  setUseWysiwygMode: React.Dispatch<React.SetStateAction<boolean>>;
  editingBlockHtml: string;
  setEditingBlockHtml: React.Dispatch<React.SetStateAction<string>>;
  editingBlockId: string | null;
  setEditingBlockId: React.Dispatch<React.SetStateAction<string | null>>;
  editingBlockType: string;
  setEditingBlockType: React.Dispatch<React.SetStateAction<string>>;
  editingBlockPayload: Record<string, any>;
  setEditingBlockPayload: React.Dispatch<React.SetStateAction<Record<string, any>>>;
  wysiwygRef: React.RefObject<HTMLDivElement | null>;
  wysiwygLoadedBlockRef: React.RefObject<string | null>;
  editorLiveHtmlRef: React.RefObject<string>;
  initEditorHistory: (html: string) => void;
  flushEditorHistory: () => void;
  canUndo: () => boolean;
  canRedo: () => boolean;
  handleEditorValueChange: (value: string) => void;
  handleUndo: () => void;
  handleRedo: () => void;
  saveSelection: () => void;
  restoreSelection: () => void;
  handleWysiwygInput: (html: string) => void;
  execCommand: (cmd: string, value?: string) => void;
}

export function useWysiwygEditor(showBlockEditor: boolean): WysiwygEditorState {
  const [useWysiwygMode, setUseWysiwygMode] = useState(true);
  const [editingBlockHtml, setEditingBlockHtml] = useState('');
  const [editingBlockId, setEditingBlockId] = useState<string | null>(null);
  const [editingBlockType, setEditingBlockType] = useState('');
  const [editingBlockPayload, setEditingBlockPayload] = useState<Record<string, any>>({});

  const editorHistoryRef = useRef<{ past: string[]; future: string[] }>({ past: [], future: [] });
  const editorHistoryTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const editorSelectionRef = useRef<Range | null>(null);
  const wysiwygRef = useRef<HTMLDivElement | null>(null);
  const editorLiveHtmlRef = useRef<string>('');
  const wysiwygLoadedBlockRef = useRef<string | null>(null);

  const pushEditorHistory = (html: string) => {
    editorHistoryRef.current.past.push(html);
    editorHistoryRef.current.future = [];
  };

  const initEditorHistory = (html: string) => {
    editorHistoryRef.current = { past: [], future: [] };
    editorLiveHtmlRef.current = html;
  };

  const flushEditorHistory = () => {
    if (editorHistoryTimerRef.current) {
      window.clearTimeout(editorHistoryTimerRef.current);
      editorHistoryTimerRef.current = null;
    }
    pushEditorHistory(editorLiveHtmlRef.current);
  };

  const canUndo = () => editorHistoryRef.current.past.length > 0;
  const canRedo = () => editorHistoryRef.current.future.length > 0;

  const handleEditorValueChange = (value: string) => {
    editorLiveHtmlRef.current = value;
    setEditingBlockHtml(value);
    pushEditorHistory(value);
  };

  const handleUndo = () => {
    if (editorHistoryRef.current.past.length === 0) return;
    const current = editorLiveHtmlRef.current;
    editorHistoryRef.current.future.push(current);
    const prev = editorHistoryRef.current.past.pop()!;
    editorLiveHtmlRef.current = prev;
    setEditingBlockHtml(prev);
    if (wysiwygRef.current) wysiwygRef.current.innerHTML = prev;
  };

  const handleRedo = () => {
    if (editorHistoryRef.current.future.length === 0) return;
    const current = editorLiveHtmlRef.current;
    editorHistoryRef.current.past.push(current);
    const next = editorHistoryRef.current.future.pop()!;
    editorLiveHtmlRef.current = next;
    setEditingBlockHtml(next);
    if (wysiwygRef.current) wysiwygRef.current.innerHTML = next;
  };

  const saveSelection = () => {
    const sel = window.getSelection();
    if (!sel || sel.rangeCount === 0) return;
    editorSelectionRef.current = sel.getRangeAt(0).cloneRange();
  };

  const restoreSelection = () => {
    if (!editorSelectionRef.current) return;
    const sel = window.getSelection();
    if (!sel) return;
    try {
      sel.removeAllRanges();
      sel.addRange(editorSelectionRef.current);
    } catch (_) { /* stale range */ }
  };

  const handleWysiwygInput = (html: string) => {
    editorLiveHtmlRef.current = html;
    setEditingBlockHtml(html);
    if (editorHistoryTimerRef.current) window.clearTimeout(editorHistoryTimerRef.current);
    editorHistoryTimerRef.current = setTimeout(() => { pushEditorHistory(html); }, 300);
  };

  const execCommand = (cmd: string, value?: string) => {
    const editor = wysiwygRef.current;
    if (!editor) return;
    let sel = window.getSelection();
    if (!sel) return;
    if (document.activeElement !== editor && !editor.contains(document.activeElement)) {
      editor.focus();
    }
    restoreSelection();
    sel = window.getSelection();
    if (!sel) return;
    if (sel.rangeCount === 0 || !editor.contains(sel.anchorNode)) {
      const range = document.createRange();
      range.selectNodeContents(editor);
      range.collapse(false);
      sel.removeAllRanges();
      sel.addRange(range);
    }
    if (cmd === 'insertUnorderedList' || cmd === 'insertOrderedList') {
      try { document.execCommand(cmd, false, ''); } catch (_) { /* noop */ }
      const html = editor.innerHTML;
      editorLiveHtmlRef.current = html;
      setEditingBlockHtml(html);
      pushEditorHistory(html);
      saveSelection();
      return;
    }
    try {
      document.execCommand(cmd, false, value ?? '');
      saveSelection();
    } catch (_) { /* noop */ }
  };

  useEffect(() => {
    if (!showBlockEditor) return;
    const onKeyDown = (e: KeyboardEvent) => {
      if (!(e.ctrlKey || e.metaKey)) return;
      const key = e.key.toLowerCase();
      if (key === 'z' && e.shiftKey) { e.preventDefault(); handleRedo(); return; }
      if (key === 'z') { e.preventDefault(); handleUndo(); return; }
      if (key === 'y') { e.preventDefault(); handleRedo(); }
    };
    document.addEventListener('keydown', onKeyDown);
    return () => document.removeEventListener('keydown', onKeyDown);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [showBlockEditor, useWysiwygMode]);

  useEffect(() => {
    return () => {
      if (editorHistoryTimerRef.current) {
        window.clearTimeout(editorHistoryTimerRef.current);
      }
    };
  }, []);

  return {
    useWysiwygMode, setUseWysiwygMode,
    editingBlockHtml, setEditingBlockHtml,
    editingBlockId, setEditingBlockId,
    editingBlockType, setEditingBlockType,
    editingBlockPayload, setEditingBlockPayload,
    wysiwygRef, wysiwygLoadedBlockRef, editorLiveHtmlRef,
    initEditorHistory, flushEditorHistory,
    canUndo, canRedo,
    handleEditorValueChange, handleUndo, handleRedo,
    saveSelection, restoreSelection, handleWysiwygInput,
    execCommand,
  };
}
