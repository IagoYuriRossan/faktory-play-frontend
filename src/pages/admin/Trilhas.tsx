import { useEffect, useState } from 'react';
import { Plus, Search, MoreVertical, BookOpen, Loader2 } from 'lucide-react';
import { Link } from 'react-router-dom';
import { api } from '../../utils/api';
import { Trail } from '../../@types';

export default function AdminTrilhas() {
  const [trails, setTrails] = useState<Trail[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');

  useEffect(() => {
    async function fetchTrails() {
      try {
        const trailsData = await api.get<Trail[]>('/api/trails');
        setTrails(trailsData);
      } catch (error) {
        console.error('Error fetching trails:', error);
      } finally {
        setLoading(false);
      }
    }

    fetchTrails();
  }, []);

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
                  <button className="p-1 text-slate-300 hover:text-slate-600">
                    <MoreVertical size={18} />
                  </button>
                </div>
                <div className="p-6">
                  <h3 className="font-bold text-slate-800 mb-2">{trail.title}</h3>
                  <p className="text-xs text-slate-500 line-clamp-2 mb-4">{trail.description}</p>
                  
                  <div className="flex items-center justify-between pt-4 border-t border-slate-50">
                    <span className="text-[10px] font-bold text-slate-400 uppercase">
                      {trail.modules.length} Módulos
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
    </div>
  );
}
