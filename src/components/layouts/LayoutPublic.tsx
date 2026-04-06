import { Outlet, Link } from 'react-router-dom';

export default function LayoutPublic() {
  return (
    <div className="min-h-screen flex flex-col bg-faktory-bg">
      <header className="bg-white border-b border-gray-200 sticky top-0 z-50 h-16 flex items-center">
        <div className="container mx-auto px-6 flex justify-between items-center">
          <Link to="/" className="flex items-center gap-2">
            <div className="flex flex-col">
              <div className="flex items-end gap-1">
                <div className="w-6 h-6 bg-gradient-to-br from-faktory-blue to-faktory-yellow rounded flex items-center justify-center text-white font-bold text-xs">F</div>
                <span className="text-lg font-bold text-[#4a5568]">Faktory</span>
              </div>
              <span className="text-[8px] text-faktory-yellow font-bold self-end -mt-0.5">Flow ■</span>
            </div>
          </Link>
          
          <nav className="hidden md:flex items-center gap-8">
            <Link to="/" className="text-sm font-medium text-slate-600 hover:text-faktory-blue transition-colors">Início</Link>
            <Link to="/login" className="text-sm font-medium text-slate-600 hover:text-faktory-blue transition-colors">Acessar</Link>
            <Link to="/register" className="px-5 py-2 bg-faktory-blue text-white rounded-lg text-sm font-bold hover:bg-[#2c6a9a] transition-all shadow-md">
              Criar Conta
            </Link>
          </nav>
        </div>
      </header>
      <main className="flex-1">
        <Outlet />
      </main>
      <footer className="bg-white border-t border-gray-200 py-8">
        <div className="container mx-auto px-6 text-center text-gray-400 text-[10px] font-bold uppercase tracking-widest">
          © 2026 EG Faktory Softwares • Faktory Flow v1.0.0
        </div>
      </footer>
    </div>
  );
}
