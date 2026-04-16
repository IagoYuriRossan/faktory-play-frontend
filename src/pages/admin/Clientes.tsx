import { useEffect, useState } from 'react';
import { Plus, Search, MoreVertical, Building2, Loader2, X, Check } from 'lucide-react';
import { Link } from 'react-router-dom';
import { api } from '../../utils/api';
import { Company } from '../../@types';
import { fetchAddressByCEP, formatCEP, formatCNPJ, isValidCNPJ, onlyDigits, validateCNPJExists } from '../../utils/validators';
import { useAuthStore } from '../../hooks/store/useAuthStore';

export default function AdminClientes() {
  const [companies, setCompanies] = useState<Company[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [openMenuId, setOpenMenuId] = useState<string | null>(null);
  const { user } = useAuthStore();
  const [toast, setToast] = useState<{ type: 'success' | 'error'; message: string } | null>(null);

  const showToast = (type: 'success' | 'error', message: string) => {
    setToast({ type, message });
    setTimeout(() => setToast(null), 3500);
  };
  const [newCompany, setNewCompany] = useState({
    name: '',
    cnpj: '',
    cep: '',
    address: '',
    number: '',
    complement: '',
    city: '',
    uf: '',
  });
  const [formError, setFormError] = useState('');
  const [creating, setCreating] = useState(false);

  const fetchCompanies = async () => {
    setLoading(true);
    try {
      const companiesData = await api.get<Company[]>('/api/companies');
      setCompanies(companiesData);
    } catch (error) {
      console.error('Error fetching companies:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchCompanies();
  }, []);

  const handleCreateCompany = async (e: any) => {
    e.preventDefault();
    setFormError('');

    if (!newCompany.name || !newCompany.cnpj || !newCompany.cep || !newCompany.address || !newCompany.number || !newCompany.city || !newCompany.uf) {
      setFormError('Preencha todos os campos obrigatorios da empresa.');
      return;
    }

    if (!isValidCNPJ(newCompany.cnpj)) {
      setFormError('CNPJ invalido. Verifique os digitos informados.');
      return;
    }

    const cnpjExists = await validateCNPJExists(newCompany.cnpj);
    if (!cnpjExists.valid) {
      setFormError(cnpjExists.message);
      return;
    }

    if (onlyDigits(newCompany.cep).length !== 8) {
      setFormError('CEP invalido. Informe 8 digitos.');
      return;
    }
    
    setCreating(true);
    try {
      await api.post('/api/companies', {
        name: newCompany.name,
        cnpj: newCompany.cnpj,
        cep: newCompany.cep,
        address: newCompany.address,
        number: newCompany.number,
        complement: newCompany.complement,
        city: newCompany.city,
        uf: newCompany.uf.toUpperCase(),
        allowedTrails: [],
      });
      setNewCompany({ name: '', cnpj: '', cep: '', address: '', number: '', complement: '', city: '', uf: '' });
      setIsModalOpen(false);
      fetchCompanies();
    } catch (error) {
      console.error('Error creating company:', error);
    } finally {
      setCreating(false);
    }
  };

  const filteredCompanies = companies.filter(c => 
    c.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    c.cnpj.includes(searchTerm)
  );

  return (
    <div className="space-y-8">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-800">Empresas Clientes</h1>
          <p className="text-slate-500">Gerencie as empresas e seus acessos às trilhas.</p>
        </div>
        <button 
          onClick={() => setIsModalOpen(true)}
          className="bg-faktory-blue text-white px-4 py-2 rounded-lg font-medium flex items-center gap-2 hover:bg-[#2c6a9a] transition-colors shadow-lg shadow-blue-100"
        >
          <Plus size={20} />
          <span>Nova Empresa</span>
        </button>
      </div>

      {/* Filters */}
      <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm flex items-center gap-4">
        <div className="relative flex-1">
          <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-400">
            <Search size={18} />
          </div>
          <input
            type="text"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="Buscar por nome ou CNPJ..."
            className="block w-full pl-10 pr-3 py-2 border border-slate-200 rounded-lg focus:ring-2 focus:ring-faktory-blue focus:border-faktory-blue outline-none transition-all text-sm"
          />
        </div>
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
                <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase tracking-wider">CNPJ</th>
                <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase tracking-wider">Trilhas Ativas</th>
                <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase tracking-wider text-right">Ações</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filteredCompanies.length === 0 ? (
                <tr>
                  <td colSpan={4} className="px-6 py-12 text-center text-slate-500">
                    Nenhuma empresa encontrada.
                  </td>
                </tr>
              ) : (
                filteredCompanies.map((company) => (
                  <tr key={company.id} className="hover:bg-slate-50 transition-colors">
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 bg-blue-50 rounded-lg flex items-center justify-center text-faktory-blue">
                          <Building2 size={20} />
                        </div>
                        <span className="font-bold text-slate-800">{company.name}</span>
                      </div>
                    </td>
                    <td className="px-6 py-4 text-sm text-slate-600">{company.cnpj}</td>
                    <td className="px-6 py-4">
                      <div className="flex flex-wrap gap-1">
                        {company.allowedTrails.length === 0 ? (
                          <span className="text-[10px] text-slate-400">Nenhuma trilha</span>
                        ) : (
                          company.allowedTrails.map((trailId) => (
                            <span key={trailId} className="text-[10px] font-bold uppercase px-2 py-0.5 bg-slate-100 text-slate-600 rounded">
                              {trailId.substring(0, 8)}...
                            </span>
                          ))
                        )}
                      </div>
                    </td>
                    <td className="px-6 py-4 text-right">
                      <div className="flex items-center justify-end gap-2">
                        <Link
                          to={`/admin/clientes/${company.id}`}
                          className="text-sm font-bold text-faktory-blue hover:underline"
                        >
                          Gerenciar
                        </Link>
                        <div className="relative">
                          <button onClick={() => setOpenMenuId(openMenuId === company.id ? null : company.id)} className="p-1 text-slate-400 hover:text-slate-600">
                            <MoreVertical size={18} />
                          </button>

                          {openMenuId === company.id && (
                            <div className="absolute right-0 mt-2 w-44 bg-white border border-slate-200 rounded-md shadow-lg z-50">
                              <Link to={`/admin/clientes/${company.id}`} className="block px-3 py-2 text-sm text-slate-700 hover:bg-slate-50">Visualizar</Link>
                              {user?.role === 'superadmin' && (
                                <button
                                  className="w-full text-left px-3 py-2 text-sm text-red-600 hover:bg-slate-50"
                                  onClick={async () => {
                                    const confirmDelete = window.confirm('Remover empresa? Esta ação removerá a empresa do sistema.');
                                    if (!confirmDelete) return;
                                    try {
                                      await api.delete(`/api/companies/${company.id}`);
                                      await fetchCompanies();
                                      setOpenMenuId(null);
                                      showToast('success', 'Empresa removida com sucesso.');
                                    } catch (err: any) {
                                      console.error('Erro removendo empresa:', err);
                                      showToast('error', err?.message || 'Erro ao remover empresa.');
                                    }
                                  }}
                                >
                                  Remover
                                </button>
                              )}
                            </div>
                          )}
                        </div>

                        {toast && (
                          <div className={`fixed right-4 bottom-6 z-50 px-4 py-2 rounded shadow-lg ${toast.type === 'success' ? 'bg-green-600 text-white' : 'bg-red-600 text-white'}`}>
                            {toast.message}
                          </div>
                        )}
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        )}
      </div>

      {/* New Company Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl w-full max-w-md shadow-2xl overflow-hidden animate-in fade-in zoom-in duration-200">
            <div className="p-6 border-b border-slate-100 flex items-center justify-between">
              <h2 className="text-xl font-bold text-slate-800">Cadastrar Nova Empresa</h2>
              <button onClick={() => setIsModalOpen(false)} className="text-slate-400 hover:text-slate-600">
                <X size={20} />
              </button>
            </div>
            <form onSubmit={handleCreateCompany} className="p-6 space-y-4">
              {formError && (
                <div className="bg-red-50 text-red-600 p-3 rounded text-xs text-center">
                  {formError}
                </div>
              )}
              <div>
                <label className="block text-sm font-bold text-slate-700 mb-2">Razão Social</label>
                <input
                  type="text"
                  required
                  value={newCompany.name}
                  onChange={(e) => setNewCompany(prev => ({ ...prev, name: e.target.value }))}
                  placeholder="Ex: Esquadrias Silva LTDA"
                  className="w-full px-4 py-2 border border-slate-200 rounded-lg focus:ring-2 focus:ring-faktory-blue outline-none"
                />
              </div>
              <div>
                <label className="block text-sm font-bold text-slate-700 mb-2">CNPJ</label>
                <input
                  type="text"
                  required
                  value={newCompany.cnpj}
                  onChange={(e) => setNewCompany(prev => ({ ...prev, cnpj: formatCNPJ(e.target.value) }))}
                  placeholder="00.000.000/0000-00"
                  className="w-full px-4 py-2 border border-slate-200 rounded-lg focus:ring-2 focus:ring-faktory-blue outline-none"
                />
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-bold text-slate-700 mb-2">CEP</label>
                  <input
                    type="text"
                    required
                    value={newCompany.cep}
                    onChange={(e) => setNewCompany(prev => ({ ...prev, cep: formatCEP(e.target.value) }))}
                    onBlur={async () => {
                      const result = await fetchAddressByCEP(newCompany.cep);
                      if (!result.found) {
                        setFormError(result.message);
                        return;
                      }

                      setFormError('');
                      setNewCompany(prev => ({
                        ...prev,
                        address: prev.address || result.address.address,
                        city: prev.city || result.address.city,
                        uf: prev.uf || result.address.uf,
                      }));
                    }}
                    placeholder="00000-000"
                    className="w-full px-4 py-2 border border-slate-200 rounded-lg focus:ring-2 focus:ring-faktory-blue outline-none"
                  />
                </div>
                <div>
                  <label className="block text-sm font-bold text-slate-700 mb-2">UF</label>
                  <input
                    type="text"
                    required
                    maxLength={2}
                    value={newCompany.uf}
                    onChange={(e) => setNewCompany(prev => ({ ...prev, uf: e.target.value.toUpperCase() }))}
                    placeholder="SP"
                    className="w-full px-4 py-2 border border-slate-200 rounded-lg focus:ring-2 focus:ring-faktory-blue outline-none"
                  />
                </div>
              </div>
              <div>
                <label className="block text-sm font-bold text-slate-700 mb-2">Endereco</label>
                <input
                  type="text"
                  required
                  value={newCompany.address}
                  onChange={(e) => setNewCompany(prev => ({ ...prev, address: e.target.value }))}
                  placeholder="Rua, Avenida, etc."
                  className="w-full px-4 py-2 border border-slate-200 rounded-lg focus:ring-2 focus:ring-faktory-blue outline-none"
                />
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-bold text-slate-700 mb-2">Numero</label>
                  <input
                    type="text"
                    required
                    value={newCompany.number}
                    onChange={(e) => setNewCompany(prev => ({ ...prev, number: e.target.value }))}
                    placeholder="123"
                    className="w-full px-4 py-2 border border-slate-200 rounded-lg focus:ring-2 focus:ring-faktory-blue outline-none"
                  />
                </div>
                <div>
                  <label className="block text-sm font-bold text-slate-700 mb-2">Complemento</label>
                  <input
                    type="text"
                    value={newCompany.complement}
                    onChange={(e) => setNewCompany(prev => ({ ...prev, complement: e.target.value }))}
                    placeholder="Sala, bloco, etc."
                    className="w-full px-4 py-2 border border-slate-200 rounded-lg focus:ring-2 focus:ring-faktory-blue outline-none"
                  />
                </div>
              </div>
              <div>
                <label className="block text-sm font-bold text-slate-700 mb-2">Cidade</label>
                <input
                  type="text"
                  required
                  value={newCompany.city}
                  onChange={(e) => setNewCompany(prev => ({ ...prev, city: e.target.value }))}
                  placeholder="Sao Paulo"
                  className="w-full px-4 py-2 border border-slate-200 rounded-lg focus:ring-2 focus:ring-faktory-blue outline-none"
                />
              </div>
              <div className="pt-4 flex gap-3">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="flex-1 px-4 py-2 border border-slate-200 text-slate-600 font-bold rounded-lg hover:bg-slate-50 transition-colors"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={creating}
                  className="flex-1 px-4 py-2 bg-faktory-blue text-white font-bold rounded-lg hover:bg-[#2c6a9a] transition-colors shadow-lg shadow-blue-100 flex items-center justify-center gap-2 disabled:opacity-50"
                >
                  {creating ? <Loader2 className="animate-spin" size={18} /> : <Check size={18} />}
                  Cadastrar
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
