import { useEffect, useState } from 'react';
import { Outlet, Link, useNavigate } from 'react-router-dom';
import { useAuthStore } from '../../hooks/store/useAuthStore';
import { LogOut, User as UserIcon } from 'lucide-react';
import { api } from '../../utils/api';

export default function LayoutAluno() {
  const { logout, user } = useAuthStore();
  const [companyName, setCompanyName] = useState('Carregando...');
  const navigate = useNavigate();

  useEffect(() => {
    async function fetchCompany() {
      if (user?.companyId) {
        try {
          const company = await api.get<{ name: string }>(`/api/companies/${user.companyId}`);
          setCompanyName(company.name);
        } catch (error) {
          console.error('Error fetching company:', error);
          setCompanyName('Empresa');
        }
      }
    }
    fetchCompany();
  }, [user]);

  const handleLogout = async () => {
    await logout();
    navigate('/login');
  };

  return (
    <div className="min-h-screen flex flex-col bg-[#f4f7f9]">
      {/* Header */}
      <header className="bg-white border-b border-gray-200 h-14 flex items-center px-6 justify-between sticky top-0 z-50 shadow-sm">
        <Link to="/app" className="flex items-center gap-2">
          <div className="flex flex-col">
            <div className="flex items-end gap-1">
              <div className="w-6 h-6 bg-gradient-to-br from-faktory-blue to-faktory-yellow rounded flex items-center justify-center text-white font-bold text-xs">F</div>
              <span className="text-lg font-bold text-[#4a5568]">Faktory</span>
            </div>
            <span className="text-[8px] text-faktory-yellow font-bold self-end -mt-0.5">Play ▶</span>
          </div>
        </Link>
        
        <div className="flex items-center gap-6">
          <div className="flex items-center gap-3">
            <div className="text-right hidden sm:block">
              <p className="text-xs font-bold text-slate-700 leading-none">{user?.name}</p>
              <p className="text-[10px] text-gray-400 font-medium">Aluno • {companyName}</p>
            </div>
            <div className="w-8 h-8 bg-faktory-blue rounded-full flex items-center justify-center text-white text-xs font-bold">
              {user?.name?.charAt(0)}
            </div>
            <button
              onClick={handleLogout}
              className="p-2 text-gray-300 hover:text-red-500 transition-colors"
              title="Sair"
            >
              <LogOut size={18} />
            </button>
          </div>
        </div>
      </header>
      <main className="flex-1 flex flex-col overflow-hidden">
        <Outlet />
      </main>
    </div>
  );
}
