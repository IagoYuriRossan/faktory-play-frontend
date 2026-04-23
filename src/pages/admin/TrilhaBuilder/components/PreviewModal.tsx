import { motion, AnimatePresence } from 'framer-motion';
import { TrailData } from '../hooks/useTrailData';

interface PreviewModalProps {
  show: boolean;
  onClose: () => void;
  onRefresh: () => void;
  trailData: TrailData;
}

export function PreviewModal({ show, onClose, onRefresh, trailData }: PreviewModalProps) {
  return (
    <AnimatePresence>
      {show && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-[110] p-4">
          <motion.div initial={{ opacity: 0, scale: 0.98 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.98 }} className="bg-white rounded-xl shadow-2xl w-full max-w-4xl overflow-auto" style={{ maxHeight: '90vh' }}>
            <div className="p-4 border-b flex items-center justify-between sticky top-0 bg-white z-10 shadow-sm">
              <h3 className="font-bold text-lg">Visualização da Trilha</h3>
              <div className="flex items-center gap-2">
                <button onClick={onRefresh} className="px-3 py-1 text-sm border rounded hover:bg-slate-50 transition-colors">Recarregar</button>
                <button onClick={onClose} className="px-3 py-1 bg-faktory-blue text-white rounded hover:bg-blue-600 transition-colors">Fechar</button>
              </div>
            </div>
            <div className="p-6">
              <h2 className="text-2xl font-bold mb-2">{trailData.title}</h2>
              <p className="text-slate-500 mb-6">{trailData.description}</p>
              <div className="space-y-4">
                {trailData.modules.map((m) => (
                  <div key={m.id} className="p-4 border rounded shadow-sm">
                    <h4 className="font-bold text-lg">{m.title}</h4>
                    <ul className="list-disc pl-6 mt-2 space-y-1">
                      {(m.etapas || []).map(l => <li key={l.id} className="text-slate-700">{l.title}</li>)}
                    </ul>
                    {(m.submodules || []).map(sm => (
                      <div key={sm.id} className="mt-3 ml-4 p-3 border rounded bg-slate-50">
                        <h5 className="font-semibold">{sm.title}</h5>
                        <ul className="list-disc pl-6 mt-2 space-y-1">
                          {(sm.etapas || []).map(l => <li key={l.id} className="text-slate-700">{l.title}</li>)}
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
  );
}
