import React, { useState, useEffect } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { api } from '../../utils/api';
import { Company, User, Trail, UserRole } from '../../@types';
import { ArrowLeft, Building2, Users, BookOpen, Link2, Mail, Trash2, Edit2, Loader2, Check, Copy, X } from 'lucide-react';
import { cn } from '../../utils/utils';

export default function AdminClienteDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const BASE_URL = import.meta.env.VITE_API_URL || 'http://127.0.0.1:3001';
  const [company, setCompany] = useState<Company | null>(null);
  const [users, setUsers] = useState<User[]>([]);
  const [allTrails, setAllTrails] = useState<Trail[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [activeTab, setActiveTab] = useState<'info' | 'users' | 'trails'>('users');
  const [showInviteModal, setShowInviteModal] = useState(false);
  const [inviteEmail, setInviteEmail] = useState('');
  const [inviteName, setInviteName] = useState('');
  const [inviting, setInviting] = useState(false);
  const [inviteUrl, setInviteUrl] = useState('');
  const [copied, setCopied] = useState(false);
  const [inviteModalError, setInviteModalError] = useState('');

  // Edit user
  const [editingUser, setEditingUser] = useState<User | null>(null);
  const [editName, setEditName] = useState('');
  const [editRole, setEditRole] = useState<UserRole>('student');
  const [editAllowedTrails, setEditAllowedTrails] = useState<string[]>([]);
  const [editSaving, setEditSaving] = useState(false);
  const [editError, setEditError] = useState('');

  // Delete user
  const [deletingUser, setDeletingUser] = useState<User | null>(null);
  const [deleteLoading, setDeleteLoading] = useState(false);

  // Toast
  const [toast, setToast] = useState('');

  const handleOpenInviteModal = () => {
    setInviteEmail('');
    setInviteName('');
    setInviteUrl('');
    setCopied(false);
    setInviteModalError('');
    setShowInviteModal(true);
  };

  const handleGenerateInvite = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!id) return;
    setInviting(true);
    setInviteModalError('');
    try {
      const data = await api.post<{ inviteToken: string; expiresAt: string; inviteUrl: string }>(
        `/api/companies/${id}/invite`,
        { email: inviteEmail, name: inviteName || undefined }
      );
      setInviteUrl(data.inviteUrl);
    } catch (err: any) {
      setInviteModalError(err.message || 'Erro ao gerar convite.');
    } finally {
      setInviting(false);
    }
  };

  const handleCopyLink = () => {
    navigator.clipboard.writeText(inviteUrl);
    setCopied(true);
    setTimeout(() => setCopied(false), 2500);
  };

  const showToast = (msg: string) => {
    setToast(msg);
    setTimeout(() => setToast(''), 3000);
  };

  const handleOpenEdit = (u: User) => {
    setEditingUser(u);
    setEditName(u.name);
    setEditRole(u.role);
    // user may have allowedTrails provided by backend
    const ua = (u as any).allowedTrails as string[] | undefined;
    setEditAllowedTrails(ua ? [...ua] : []);
    setEditError('');
  };

  const handleEditSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingUser) return;
    setEditSaving(true);
    setEditError('');
    try {
      const payload: any = { name: editName, role: editRole, allowedTrails: editAllowedTrails };
      await api.put(`/api/users/${editingUser.id}`, payload);
      setUsers(prev => prev.map(u => u.id === editingUser.id ? { ...u, name: editName, role: editRole, allowedTrails: editAllowedTrails } as any : u));
      setEditingUser(null);
      showToast('Usuário atualizado com sucesso.');
    } catch (err: any) {
      setEditError(err.message || 'Erro ao salvar alterações.');
    } finally {
      setEditSaving(false);
    }
  };

  const handleDeleteConfirm = async () => {
    if (!deletingUser) return;
    setDeleteLoading(true);
    try {
      await api.delete(`/api/users/${deletingUser.id}`);
      setUsers(prev => prev.filter(u => u.id !== deletingUser.id));
      setDeletingUser(null);
      showToast('Usuário removido.');
    } catch (err: any) {
      showToast(err.message || 'Erro ao remover usuário.');
      setDeletingUser(null);
    } finally {
      setDeleteLoading(false);
    }
  };

  const handleSendPasswordReset = async (u: User) => {
    try {
      const res = await fetch(`${BASE_URL}/api/auth/forgot-password`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: u.email }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        showToast(data.message || 'Erro ao enviar e-mail de redefinição.');
        return;
      }
      showToast(`E-mail de redefinição de senha enviado para ${u.email}.`);
    } catch {
      showToast('Erro ao enviar e-mail de redefinição.');
    }
  };

  useEffect(() => {
    async function fetchData() {
      if (!id) return;
      try {
        const [companyData, allUsersData, trailsData] = await Promise.all([
          api.get<Company>(`/api/companies/${id}`),
          api.get<User[]>('/api/users'),
          api.get<Trail[]>('/api/trails'),
        ]);

        setCompany(companyData);
        setUsers(allUsersData.filter(u => u.companyId === id));
        setAllTrails(trailsData);
      } catch (error) {
        console.error('Error fetching company detail:', error);
      } finally {
        setLoading(false);
      }
    }
    fetchData();
  }, [id]);

  const toggleTrail = async (trailId: string) => {
    if (!company) return;
    
    const newAllowedTrails = company.allowedTrails.includes(trailId)
      ? company.allowedTrails.filter(tid => tid !== trailId)
      : [...company.allowedTrails, trailId];
    
    setCompany({ ...company, allowedTrails: newAllowedTrails });
  };

  const handleSaveTrails = async () => {
    if (!company || !id) return;
    setSaving(true);
    try {
      await api.put(`/api/companies/${id}`, { allowedTrails: company.allowedTrails });
    } catch (error) {
      console.error('Error saving trails:', error);
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <Loader2 className="animate-spin text-faktory-blue" size={40} />
      </div>
    );
  }

  if (!company) return <div className="p-8 text-center text-slate-500">Empresa não encontrada.</div>;

  const tabs = [
    { id: 'info', label: 'Dados da Empresa', icon: Building2 },
    { id: 'users', label: 'Funcionários', icon: Users },
    { id: 'trails', label: 'Trilhas Liberadas', icon: BookOpen },
  ];

  return (
    <div className="space-y-8">
      <div className="flex items-center gap-4">
        <Link to="/admin/clientes" className="p-2 bg-white border border-slate-200 rounded-lg text-slate-400 hover:text-faktory-blue transition-colors">
          <ArrowLeft size={20} />
        </Link>
        <div>
          <h1 className="text-2xl font-bold text-slate-800">{company.name}</h1>
          <p className="text-slate-500">Gerenciamento detalhado do cliente.</p>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex border-b border-slate-200">
        {tabs.map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id as any)}
            className={cn(
              "flex items-center gap-2 px-6 py-3 font-medium text-sm transition-all border-b-2 -mb-px",
              activeTab === tab.id
                ? "border-faktory-blue text-faktory-blue"
                : "border-transparent text-slate-400 hover:text-slate-600"
            )}
          >
            <tab.icon size={18} />
            {tab.label}
          </button>
        ))}
      </div>

      {/* Tab Content */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-6">
        {activeTab === 'info' && (
          <div className="max-w-2xl space-y-6">
            <div className="grid grid-cols-2 gap-6">
              <div>
                <label className="block text-xs font-bold text-slate-400 uppercase mb-2">Razão Social</label>
                <p className="text-slate-800 font-medium">{company.name}</p>
              </div>
              <div>
                <label className="block text-xs font-bold text-slate-400 uppercase mb-2">CNPJ</label>
                <p className="text-slate-800 font-medium">{company.cnpj}</p>
              </div>
            </div>
            <button className="flex items-center gap-2 text-faktory-blue font-bold text-sm hover:underline">
              <Edit2 size={16} />
              Editar Informações
            </button>
          </div>
        )}

        {activeTab === 'users' && (
          <div className="space-y-6">
            <div className="flex justify-between items-center">
              <h3 className="font-bold text-slate-800 text-lg">Funcionários Cadastrados</h3>
              <button
                onClick={handleOpenInviteModal}
                className="bg-faktory-blue text-white px-4 py-2 rounded-lg font-medium flex items-center gap-2 hover:bg-[#2c6a9a] transition-colors shadow-lg shadow-blue-100"
              >
                <Link2 size={18} />
                Gerar Link de Cadastro
              </button>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left">
                <thead className="bg-slate-50 border-b border-slate-200">
                  <tr>
                    <th className="px-4 py-3 text-xs font-bold text-slate-500 uppercase">Nome</th>
                    <th className="px-4 py-3 text-xs font-bold text-slate-500 uppercase">E-mail</th>
                    <th className="px-4 py-3 text-xs font-bold text-slate-500 uppercase">Status</th>
                    <th className="px-4 py-3 text-xs font-bold text-slate-500 uppercase text-right">Ações</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {users.length === 0 ? (
                    <tr>
                      <td colSpan={4} className="px-4 py-8 text-center text-slate-400">Nenhum funcionário cadastrado.</td>
                    </tr>
                  ) : (
                    users.map((user) => (
                      <tr key={user.id} className="hover:bg-slate-50 transition-colors">
                        <td className="px-4 py-4 font-medium text-slate-800">{user.name}</td>
                        <td className="px-4 py-4 text-sm text-slate-600">{user.email}</td>
                        <td className="px-4 py-4">
                          <span className="px-2 py-0.5 bg-green-100 text-green-700 text-[10px] font-bold uppercase rounded">Ativo</span>
                        </td>
                        <td className="px-4 py-4 text-right">
                          <div className="flex items-center justify-end gap-3 text-slate-300">
                            <div className="relative group">
                              <button
                                onClick={() => handleOpenEdit(user)}
                                className="hover:text-faktory-blue transition-colors"
                              >
                                <Edit2 size={16} />
                              </button>
                              <span className="pointer-events-none absolute bottom-full left-1/2 -translate-x-1/2 mb-1.5 whitespace-nowrap rounded bg-slate-800 px-2 py-1 text-[11px] text-white opacity-0 group-hover:opacity-100 transition-opacity">
                                Editar
                              </span>
                            </div>
                            <div className="relative group">
                              <button
                                onClick={() => setDeletingUser(user)}
                                className="hover:text-red-600 transition-colors"
                              >
                                <Trash2 size={16} />
                              </button>
                              <span className="pointer-events-none absolute bottom-full left-1/2 -translate-x-1/2 mb-1.5 whitespace-nowrap rounded bg-slate-800 px-2 py-1 text-[11px] text-white opacity-0 group-hover:opacity-100 transition-opacity">
                                Excluir
                              </span>
                            </div>
                            <div className="relative group">
                              <button
                                onClick={() => handleSendPasswordReset(user)}
                                className="hover:text-slate-600 transition-colors"
                              >
                                <Mail size={16} />
                              </button>
                              <span className="pointer-events-none absolute bottom-full left-1/2 -translate-x-1/2 mb-1.5 whitespace-nowrap rounded bg-slate-800 px-2 py-1 text-[11px] text-white opacity-0 group-hover:opacity-100 transition-opacity">
                                Redefinir senha
                              </span>
                            </div>
                          </div>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {activeTab === 'trails' && (
          <div className="space-y-6">
            <h3 className="font-bold text-slate-800 text-lg">Configurar Acesso às Trilhas</h3>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              {allTrails.map((trail) => (
                <label
                  key={trail.id}
                  className={cn(
                    "flex flex-col p-6 rounded-xl border-2 cursor-pointer transition-all",
                    company.allowedTrails.includes(trail.id)
                      ? "border-faktory-blue bg-blue-50"
                      : "border-slate-200 hover:border-slate-300"
                  )}
                >
                  <div className="flex items-center justify-between mb-4">
                    <span className="font-bold text-slate-800">{trail.title}</span>
                    <input
                      type="checkbox"
                      checked={company.allowedTrails.includes(trail.id)}
                      onChange={() => toggleTrail(trail.id)}
                      className="w-5 h-5 text-faktory-blue rounded focus:ring-faktory-blue"
                    />
                  </div>
                  <p className="text-xs text-slate-500">
                    {trail.description}
                  </p>
                </label>
              ))}
            </div>
            <div className="pt-4 flex justify-end">
              <button 
                onClick={handleSaveTrails}
                disabled={saving}
                className="bg-faktory-blue text-white px-6 py-2 rounded-lg font-bold shadow-lg shadow-blue-100 flex items-center gap-2 disabled:opacity-50"
              >
                {saving ? <Loader2 className="animate-spin" size={18} /> : <Check size={18} />}
                Salvar Alterações
              </button>
            </div>
          </div>
        )}
      </div>

      {/* ── Modal: Editar Usuário ── */}
      {editingUser && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-md">
            <div className="flex items-center justify-between p-5 border-b border-slate-100">
              <h2 className="text-base font-bold text-slate-800">Editar Usuário</h2>
              <button onClick={() => setEditingUser(null)} className="text-slate-400 hover:text-slate-600">
                <X size={20} />
              </button>
            </div>
            <form onSubmit={handleEditSave} className="p-5 space-y-4">
              <div>
                <label className="block text-xs font-bold text-slate-600 mb-1">Nome</label>
                <input
                  type="text"
                  value={editName}
                  onChange={e => setEditName(e.target.value)}
                  required
                  className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm focus:ring-2 focus:ring-faktory-blue focus:border-faktory-blue outline-none"
                />
              </div>
              <div>
                <label className="block text-xs font-bold text-slate-600 mb-1">Cargo / Perfil</label>
                <select
                  value={editRole}
                  onChange={e => setEditRole(e.target.value as UserRole)}
                  className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm focus:ring-2 focus:ring-faktory-blue outline-none bg-white"
                >
                  <option value="student">Aluno (student)</option>
                  <option value="company_admin">Admin da Empresa (company_admin)</option>
                </select>
              </div>
              <div>
                <div className="flex items-center justify-between mb-2">
                  <label className="text-xs font-bold text-slate-600">
                    Trilhas por usuário
                    {editAllowedTrails.length > 0 && (
                      <span className="ml-2 bg-faktory-blue text-white text-[10px] px-1.5 py-0.5 rounded-full">
                        {editAllowedTrails.length} selecionada{editAllowedTrails.length > 1 ? 's' : ''}
                      </span>
                    )}
                  </label>
                  <div className="flex gap-2">
                    <button
                      type="button"
                      onClick={() => setEditAllowedTrails(allTrails.map(t => t.id))}
                      className="text-[11px] text-faktory-blue hover:underline"
                    >
                      Todas
                    </button>
                    <span className="text-slate-300 text-[11px]">|</span>
                    <button
                      type="button"
                      onClick={() => setEditAllowedTrails([])}
                      className="text-[11px] text-slate-400 hover:underline"
                    >
                      Limpar
                    </button>
                  </div>
                </div>
                <div className="grid grid-cols-1 gap-1.5 max-h-44 overflow-auto border border-slate-100 rounded-lg p-2">
                  {allTrails.map(t => {
                    const checked = editAllowedTrails.includes(t.id);
                    const inheritedFromCompany = company?.allowedTrails.includes(t.id);
                    return (
                      <label
                        key={t.id}
                        className={cn(
                          'flex items-center gap-2.5 px-2 py-1.5 rounded-lg cursor-pointer transition-colors',
                          checked ? 'bg-blue-50' : 'hover:bg-slate-50'
                        )}
                      >
                        <input
                          type="checkbox"
                          checked={checked}
                          onChange={() =>
                            setEditAllowedTrails(prev =>
                              prev.includes(t.id) ? prev.filter(id => id !== t.id) : [...prev, t.id]
                            )
                          }
                          className="w-4 h-4 text-faktory-blue rounded"
                        />
                        <span className={cn('text-sm flex-1', checked ? 'text-faktory-blue font-medium' : 'text-slate-700')}>
                          {t.title}
                        </span>
                        {inheritedFromCompany && !checked && (
                          <span className="text-[10px] text-slate-400 border border-slate-200 rounded px-1.5 py-0.5">
                            empresa
                          </span>
                        )}
                      </label>
                    );
                  })}
                </div>
                <p className="text-xs text-slate-400 mt-1.5">
                  {editAllowedTrails.length === 0
                    ? '⚠ Nenhuma marcada — o acesso seguirá as trilhas liberadas para a empresa.'
                    : 'Somente as trilhas marcadas acima serão acessíveis por este usuário.'}
                </p>
              </div>
              {editError && (
                <p className="text-xs text-red-500 bg-red-50 px-3 py-2 rounded-lg">{editError}</p>
              )}
              <div className="flex gap-3 pt-1">
                <button
                  type="button"
                  onClick={() => setEditingUser(null)}
                  className="flex-1 py-2 rounded-lg text-sm font-bold border border-slate-200 text-slate-600 hover:bg-slate-50 transition-colors"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={editSaving}
                  className="flex-1 py-2 rounded-lg text-sm font-bold bg-faktory-blue text-white hover:bg-[#2c6a9a] transition-colors disabled:opacity-60 flex items-center justify-center gap-2"
                >
                  {editSaving && <Loader2 size={14} className="animate-spin" />}
                  {editSaving ? 'Salvando...' : 'Salvar'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ── Modal: Confirmar Exclusão ── */}
      {deletingUser && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-sm p-6 space-y-4">
            <h2 className="text-base font-bold text-slate-800">Remover usuário?</h2>
            <p className="text-sm text-slate-500">
              O usuário <span className="font-semibold text-slate-700">{deletingUser.name}</span> ({deletingUser.email}) será removido da empresa. Esta ação não pode ser desfeita.
            </p>
            <div className="flex gap-3 pt-1">
              <button
                onClick={() => setDeletingUser(null)}
                className="flex-1 py-2 rounded-lg text-sm font-bold border border-slate-200 text-slate-600 hover:bg-slate-50 transition-colors"
              >
                Cancelar
              </button>
              <button
                onClick={handleDeleteConfirm}
                disabled={deleteLoading}
                className="flex-1 py-2 rounded-lg text-sm font-bold bg-red-600 text-white hover:bg-red-700 transition-colors disabled:opacity-60 flex items-center justify-center gap-2"
              >
                {deleteLoading && <Loader2 size={14} className="animate-spin" />}
                {deleteLoading ? 'Removendo...' : 'Remover'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── Toast ── */}
      {toast && (
        <div className="fixed bottom-6 left-1/2 -translate-x-1/2 bg-slate-800 text-white text-sm px-5 py-3 rounded-xl shadow-lg z-50 animate-fade-in">
          {toast}
        </div>
      )}

      {/* ── Modal: Convidar Funcionário ── */}
      {showInviteModal && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-lg">
            <div className="flex items-center justify-between p-5 border-b border-slate-100">
              <div>
                <h2 className="text-base font-bold text-slate-800">Convidar Funcionário</h2>
                <p className="text-xs text-slate-500 mt-0.5">Gere um link de cadastro vinculado a esta empresa.</p>
              </div>
              <button onClick={() => setShowInviteModal(false)} className="text-slate-400 hover:text-slate-600">
                <X size={20} />
              </button>
            </div>

            {!inviteUrl ? (
              <form onSubmit={handleGenerateInvite} className="p-5 space-y-4">
                <div>
                  <label className="block text-xs font-bold text-slate-600 mb-1">E-mail do funcionário</label>
                  <input
                    type="email"
                    value={inviteEmail}
                    onChange={e => setInviteEmail(e.target.value)}
                    placeholder="joao@empresa.com.br"
                    required
                    className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm focus:ring-2 focus:ring-faktory-blue focus:border-faktory-blue outline-none"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-600 mb-1">Nome (opcional)</label>
                  <input
                    type="text"
                    value={inviteName}
                    onChange={e => setInviteName(e.target.value)}
                    placeholder="João da Silva"
                    className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm focus:ring-2 focus:ring-faktory-blue focus:border-faktory-blue outline-none"
                  />
                </div>
                {inviteModalError && (
                  <p className="text-xs text-red-500 bg-red-50 px-3 py-2 rounded-lg">{inviteModalError}</p>
                )}
                <button
                  type="submit"
                  disabled={inviting}
                  className="w-full bg-faktory-blue text-white py-2.5 rounded-lg font-bold text-sm hover:bg-[#2c6a9a] transition-colors disabled:opacity-60 flex items-center justify-center gap-2"
                >
                  {inviting ? <Loader2 size={16} className="animate-spin" /> : <Mail size={16} />}
                  {inviting ? 'Gerando...' : 'Gerar link de convite'}
                </button>
              </form>
            ) : (
              <div className="p-5 space-y-4">
                <p className="text-sm text-slate-600">Link gerado com sucesso! Copie e envie ao funcionário.</p>
                <div className="flex items-center gap-2 bg-slate-50 border border-slate-200 rounded-lg px-3 py-2.5">
                  <span className="flex-1 text-sm text-slate-600 truncate font-mono">{inviteUrl}</span>
                </div>
                <button
                  onClick={handleCopyLink}
                  className={`w-full py-2.5 rounded-lg font-bold text-sm flex items-center justify-center gap-2 transition-colors ${
                    copied ? 'bg-green-500 text-white' : 'bg-faktory-blue text-white hover:bg-[#2c6a9a]'
                  }`}
                >
                  {copied ? <Check size={16} /> : <Copy size={16} />}
                  {copied ? 'Link copiado!' : 'Copiar link'}
                </button>
                <button
                  type="button"
                  onClick={handleOpenInviteModal}
                  className="w-full py-2 rounded-lg text-sm text-slate-400 hover:text-slate-600 transition-colors"
                >
                  Gerar novo convite
                </button>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
