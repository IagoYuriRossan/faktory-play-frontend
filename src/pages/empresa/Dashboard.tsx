import { useAuthStore } from '../../hooks/store/useAuthStore';
import { Loader2 } from 'lucide-react';
import ClienteDetail from '../admin/ClienteDetail';

export default function EmpresaDashboard() {
  const { user, isAuthReady } = useAuthStore();

  if (!isAuthReady) {
    return (
      <div className="flex justify-center py-20">
        <Loader2 className="animate-spin text-faktory-blue" size={28} />
      </div>
    );
  }

  if (!user?.companyId) {
    return (
      <div className="text-center py-20 text-slate-400 text-sm">
        Empresa não associada ao seu perfil.
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-2xl font-bold text-slate-800">
          Olá, <span className="text-faktory-blue">{user.name?.split(' ')[0]}</span>
        </h1>
        <p className="text-sm text-slate-500 mt-1">Gerencie membros e acompanhe os projetos da sua empresa.</p>
      </div>
      <ClienteDetail companyId={user.companyId} readOnly={true} />
    </div>
  );
}
