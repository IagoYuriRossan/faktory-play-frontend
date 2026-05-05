import { useEffect, useState } from 'react';
import { UserCog, Link as LinkIcon, Trash2, AlertCircle, Check, Loader2, ShieldCheck, Pencil, X, Copy } from 'lucide-react';
import { api } from '../../utils/api';
import { useAuthStore } from '../../hooks/store/useAuthStore';
import { cn } from '../../utils/utils';

interface Consultor {
  id: string;
  name: string;
  email: string;
  role: string;
  createdAt?: string;
}

export default function AdminConsultores() {
  const { user: currentUser } = useAuthStore();
  const [consultores, setConsultores] = useState<Consultor[]>([]);
  const [loading, setLoading] = useState(true);

  // Invite modal
  const [showInviteModal, setShowInviteModal] = useState(false);
  const [inviteEmail, setInviteEmail] = useState('');
  const [inviting, setInviting] = useState(false);
  const [generatedLink, setGeneratedLink] = useState('');

  // Edit modal
  const [editingConsultor, setEditingConsultor] = useState<Consultor | null>(null);
  const [editName, setEditName] = useState('');
  const [saving, setSaving] = useState(false);

  const [toast, setToast] = useState<{ type: 'success' | 'error'; message: string } | null>(null);

  const showToast = (type: 'success' | 'error', message: string) => {
    setToast({ type, message });
    setTimeout(() => setToast(null), 3500);
  };

  const fetchConsultores = async () => {
    setLoading(true);
    try {
      const data = await api.get<{ consultores: Consultor[] }>('/api/admin/consultores');
      setConsultores(data.consultores ?? []);
    } catch {
      showToast('error', 'Erro ao carregar consultores.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchConsultores(); }, []);

  // ── Invite ─────────────────────────────────────────────────────────────────
  const handleInvite = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!inviteEmail) return;
    setInviting(true);
    setGeneratedLink('');
    try {
      const data = await api.post<{ inviteUrl: string }>('/api/admin/consultores/invite', { email: inviteEmail });
      setGeneratedLink(data.inviteUrl);
    } catch (err: any) {
      if (err?.status === 409) {
        showToast('error', 'Já existe um convite pendente para este e-mail.');
      } else {
        showToast('error', 'Erro ao gerar convite.');
      }
    } finally {
      setInviting(false);
    }
  };

  const copyLink = () => {
    navigator.clipboard.writeText(generatedLink);
    showToast('success', 'Link copiado!');
  };

  const closeInviteModal = () => {
    setShowInviteModal(false);
    setInviteEmail('');
    setGeneratedLink('');
  };

  // ── Edit ───────────────────────────────────────────────────────────────────
  const openEdit = (c: Consultor) => {
    setEditingConsultor(c);
    setEditName(c.name);
  };

  const handleEdit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingConsultor) return;
    setSaving(true);
    try {
      await api.patch(`/api/admin/consultores/${editingConsultor.id}`, { name: editName });
      showToast('success', 'Dados atualizados.');
      setEditingConsultor(null);
      fetchConsultores();
    } catch {
      showToast('error', 'Erro ao atualizar dados.');
    } finally {
      setSaving(false);
    }
  };

  // ── Remove ─────────────────────────────────────────────────────────────────
  const handleRemove = async (consultor: Consultor) => {
    if (!confirm(`Remover acesso de consultor de ${consultor.name}?\n\nO usuário continuará existindo, mas perderá o acesso de administrador.`)) return;
    try {
      await api.delete(`/api/admin/consultores/${consultor.id}`);
      showToast('success', 'Acesso de consultor removido.');
      fetchConsultores();
    } catch {
      showToast('error', 'Erro ao remover consultor.');
    }
  };

  return (
    <div className="space-y-6">
      {/* Toast */}
      {toast && (
        <div className={cn(
          'fixed top-4 right-4 z-50 px-4 py-3 rounded-lg text-sm font-medium shadow-lg flex items-center gap-2',
          toast.type === 'success' ? 'bg-green-600 text-white' : 'bg-red-600 text-white'
        )}>
          {toast.type === 'success' ? <Check size={16} /> : <AlertCircle size={16} />}
          {toast.message}
        </div>
      )}

      {/* Header */}
      <div className="flex items-center justify-between gap-3 flex-wrap">
        <div>
          <h1 className="text-2xl font-bold text-slate-800">Consultores</h1>
          <p className="text-sm text-slate-500 mt-0.5">Gerencie a equipe com acesso de administrador master.</p>
        </div>
        <button
          onClick={() => setShowInviteModal(true)}
          className="flex items-center gap-1.5 bg-faktory-blue text-white text-sm font-medium px-4 py-2 rounded-lg hover:opacity-90 transition-opacity"
        >
          <LinkIcon size={15} /> Convidar consultor
        </button>
      </div>

      {/* Info banner */}
      <div className="flex items-start gap-3 bg-blue-50 border border-blue-200 rounded-xl p-4 text-sm text-blue-800">
        <ShieldCheck size={18} className="shrink-0 mt-0.5 text-blue-500" />
        <p>
          Consultores têm acesso de <strong>superadmin</strong> — podem gerenciar clientes, trilhas, projetos e outros consultores.
          O convite expira em <strong>7 dias</strong>. Ao remover, o acesso é revogado mas o histórico é preservado.
        </p>
      </div>

      {/* Table */}
      {loading ? (
        <div className="flex justify-center py-16">
          <Loader2 className="animate-spin text-faktory-blue" size={28} />
        </div>
      ) : consultores.length === 0 ? (
        <div className="bg-white rounded-xl border border-slate-200 p-12 text-center">
          <UserCog size={40} className="mx-auto text-slate-300 mb-3" />
          <p className="text-slate-500 font-medium">Nenhum consultor cadastrado ainda.</p>
        </div>
      ) : (
        <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-slate-50 border-b border-slate-200">
              <tr>
                <th className="text-left px-5 py-3 text-xs font-bold text-slate-500 uppercase">Consultor</th>
                <th className="text-left px-5 py-3 text-xs font-bold text-slate-500 uppercase hidden sm:table-cell">Acesso</th>
                <th className="px-5 py-3 w-24" />
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {consultores.map(c => (
                <tr key={c.id} className="hover:bg-slate-50 transition-colors">
                  <td className="px-5 py-3">
                    <p className="font-medium text-slate-800">{c.name}</p>
                    <p className="text-xs text-slate-400">{c.email}</p>
                  </td>
                  <td className="px-5 py-3 hidden sm:table-cell">
                    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium bg-purple-100 text-purple-700">
                      <ShieldCheck size={11} /> Admin master
                    </span>
                  </td>
                  <td className="px-5 py-3 text-right">
                    {c.id === currentUser?.id ? (
                      <span className="text-xs text-slate-400 italic">Você</span>
                    ) : (
                      <div className="flex items-center justify-end gap-1">
                        <button onClick={() => openEdit(c)} title="Editar" className="p-1.5 rounded hover:bg-blue-50 text-slate-400 hover:text-blue-600 transition-colors">
                          <Pencil size={14} />
                        </button>
                        <button onClick={() => handleRemove(c)} title="Remover acesso" className="p-1.5 rounded hover:bg-red-50 text-slate-400 hover:text-red-600 transition-colors">
                          <Trash2 size={14} />
                        </button>
                      </div>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Invite Modal */}
      {showInviteModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-md p-6 space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-bold text-slate-800">Convidar consultor</h2>
              <button onClick={closeInviteModal} className="text-slate-400 hover:text-slate-600"><X size={18} /></button>
            </div>

            {!generatedLink ? (
              <>
                <p className="text-sm text-slate-500">
                  Informe o e-mail do novo consultor. Um link de cadastro será gerado para você compartilhar.
                </p>
                <form onSubmit={handleInvite} className="space-y-3">
                  <div>
                    <label className="block text-xs font-medium text-slate-600 mb-1">E-mail *</label>
                    <input
                      type="email"
                      value={inviteEmail}
                      onChange={e => setInviteEmail(e.target.value)}
                      className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-faktory-blue"
                      placeholder="consultor@email.com"
                      required
                      autoFocus
                    />
                  </div>
                  <div className="flex gap-3">
                    <button type="button" onClick={closeInviteModal} className="flex-1 border border-slate-200 text-slate-600 rounded-lg py-2 text-sm hover:bg-slate-50">Cancelar</button>
                    <button type="submit" disabled={inviting} className="flex-1 bg-faktory-blue text-white rounded-lg py-2 text-sm font-medium hover:opacity-90 disabled:opacity-50">
                      {inviting ? 'Gerando…' : 'Gerar link'}
                    </button>
                  </div>
                </form>
              </>
            ) : (
              <div className="space-y-4">
                <div className="flex items-start gap-2 bg-green-50 border border-green-200 rounded-lg p-3 text-sm text-green-800">
                  <Check size={16} className="shrink-0 mt-0.5" />
                  <p>Link gerado! Compartilhe com o consultor. Expira em <strong>7 dias</strong>.</p>
                </div>
                <div className="flex items-center gap-2 bg-slate-50 border border-slate-200 rounded-lg px-3 py-2">
                  <span className="flex-1 text-xs text-slate-600 break-all font-mono">{generatedLink}</span>
                  <button onClick={copyLink} className="shrink-0 p-1.5 rounded hover:bg-slate-200 text-slate-500 hover:text-slate-700 transition-colors">
                    <Copy size={14} />
                  </button>
                </div>
                <button onClick={closeInviteModal} className="w-full border border-slate-200 text-slate-600 rounded-lg py-2 text-sm hover:bg-slate-50">Fechar</button>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Edit Modal */}
      {editingConsultor && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-sm p-6 space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-bold text-slate-800">Editar consultor</h2>
              <button onClick={() => setEditingConsultor(null)} className="text-slate-400 hover:text-slate-600"><X size={18} /></button>
            </div>
            <form onSubmit={handleEdit} className="space-y-3">
              <div>
                <label className="block text-xs font-medium text-slate-600 mb-1">Nome completo *</label>
                <input
                  type="text"
                  value={editName}
                  onChange={e => setEditName(e.target.value)}
                  className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-faktory-blue"
                  required
                  autoFocus
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-slate-600 mb-1">E-mail</label>
                <input
                  type="email"
                  value={editingConsultor.email}
                  readOnly
                  className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm bg-slate-50 text-slate-500 cursor-not-allowed"
                />
              </div>
              <div className="flex gap-3 pt-1">
                <button type="button" onClick={() => setEditingConsultor(null)} className="flex-1 border border-slate-200 text-slate-600 rounded-lg py-2 text-sm hover:bg-slate-50">Cancelar</button>
                <button type="submit" disabled={saving} className="flex-1 bg-faktory-blue text-white rounded-lg py-2 text-sm font-medium hover:opacity-90 disabled:opacity-50">
                  {saving ? 'Salvando…' : 'Salvar'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
