import { useEffect, useState } from 'react';
import { useAuthStore } from '../../hooks/store/useAuthStore';
import { api } from '../../utils/api';
import { Users, Loader2, Check, Clock } from 'lucide-react';
import { cn } from '../../utils/utils';

interface Member {
  id: string;
  name: string;
  email: string;
  role: string;
  status?: 'active' | 'pending' | 'inactive';
}

interface PendingInvite {
  token: string;
  invitedEmail: string;
  invitedName?: string;
  expiresAt: string;
}

export default function EmpresaMembros() {
  const { user } = useAuthStore();
  const [members, setMembers] = useState<Member[]>([]);
  const [pendingInvites, setPendingInvites] = useState<PendingInvite[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<'all' | 'active' | 'pending' | 'inactive'>('all');
  const [search, setSearch] = useState('');

  useEffect(() => {
    async function fetchMembers() {
      if (!user?.companyId) return;
      try {
        const data = await api.get<{ members: Member[]; pendingInvites: PendingInvite[] }>(
          `/api/companies/${user.companyId}/members`
        );
        setMembers(data.members ?? []);
        setPendingInvites(data.pendingInvites ?? []);
      } catch (err) {
        console.error('Erro ao carregar membros:', err);
      } finally {
        setLoading(false);
      }
    }
    fetchMembers();
  }, [user]);

  const statusLabel = (status?: string) => {
    if (status === 'pending') return { label: 'Pendente', color: 'bg-yellow-100 text-yellow-700' };
    if (status === 'inactive') return { label: 'Inativo', color: 'bg-slate-100 text-slate-500' };
    return { label: 'Ativo', color: 'bg-green-100 text-green-700' };
  };

  const filtered = members.filter(m => {
    const matchSearch =
      m.name.toLowerCase().includes(search.toLowerCase()) ||
      m.email.toLowerCase().includes(search.toLowerCase());
    const matchFilter =
      filter === 'all' ||
      (filter === 'active' && (!m.status || m.status === 'active')) ||
      (filter === 'pending' && m.status === 'pending') ||
      (filter === 'inactive' && m.status === 'inactive');
    return matchSearch && matchFilter;
  });

  const filterButtons: { key: typeof filter; label: string }[] = [
    { key: 'all', label: 'Todos' },
    { key: 'active', label: 'Ativos' },
    { key: 'pending', label: 'Aguardando' },
    { key: 'inactive', label: 'Inativos' },
  ];

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-800">Membros</h1>
          <p className="text-sm text-slate-500 mt-1">Funcionários cadastrados na sua empresa.</p>
        </div>
      </div>

      {/* Filters + Search */}
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <input
            type="text"
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="Buscar por nome ou e-mail..."
            className="w-full pl-4 pr-4 py-2 border border-slate-200 rounded-lg text-sm focus:ring-2 focus:ring-faktory-blue focus:border-faktory-blue outline-none"
          />
        </div>
        <div className="flex gap-2">
          {filterButtons.map(f => (
            <button
              key={f.key}
              onClick={() => setFilter(f.key)}
              className={cn(
                'px-3 py-2 rounded-lg text-xs font-bold border transition-colors',
                filter === f.key
                  ? 'bg-faktory-blue text-white border-faktory-blue'
                  : 'bg-white text-slate-600 border-slate-200 hover:bg-slate-50'
              )}
            >
              {f.label}
            </button>
          ))}
        </div>
      </div>

      {/* Table */}
      {loading ? (
        <div className="flex justify-center py-20">
          <Loader2 className="animate-spin text-faktory-blue" size={32} />
        </div>
      ) : filtered.length === 0 ? (
        <div className="bg-white rounded-xl border border-slate-200 p-12 text-center">
          <Users size={40} className="mx-auto text-slate-300 mb-3" />
          <p className="text-slate-500 font-medium">Nenhum membro encontrado.</p>
        </div>
      ) : (
        <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-slate-50 border-b border-slate-200">
              <tr>
                <th className="text-left px-5 py-3 text-xs font-bold text-slate-500 uppercase">Situação</th>
                <th className="text-left px-5 py-3 text-xs font-bold text-slate-500 uppercase">Membro</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filtered.map(member => {
                const { label, color } = statusLabel(member.status);
                return (
                  <tr key={member.id} className="hover:bg-slate-50 transition-colors">
                    <td className="px-5 py-4 w-36">
                      <span className={cn('inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-bold', color)}>
                        {member.status === 'pending' ? <Clock size={11} /> : <Check size={11} />}
                        {label}
                      </span>
                    </td>
                    <td className="px-5 py-4">
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-full bg-slate-200 flex items-center justify-center text-slate-500 font-bold text-xs shrink-0">
                          {member.name?.charAt(0) || '?'}
                        </div>
                        <div>
                          <p className="font-medium text-slate-800">{member.name}</p>
                          <p className="text-xs text-slate-400">{member.email}</p>
                        </div>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      {/* Pending invites */}
      {!loading && pendingInvites.length > 0 && (
        <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
          <div className="px-5 py-3 bg-yellow-50 border-b border-yellow-100">
            <p className="text-xs font-bold text-yellow-700 uppercase">Convites Pendentes ({pendingInvites.length})</p>
          </div>
          <table className="w-full text-sm">
            <tbody className="divide-y divide-slate-100">
              {pendingInvites.map(invite => (
                <tr key={invite.token} className="hover:bg-slate-50 transition-colors">
                  <td className="px-5 py-4 w-36">
                    <span className={cn('inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-bold', 'bg-yellow-100 text-yellow-700')}>
                      <Clock size={11} />
                      Aguardando
                    </span>
                  </td>
                  <td className="px-5 py-4">
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded-full bg-slate-200 flex items-center justify-center text-slate-500 font-bold text-xs shrink-0">
                        {invite.invitedName?.charAt(0) || invite.invitedEmail.charAt(0).toUpperCase()}
                      </div>
                      <div>
                        <p className="font-medium text-slate-800">{invite.invitedName || '—'}</p>
                        <p className="text-xs text-slate-400">{invite.invitedEmail}</p>
                      </div>
                    </div>
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
