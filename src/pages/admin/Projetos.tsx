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
  const [selectedUserForModal, setSelectedUserForModal] = useState<any>(null);
  const [selectedUserTrails, setSelectedUserTrails] = useState<any[]>([]);
  const [selectedUserLoading, setSelectedUserLoading] = useState(false);
  
  const handleOpenUserModal = async (user: any) => {
    setSelectedUserForModal(user);
    setSelectedUserLoading(true);
    // try to find user trails from companyTrails first
    const trailsFromCompany: any[] = [];
    try {
      // aggregate any trail entries that include this user
      Object.values(companyTrails).forEach((arr: any[]) => {
        arr.forEach(item => {
          const usersArr = item.users || item.usersWithProgress || item.usersWithUserTrail || [];
          usersArr.forEach((u: any) => {
            const uid = u.uid || u.user?.uid || u.user?.id || u.id || u.userId || null;
            if (uid && (uid === user.id || uid === user.uid)) {
              trailsFromCompany.push({
                trailId: item.id || item.trail?.id,
                title: item.title || item.trail?.title,
                totalProgress: u.totalProgress ?? u.userTrail?.totalProgress ?? u.progress ?? u.userTrail?.progress
              });
            }
          });
        });
      });
    } catch (err) {
      console.debug('no companyTrails aggregation', err);
    }

    if (trailsFromCompany.length > 0) {
      setSelectedUserTrails(trailsFromCompany);
      setSelectedUserLoading(false);
      return;
    }

    // fallback: call API for user progress
    const res = await fetchUserProgress(user.id || user.uid);
    setSelectedUserTrails(res || []);
    setSelectedUserLoading(false);
  };

  const loadCompanyTrails = async (companyId: string) => {
    if (companyTrails[companyId]) return; // already loaded
    setCompanyTrailsLoading(prev => ({ ...prev, [companyId]: true }));
    try {
      const data = await api.get<any>(`/api/companies/${companyId}/trails-with-users`);
      console.debug('[API] /api/companies/' + companyId + '/trails-with-users →', data);
      // expected canonical shape: { companyId: string, trails: [] }
      const trailsArr = data?.trails || [];
      setCompanyTrails(prev => ({ ...prev, [companyId]: trailsArr }));
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
                                          // possible shapes:
                                          // 1) { user: { id|uid, name, email }, userTrail: { uid, trailId, totalProgress }
                                          // 2) { uid, trailId, totalProgress }
                                          // 3) user object directly { id|uid, name, email }
                                          const uid = u.uid || u.user?.uid || u.user?.id || u.id || u.userId || null;

                                          // try to resolve user object from loaded users
                                          const userObj = (uid && users.find(usr => usr.id === uid || (usr as any).uid === uid)) || u.user || u;

                                          // try multiple fields for progress
                                          const progress =
                                            u.totalProgress ??
                                            u.userTrail?.totalProgress ??
                                            u.userTrail?.progress ??
                                            u.enrollment?.progress ??
                                            u.progress ??
                                            null;

                                          const key = (userObj && (userObj.id || (userObj as any).uid || userObj.email)) || uid || Math.random();

                                          return (
                                            <div key={key} className="flex items-center justify-between">
                                              <div className="flex items-center gap-3">
                                                <div className="w-8 h-8 bg-blue-50 rounded-full flex items-center justify-center text-faktory-blue">
                                                  <User size={14} />
                                                </div>
                                                <div>
                                                  <p className="text-sm font-bold text-slate-700">{(userObj && (userObj.name || userObj.email)) || uid}</p>
                                                  <p className="text-xs text-slate-400">{(userObj && userObj.email) || ''}</p>
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
                        // Fallback: use company.allowedTrails + projects/users already loaded
                        company.allowedTrails && company.allowedTrails.length > 0 ? (
                          <table className="w-full text-left border-collapse">
                            <thead>
                              <tr className="bg-slate-50 border-b border-slate-200">
                                <th className="px-4 py-3 text-xs font-bold text-slate-500 uppercase tracking-wider">Trilha</th>
                                <th className="px-4 py-3 text-xs font-bold text-slate-500 uppercase tracking-wider">Alunos</th>
                                <th className="px-4 py-3 text-xs font-bold text-slate-500 uppercase tracking-wider text-right">Ações</th>
                              </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-100">
                              {company.allowedTrails.map((trailId) => {
                                const trail = trails.find(t => t.id === trailId || (t as any).id === trailId);
                                // find projects that link this trail and users of this company
                                const usersOfCompany = users.filter(u => u.companyId === company.id);
                                const linkedUsers = usersOfCompany.filter(u => projects.some(p => p.trailId === trailId && p.clientId === u.id));

                                return (
                                  <tr key={trailId} className="hover:bg-slate-50/50 transition-colors">
                                    <td className="px-4 py-3 align-top">
                                      <div className="flex items-center gap-2">
                                        <BookOpen size={14} className="text-orange-400" />
                                        <span className="text-sm text-slate-700 font-medium">{trail?.title || trailId}</span>
                                      </div>
                                    </td>
                                    <td className="px-4 py-3">
                                      <div className="flex flex-col gap-2">
                                        {linkedUsers.length === 0 ? (
                                          <span className="text-sm text-slate-400 italic">Nenhum aluno vinculado</span>
                                        ) : (
                                          linkedUsers.map(u => (
                                            <div key={u.id} className="flex items-center justify-between">
                                              <div className="flex items-center gap-3">
                                                <div className="w-8 h-8 bg-blue-50 rounded-full flex items-center justify-center text-faktory-blue">
                                                  <User size={14} />
                                                </div>
                                                <div className="cursor-pointer" onClick={() => handleOpenUserModal(u)}>
                                                  <p className="text-sm font-bold text-slate-700 hover:underline">{u.name}</p>
                                                  <p className="text-xs text-slate-400">{u.email}</p>
                                                </div>
                                              </div>
                                              <div className="text-xs text-slate-500 font-bold">--</div>
                                            </div>
                                          ))
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
                        )
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

      {/* User Trails Modal */}
      {selectedUserForModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl shadow-2xl w-full max-w-lg overflow-hidden">
            <div className="p-6 border-b border-slate-100 flex items-center justify-between">
              <h2 className="text-lg font-bold text-slate-800">Trilhas de {selectedUserForModal.name || selectedUserForModal.email}</h2>
              <button onClick={() => setSelectedUserForModal(null)} className="text-slate-400 hover:text-slate-600">×</button>
            </div>
            <div className="p-6">
              {selectedUserLoading ? (
                <div className="flex items-center justify-center p-6"><Loader2 className="animate-spin text-faktory-blue" /></div>
              ) : selectedUserTrails.length === 0 ? (
                <div className="text-sm text-slate-500">Nenhuma trilha encontrada para este usuário.</div>
              ) : (
                <ul className="space-y-3">
                  {selectedUserTrails.map((st) => (
                    <li key={st.trailId || st.id} className="flex items-center justify-between">
                      <div>
                        <p className="font-medium text-slate-800">{st.title || st.trail?.title || st.trailId}</p>
                        <p className="text-xs text-slate-400">Progresso: {st.totalProgress ?? st.progress ?? '--'}%</p>
                      </div>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

async function fetchUserProgress(userId: string) {
  try {
    return await api.get<any[]>(`/api/users/${userId}/progress`);
  } catch (err) {
    console.error('Error fetching user progress:', err);
    return [];
  }
}
