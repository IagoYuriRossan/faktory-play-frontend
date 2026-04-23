import { motion, AnimatePresence } from 'framer-motion';
import { Video, Minus, MousePointer2, Trash2 } from 'lucide-react';
import { Etapa } from '../../../../@types/index';
import { cn } from '../../../../utils/utils';

interface VideoSettingsModalProps {
  show: boolean;
  onClose: () => void;
  activeLesson: Etapa | null;
  updateLesson: (updates: Partial<Etapa>) => void;
  insertVideoAsBlock: () => void;
}

export function VideoSettingsModal({ show, onClose, activeLesson, updateLesson, insertVideoAsBlock }: VideoSettingsModalProps) {
  if (!activeLesson) return null;

  return (
    <AnimatePresence>
      {show && (
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
              <button onClick={onClose} className="p-2 hover:bg-slate-200 rounded-full transition-colors">
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
                    value={activeLesson.videoUrl || ''}
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
                  onChange={(e) => updateLesson({ videoOptions: { ...activeLesson.videoOptions, subtitlesUrl: e.target.value } })}
                />
              </div>

              <div className="grid grid-cols-2 gap-6 pt-2">
                <label className="flex items-center gap-3 cursor-pointer group">
                  <div className="relative">
                    <input
                      type="checkbox"
                      className="sr-only"
                      checked={activeLesson.videoOptions?.autoplay || false}
                      onChange={(e) => updateLesson({ videoOptions: { ...activeLesson.videoOptions, autoplay: e.target.checked } })}
                    />
                    <div className={cn("w-10 h-5 rounded-full transition-all", activeLesson.videoOptions?.autoplay ? "bg-faktory-blue" : "bg-slate-200")}></div>
                    <div className={cn("absolute top-1 left-1 w-3 h-3 bg-white rounded-full transition-all", activeLesson.videoOptions?.autoplay ? "translate-x-5" : "")}></div>
                  </div>
                  <span className="text-xs font-bold text-slate-600 group-hover:text-faktory-blue transition-colors">Reprodução Automática</span>
                </label>

                <label className="flex items-center gap-3 cursor-pointer group">
                  <div className="relative">
                    <input
                      type="checkbox"
                      className="sr-only"
                      checked={activeLesson.videoOptions?.loop || false}
                      onChange={(e) => updateLesson({ videoOptions: { ...activeLesson.videoOptions, loop: e.target.checked } })}
                    />
                    <div className={cn("w-10 h-5 rounded-full transition-all", activeLesson.videoOptions?.loop ? "bg-faktory-blue" : "bg-slate-200")}></div>
                    <div className={cn("absolute top-1 left-1 w-3 h-3 bg-white rounded-full transition-all", activeLesson.videoOptions?.loop ? "translate-x-5" : "")}></div>
                  </div>
                  <span className="text-xs font-bold text-slate-600 group-hover:text-faktory-blue transition-colors">Repetir Vídeo (Loop)</span>
                </label>

                <label className="flex items-center gap-3 cursor-pointer group">
                  <div className="relative">
                    <input
                      type="checkbox"
                      className="sr-only"
                      checked={activeLesson.videoOptions?.controls !== false}
                      onChange={(e) => updateLesson({ videoOptions: { ...activeLesson.videoOptions, controls: e.target.checked } })}
                    />
                    <div className={cn("w-10 h-5 rounded-full transition-all", activeLesson.videoOptions?.controls !== false ? "bg-faktory-blue" : "bg-slate-200")}></div>
                    <div className={cn("absolute top-1 left-1 w-3 h-3 bg-white rounded-full transition-all", activeLesson.videoOptions?.controls !== false ? "translate-x-5" : "")}></div>
                  </div>
                  <span className="text-xs font-bold text-slate-600 group-hover:text-faktory-blue transition-colors">Exibir Controles</span>
                </label>
              </div>
            </div>

            <div className="p-4 bg-slate-50 border-t border-slate-100 flex items-center justify-between gap-3">
              <button
                type="button"
                onClick={() => { updateLesson({ videoUrl: '' }); onClose(); }}
                className="flex items-center gap-2 px-4 py-2 bg-red-600 text-white rounded-lg font-bold text-sm hover:bg-red-700 transition-all"
              >
                <Trash2 size={14} />
                Remover Vídeo
              </button>
              <div className="flex items-center gap-2">
                <button type="button" onClick={insertVideoAsBlock} className="px-4 py-2 bg-white border border-slate-200 rounded-lg font-medium text-sm hover:bg-slate-50 transition-all">
                  Inserir como bloco
                </button>
                <button onClick={onClose} className="px-4 py-2 bg-white border border-slate-200 rounded-lg font-medium text-sm hover:bg-slate-50 transition-all">
                  Cancelar
                </button>
                <button onClick={onClose} className="px-6 py-2 bg-faktory-blue text-white rounded-lg font-bold text-sm hover:bg-[#2c6a9a] transition-all">
                  Confirmar
                </button>
              </div>
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}
