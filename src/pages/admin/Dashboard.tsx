import { useEffect, useState } from 'react';
import { AlertCircle, CheckCircle2, BarChart3, ChevronRight, Users, Building2, BookOpen } from 'lucide-react';
import { useAuthStore } from '../../hooks/store/useAuthStore';
import { cn } from '../../utils/utils';
import { api } from '../../utils/api';

export default function AdminDashboard() {
  const { user } = useAuthStore();
  const [stats, setStats] = useState({
    companies: 0,
    users: 0,
    trails: 0
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchStats() {
      try {
        const [companies, users, trails] = await Promise.all([
          api.get<any[]>('/api/companies'),
          api.get<any[]>('/api/users'),
          api.get<any[]>('/api/trails'),
        ]);

        setStats({
          companies: companies.length,
          users: users.length,
          trails: trails.length,
        });
      } catch (error) {
        console.error('Error fetching stats:', error);
      } finally {
        setLoading(false);
      }
    }

    fetchStats();
  }, []);
  
  const today = new Date().toLocaleDateString('pt-BR', { weekday: 'long', day: 'numeric', month: 'long' });
  const now = new Date().toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });

  return (
    <div className="space-y-6">
      {/* Welcome Card */}
      <div className="bg-white rounded-xl shadow-sm border-t-4 border-faktory-blue p-8 relative overflow-hidden">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-xs font-bold text-slate-400 mb-1 capitalize">{today}</p>
            <h1 className="text-3xl font-bold text-slate-800">Boa tarde, <span className="text-faktory-blue">{user?.name.split(' ')[0]}</span></h1>
            <p className="text-sm text-slate-500 mt-1">Aqui está o resumo da plataforma Faktory Play.</p>
            <p className="text-[10px] text-gray-300 mt-4 uppercase font-bold">Atualizado às {now}</p>
          </div>
          <div className="flex items-center gap-3">
            <button className="bg-green-500 text-white text-[10px] font-bold px-4 py-2 rounded-lg shadow-sm">Sistema Online</button>
          </div>
        </div>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-100 flex items-center gap-4">
          <div className="w-12 h-12 bg-blue-50 text-faktory-blue rounded-xl flex items-center justify-center">
            <Building2 size={24} />
          </div>
          <div>
            <p className="text-[10px] font-bold text-slate-400 uppercase">Empresas Clientes</p>
            <p className="text-2xl font-bold text-slate-800">{loading ? '...' : stats.companies}</p>
          </div>
        </div>
        <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-100 flex items-center gap-4">
          <div className="w-12 h-12 bg-green-50 text-green-600 rounded-xl flex items-center justify-center">
            <Users size={24} />
          </div>
          <div>
            <p className="text-[10px] font-bold text-slate-400 uppercase">Total de Alunos</p>
            <p className="text-2xl font-bold text-slate-800">{loading ? '...' : stats.users}</p>
          </div>
        </div>
        <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-100 flex items-center gap-4">
          <div className="w-12 h-12 bg-orange-50 text-orange-600 rounded-xl flex items-center justify-center">
            <BookOpen size={24} />
          </div>
          <div>
            <p className="text-[10px] font-bold text-slate-400 uppercase">Trilhas Ativas</p>
            <p className="text-2xl font-bold text-slate-800">{loading ? '...' : stats.trails}</p>
          </div>
        </div>
      </div>

      {/* Urgent Alerts */}
      <div className="bg-white rounded-xl shadow-sm border border-slate-100 overflow-hidden">
        <div className="p-4 border-b border-slate-50 flex items-center gap-3">
          <div className="w-8 h-8 bg-orange-100 text-orange-600 rounded-lg flex items-center justify-center">
            <AlertCircle size={18} />
          </div>
          <h2 className="text-sm font-bold text-slate-800">Alertas urgentes</h2>
          <span className="ml-auto w-5 h-5 bg-orange-100 text-orange-600 text-[10px] font-bold rounded-full flex items-center justify-center">1</span>
        </div>
        <div className="p-6">
          <div className="flex items-center justify-between group cursor-pointer">
            <div>
              <p className="text-sm font-bold text-slate-700">Pedidos de venda em aberto</p>
              <p className="text-xs text-slate-500">3 pedidos aguardando faturamento</p>
            </div>
            <ChevronRight size={16} className="text-slate-300 group-hover:text-faktory-blue transition-colors" />
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Tasks Card */}
        <div className="bg-white rounded-xl shadow-sm border border-slate-100">
          <div className="p-4 border-b border-slate-50 flex items-center gap-3">
            <div className="w-8 h-8 bg-blue-100 text-faktory-blue rounded-lg flex items-center justify-center">
              <CheckCircle2 size={18} />
            </div>
            <h2 className="text-sm font-bold text-slate-800">Tarefas do dia</h2>
            <span className="bg-blue-50 text-faktory-blue text-[10px] font-bold px-2 py-0.5 rounded-full">3 pendências</span>
          </div>
          <div className="p-6 space-y-6">
            {[
              { title: 'Títulos a receber em aberto', desc: '2 título(s) pendente(s) de recebimento', tag: 'Financeiro', tagColor: 'bg-green-50 text-green-600' },
              { title: 'Títulos a pagar em aberto', desc: '6 título(s) pendente(s) de pagamento', tag: 'Financeiro', tagColor: 'bg-green-50 text-green-600' },
              { title: 'Pedidos de venda em aberto', desc: '3 pedido(s) aguardando faturamento', tag: 'Vendas', tagColor: 'bg-orange-50 text-orange-600' },
            ].map((task, i) => (
              <div key={i} className="group cursor-pointer">
                <p className="text-sm font-bold text-slate-700">{task.title}</p>
                <p className="text-xs text-slate-500">{task.desc}</p>
                <span className={cn("text-[10px] font-bold px-2 py-0.5 rounded mt-2 inline-block", task.tagColor)}>{task.tag}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Business Summary */}
        <div className="bg-white rounded-xl shadow-sm border border-slate-100">
          <div className="p-4 border-b border-slate-50 flex items-center gap-3">
            <div className="w-8 h-8 bg-slate-100 text-slate-600 rounded-lg flex items-center justify-center">
              <BarChart3 size={18} />
            </div>
            <h2 className="text-sm font-bold text-slate-800">Resumo do negócio</h2>
          </div>
          <div className="p-6 grid grid-cols-2 gap-4">
            {[
              { label: 'Recebido no mês', value: 'R$ 0,00', desc: 'Valor recebido no mês atual', color: 'border-green-500', icon: '💰' },
              { label: 'A receber', value: 'R$ 1.000', desc: 'Total em títulos em aberto', color: 'border-blue-500', icon: '📈' },
              { label: 'A pagar', value: 'R$ 10.600', desc: 'Total em títulos a pagar', color: 'border-red-500', icon: '📉' },
              { label: 'Pedidos no mês', value: 'R$ 0,00', desc: '0 pedido(s) criado(s)', color: 'border-orange-500', icon: '🛒' },
            ].map((stat, i) => (
              <div key={i} className={cn("p-4 rounded-lg border-l-4 bg-slate-50/50", stat.color)}>
                <div className="flex items-center gap-2 mb-1">
                  <span className="text-xs">{stat.icon}</span>
                  <p className="text-[10px] font-bold text-slate-400 uppercase">{stat.label}</p>
                </div>
                <p className="text-lg font-bold text-slate-800">{stat.value}</p>
                <p className="text-[9px] text-slate-400">{stat.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
