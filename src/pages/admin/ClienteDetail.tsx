import React, { useState, useEffect } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { api } from '../../utils/api';
import { Company, User, Trail } from '../../@types';
import { ArrowLeft, Building2, Users, BookOpen, Link2, Plus, Mail, Trash2, Edit2, Loader2, Check, Copy, X } from 'lucide-react';
import { cn } from '../../utils/utils';

export default function AdminClienteDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
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
                            <button className="hover:text-faktory-blue"><Edit2 size={16} /></button>
                            <button className="hover:text-red-600"><Trash2 size={16} /></button>
                            <button className="hover:text-slate-600"><Mail size={16} /></button>
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
