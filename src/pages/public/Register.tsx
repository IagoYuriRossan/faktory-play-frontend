import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { User as UserIcon, Mail, Lock, Building2, ShieldCheck, Eye } from 'lucide-react';
import { auth } from '../../utils/firebase';
import { signInWithEmailAndPassword } from 'firebase/auth';
import { fetchAddressByCEP, formatCEP, formatCNPJ, isStrongPassword, isValidCNPJ, onlyDigits, validateCNPJExists } from '../../utils/validators';

export default function Register() {
  const [formData, setFormData] = useState({
    companyName: '',
    cnpj: '',
    cep: '',
    address: '',
    number: '',
    complement: '',
    city: '',
    uf: '',
    adminName: '',
    email: '',
    password: '',
    confirmPassword: '',
  });
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  const ensureOnboardingData = async (_token: string) => ({ alreadyConfigured: false });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (formData.password !== formData.confirmPassword) {
      setError('As senhas não coincidem.');
      return;
    }

    if (!isStrongPassword(formData.password)) {
      setError('Senha fraca. Use no minimo 8 caracteres com maiuscula, minuscula, numero e simbolo.');
      return;
    }

    if (!isValidCNPJ(formData.cnpj)) {
      setError('CNPJ invalido. Verifique os digitos informados.');
      return;
    }

    const cnpjExists = await validateCNPJExists(formData.cnpj);
    if (!cnpjExists.valid) {
      setError(cnpjExists.message);
      return;
    }

    if (onlyDigits(formData.cep).length !== 8) {
      setError('CEP invalido. Informe 8 digitos.');
      return;
    }

    setLoading(true);
    try {
      const BASE_URL = import.meta.env.VITE_API_URL || 'http://127.0.0.1:3001';

      const res = await fetch(`${BASE_URL}/api/register`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: formData.email,
          password: formData.password,
          name: formData.adminName,
          companyName: formData.companyName,
          cnpj: formData.cnpj,
          cep: formData.cep,
          address: formData.address,
          number: formData.number,
          complement: formData.complement,
          city: formData.city,
          uf: formData.uf.toUpperCase(),
        }),
      });

      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        if (res.status === 409) {
          setError('Este e-mail ou CNPJ já está cadastrado.');
        } else {
          setError(data.message || `Erro ao criar conta (${res.status})`);
        }
        return;
      }

      // Sign in to establish the Firebase session
      await signInWithEmailAndPassword(auth, formData.email, formData.password);
      navigate('/empresa');
    } catch (err: any) {
      console.error('Registration error:', err);
      setError('Ocorreu um erro ao realizar o cadastro. Tente novamente.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-[#f4f7f9] py-12 px-4">
      {/* Logo Area */}
      <div className="mb-8 flex flex-col items-center">
        <div className="flex items-center gap-2">
          <div className="flex flex-col">
            <div className="flex items-end gap-1">
              <div className="w-8 h-8 bg-gradient-to-br from-faktory-blue to-faktory-yellow rounded flex items-center justify-center text-white font-bold">F</div>
              <span className="text-2xl font-semibold text-[#4a5568] tracking-tight">Faktory</span>
            </div>
            <span className="text-[10px] text-faktory-yellow font-bold self-end -mt-1 mr-1">Play ▶</span>
          </div>
        </div>
      </div>

      {/* Register Card */}
      <div className="bg-white rounded-lg shadow-xl w-full max-w-[500px] overflow-hidden relative">
        <div className="h-1 w-full bg-gradient-to-r from-faktory-blue to-faktory-yellow"></div>
        
        <div className="p-10">
          <div className="text-center mb-8">
            <h1 className="text-xl font-bold text-slate-800">Cadastre sua empresa</h1>
            <p className="text-sm text-slate-500">Comece agora com o Faktory PRO</p>
          </div>

          {error && (
            <div className="bg-red-50 text-red-600 p-3 rounded text-xs mb-4 text-center">
              {error}
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-5">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="flex items-center gap-2 text-xs font-semibold text-slate-600 mb-2">
                  <Building2 size={14} /> Nome da Empresa
                </label>
                <input
                  type="text"
                  required
                  className="w-full px-4 py-2.5 bg-[#f3f6f9] border border-transparent rounded-lg focus:bg-white focus:border-faktory-blue outline-none transition-all text-sm"
                  placeholder="Ex: Minha Empresa LTDA"
                  onChange={(e) => setFormData({...formData, companyName: e.target.value})}
                />
              </div>
              <div>
                <label className="flex items-center gap-2 text-xs font-semibold text-slate-600 mb-2">
                  <ShieldCheck size={14} /> CNPJ
                </label>
                <input
                  type="text"
                  required
                  value={formData.cnpj}
                  className="w-full px-4 py-2.5 bg-[#f3f6f9] border border-transparent rounded-lg focus:bg-white focus:border-faktory-blue outline-none transition-all text-sm"
                  placeholder="00.000.000/0000-00"
                  onChange={(e) => setFormData({...formData, cnpj: formatCNPJ(e.target.value)})}
                />
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="flex items-center gap-2 text-xs font-semibold text-slate-600 mb-2">CEP</label>
                <input
                  type="text"
                  required
                  value={formData.cep}
                  className="w-full px-4 py-2.5 bg-[#f3f6f9] border border-transparent rounded-lg focus:bg-white focus:border-faktory-blue outline-none transition-all text-sm"
                  placeholder="00000-000"
                  onChange={(e) => setFormData({...formData, cep: formatCEP(e.target.value)})}
                  onBlur={async () => {
                    const result = await fetchAddressByCEP(formData.cep);
                    if (!result.found) {
                      setError(result.message);
                      return;
                    }

                    setError('');
                    setFormData(prev => ({
                      ...prev,
                      address: prev.address || result.address.address,
                      city: prev.city || result.address.city,
                      uf: prev.uf || result.address.uf,
                    }));
                  }}
                />
              </div>
              <div>
                <label className="flex items-center gap-2 text-xs font-semibold text-slate-600 mb-2">UF</label>
                <input
                  type="text"
                  required
                  maxLength={2}
                  value={formData.uf}
                  className="w-full px-4 py-2.5 bg-[#f3f6f9] border border-transparent rounded-lg focus:bg-white focus:border-faktory-blue outline-none transition-all text-sm"
                  placeholder="SP"
                  onChange={(e) => setFormData({...formData, uf: e.target.value.toUpperCase()})}
                />
              </div>
            </div>

            <div>
              <label className="flex items-center gap-2 text-xs font-semibold text-slate-600 mb-2">Endereco</label>
              <input
                type="text"
                required
                value={formData.address}
                className="w-full px-4 py-2.5 bg-[#f3f6f9] border border-transparent rounded-lg focus:bg-white focus:border-faktory-blue outline-none transition-all text-sm"
                placeholder="Rua, Avenida, etc."
                onChange={(e) => setFormData({...formData, address: e.target.value})}
              />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="flex items-center gap-2 text-xs font-semibold text-slate-600 mb-2">Numero</label>
                <input
                  type="text"
                  required
                  value={formData.number}
                  className="w-full px-4 py-2.5 bg-[#f3f6f9] border border-transparent rounded-lg focus:bg-white focus:border-faktory-blue outline-none transition-all text-sm"
                  placeholder="123"
                  onChange={(e) => setFormData({...formData, number: e.target.value})}
                />
              </div>
              <div>
                <label className="flex items-center gap-2 text-xs font-semibold text-slate-600 mb-2">Complemento</label>
                <input
                  type="text"
                  value={formData.complement}
                  className="w-full px-4 py-2.5 bg-[#f3f6f9] border border-transparent rounded-lg focus:bg-white focus:border-faktory-blue outline-none transition-all text-sm"
                  placeholder="Sala, bloco, etc."
                  onChange={(e) => setFormData({...formData, complement: e.target.value})}
                />
              </div>
            </div>

            <div>
              <label className="flex items-center gap-2 text-xs font-semibold text-slate-600 mb-2">Cidade</label>
              <input
                type="text"
                required
                value={formData.city}
                className="w-full px-4 py-2.5 bg-[#f3f6f9] border border-transparent rounded-lg focus:bg-white focus:border-faktory-blue outline-none transition-all text-sm"
                placeholder="Sao Paulo"
                onChange={(e) => setFormData({...formData, city: e.target.value})}
              />
            </div>

            <div>
              <label className="flex items-center gap-2 text-xs font-semibold text-slate-600 mb-2">
                <UserIcon size={14} /> Nome do Administrador
              </label>
              <input
                type="text"
                required
                className="w-full px-4 py-2.5 bg-[#f3f6f9] border border-transparent rounded-lg focus:bg-white focus:border-faktory-blue outline-none transition-all text-sm"
                placeholder="Seu nome completo"
                onChange={(e) => setFormData({...formData, adminName: e.target.value})}
              />
            </div>

            <div>
              <label className="flex items-center gap-2 text-xs font-semibold text-slate-600 mb-2">
                <Mail size={14} /> E-mail Corporativo
              </label>
              <input
                type="email"
                required
                className="w-full px-4 py-2.5 bg-[#f3f6f9] border border-transparent rounded-lg focus:bg-white focus:border-faktory-blue outline-none transition-all text-sm"
                placeholder="seu@email.com"
                onChange={(e) => setFormData({...formData, email: e.target.value})}
              />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="flex items-center gap-2 text-xs font-semibold text-slate-600 mb-2">
                  <Lock size={14} /> Senha
                </label>
                <input
                  type="password"
                  required
                  value={formData.password}
                  className="w-full px-4 py-2.5 bg-[#f3f6f9] border border-transparent rounded-lg focus:bg-white focus:border-faktory-blue outline-none transition-all text-sm"
                  placeholder="••••••••"
                  onChange={(e) => setFormData({...formData, password: e.target.value})}
                />
                <p className="mt-1 text-[11px] text-slate-500">
                  Minimo 8 caracteres com letra maiuscula, minuscula, numero e simbolo.
                </p>
              </div>
              <div>
                <label className="flex items-center gap-2 text-xs font-semibold text-slate-600 mb-2">
                  <Lock size={14} /> Confirmar Senha
                </label>
                <input
                  type="password"
                  required
                  value={formData.confirmPassword}
                  className="w-full px-4 py-2.5 bg-[#f3f6f9] border border-transparent rounded-lg focus:bg-white focus:border-faktory-blue outline-none transition-all text-sm"
                  placeholder="••••••••"
                  onChange={(e) => setFormData({...formData, confirmPassword: e.target.value})}
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full bg-faktory-blue text-white py-3 rounded-lg font-bold hover:bg-[#2c6a9a] transition-colors shadow-md mt-4 disabled:opacity-50"
            >
              {loading ? 'Criando Conta...' : 'Criar Conta Faktory PRO'}
            </button>
          </form>

          <div className="mt-8 text-center">
            <p className="text-xs text-slate-500">
              Já tem uma conta? <Link to="/login" className="text-faktory-blue font-bold hover:underline">Fazer Login</Link>
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
