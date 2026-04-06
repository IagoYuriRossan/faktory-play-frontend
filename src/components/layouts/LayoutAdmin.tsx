import { useState } from 'react';
import { Outlet, Link, useNavigate, useLocation } from 'react-router-dom';
import { useAuthStore } from '../../hooks/store/useAuthStore';
import { LayoutDashboard, Users, BookOpen, BarChart3, LogOut, Settings, ChevronDown, ChevronLeft, ChevronRight, Search, Building2, Layers, Mail, FileText } from 'lucide-react';
import { cn } from '../../utils/utils';

export default function LayoutAdmin() {
  const { logout, user } = useAuthStore();
  const navigate = useNavigate();
  const location = useLocation();

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  const [openMenus, setOpenMenus] = useState<string[]>(['gestao', 'atendimento', 'ativos']);

  const toggleMenu = (menu: string) => {
    setOpenMenus(prev => 
      prev.includes(menu) ? prev.filter(m => m !== menu) : [...prev, menu]
    );
  };

  const menuGroups = [
    {
      id: 'cliente',
      items: [
        { label: 'Área do Cliente', icon: Users, path: '/admin/area-cliente', color: 'text-blue-500' },
      ]
    },
    {
      id: 'gestao',
      label: 'Gestão',
      icon: BarChart3,
      items: [
        { label: 'Dashboard', icon: LayoutDashboard, path: '/admin', color: 'text-faktory-blue' },
        { label: 'Clientes', icon: Users, path: '/admin/clientes', color: 'text-blue-500' },
        { label: 'Projetos', icon: Layers, path: '/admin/projetos', color: 'text-orange-500' },
        { label: 'Convites', icon: Mail, path: '/admin/convites', color: 'text-purple-500' },
      ]
    },
    {
      id: 'atendimento',
      label: 'Atendimento',
      icon: Search, // Using Search as a placeholder for Atendimento icon
      items: [
        { label: 'Chamados', icon: FileText, path: '/admin/chamados', color: 'text-red-500' },
        { label: 'Chat', icon: Search, path: '/admin/chat', color: 'text-green-500' },
      ]
    },
    {
      id: 'recursos',
      items: [
        { label: 'Alocação de Recursos', icon: BarChart3, path: '/admin/alocacao', color: 'text-slate-500', hasArrow: true },
      ]
    },
    {
      id: 'ativos',
      label: 'Meus Ativos',
      icon: BookOpen,
      items: [
        { label: 'Meus Produtos', icon: BookOpen, path: '/admin/trilhas', color: 'text-orange-500' },
        { label: 'Questionários', icon: FileText, path: '/admin/questionarios', color: 'text-blue-400' },
        { label: 'Pág. customizáveis', icon: Settings, path: '/admin/paginas', color: 'text-slate-400' },
      ]
    }
  ];

  const getBreadcrumb = () => {
    const path = location.pathname;
    if (path === '/admin') return 'Dashboard';
    if (path.includes('/admin/clientes')) return 'Clientes';
    if (path.includes('/admin/projetos')) return 'Projetos';
    if (path.includes('/admin/trilhas')) return 'Meus Produtos';
    if (path.includes('/admin/relatorios')) return 'Relatórios';
    if (path.includes('/admin/configuracoes')) return 'Configurações';
    return 'Dashboard';
  };

  return (
    <div className="flex h-screen bg-[#f4f7f9]">
      {/* Sidebar */}
      <aside className="w-64 bg-white border-r border-gray-200 flex flex-col shadow-sm">
        <div className="p-4 flex items-center justify-between border-b border-gray-100">
          <div className="flex flex-col">
            <div className="flex items-end gap-1">
              <div className="w-6 h-6 bg-gradient-to-br from-faktory-blue to-faktory-yellow rounded flex items-center justify-center text-white font-bold text-xs">F</div>
              <span className="text-lg font-bold text-[#4a5568]">Faktory</span>
            </div>
            <span className="text-[8px] text-faktory-yellow font-bold self-end -mt-0.5">Play ▶</span>
          </div>
          <button className="text-gray-300 hover:text-gray-500">
            <ChevronLeft size={16} />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto py-4">
          <nav className="space-y-1">
            {menuGroups.map((group) => (
              <div key={group.id} className="px-2">
                {group.label ? (
                  <div className="mb-1">
                    <button
                      onClick={() => toggleMenu(group.id)}
                      className={cn(
                        "w-full flex items-center justify-between px-3 py-2 text-xs font-bold text-slate-700 hover:bg-gray-50 rounded-lg transition-all",
                        openMenus.includes(group.id) ? "bg-gray-50/50" : ""
                      )}
                    >
                      <div className="flex items-center gap-3">
                        <group.icon size={16} className="text-slate-400" />
                        <span>{group.label}</span>
                      </div>
                      <ChevronDown 
                        size={14} 
                        className={cn("text-gray-300 transition-transform", openMenus.includes(group.id) ? "rotate-180" : "")} 
                      />
                    </button>
                    
                    {openMenus.includes(group.id) && (
                      <div className="mt-1 ml-4 space-y-0.5 border-l-2 border-slate-100">
                        {group.items.map((item) => (
                          <Link
                            key={item.label}
                            to={item.path}
                            className={cn(
                              "flex items-center gap-3 px-4 py-2 text-[11px] font-medium transition-all rounded-r-lg",
                              location.pathname === item.path 
                                ? "bg-blue-50 text-faktory-blue border-l-2 border-faktory-blue -ml-[2px]" 
                                : "text-slate-500 hover:bg-gray-50"
                            )}
                          >
                            <item.icon size={14} className={cn(item.color, "opacity-80")} />
                            <span>{item.label}</span>
                          </Link>
                        ))}
                      </div>
                    )}
                  </div>
                ) : (
                  <div className="mb-1">
                    {group.items.map((item) => (
                      <Link
                        key={item.label}
                        to={item.path}
                        className={cn(
                          "flex items-center justify-between px-3 py-2 text-xs font-bold transition-all rounded-lg",
                          location.pathname === item.path 
                            ? "bg-blue-50 text-faktory-blue" 
                            : "text-slate-700 hover:bg-gray-50"
                        )}
                      >
                        <div className="flex items-center gap-3">
                          <item.icon size={16} className={cn(item.color, "opacity-80")} />
                          <span>{item.label}</span>
                        </div>
                        {item.hasArrow && <ChevronRight size={14} className="text-gray-300" />}
                      </Link>
                    ))}
                  </div>
                )}
              </div>
            ))}
          </nav>
        </div>

        <div className="p-4 border-t border-gray-100 bg-gray-50/50">
          <div className="flex items-center justify-between text-[8px] text-gray-400 font-bold uppercase">
            <div className="flex items-center gap-1">
              <div className="w-1.5 h-1.5 bg-green-500 rounded-full"></div>
              Faktory Play <span className="text-gray-300">v1.0.0</span>
            </div>
          </div>
        </div>
      </aside>

      {/* Content Area */}
      <div className="flex-1 flex flex-col overflow-hidden">
        {/* Header */}
        <header className="bg-white h-14 border-b border-gray-200 flex items-center px-6 justify-between shrink-0">
          <div className="flex items-center gap-2 text-xs text-gray-400">
            <span>Início</span>
            <ChevronRight size={12} />
            <span className="text-slate-600 font-medium">{getBreadcrumb()}</span>
          </div>

          <div className="flex items-center gap-4">
            <div className="relative w-80">
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-gray-400">
                <Search size={14} />
              </div>
              <input
                type="text"
                placeholder="Pesquisar funcionalidades... (Ctrl K)"
                className="w-full bg-[#f3f6f9] border-none rounded-lg py-1.5 pl-10 pr-3 text-xs focus:ring-1 focus:ring-faktory-blue outline-none"
              />
            </div>
            
            <div className="h-6 w-px bg-gray-200 mx-2"></div>

            <div className="flex items-center gap-3">
              <div className="text-right">
                <p className="text-xs font-bold text-slate-700 leading-none">{user?.name}</p>
                <p className="text-[10px] text-gray-400 font-medium">Administrador</p>
              </div>
              <div className="w-8 h-8 bg-faktory-blue rounded-full flex items-center justify-center text-white text-xs font-bold">
                {user?.name.charAt(0)}
              </div>
              <button onClick={handleLogout} className="text-gray-300 hover:text-red-500 transition-colors">
                <LogOut size={16} />
              </button>
            </div>
          </div>
        </header>

        {/* Main Content */}
        <main className="flex-1 overflow-y-auto p-6">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
