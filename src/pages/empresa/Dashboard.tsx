import { useEffect, useState } from 'react';
import { useAuthStore } from '../../hooks/store/useAuthStore';
import { api } from '../../utils/api';
import { Users, Layers, BookOpen, Loader2 } from 'lucide-react';
import { Link } from 'react-router-dom';

export default function EmpresaDashboard() {
  const { user } = useAuthStore();
  const [stats, setStats] = useState({ members: 0, projects: 0, trails: 0 });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchStats() {
      if (!user?.companyId) return;
      try {
        const [membersData, projects, trails] = await Promise.all([
          api.get<{ members: any[]; pendingInvites: any[] }>(`/api/companies/${user.companyId}/members`),
          api.get<any[]>('/api/projects'),
          api.get<any[]>('/api/trails'),
        ]);
        setStats({
          members: (membersData.members ?? []).length,
          projects: projects.length,
          trails: trails.length,
        });
      } catch (err) {
        console.error('Erro ao carregar dashboard:', err);
      } finally {
        setLoading(false);
      }
    }
    fetchStats();
  }, []);

  const today = new Date().toLocaleDateString('pt-BR', { weekday: 'long', day: 'numeric', month: 'long' });

  const cards = [
    { label: 'Membros', value: stats.members, icon: Users, color: 'text-blue-500', bg: 'bg-blue-50', href: '/empresa/membros' },
    { label: 'Projetos Ativos', value: stats.projects, icon: Layers, color: 'text-orange-500', bg: 'bg-orange-50', href: '/empresa/projetos' },
    { label: 'Trilhas Disponíveis', value: stats.trails, icon: BookOpen, color: 'text-green-500', bg: 'bg-green-50', href: '/empresa/projetos' },
  ];

  return (
    <div className="space-y-6">
      {/* Welcome */}
      <div className="bg-white rounded-xl border-t-4 border-faktory-blue shadow-sm p-8">
        <p className="text-xs font-bold text-slate-400 mb-1 capitalize">{today}</p>
        <h1 className="text-2xl font-bold text-slate-800">
          Olá, <span className="text-faktory-blue">{user?.name?.split(' ')[0]}</span>
        </h1>
        <p className="text-sm text-slate-500 mt-1">Aqui está o resumo dos treinamentos da sua empresa.</p>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
        {cards.map(card => (
          <Link
            key={card.label}
            to={card.href}
            className="bg-white p-6 rounded-xl shadow-sm border border-slate-100 flex items-center gap-4 hover:shadow-md transition-shadow"
          >
            <div className={`w-12 h-12 ${card.bg} ${card.color} rounded-xl flex items-center justify-center shrink-0`}>
              <card.icon size={24} />
            </div>
            <div>
              <p className="text-[10px] font-bold text-slate-400 uppercase">{card.label}</p>
              <p className="text-2xl font-bold text-slate-800">{loading ? '...' : card.value}</p>
            </div>
          </Link>
        ))}
      </div>
    </div>
  );
}
