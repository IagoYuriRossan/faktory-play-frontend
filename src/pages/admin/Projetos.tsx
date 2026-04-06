import React, { useEffect, useState } from 'react';
import { Plus, Search, Trash2, Loader2, Layers, User, BookOpen } from 'lucide-react';
import { api } from '../../utils/api';
import { Project, User as UserType, Trail } from '../../@types';
import { cn } from '../../utils/utils';

export default function AdminProjetos() {
  const [projects, setProjects] = useState<Project[]>([]);
  const [users, setUsers] = useState<UserType[]>([]);
  const [trails, setTrails] = useState<Trail[]>([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [saving, setSaving] = useState(false);

  // Form State
  const [selectedUser, setSelectedUser] = useState('');
  const [selectedTrail, setSelectedTrail] = useState('');

  useEffect(() => {
    async function fetchData() {
      try {
        const [projectsData, usersData, trailsData] = await Promise.all([
          api.get<Project[]>('/api/projects'),
          api.get<UserType[]>('/api/users'),
          api.get<Trail[]>('/api/trails'),
        ]);

        setProjects(projectsData);
        setUsers(usersData.filter(u => u.role === 'student'));
        setTrails(trailsData);
      } catch (error) {
        console.error('Error fetching projects data:', error);
      } finally {
        setLoading(false);
      }
    }

    fetchData();
  }, []);

  const handleCreateProject = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedUser || !selectedTrail) return;

    setSaving(true);
    try {
      const created = await api.post<{ id: string }>('/api/projects', {
        clientId: selectedUser,
        trailId: selectedTrail,
        status: 'active',
      });
      const newProject: Project = {
        id: created.id,
        clientId: selectedUser,
        trailId: selectedTrail,
        status: 'active',
        createdAt: new Date(),
      };
      setProjects(prev => [...prev, newProject]);
      setShowModal(false);
      setSelectedUser('');
      setSelectedTrail('');
    } catch (error) {
      console.error('Error creating project:', error);
    } finally {
      setSaving(false);
    }
  };

  const handleDeleteProject = async (id: string) => {
    if (!confirm('Tem certeza que deseja remover este projeto? O aluno perderá acesso ao curso.')) return;

    try {
      await api.delete(`/api/projects/${id}`);
      setProjects(prev => prev.filter(p => p.id !== id));
    } catch (error) {
      console.error('Error deleting project:', error);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <Loader2 className="animate-spin text-faktory-blue" size={40} />
      </div>
    );
  }

  return (
    <div className="space-y-8">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-800">Gestão de Projetos</h1>
          <p className="text-slate-500 text-sm">Vincule alunos aos seus respectivos cursos (produtos).</p>
        </div>
        <button 
          onClick={() => setShowModal(true)}
          className="bg-faktory-blue text-white px-4 py-2 rounded-lg font-bold flex items-center gap-2 hover:bg-[#2c6a9a] transition-all shadow-lg shadow-blue-100"
        >
          <Plus size={20} />
          <span>Novo Projeto</span>
        </button>
      </div>

      <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
        <table className="w-full text-left border-collapse">
          <thead>
            <tr className="bg-slate-50 border-b border-slate-200">
              <th className="px-6 py-4 text-[10px] font-bold text-slate-400 uppercase tracking-widest">Aluno</th>
              <th className="px-6 py-4 text-[10px] font-bold text-slate-400 uppercase tracking-widest">Produto (Curso)</th>
              <th className="px-6 py-4 text-[10px] font-bold text-slate-400 uppercase tracking-widest">Status</th>
              <th className="px-6 py-4 text-[10px] font-bold text-slate-400 uppercase tracking-widest text-right">Ações</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {projects.length === 0 ? (
              <tr>
                <td colSpan={4} className="px-6 py-12 text-center text-slate-400 italic">Nenhum projeto vinculado ainda.</td>
              </tr>
            ) : (
              projects.map((project) => {
                const user = users.find(u => u.id === project.clientId);
                const trail = trails.find(t => t.id === project.trailId);

                return (
                  <tr key={project.id} className="hover:bg-slate-50/50 transition-colors">
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 bg-blue-50 rounded-full flex items-center justify-center text-faktory-blue">
                          <User size={16} />
                        </div>
                        <div>
                          <p className="text-sm font-bold text-slate-700">{user?.name || 'Usuário não encontrado'}</p>
                          <p className="text-[10px] text-slate-400">{user?.email}</p>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-2">
                        <BookOpen size={14} className="text-orange-400" />
                        <span className="text-sm text-slate-600 font-medium">{trail?.title || 'Curso não encontrado'}</span>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <span className={cn(
                        "px-2 py-1 rounded-full text-[10px] font-bold uppercase",
                        project.status === 'active' ? "bg-green-100 text-green-600" : "bg-slate-100 text-slate-400"
                      )}>
                        {project.status === 'active' ? 'Ativo' : 'Inativo'}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-right">
                      <button 
                        onClick={() => handleDeleteProject(project.id)}
                        className="p-2 text-slate-300 hover:text-red-500 transition-colors"
                      >
                        <Trash2 size={16} />
                      </button>
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>

      {/* Create Project Modal */}
      {showModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl shadow-2xl w-full max-w-md overflow-hidden">
            <div className="p-6 border-b border-slate-100 flex items-center justify-between">
              <h2 className="text-lg font-bold text-slate-800">Vincular Novo Projeto</h2>
              <button onClick={() => setShowModal(false)} className="text-slate-400 hover:text-slate-600">×</button>
            </div>
            <form onSubmit={handleCreateProject} className="p-6 space-y-6">
              <div>
                <label className="block text-xs font-bold text-slate-500 uppercase mb-2">Selecionar Aluno</label>
                <select 
                  required
                  value={selectedUser}
                  onChange={(e) => setSelectedUser(e.target.value)}
                  className="w-full p-3 bg-slate-50 border border-slate-200 rounded-lg text-sm outline-none focus:ring-2 focus:ring-faktory-blue"
                >
                  <option value="">Selecione um aluno...</option>
                  {users.map(u => (
                    <option key={u.id} value={u.id}>{u.name} ({u.email})</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-500 uppercase mb-2">Selecionar Produto (Curso)</label>
                <select 
                  required
                  value={selectedTrail}
                  onChange={(e) => setSelectedTrail(e.target.value)}
                  className="w-full p-3 bg-slate-50 border border-slate-200 rounded-lg text-sm outline-none focus:ring-2 focus:ring-faktory-blue"
                >
                  <option value="">Selecione um curso...</option>
                  {trails.map(t => (
                    <option key={t.id} value={t.id}>{t.title}</option>
                  ))}
                </select>
              </div>

              <div className="flex gap-3 pt-4">
                <button 
                  type="button"
                  onClick={() => setShowModal(false)}
                  className="flex-1 py-3 text-sm font-bold text-slate-500 hover:bg-slate-50 rounded-lg transition-all"
                >
                  Cancelar
                </button>
                <button 
                  type="submit"
                  disabled={saving}
                  className="flex-1 py-3 bg-faktory-blue text-white rounded-lg font-bold text-sm hover:bg-[#2c6a9a] transition-all shadow-lg shadow-blue-100 disabled:opacity-50"
                >
                  {saving ? 'Salvando...' : 'Criar Projeto'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
