import React, { useState, useEffect } from 'react';
import { useSearchParams, useNavigate, Link } from 'react-router-dom';
import { auth } from '../../utils/firebase';
import { confirmPasswordReset, verifyPasswordResetCode } from 'firebase/auth';
import { Lock, Eye, EyeOff, CheckCircle, XCircle, Loader2 } from 'lucide-react';
import { isStrongPassword } from '../../utils/validators';

export default function AuthAcao() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();

  const mode = searchParams.get('mode');
  const oobCode = searchParams.get('oobCode') || '';

  const [verifying, setVerifying] = useState(true);
  const [verifyError, setVerifyError] = useState('');
  const [email, setEmail] = useState('');

  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);

  useEffect(() => {
    if (!oobCode) {
      setVerifyError('Link inválido ou expirado.');
      setVerifying(false);
      return;
    }

    verifyPasswordResetCode(auth, oobCode)
      .then(emailFromCode => {
        setEmail(emailFromCode);
      })
      .catch(() => {
        setVerifyError('Este link de redefinição é inválido ou já foi utilizado. Solicite um novo.');
      })
      .finally(() => setVerifying(false));
  }, [oobCode]);

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

    setLoading(true);
    try {
      await confirmPasswordReset(auth, oobCode, password);
      setSuccess(true);
    } catch (err: any) {
      if (err.code === 'auth/expired-action-code') {
        setError('Este link expirou. Solicite um novo e-mail de redefinição.');
      } else if (err.code === 'auth/invalid-action-code') {
        setError('Link inválido ou já utilizado. Solicite um novo.');
      } else if (err.code === 'auth/weak-password') {
        setError('Senha muito fraca. Escolha uma senha mais segura.');
      } else {
        setError('Erro ao redefinir a senha. Tente novamente.');
      }
    } finally {
      setLoading(false);
    }
  };

  if (verifying) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50">
        <Loader2 className="animate-spin text-faktory-blue" size={36} />
      </div>
    );
  }

  if (verifyError) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50 p-4">
        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-10 text-center max-w-sm w-full space-y-4">
          <XCircle className="mx-auto text-red-400" size={48} />
          <h2 className="text-lg font-bold text-slate-800">Link inválido</h2>
          <p className="text-sm text-slate-500">{verifyError}</p>
          <Link
            to="/login"
            className="block w-full bg-faktory-blue text-white py-2.5 rounded-lg font-bold text-sm hover:bg-[#2c6a9a] transition-colors"
          >
            Ir para o login
          </Link>
        </div>
      </div>
    );
  }

  if (success) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50 p-4">
        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-10 text-center max-w-sm w-full space-y-4">
          <CheckCircle className="mx-auto text-green-500" size={48} />
          <h2 className="text-xl font-bold text-slate-800">Senha redefinida!</h2>
          <p className="text-sm text-slate-500">
            Sua nova senha foi salva com sucesso. Agora você pode entrar na plataforma.
          </p>
          <button
            onClick={() => navigate('/login', { replace: true })}
            className="block w-full bg-faktory-blue text-white py-2.5 rounded-lg font-bold text-sm hover:bg-[#2c6a9a] transition-colors"
          >
            Ir para o login
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-slate-50 p-4">
      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-8 w-full max-w-sm space-y-6">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-slate-800">Redefinir senha</h1>
          <p className="text-sm text-slate-500 mt-1">
            Criando nova senha para <span className="font-medium text-slate-700">{email}</span>
          </p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-xs font-bold text-slate-600 mb-1">Nova senha</label>
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
            <label className="block text-xs font-bold text-slate-600 mb-1">Confirmar nova senha</label>
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
            disabled={loading}
            className="w-full bg-faktory-blue text-white py-2.5 rounded-lg font-bold text-sm hover:bg-[#2c6a9a] transition-colors disabled:opacity-60 flex items-center justify-center gap-2"
          >
            {loading && <Loader2 size={16} className="animate-spin" />}
            {loading ? 'Salvando...' : 'Salvar nova senha'}
          </button>
        </form>
      </div>
    </div>
  );
}
