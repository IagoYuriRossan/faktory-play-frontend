import { useEffect, useState } from 'react';
import { useAuthStore } from '../../hooks/store/useAuthStore';
import { api } from '../../utils/api';
import { Layers, Loader2 } from 'lucide-react';

interface Project {
  id: string;
  ownerUid: string;
  templateId?: string;
  title: string;
  description?: string;
  status: 'active' | 'inactive';
  createdAt: any;
}

interface Trail {
  id: string;
  title: string;
  description: string;
}

interface UserData {
  id: string;
  name: string;
  email: string;
}

interface ProjectRow {
  project: Project;
  trail: Trail | undefined;
  member: UserData | undefined;
}

export default function EmpresaProjetos() {
  const { user } = useAuthStore();
  const [rows, setRows] = useState<ProjectRow[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchData() {
      if (!user) return;
      try {
        const [projects, trails, membersData] = await Promise.all([
          api.get<Project[]>('/api/projects'),
          api.get<Trail[]>('/api/trails'),
          api.get<{ members: UserData[] }>(`/api/companies/${user.companyId}/members`),
        ]);

        const trailsMap = new Map(trails.map(t => [t.id, t]));
        const usersMap = new Map((membersData.members || []).map(u => [u.id, u]));

        setRows(
          projects.map(p => ({
            project: p,
            trail: p.templateId ? trailsMap.get(p.templateId) : undefined,
            member: usersMap.get(p.ownerUid),
          }))
        );
      } catch (err) {
        console.error('Erro ao carregar projetos:', err);
      } finally {
        setLoading(false);
      }
    }
    fetchData();
  }, [user]);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-slate-800">Projetos</h1>
        <p className="text-sm text-slate-500 mt-1">Acompanhe os treinamentos ativos da sua empresa.</p>
      </div>

      {loading ? (
        <div className="flex justify-center py-20">
          <Loader2 className="animate-spin text-faktory-blue" size={32} />
        </div>
      ) : rows.length === 0 ? (
        <div className="bg-white rounded-xl border border-slate-200 p-12 text-center">
          <Layers size={40} className="mx-auto text-slate-300 mb-3" />
          <p className="text-slate-500 font-medium">Nenhum projeto encontrado.</p>
          <p className="text-slate-400 text-sm mt-1">Entre em contato com a Faktory para liberar treinamentos.</p>
        </div>
      ) : (
        <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-slate-50 border-b border-slate-200">
              <tr>
                <th className="text-left px-5 py-3 text-xs font-bold text-slate-500 uppercase">Membro</th>
                <th className="text-left px-5 py-3 text-xs font-bold text-slate-500 uppercase">Trilha</th>
                <th className="text-left px-5 py-3 text-xs font-bold text-slate-500 uppercase">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {rows.map(({ project, trail, member }) => (
                <tr key={project.id} className="hover:bg-slate-50 transition-colors">
                  <td className="px-5 py-3">
                    <p className="font-medium text-slate-800">{member?.name || '—'}</p>
                    <p className="text-xs text-slate-400">{member?.email || ''}</p>
                  </td>
                  <td className="px-5 py-3 text-slate-700">{project.title || trail?.title || '—'}</td>
                  <td className="px-5 py-3">
                    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-bold ${
                      project.status === 'active'
                        ? 'bg-green-100 text-green-700'
                        : 'bg-slate-100 text-slate-500'
                    }`}>
                      {project.status === 'active' ? 'Ativo' : 'Inativo'}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
