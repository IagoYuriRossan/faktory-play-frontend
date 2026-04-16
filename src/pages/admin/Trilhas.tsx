import { useEffect, useState } from 'react';
import { Plus, Search, MoreVertical, BookOpen, Loader2 } from 'lucide-react';
import { Link, useLocation } from 'react-router-dom';
import { api } from '../../utils/api';
import { TrailSummary } from '../../@types';
import { useAuthStore } from '../../hooks/store/useAuthStore';

export default function AdminTrilhas() {
  const [trails, setTrails] = useState<TrailSummary[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [openMenuId, setOpenMenuId] = useState<string | null>(null);
  const { user } = useAuthStore();
  const location = useLocation();
  const [toast, setToast] = useState<{ type: 'success' | 'error'; message: string } | null>(null);

  const showToast = (type: 'success' | 'error', message: string) => {
    setToast({ type, message });
    setTimeout(() => setToast(null), 3500);
  };

  const fetchTrails = async () => {
    setLoading(true);
    try {
      const trailsData = await api.get<TrailSummary[]>('/api/trails');
      setTrails(trailsData);
    } catch (error) {
      console.error('Error fetching trails:', error);
      showToast('error', 'Erro ao carregar trilhas. Veja o console.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchTrails(); }, [location.key]);

  const filteredTrails = trails.filter(t => 
    t.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
    t.description.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="space-y-8">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-800">Trilhas de Treinamento</h1>
          <p className="text-slate-500">Gerencie os cursos, módulos e aulas da plataforma.</p>
        </div>
        <Link 
          to="/admin/trilhas/nova"
          className="bg-faktory-blue text-white px-4 py-2 rounded-lg font-medium flex items-center gap-2 hover:bg-[#2c6a9a] transition-colors shadow-lg shadow-blue-100"
        >
          <Plus size={20} />
          <span>Nova Trilha</span>
        </Link>
      </div>

      {/* Filters */}
      <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm flex items-center gap-4">
        <div className="relative flex-1">
          <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-400">
            <Search size={18} />
          </div>
          <input
            type="text"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="Buscar por título ou descrição..."
            className="block w-full pl-10 pr-3 py-2 border border-slate-200 rounded-lg focus:ring-2 focus:ring-faktory-blue focus:border-faktory-blue outline-none transition-all text-sm"
          />
        </div>
      </div>

      {/* Grid */}
      {loading ? (
        <div className="p-12 flex justify-center">
          <Loader2 className="animate-spin text-faktory-blue" size={32} />
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredTrails.length === 0 ? (
            <div className="col-span-full bg-white p-12 rounded-xl border border-slate-200 text-center text-slate-500">
              Nenhuma trilha encontrada.
            </div>
          ) : (
            filteredTrails.map((trail) => (
              <div key={trail.id} className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden hover:shadow-md transition-shadow group">
                <div className="h-24 bg-slate-50 p-6 flex items-center justify-between border-b border-slate-100">
                  <div className="w-12 h-12 bg-white rounded-lg shadow-sm border border-slate-100 flex items-center justify-center text-faktory-blue">
                    <BookOpen size={24} />
                  </div>
                  <div className="relative">
                    <button onClick={() => setOpenMenuId(openMenuId === trail.id ? null : trail.id)} className="p-1 text-slate-300 hover:text-slate-600">
                      <MoreVertical size={18} />
                    </button>

                    {openMenuId === trail.id && (
                      <div className="absolute right-0 mt-2 w-40 bg-white border border-slate-200 rounded-md shadow-lg z-50">
                        <Link to={`/admin/trilhas/${trail.id}`} className="block px-3 py-2 text-sm text-slate-700 hover:bg-slate-50">Visualizar</Link>
                        {user?.role === 'superadmin' && (
                          <button
                            className="w-full text-left px-3 py-2 text-sm text-red-600 hover:bg-slate-50"
                            onClick={() => {
                              const confirmDelete = window.confirm('Remover trilha? Esta ação é irreversível.');
                              if (!confirmDelete) return;
                              // Optimistic: remove from list immediately
                              setTrails(prev => prev.filter(t => t.id !== trail.id));
                              setOpenMenuId(null);
                              showToast('success', 'Trilha removida.');
                              // Delete in background; restore on failure
                              api.delete(`/api/trails/${trail.id}`).catch((err: any) => {
                                console.error('Erro removendo trilha:', err);
                                showToast('error', 'Erro ao remover trilha — recarregando lista.');
                                fetchTrails();
                              });
                            }}
                          >
                            Remover
                          </button>
                        )}
                      </div>
                    )}
                  </div>
                </div>
                <div className="p-6">
                  <h3 className="font-bold text-slate-800 mb-2">{trail.title}</h3>
                  <p className="text-xs text-slate-500 line-clamp-2 mb-4">{trail.description}</p>
                  
                  <div className="flex items-center justify-between pt-4 border-t border-slate-50">
                    <span className="text-[10px] font-bold text-slate-400 uppercase">
                      {trail.moduleCount} Módulos
                    </span>
                    <Link
                      to={`/admin/trilhas/${trail.id}`}
                      className="text-xs font-bold text-faktory-blue hover:underline"
                    >
                      Editar Trilha
                    </Link>
                  </div>
                </div>
              </div>
            ))
          )}
        </div>
      )}
      {toast && (
        <div className={`fixed right-4 bottom-6 z-50 px-4 py-2 rounded shadow-lg ${toast.type === 'success' ? 'bg-green-600 text-white' : 'bg-red-600 text-white'}`}>
          {toast.message}
        </div>
      )}
    </div>
  );
}
