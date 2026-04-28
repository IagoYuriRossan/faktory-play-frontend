import { useEffect, useState } from 'react';
import { Outlet, Link, NavLink, useNavigate, useLocation } from 'react-router-dom';
import { useAuthStore } from '../../hooks/store/useAuthStore';
import {
  LogOut, Home, BookOpen, User as UserIcon, Bell, Search,
  FileText, Settings, ChevronDown, MessageCircle, HelpCircle,
  GraduationCap, BarChart3, Bookmark, Calendar
} from 'lucide-react';
import { api } from '../../utils/api';
import { cn } from '../../utils/utils';

export default function LayoutAluno() {
  const { logout, user } = useAuthStore();
  const [companyName, setCompanyName] = useState('');
  const navigate = useNavigate();
  const location = useLocation();
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);

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

  const navItems = [
    { label: 'Início', icon: Home, path: '/app', exact: true },
    { label: 'Minhas Trilhas', icon: GraduationCap, path: '/app/trilhas' },
  ];

  const isActive = (path: string, exact?: boolean) => {
    if (exact) return location.pathname === path;
    return location.pathname.startsWith(path);
  };

  return (
    <div className="flex h-screen bg-[#f4f7f9]">
      {/* Sidebar */}
      <aside className={cn(
        "bg-white border-r border-gray-200 flex flex-col shadow-sm transition-all duration-200 shrink-0",
        sidebarCollapsed ? "w-16" : "w-60"
      )}>
        {/* Logo */}
        <div className="h-14 flex items-center px-4 border-b border-gray-100 shrink-0">
          <Link to="/app" className="flex items-center gap-2">
            <div className="w-8 h-8 bg-gradient-to-br from-faktory-blue to-faktory-yellow rounded-lg flex items-center justify-center text-white font-bold text-xs shadow-sm shrink-0">
              F
            </div>
            {!sidebarCollapsed && (
              <div className="flex flex-col">
                <div className="flex items-end gap-0.5">
                  <span className="text-base font-bold text-slate-700 leading-none">Faktory</span>
                </div>
                <span className="text-[7px] text-faktory-yellow font-bold -mt-0.5">Play ▶</span>
              </div>
            )}
          </Link>
        </div>

        {/* Search */}
        {!sidebarCollapsed && (
          <div className="px-3 py-3 border-b border-gray-100">
            <div className="relative">
              <Search size={14} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-400" />
              <input
                type="text"
                placeholder="Pesquisar..."
                className="w-full bg-slate-50 border border-slate-200 rounded-lg py-1.5 pl-8 pr-3 text-xs outline-none focus:ring-1 focus:ring-faktory-blue/40 focus:border-faktory-blue/40 placeholder:text-slate-400"
              />
            </div>
          </div>
        )}

        {/* Navigation */}
        <nav className="flex-1 overflow-y-auto py-3 px-2">
          {/* Main Nav */}
          <div className="space-y-0.5">
            {navItems.map(item => (
              <Link
                key={item.path}
                to={item.path}
                className={cn(
                  "flex items-center gap-3 px-3 py-2 rounded-lg text-[13px] font-medium transition-all group",
                  isActive(item.path, item.exact)
                    ? "bg-faktory-blue/10 text-faktory-blue font-semibold"
                    : "text-slate-600 hover:bg-slate-50 hover:text-slate-800"
                )}
              >
                <item.icon size={18} className={cn(
                  "shrink-0 transition-colors",
                  isActive(item.path, item.exact) ? "text-faktory-blue" : "text-slate-400 group-hover:text-slate-600"
                )} />
                {!sidebarCollapsed && <span>{item.label}</span>}
              </Link>
            ))}
          </div>

          {!sidebarCollapsed && (
            <>
              <div className="mt-6 mb-2 px-3">
                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Talento</span>
              </div>
              <div className="space-y-0.5">
                <Link
                  to="/app/trilhas"
                  className={cn(
                    "flex items-center gap-3 px-3 py-2 rounded-lg text-[13px] font-medium transition-all group",
                    location.pathname === '/app/trilhas'
                      ? "bg-faktory-blue/10 text-faktory-blue font-semibold"
                      : "text-slate-600 hover:bg-slate-50 hover:text-slate-800"
                  )}
                >
                  <BarChart3 size={18} className={cn("shrink-0", location.pathname === '/app/trilhas' ? "text-faktory-blue" : "text-slate-400 group-hover:text-slate-600")} />
                  <span>Desempenho</span>
                </Link>
                <Link
                  to="/app/trilhas"
                  className="flex items-center gap-3 px-3 py-2 rounded-lg text-[13px] font-medium text-slate-600 hover:bg-slate-50 hover:text-slate-800 transition-all group"
                >
                  <BookOpen size={18} className="text-slate-400 group-hover:text-slate-600 shrink-0" />
                  <span>Treinamentos</span>
                </Link>
              </div>
            </>
          )}
        </nav>

        {/* User Info at Bottom */}
        <div className="border-t border-gray-100 p-3 shrink-0">
          <div className={cn(
            "flex items-center gap-2",
            sidebarCollapsed ? "justify-center" : ""
          )}>
            <div className="w-8 h-8 bg-faktory-blue rounded-full flex items-center justify-center text-white text-xs font-bold shrink-0">
              {user?.name?.charAt(0)}
            </div>
            {!sidebarCollapsed && (
              <div className="flex-1 min-w-0">
                <p className="text-xs font-bold text-slate-700 truncate leading-none">{user?.name}</p>
                <p className="text-[10px] text-slate-400 truncate mt-0.5">{companyName}</p>
              </div>
            )}
            {!sidebarCollapsed && (
              <div className="flex items-center gap-0.5 shrink-0">
                <button className="p-1.5 text-slate-300 hover:text-slate-500 transition-colors rounded-lg hover:bg-slate-50">
                  <Bell size={15} />
                </button>
                <button
                  onClick={handleLogout}
                  className="p-1.5 text-slate-300 hover:text-red-500 transition-colors rounded-lg hover:bg-slate-50"
                  title="Sair"
                >
                  <LogOut size={15} />
                </button>
              </div>
            )}
          </div>
        </div>
      </aside>

      {/* Main Content */}
      <div className="flex-1 flex flex-col overflow-hidden">
        {/* Top Bar */}
        <header className="bg-white h-14 border-b border-gray-200 flex items-center px-6 justify-between shrink-0 shadow-sm">
          <div className="flex items-center gap-2 text-xs text-slate-400">
            <Link to="/app" className="hover:text-faktory-blue transition-colors">Início</Link>
            {location.pathname !== '/app' && (
              <>
                <span>/</span>
                <span className="text-slate-600 font-medium">
                  {location.pathname.includes('/trilhas') ? 'Minhas Trilhas' :
                   location.pathname.includes('/post/') ? 'Post' :
                   location.pathname.includes('/aula/') ? 'Aula' : ''}
                </span>
              </>
            )}
          </div>

          <div className="flex items-center gap-3">
            <div className="hidden sm:flex items-center gap-2 text-right">
              <div>
                <p className="text-xs font-bold text-slate-700 leading-none">{user?.name}</p>
                <p className="text-[10px] text-slate-400 font-medium">Aluno • {companyName}</p>
              </div>
              <div className="w-8 h-8 bg-faktory-blue rounded-full flex items-center justify-center text-white text-xs font-bold">
                {user?.name?.charAt(0)}
              </div>
            </div>
          </div>
        </header>

        {/* Page Content */}
        <main className="flex-1 overflow-y-auto">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
