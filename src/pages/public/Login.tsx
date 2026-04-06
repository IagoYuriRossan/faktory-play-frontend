import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuthStore } from '../../hooks/store/useAuthStore';
import { auth, db } from '../../utils/firebase';
import { signInWithEmailAndPassword, signInWithPopup, GoogleAuthProvider } from 'firebase/auth';
import { doc, getDoc } from 'firebase/firestore';
import { Lock, Mail, AlertCircle, Eye, ShieldCheck } from 'lucide-react';
import { User } from '../../@types';

export default function Login() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();
  const { login } = useAuthStore();

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      const userCredential = await signInWithEmailAndPassword(auth, email, password);
      const firebaseUser = userCredential.user;
      const token = await firebaseUser.getIdToken();
      
      const userDoc = await getDoc(doc(db, 'users', firebaseUser.uid));
      
      if (!userDoc.exists()) {
        setError('Dados do usuário não encontrados. Por favor, entre em contato com o suporte.');
        setLoading(false);
        return;
      }

      const userData = userDoc.data() as User;

      login(userData, token);
      if (userData.role === 'admin') {
        navigate('/admin');
      } else {
        navigate('/app');
      }
    } catch (err: any) {
      console.error('Login error:', err);
      if (err.code === 'auth/user-not-found' || err.code === 'auth/wrong-password' || err.code === 'auth/invalid-credential') {
        setError('E-mail ou senha inválidos.');
      } else {
        setError('Ocorreu um erro ao tentar fazer login.');
      }
    } finally {
      setLoading(false);
    }
  };

  const handleGoogleLogin = async () => {
    setError('');
    setLoading(true);
    try {
      const provider = new GoogleAuthProvider();
      const result = await signInWithPopup(auth, provider);
      const firebaseUser = result.user;
      const token = await firebaseUser.getIdToken();

      const userDocRef = doc(db, 'users', firebaseUser.uid);
      const userDoc = await getDoc(userDocRef);

      if (!userDoc.exists()) {
        setError('Dados do usuário não encontrados. Por favor, entre em contato com o suporte.');
        setLoading(false);
        return;
      }

      const userData = userDoc.data() as User;

      login(userData, token);
      if (userData.role === 'admin') {
        navigate('/admin');
      } else {
        navigate('/app');
      }
    } catch (err: any) {
      console.error('Google login error:', err);
      if (err.code === 'auth/operation-not-allowed') {
        setError('O login com Google não está ativado no Firebase Console. Por favor, ative-o em Authentication > Sign-in method.');
      } else if (err.code === 'auth/unauthorized-domain') {
        setError('Domínio não autorizado no Firebase Auth. Adicione localhost e 127.0.0.1 em Authentication > Settings > Authorized domains.');
      } else {
        setError(`Erro no login Google: ${err.message || err.code || 'Erro desconhecido'}`);
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-[#f4f7f9] p-4">
      {/* Logo Area */}
      <div className="mb-8 flex flex-col items-center">
        <div className="flex items-center gap-2">
          <div className="flex flex-col">
            <div className="flex items-end gap-1">
              <div className="w-8 h-8 bg-gradient-to-br from-faktory-blue to-faktory-yellow rounded flex items-center justify-center text-white font-bold">F</div>
              <span className="text-2xl font-semibold text-[#4a5568] tracking-tight">Faktory</span>
            </div>
            <span className="text-[10px] text-faktory-yellow font-bold self-end -mt-1 mr-1">Flow ■</span>
          </div>
        </div>
      </div>

      {/* Login Card */}
      <div className="bg-white rounded-lg shadow-xl w-full max-w-[400px] overflow-hidden relative">
        {/* Top Gradient Border */}
        <div className="h-1 w-full bg-gradient-to-r from-faktory-blue to-faktory-yellow"></div>
        
        <div className="p-10">
          <div className="text-center mb-8">
            <h1 className="text-xl font-bold text-slate-800">Acesse sua conta</h1>
            <p className="text-sm text-slate-500">Faça login para continuar</p>
          </div>

          {error && (
            <div className="bg-red-50 text-red-600 p-3 rounded text-xs mb-4 text-center">
              {error}
            </div>
          )}

          <form onSubmit={handleLogin} className="space-y-5">
            <div>
              <label className="flex items-center gap-2 text-xs font-semibold text-slate-600 mb-2">
                <Mail size={14} /> E-mail
              </label>
              <input
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full px-4 py-2.5 bg-[#f3f6f9] border border-transparent rounded-lg focus:bg-white focus:border-faktory-blue outline-none transition-all text-sm"
                placeholder="seu@email.com"
              />
            </div>

            <div>
              <label className="flex items-center gap-2 text-xs font-semibold text-slate-600 mb-2">
                <Lock size={14} /> Senha
              </label>
              <div className="relative">
                <input
                  type="password"
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full px-4 py-2.5 bg-[#f3f6f9] border border-transparent rounded-lg focus:bg-white focus:border-faktory-blue outline-none transition-all text-sm"
                  placeholder="••••••••"
                />
                <button type="button" className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400">
                  <Eye size={16} />
                </button>
              </div>
            </div>

            <div className="flex items-center justify-between text-xs">
              <label className="flex items-center gap-2 text-slate-600 cursor-pointer">
                <input type="checkbox" className="rounded text-faktory-blue" />
                Manter conectado
              </label>
              <button type="button" className="text-faktory-blue font-semibold">Esqueci a senha</button>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full bg-faktory-blue text-white py-3 rounded-lg font-bold hover:bg-[#2c6a9a] transition-colors shadow-md disabled:opacity-50"
            >
              {loading ? 'Entrando...' : 'Entrar'}
            </button>
          </form>

          <div className="relative my-6">
            <div className="absolute inset-0 flex items-center">
              <div className="w-full border-t border-slate-200"></div>
            </div>
            <div className="relative flex justify-center text-xs uppercase">
              <span className="bg-white px-2 text-slate-500">ou</span>
            </div>
          </div>

          <button
            onClick={handleGoogleLogin}
            disabled={loading}
            className="w-full flex items-center justify-center gap-3 bg-white border border-slate-300 text-slate-700 py-2.5 rounded-lg font-semibold hover:bg-slate-50 transition-colors shadow-sm disabled:opacity-50"
          >
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
              <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4"/>
              <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/>
              <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l3.66-2.84z" fill="#FBBC05"/>
              <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/>
            </svg>
            Entrar com Google
          </button>

          <div className="mt-8 flex flex-col gap-4 items-center">
            <button className="text-xs text-slate-500 flex items-center gap-2 hover:text-faktory-blue transition-colors">
              <Lock size={14} /> Alterar minha senha
            </button>
            <p className="text-xs text-slate-500">
              Não tem uma conta? <Link to="/register" className="text-blue-600 font-bold hover:underline">Criar agora!</Link>
            </p>
          </div>
        </div>
      </div>

      {/* Footer Status */}
      <div className="mt-8 flex items-center gap-6 text-[10px] text-slate-500 font-medium">
        <div className="flex items-center gap-1.5">
          <div className="w-2 h-2 bg-green-500 rounded-full"></div>
          Sistema online
        </div>
        <div className="flex items-center gap-1.5">
          <ShieldCheck size={12} />
          Conexão segura
        </div>
      </div>
    </div>
  );
}
