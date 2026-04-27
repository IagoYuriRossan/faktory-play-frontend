import { useState, useEffect } from 'react';
import { useAuthStore } from '../../hooks/store/useAuthStore';
import { Search, Download, Filter, Loader2 } from 'lucide-react';
import { api } from '../../utils/api';
import { Enrollment, User, Company, Trail } from '../../@types';

interface ReportItem {
  id: string;
  company: string;
  user: string;
  trail: string;
  progress: number;
  status: string;
  lastAccess: string;
}

export default function AdminRelatorios() {
  const { user } = useAuthStore();
  const [reports, setReports] = useState<ReportItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCompany, setSelectedCompany] = useState('Todas as Empresas');
  const [selectedStatus, setSelectedStatus] = useState('Todos os Status');
  const [companies, setCompanies] = useState<Company[]>([]);

  useEffect(() => {
    async function fetchReports() {
      try {
        const [enrollments, companies, trails] = await Promise.all([
          api.get<any[]>('/api/reports'),
          api.get<Company[]>('/api/companies'),
          api.get<Trail[]>('/api/trails'),
        ]);

        // Buscar apenas os usuários presentes nas enrollments usando endpoint batch otimizado
        const userIds = Array.from(new Set(enrollments.map((e: any) => e.userId)));
        
        // Usar endpoint batch (aceita até 100 uids por chamada)
        const users = userIds.length > 0 
          ? await api.post<User[]>('/api/users/batch', { uids: userIds, ...(user?.companyId ? { companyId: user.companyId } : {}) })
          : [];

        const usersMap = new Map(users.map(u => [u.id, u]));
        const companiesMap = new Map(companies.map(c => [c.id, c]));
        const trailsMap = new Map(trails.map(t => [t.id, t]));

        setCompanies(companies);

        const combinedReports: ReportItem[] = enrollments.map((data: any) => {
          const user = usersMap.get(data.userId);
          const company = user?.companyId ? companiesMap.get(user.companyId) : null;
          const trail = trailsMap.get(data.trailId);

          let status = 'Não Iniciado';
          if (data.progress === 100) status = 'Concluído';
          else if (data.progress > 0) status = 'Em Andamento';

          return {
            id: data.id,
            company: company?.name || 'N/A',
            user: user?.name || 'N/A',
            trail: trail?.title || 'N/A',
            progress: data.progress,
            status,
            lastAccess: data.lastAccess ? new Date(data.lastAccess).toLocaleDateString('pt-BR') : '-',
          };
        });

        setReports(combinedReports);
      } catch (error) {
        console.error('Error fetching reports:', error);
      } finally {
        setLoading(false);
      }
    }
    fetchReports();
  }, []);

  const filteredReports = reports.filter(report => {
    const matchesSearch = report.user.toLowerCase().includes(searchTerm.toLowerCase()) || 
                         report.company.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesCompany = selectedCompany === 'Todas as Empresas' || report.company === selectedCompany;
    const matchesStatus = selectedStatus === 'Todos os Status' || report.status === selectedStatus;
    return matchesSearch && matchesCompany && matchesStatus;
  });

  const exportCSV = () => {
    const headers = ['Empresa', 'Usuário', 'Trilha', 'Progresso', 'Status', 'Último Acesso'];
    const rows = filteredReports.map(r => [r.company, r.user, r.trail, `${r.progress}%`, r.status, r.lastAccess]);
    
    const csvContent = [
      headers.join(','),
      ...rows.map(row => row.join(','))
    ].join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    const url = URL.createObjectURL(blob);
    link.setAttribute('href', url);
    link.setAttribute('download', `relatorio_faktory_play_${new Date().toISOString().split('T')[0]}.csv`);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="space-y-8">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-800">Relatórios de Engajamento</h1>
          <p className="text-slate-500">Acompanhe o progresso dos alunos em tempo real.</p>
        </div>
        <button 
          onClick={exportCSV}
          className="bg-white border border-slate-200 text-slate-700 px-4 py-2 rounded-lg font-medium flex items-center gap-2 hover:bg-slate-50 transition-colors shadow-sm"
        >
          <Download size={20} />
          <span>Exportar CSV</span>
        </button>
      </div>

      {/* Filters */}
      <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm flex flex-wrap items-center gap-4">
        <div className="relative flex-1 min-w-[200px]">
          <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-400">
            <Search size={18} />
          </div>
          <input
            type="text"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="Buscar por aluno ou empresa..."
            className="block w-full pl-10 pr-3 py-2 border border-slate-200 rounded-lg focus:ring-2 focus:ring-faktory-blue outline-none transition-all"
          />
        </div>
        <select 
          value={selectedCompany}
          onChange={(e) => setSelectedCompany(e.target.value)}
          className="border border-slate-200 rounded-lg px-3 py-2 outline-none focus:ring-2 focus:ring-faktory-blue bg-white text-slate-700"
        >
          <option>Todas as Empresas</option>
          {companies.map(c => (
            <option key={c.id} value={c.name}>{c.name}</option>
          ))}
        </select>
        <select 
          value={selectedStatus}
          onChange={(e) => setSelectedStatus(e.target.value)}
          className="border border-slate-200 rounded-lg px-3 py-2 outline-none focus:ring-2 focus:ring-faktory-blue bg-white text-slate-700"
        >
          <option>Todos os Status</option>
          <option>Concluído</option>
          <option>Em Andamento</option>
          <option>Não Iniciado</option>
        </select>
        <button className="p-2 text-slate-400 hover:text-faktory-blue">
          <Filter size={20} />
        </button>
      </div>

      {/* Table */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
        {loading ? (
          <div className="p-12 flex justify-center">
            <Loader2 className="animate-spin text-faktory-blue" size={32} />
          </div>
        ) : (
          <table className="w-full text-left border-collapse">
            <thead className="bg-slate-50 border-b border-slate-200">
              <tr>
                <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase tracking-wider">Empresa</th>
                <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase tracking-wider">Usuário</th>
                <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase tracking-wider">Trilha</th>
                <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase tracking-wider">Progresso</th>
                <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase tracking-wider">Status</th>
                <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase tracking-wider">Último Acesso</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filteredReports.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-6 py-8 text-center text-slate-400">Nenhum registro encontrado.</td>
                </tr>
              ) : (
                filteredReports.map((report) => (
                  <tr key={report.id} className="hover:bg-slate-50 transition-colors">
                    <td className="px-6 py-4 text-sm font-medium text-slate-800">{report.company}</td>
                    <td className="px-6 py-4 text-sm text-slate-600">{report.user}</td>
                    <td className="px-6 py-4 text-sm text-slate-600">{report.trail}</td>
                    <td className="px-6 py-4">
                      <div className="w-full bg-slate-100 rounded-full h-2 max-w-[100px]">
                        <div
                          className="bg-faktory-blue h-2 rounded-full transition-all duration-500"
                          style={{ width: `${report.progress}%` }}
                        ></div>
                      </div>
                      <span className="text-[10px] font-bold text-slate-500 mt-1 block">{report.progress}%</span>
                    </td>
                    <td className="px-6 py-4">
                      <span className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase ${
                        report.status === 'Concluído' ? 'bg-green-100 text-green-700' :
                        report.status === 'Em Andamento' ? 'bg-blue-100 text-blue-700' :
                        'bg-slate-100 text-slate-600'
                      }`}>
                        {report.status}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-sm text-slate-500">{report.lastAccess}</td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}
