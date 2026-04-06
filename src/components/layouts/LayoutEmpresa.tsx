import { Outlet, Link, useNavigate, useLocation } from 'react-router-dom';
import { useAuthStore } from '../../hooks/store/useAuthStore';
import { LayoutDashboard, Users, Layers, LogOut } from 'lucide-react';
import { cn } from '../../utils/utils';

const navItems = [
  { label: 'Dashboard', icon: LayoutDashboard, path: '/empresa' },
  { label: 'Projetos', icon: Layers, path: '/empresa/projetos' },
  { label: 'Membros', icon: Users, path: '/empresa/membros' },
];

export default function LayoutEmpresa() {
  const { logout, user } = useAuthStore();
  const navigate = useNavigate();
  const location = useLocation();

  const handleLogout = async () => {
    await logout();
    navigate('/login');
  };

  return (
    <div className="min-h-screen flex bg-[#f4f7f9]">
      {/* Sidebar */}
      <aside className="w-56 bg-white border-r border-slate-200 flex flex-col shrink-0">
        {/* Logo */}
        <div className="h-14 flex items-center px-5 border-b border-slate-100">
          <div className="flex flex-col">
            <div className="flex items-end gap-1">
              <div className="w-6 h-6 bg-gradient-to-br from-faktory-blue to-faktory-yellow rounded flex items-center justify-center text-white font-bold text-xs">F</div>
              <span className="text-base font-bold text-[#4a5568]">Faktory</span>
            </div>
            <span className="text-[8px] text-faktory-yellow font-bold self-end -mt-0.5">Play ▶</span>
          </div>
        </div>

        {/* Nav */}
        <nav className="flex-1 py-4 px-3 space-y-1">
          {navItems.map(item => {
            const isActive = item.path === '/empresa'
              ? location.pathname === '/empresa'
              : location.pathname.startsWith(item.path);
            return (
              <Link
                key={item.path}
                to={item.path}
                className={cn(
                  'flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium transition-colors',
                  isActive
                    ? 'bg-faktory-blue text-white'
                    : 'text-slate-600 hover:bg-slate-100'
                )}
              >
                <item.icon size={16} />
                {item.label}
              </Link>
            );
          })}
        </nav>

        {/* User */}
        <div className="p-4 border-t border-slate-100">
          <div className="flex items-center gap-3 mb-3">
            <div className="w-8 h-8 bg-faktory-blue rounded-full flex items-center justify-center text-white text-xs font-bold shrink-0">
              {user?.name?.charAt(0)}
            </div>
            <div className="min-w-0">
              <p className="text-xs font-bold text-slate-700 truncate">{user?.name}</p>
              <p className="text-[10px] text-slate-400">Admin da Empresa</p>
            </div>
          </div>
          <button
            onClick={handleLogout}
            className="flex items-center gap-2 text-xs text-slate-400 hover:text-red-500 transition-colors w-full"
          >
            <LogOut size={14} />
            Sair
          </button>
        </div>
      </aside>

      {/* Main */}
      <main className="flex-1 overflow-auto">
        <div className="max-w-6xl mx-auto p-8">
          <Outlet />
        </div>
      </main>
    </div>
  );
}
