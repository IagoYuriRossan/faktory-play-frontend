import { motion, AnimatePresence } from 'framer-motion';
import { Minus, Undo2, Redo2 } from 'lucide-react';
import type { WysiwygEditorState } from '../hooks/useWysiwygEditor';

interface BlockEditorModalProps {
  show: boolean;
  wysiwyg: WysiwygEditorState;
  cancelEditBlock: () => void;
  saveEditedBlock: () => void;
  getEmbedUrl: (url: string) => string;
  triggerImageUpload?: () => void;
}

export function BlockEditorModal({ show, wysiwyg, cancelEditBlock, saveEditedBlock, getEmbedUrl, triggerImageUpload }: BlockEditorModalProps) {
  const {
    editingBlockId, editingBlockType, editingBlockHtml,
    editingBlockPayload, setEditingBlockPayload,
    useWysiwygMode, setUseWysiwygMode, setEditingBlockHtml,
    handleEditorValueChange, handleUndo, handleRedo,
    canUndo, canRedo, wysiwygRef, saveSelection, restoreSelection,
    handleWysiwygInput, execCommand
  } = wysiwyg;

  return (
    <AnimatePresence>
      {show && editingBlockId && (
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
                  <div className="space-y-2">
                    <div className="text-xs text-slate-500 font-semibold uppercase tracking-wide mb-2 flex items-center justify-between">
                      <span>URL da Imagem</span>
                      <button type="button" onClick={triggerImageUpload} className="cursor-pointer text-[10px] bg-slate-100 hover:bg-slate-200 text-slate-600 px-2 py-1 rounded transition-colors flex items-center gap-1">
                        <svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"></path><polyline points="17 8 12 3 7 8"></polyline><line x1="12" y1="3" x2="12" y2="15"></line></svg>
                        Upload do PC
                      </button>
                    </div>
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
              {editingBlockType !== 'title' && editingBlockType !== 'video' && editingBlockType !== 'embed' && editingBlockType !== 'image' && editingBlockType !== 'quiz' && (
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

              {/* ── Quiz block edit ── */}
              {editingBlockType === 'quiz' && (
                <div className="space-y-4">
                  <div className="text-xs text-slate-500 font-semibold uppercase tracking-wide">Questionnaire ID</div>
                  <input
                    autoFocus
                    value={editingBlockPayload?.questionnaireId || ''}
                    onChange={(e) => setEditingBlockPayload(prev => ({ ...prev, questionnaireId: e.target.value }))}
                    className="w-full p-3 border border-slate-200 rounded-lg text-sm outline-none focus:ring-2 focus:ring-faktory-blue/30"
                    placeholder="ID do questionnaire (ex: quiz-123)"
                  />
                  <p className="text-[10px] text-slate-400">Insira o `questionnaireId` de um questionário existente para vinculá‑lo a este bloco.</p>
                </div>
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
  );
}
