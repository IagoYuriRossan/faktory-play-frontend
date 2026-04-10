import React, { useEffect, useState } from 'react';
import { Plus, Search, Trash2, Loader2, Layers, User, BookOpen } from 'lucide-react';
import { api } from '../../utils/api';
import { Project, User as UserType, Trail, Company, Enrollment } from '../../@types';
import { cn } from '../../utils/utils';

export default function AdminProjetos() {
  const [projects, setProjects] = useState<Project[]>([]);
  const [users, setUsers] = useState<UserType[]>([]);
  const [trails, setTrails] = useState<Trail[]>([]);
  const [companies, setCompanies] = useState<Company[]>([]);
  const [companyTrails, setCompanyTrails] = useState<Record<string, any[]>>({});
  const [companyTrailsLoading, setCompanyTrailsLoading] = useState<Record<string, boolean>>({});
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [saving, setSaving] = useState(false);

  // Form State
  const [selectedUser, setSelectedUser] = useState('');
  const [selectedTrail, setSelectedTrail] = useState('');

  useEffect(() => {
    async function fetchData() {
      try {
        const [projectsData, usersData, trailsData, companiesData] = await Promise.all([
          api.get<Project[]>('/api/projects'),
          api.get<UserType[]>('/api/users'),
          api.get<Trail[]>('/api/trails'),
          api.get<Company[]>('/api/companies'),
        ]);

        setProjects(projectsData);
        setUsers(usersData.filter(u => u.role === 'student'));
        setTrails(trailsData);
        setCompanies(companiesData);
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

  const [expandedCompanies, setExpandedCompanies] = useState<Record<string, boolean>>({});

  const loadCompanyTrails = async (companyId: string) => {
    if (companyTrails[companyId]) return; // already loaded
    setCompanyTrailsLoading(prev => ({ ...prev, [companyId]: true }));
    try {
      const data = await api.get<any[]>(`/api/companies/${companyId}/trails-with-users`);
      console.debug('[API] /api/companies/' + companyId + '/trails-with-users →', data);
      setCompanyTrails(prev => ({ ...prev, [companyId]: data }));
    } catch (err) {
      console.error('Error loading company trails:', err);
      setCompanyTrails(prev => ({ ...prev, [companyId]: [] }));
    } finally {
      setCompanyTrailsLoading(prev => ({ ...prev, [companyId]: false }));
    }
  };

  const toggleCompany = (companyId: string) => {
    const isOpen = !!expandedCompanies[companyId];
    setExpandedCompanies(prev => ({ ...prev, [companyId]: !isOpen }));
    if (!isOpen) loadCompanyTrails(companyId);
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
        {companies.length === 0 ? (
          <div className="p-12 text-center text-slate-500">Nenhuma empresa cadastrada.</div>
        ) : (
          companies.map((company) => (
            <div key={company.id} className="border-b last:border-b-0">
              <div
                className="flex items-center justify-between px-6 py-4 cursor-pointer"
                onClick={() => toggleCompany(company.id)}
              >
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 bg-blue-50 rounded-lg flex items-center justify-center text-faktory-blue">
                    <Layers size={18} />
                  </div>
                  <div>
                    <p className="text-sm font-bold text-slate-800">{company.name}</p>
                    <p className="text-xs text-slate-400">{company.cnpj}</p>
                  </div>
                </div>
                <div className="text-sm text-slate-500">{company.allowedTrails.length} trilha(s)</div>
              </div>

              {expandedCompanies[company.id] && (
                <div className="px-6 pb-6">
                  {companyTrailsLoading[company.id] ? (
                    <div className="p-6 flex items-center justify-center">
                      <Loader2 className="animate-spin text-faktory-blue" />
                    </div>
                  ) : (
                    <>
                      {companyTrails[company.id] && companyTrails[company.id].length > 0 ? (
                        <table className="w-full text-left border-collapse">
                          <thead>
                            <tr className="bg-slate-50 border-b border-slate-200">
                              <th className="px-4 py-3 text-xs font-bold text-slate-500 uppercase tracking-wider">Trilha</th>
                              <th className="px-4 py-3 text-xs font-bold text-slate-500 uppercase tracking-wider">Alunos</th>
                              <th className="px-4 py-3 text-xs font-bold text-slate-500 uppercase tracking-wider text-right">Ações</th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-slate-100">
                            {companyTrails[company.id].map((trailItem: any) => {
                              const trailTitle = trailItem.title || trailItem.trail?.title || '—';
                              const usersList = trailItem.users || trailItem.usersWithProgress || trailItem.usersWithUserTrail || [];

                              return (
                                <tr key={trailItem.id || trailItem.trail?.id} className="hover:bg-slate-50/50 transition-colors">
                                  <td className="px-4 py-3 align-top">
                                    <div className="flex items-center gap-2">
                                      <BookOpen size={14} className="text-orange-400" />
                                      <span className="text-sm text-slate-700 font-medium">{trailTitle}</span>
                                    </div>
                                  </td>
                                  <td className="px-4 py-3">
                                    <div className="flex flex-col gap-2">
                                      {usersList.length === 0 ? (
                                        <span className="text-sm text-slate-400 italic">Nenhum aluno vinculado</span>
                                      ) : (
                                        usersList.map((u: any) => {
                                          const userObj = u.user || u;
                                          const userTrail: Enrollment | undefined = u.userTrail || u.userTrailRef || u.enrollment || undefined;
                                          const progress = userTrail?.progress ?? (u.progress ?? null);

                                          return (
                                            <div key={userObj.id || userObj.email} className="flex items-center justify-between">
                                              <div className="flex items-center gap-3">
                                                <div className="w-8 h-8 bg-blue-50 rounded-full flex items-center justify-center text-faktory-blue">
                                                  <User size={14} />
                                                </div>
                                                <div>
                                                  <p className="text-sm font-bold text-slate-700">{userObj.name || userObj.email}</p>
                                                  <p className="text-xs text-slate-400">{userObj.email}</p>
                                                </div>
                                              </div>
                                              <div className="text-xs text-slate-500 font-bold">
                                                {progress !== null && progress !== undefined ? `${Math.round(progress)}%` : '--'}
                                              </div>
                                            </div>
                                          );
                                        })
                                      )}
                                    </div>
                                  </td>
                                  <td className="px-4 py-3 text-right">
                                    <div className="text-xs text-slate-500">&nbsp;</div>
                                  </td>
                                </tr>
                              );
                            })}
                          </tbody>
                        </table>
                      ) : (
                        <div className="p-4 text-sm text-slate-500">Nenhuma trilha permitida para esta empresa.</div>
                      )}
                    </>
                  )}
                </div>
              )}
            </div>
          ))
        )}
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
