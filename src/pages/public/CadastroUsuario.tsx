import React, { useState, useEffect } from 'react';
import { useNavigate, useSearchParams, Link } from 'react-router-dom';
import { User as UserIcon, Mail, Lock, Eye, EyeOff, Loader2, Building2 } from 'lucide-react';
import { auth } from '../../utils/firebase';
import { signInWithEmailAndPassword, signInWithPopup, GoogleAuthProvider, fetchSignInMethodsForEmail, sendPasswordResetEmail } from 'firebase/auth';
import { useAuthStore } from '../../hooks/store/useAuthStore';
import { api } from '../../utils/api';
import { User } from '../../@types';
import { isStrongPassword } from '../../utils/validators';

interface InviteInfo {
  companyId: string;
  companyName: string;
  invitedEmail?: string;
  invitedName?: string;
  expiresAt: string;
}

export default function CadastroUsuario() {
  const [searchParams] = useSearchParams();
  const token = searchParams.get('invite') || searchParams.get('token') || '';
  const navigate = useNavigate();

  const [invite, setInvite] = useState<InviteInfo | null>(null);
  const [inviteError, setInviteError] = useState('');
  const [validating, setValidating] = useState(true);

  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [googleLoading, setGoogleLoading] = useState(false);
  const [providers, setProviders] = useState<string[]>([]);
  const [showResetOption, setShowResetOption] = useState(false);
  const [sendingReset, setSendingReset] = useState(false);
  const [resetSent, setResetSent] = useState('');

  const { login } = useAuthStore();
  const BASE_URL = import.meta.env.VITE_API_URL || 'http://127.0.0.1:3001';
  const AUTO_REDIRECT_TO_PROVIDER = (import.meta.env.VITE_AUTO_REDIRECT_TO_PROVIDER || 'false') === 'true';

  useEffect(() => {
    if (!token) {
      navigate('/register', { replace: true });
      return;
    }

    fetch(`${BASE_URL}/api/invites/${token}`)
      .then(async res => {
        const data = await res.json().catch(() => ({}));
        if (res.status === 404) throw new Error('Convite não encontrado.');
        if (res.status === 410) throw new Error('Convite expirado ou já utilizado.');
        if (!res.ok) throw new Error(data.message || `Erro ${res.status}`);
        return data as InviteInfo;
      })
      .then(data => {
        setInvite(data);
        if (data.invitedEmail) setEmail(data.invitedEmail);
        if (data.invitedName) setName(data.invitedName);
      })
      .catch(err => setInviteError(err.message || 'Erro ao validar convite.'))
      .finally(() => setValidating(false));
  }, [token]);

  const handleGoogleLogin = async () => {
    setError('');
    setGoogleLoading(true);
    try {
      const provider = new GoogleAuthProvider();
      provider.setCustomParameters({ prompt: 'select_account' });
      const result = await signInWithPopup(auth, provider);
      const idToken = await result.user.getIdToken();

      // Valida que o e-mail da conta Google bate com o convite
      if (invite?.invitedEmail && result.user.email?.toLowerCase() !== invite.invitedEmail.toLowerCase()) {
        setError(`Este convite é para ${invite.invitedEmail}. Entre com o e-mail correto.`);
        await result.user.delete().catch(() => {});
        return;
      }

      // Aceitar o convite vinculando a conta Google à empresa
      const acceptRes = await fetch(`${BASE_URL}/api/invites/${token}/accept`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${idToken}` },
      });

      if (!acceptRes.ok) {
        const data = await acceptRes.json().catch(() => ({}));
        console.error('Invite accept failed', acceptRes.status, data);
        setError(data.message || `Erro ao aceitar convite (${acceptRes.status})`);
        return;
      }

      const userData = await api.get<User>('/api/auth/me');
      login(userData, idToken);
      navigate('/app', { replace: true });
    } catch (err: any) {
      if (err.code === 'auth/popup-closed-by-user') return;
      if (err.code === 'auth/unauthorized-domain') {
        setError('Domínio não autorizado no Firebase. Adicione localhost em Authentication > Authorized domains.');
      } else {
        setError(err.message || 'Erro ao entrar com Google.');
      }
    } finally {
      setGoogleLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (password !== confirmPassword) {
      setError('As senhas não coincidem.');
      return;
    }

    if (!isStrongPassword(password)) {
      setError('Senha fraca. Use no mínimo 8 caracteres com maiúscula, minúscula, número e símbolo.');
      return;
    }

    // Valida que o e-mail digitado bate com o convite
    if (invite?.invitedEmail && email.toLowerCase().trim() !== invite.invitedEmail.toLowerCase().trim()) {
      setError(`Este convite é para ${invite.invitedEmail}. Use o e-mail correto.`);
      return;
    }

    setLoading(true);
    try {
      const BASE_URL = import.meta.env.VITE_API_URL || 'http://127.0.0.1:3001';

      const res = await fetch(`${BASE_URL}/api/register`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password, name, inviteToken: token }),
      });

      const data = await res.json().catch(() => ({}));

      if (!res.ok) {
        if (res.status === 409) {
          console.error('Register returned 409:', data);
          try {
            const methods = await fetchSignInMethodsForEmail(auth, email).catch(() => null);
            if (Array.isArray(methods) && methods.length > 0) {
              setError(`Este e-mail já está cadastrado. Métodos de login: ${methods.join(', ')}`);
            } else {
              setError('Este e-mail já está cadastrado.');
            }
          } catch (innerErr) {
            console.error('Erro ao checar métodos de login do Firebase:', innerErr);
            setError('Este e-mail já está cadastrado.');
          }
        } else {
          setError(data.message || `Erro ao criar conta (${res.status})`);
        }
        return;
      }

      // Backend may respond with a success but signal that the auth user exists without password
      if (data && data.message === 'existing_auth_no_password') {
        const provs = Array.isArray(data.providers) ? data.providers : [];
        setProviders(provs);
        setShowResetOption(true);

        // Fallback: if backend didn't include providers, probe Firebase client
        if (provs.length === 0) {
          try {
            const methods = await fetchSignInMethodsForEmail(auth, email).catch(() => []);
            if (Array.isArray(methods)) setProviders(methods);
          } catch (probeErr) {
            console.error('Erro ao descobrir provedores via Firebase:', probeErr);
          }
        }

        if (AUTO_REDIRECT_TO_PROVIDER && (provs || []).includes('google.com')) {
          await handleGoogleLogin();
          return;
        }

        setError('Já existe uma conta para este e‑mail sem senha. Entre com o provedor listado ou peça redefinição de senha.');
        return;
      }

      // Auto-login: estabelece sessão Firebase e popula o store
      const credential = await signInWithEmailAndPassword(auth, email, password);
      const idToken = await credential.user.getIdToken();
      const userData = await api.get<User>('/api/auth/me');
      login(userData, idToken);
      navigate('/app', { replace: true });
    } catch (err: any) {
      setError(err.message || 'Erro ao criar conta. Tente novamente.');
    } finally {
      setLoading(false);
    }
  };

  const handleSendReset = async () => {
    setSendingReset(true);
    setResetSent('');
    setError('');
    try {
      await sendPasswordResetEmail(auth, email);
      setResetSent('Link de redefinição enviado. Verifique seu e‑mail.');
    } catch (err: any) {
      console.error('Erro ao enviar reset:', err);
      setError('Não foi possível enviar o e‑mail — tente mais tarde.');
    } finally {
      setSendingReset(false);
    }
  };

  if (validating) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50">
        <Loader2 className="animate-spin text-faktory-blue" size={36} />
      </div>
    );
  }

  if (inviteError) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50 p-4">
        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-10 text-center max-w-sm w-full space-y-3">
          <p className="text-red-500 font-medium">{inviteError}</p>
          <p className="text-sm text-slate-400">Entre em contato com o administrador da sua empresa.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-slate-50 p-4">
      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-8 w-full max-w-sm space-y-6">
        {/* Banner da empresa */}
        <div className="bg-faktory-blue/5 border border-faktory-blue/20 rounded-xl px-4 py-3 flex items-center gap-3">
          <Building2 size={18} className="text-faktory-blue shrink-0" />
          <p className="text-sm text-slate-700">
            Você foi convidado para entrar em{' '}
            <span className="font-semibold text-faktory-blue">{invite?.companyName}</span>
          </p>
        </div>

        <div className="text-center">
          <h1 className="text-2xl font-bold text-slate-800">Criar sua conta</h1>
          <p className="text-sm text-slate-500 mt-1">Preencha os dados para acessar a plataforma.</p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-xs font-bold text-slate-600 mb-1">Nome completo</label>
            <div className="relative">
              <UserIcon size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
              <input
                type="text"
                value={name}
                onChange={e => setName(e.target.value)}
                placeholder="João da Silva"
                required
                className="w-full pl-9 pr-4 py-2.5 border border-slate-200 rounded-lg text-sm focus:ring-2 focus:ring-faktory-blue focus:border-faktory-blue outline-none"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-600 mb-1">E-mail</label>
            <div className="relative">
              <Mail size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
              <input
                type="email"
                value={email}
                onChange={e => setEmail(e.target.value)}
                placeholder="joao@empresa.com.br"
                required
                readOnly={!!invite?.invitedEmail}
                className="w-full pl-9 pr-4 py-2.5 border border-slate-200 rounded-lg text-sm focus:ring-2 focus:ring-faktory-blue focus:border-faktory-blue outline-none read-only:bg-slate-50 read-only:text-slate-500"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-600 mb-1">Senha</label>
            <div className="relative">
              <Lock size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
              <input
                type={showPassword ? 'text' : 'password'}
                value={password}
                onChange={e => setPassword(e.target.value)}
                placeholder="Mínimo 8 caracteres"
                required
                className="w-full pl-9 pr-10 py-2.5 border border-slate-200 rounded-lg text-sm focus:ring-2 focus:ring-faktory-blue focus:border-faktory-blue outline-none"
              />
              <button
                type="button"
                onClick={() => setShowPassword(v => !v)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
              >
                {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
              </button>
            </div>
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-600 mb-1">Confirmar senha</label>
            <div className="relative">
              <Lock size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
              <input
                type={showPassword ? 'text' : 'password'}
                value={confirmPassword}
                onChange={e => setConfirmPassword(e.target.value)}
                placeholder="Repita a senha"
                required
                className="w-full pl-9 pr-4 py-2.5 border border-slate-200 rounded-lg text-sm focus:ring-2 focus:ring-faktory-blue focus:border-faktory-blue outline-none"
              />
            </div>
          </div>

          {error && (
            <p className="text-xs text-red-500 bg-red-50 px-3 py-2 rounded-lg">{error}</p>
          )}

          <button
            type="submit"
            disabled={loading || googleLoading}
            className="w-full bg-faktory-blue text-white py-2.5 rounded-lg font-bold text-sm hover:bg-[#2c6a9a] transition-colors disabled:opacity-60 flex items-center justify-center gap-2"
          >
            {loading && <Loader2 size={16} className="animate-spin" />}
            {loading ? 'Criando conta...' : 'Criar conta'}
          </button>

          <div className="flex items-center gap-3">
            <div className="flex-1 h-px bg-slate-200" />
            <span className="text-xs text-slate-400">ou</span>
            <div className="flex-1 h-px bg-slate-200" />
          </div>

          <button
            type="button"
            onClick={handleGoogleLogin}
            disabled={loading || googleLoading}
            className="w-full border border-slate-200 bg-white text-slate-700 py-2.5 rounded-lg font-bold text-sm hover:bg-slate-50 transition-colors disabled:opacity-60 flex items-center justify-center gap-2"
          >
            {googleLoading ? (
              <Loader2 size={16} className="animate-spin" />
            ) : (
              <svg width="16" height="16" viewBox="0 0 48 48" fill="none" xmlns="http://www.w3.org/2000/svg">
                <path d="M43.611 20.083H42V20H24v8h11.303c-1.649 4.657-6.08 8-11.303 8-6.627 0-12-5.373-12-12s5.373-12 12-12c3.059 0 5.842 1.154 7.961 3.039l5.657-5.657C34.046 6.053 29.268 4 24 4 12.955 4 4 12.955 4 24s8.955 20 20 20 20-8.955 20-20c0-1.341-.138-2.65-.389-3.917z" fill="#FFC107"/>
                <path d="M6.306 14.691l6.571 4.819C14.655 15.108 18.961 12 24 12c3.059 0 5.842 1.154 7.961 3.039l5.657-5.657C34.046 6.053 29.268 4 24 4 16.318 4 9.656 8.337 6.306 14.691z" fill="#FF3D00"/>
                <path d="M24 44c5.166 0 9.86-1.977 13.409-5.192l-6.19-5.238C29.211 35.091 26.715 36 24 36c-5.202 0-9.619-3.317-11.283-7.946l-6.522 5.025C9.505 39.556 16.227 44 24 44z" fill="#4CAF50"/>
                <path d="M43.611 20.083H42V20H24v8h11.303c-.792 2.237-2.231 4.166-4.087 5.571l6.19 5.238C42.021 35.851 44 30.138 44 24c0-1.341-.138-2.65-.389-3.917z" fill="#1976D2"/>
              </svg>
            )}
            {googleLoading ? 'Aguarde...' : 'Entrar com Google'}
          </button>

          {providers.length > 0 && (
            <div className="space-y-2 mt-3">
              <p className="text-sm text-slate-600">Este e‑mail já existe. Entre com:</p>
              {providers.includes('google.com') && (
                <button
                  type="button"
                  onClick={handleGoogleLogin}
                  disabled={googleLoading}
                  className="w-full border border-slate-200 bg-white text-slate-700 py-2.5 rounded-lg font-bold text-sm hover:bg-slate-50 transition-colors disabled:opacity-60 flex items-center justify-center gap-2"
                >
                  {googleLoading ? <Loader2 size={16} className="animate-spin" /> : null}
                  {googleLoading ? 'Aguarde...' : 'Entrar com Google'}
                </button>
              )}

              {showResetOption && (
                <button
                  type="button"
                  onClick={handleSendReset}
                  disabled={sendingReset}
                  className="w-full bg-white text-slate-700 py-2.5 rounded-lg font-medium text-sm border border-slate-200 hover:bg-slate-50 disabled:opacity-60"
                >
                  {sendingReset ? 'Enviando...' : 'Enviar link de redefinição'}
                </button>
              )}

              {resetSent && <p className="text-sm text-green-600">{resetSent}</p>}
            </div>
          )}
        </form>

        <p className="text-center text-xs text-slate-400">
          Já tem conta?{' '}
          <Link to="/login" className="text-faktory-blue font-bold hover:underline">
            Entrar
          </Link>
        </p>
      </div>
    </div>
  );
}
