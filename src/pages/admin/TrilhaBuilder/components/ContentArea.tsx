import { useRef, useState } from 'react';
import { GripVertical, Copy, Pencil, Trash2, ChevronUp, ChevronDown } from 'lucide-react';
import { Etapa, Component } from '../../../../@types/index';
import { getEmbedUrl } from '../utils/contentBlocks';

interface ContentAreaProps {
  activeLesson: Etapa;
  updateLesson: (updates: Partial<Etapa>) => void;
  showToast: (msg: string) => void;
  blockEditor: any; // Returned from useBlockEditor
}

export function ContentArea({ activeLesson, updateLesson, showToast, blockEditor }: ContentAreaProps) {
  const [hoveredBlockId, setHoveredBlockId] = useState<string | null>(null);
  const [draggedId, setDraggedId] = useState<string | null>(null);

  const {
    moveBlockById, reorderBlock, duplicateBlockById, removeBlockById, editBlockById
  } = blockEditor;

  const components = activeLesson.components ? [...activeLesson.components].sort((a, b) => (a.order || 0) - (b.order || 0)) : [];

  const handleDrop = (e: React.DragEvent, dropTargetId: string) => {
    e.preventDefault();
    if (draggedId && draggedId !== dropTargetId) {
      reorderBlock(draggedId, dropTargetId);
    }
    setDraggedId(null);
  };

  if (!components.length) {
    return (
      <div className="flex-1 p-10 flex flex-col items-center justify-center text-slate-400">
        <p>Nenhum componente nesta etapa.</p>
        <p className="text-sm mt-2">Use a barra lateral direita para adicionar textos, imagens ou vídeos.</p>
      </div>
    );
  }

  return (
    <div className="flex-1 p-10 space-y-8">
      <div className="prose prose-slate max-w-none space-y-2">
        {components.map((comp) => (
          <div
            key={comp.id}
            draggable
            onDragStart={(e) => {
              setDraggedId(comp.id);
              e.dataTransfer.effectAllowed = 'move';
            }}
            onDragOver={(e) => e.preventDefault()}
            onDrop={(e) => handleDrop(e, comp.id)}
            onMouseEnter={() => setHoveredBlockId(comp.id)}
            onMouseLeave={() => setHoveredBlockId(null)}
            className={`relative rounded-lg border transition-all bg-white ${
              hoveredBlockId === comp.id ? 'border-faktory-blue/50 shadow-sm' : 'border-transparent'
            }`}
          >
            {/* Toolbar */}
            {hoveredBlockId === comp.id && (
              <div className="absolute -top-7 left-0 z-30 flex items-center justify-between px-2 py-1 bg-white/95 backdrop-blur-sm border border-slate-200 shadow-sm rounded-t-lg">
                <div className="flex items-center gap-1 text-slate-500 text-[10px] font-bold px-2 py-0.5 cursor-grab select-none">
                  <GripVertical size={11} />
                  {comp.type.toUpperCase()}
                </div>
                <div className="flex items-center gap-0.5 ml-2">
                  <button onClick={() => editBlockById(comp.id)} className="p-1 rounded hover:bg-slate-100 text-slate-500 hover:text-faktory-blue"><Pencil size={13} /></button>
                  <button onClick={() => duplicateBlockById(comp.id)} className="p-1 rounded hover:bg-slate-100 text-slate-500 hover:text-faktory-blue"><Copy size={13} /></button>
                  <div className="w-px h-4 bg-slate-200 mx-0.5" />
                  <button onClick={() => moveBlockById(comp.id, -1)} className="p-1 rounded hover:bg-slate-100 text-slate-500 hover:text-faktory-blue"><ChevronUp size={13} /></button>
                  <button onClick={() => moveBlockById(comp.id, 1)} className="p-1 rounded hover:bg-slate-100 text-slate-500 hover:text-faktory-blue"><ChevronDown size={13} /></button>
                  <div className="w-px h-4 bg-slate-200 mx-0.5" />
                  <button onClick={() => removeBlockById(comp.id)} className="p-1 rounded hover:bg-red-50 text-slate-400 hover:text-red-600"><Trash2 size={13} /></button>
                </div>
              </div>
            )}

            {/* Component Content Render */}
            <div
              className={`relative ${hoveredBlockId === comp.id ? 'bg-slate-50/50' : ''} cursor-pointer p-4`}
              onDoubleClick={(e) => { e.stopPropagation(); editBlockById(comp.id); }}
            >
              {comp.type === 'text' && (
                <div className="rich-text-content pointer-events-none" dangerouslySetInnerHTML={{ __html: comp.payload.html || '' }} />
              )}
              {(comp.type === 'video' || comp.type === 'iframe') && (
                <div className="embed aspect-video bg-black rounded overflow-hidden flex items-center justify-center">
                  {comp.payload.url ? (
                    <iframe src={getEmbedUrl(comp.payload.url)} width="100%" height="100%" frameBorder="0" allowFullScreen></iframe>
                  ) : (
                    <div className="text-slate-500 text-xs flex flex-col items-center gap-2">
                      <div className="w-10 h-10 rounded-full bg-slate-800 flex items-center justify-center">
                        <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="lucide lucide-video"><path d="m22 8-6 4 6 4V8Z"/><rect width="14" height="12" x="2" y="6" rx="2" ry="2"/></svg>
                      </div>
                      Clique para configurar o vídeo
                    </div>
                  )}
                </div>
              )}
              {comp.type === 'image' && (
                <div style={{ textAlign: comp.payload.align || 'center' }}>
                  <img 
                    src={comp.payload.url} 
                    alt={comp.payload.alt || 'Imagem da etapa'} 
                    style={{ width: comp.payload.width || '100%', maxWidth: '100%' }} 
                    className="rounded inline-block" 
                  />
                </div>
              )}
              {comp.type === 'quiz' && (
                <div className="p-4 border border-faktory-blue/20 bg-blue-50/30 rounded-lg text-center">
                  <p className="font-semibold text-faktory-blue">Questionário Vinculado</p>
                  <p className="text-xs text-slate-500">ID: {comp.payload.questionnaireId}</p>
                </div>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
