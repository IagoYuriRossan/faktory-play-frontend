import React from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import { useAuthStore } from '../hooks/store/useAuthStore';

// Public Pages
import Home from '../pages/public/Home';
import Login from '../pages/public/Login';
import Register from '../pages/public/Register';
import CadastroUsuario from '../pages/public/CadastroUsuario';
import AuthAcao from '../pages/public/AuthAcao';

// Admin Pages
import AdminDashboard from '../pages/admin/Dashboard';
import AdminClientes from '../pages/admin/Clientes';
import AdminClienteDetail from '../pages/admin/ClienteDetail';
import AdminTrilhas from '../pages/admin/Trilhas';
import AdminTrilhaBuilder from '../pages/admin/TrilhaBuilder';
import AdminProjetos from '../pages/admin/Projetos';
import AdminRelatorios from '../pages/admin/Relatorios';
import AdminConfiguracoes from '../pages/admin/Configuracoes';
import PlaceholderPage from '../pages/admin/Placeholder';

// Empresa (company_admin) Pages
import EmpresaDashboard from '../pages/empresa/Dashboard';
import EmpresaProjetos from '../pages/empresa/Projetos';
import EmpresaMembros from '../pages/empresa/Membros';

// Student Pages
import AlunoDashboard from '../pages/aluno/Dashboard';
import AlunoAulaPlayer from '../pages/aluno/AulaPlayer';

// Layouts
import LayoutAdmin from '../components/layouts/LayoutAdmin';
import LayoutAluno from '../components/layouts/LayoutAluno';
import LayoutEmpresa from '../components/layouts/LayoutEmpresa';
import LayoutPublic from '../components/layouts/LayoutPublic';

type AllowedRole = 'superadmin' | 'company_admin' | 'student';

const ProtectedRoute = ({ children, role }: { children: React.ReactNode, role?: AllowedRole }) => {
  const { user, isAuthReady } = useAuthStore();

  if (!isAuthReady) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#f4f7f9] text-slate-500 text-sm">
        Carregando sessao...
      </div>
    );
  }

  if (!user) {
    return <Navigate to="/login" replace />;
  }

  if (role && user.role !== role) {
    if (user.role === 'superadmin') return <Navigate to="/admin" replace />;
    if (user.role === 'company_admin') return <Navigate to="/empresa" replace />;
    return <Navigate to="/app" replace />;
  }

  return <>{children}</>;
};

export default function AppRoutes() {
  return (
    <Routes>
      {/* Public Routes */}
      <Route element={<LayoutPublic />}>
        <Route path="/" element={<Home />} />
        <Route path="/login" element={<Login />} />
        <Route path="/register" element={<Register />} />
        <Route path="/cadastro" element={<CadastroUsuario />} />
        <Route path="/auth/acao" element={<AuthAcao />} />
      </Route>

      {/* Admin Routes */}
      <Route
        path="/admin"
        element={
          <ProtectedRoute role="superadmin">
            <LayoutAdmin />
          </ProtectedRoute>
        }
      >
        <Route index element={<AdminDashboard />} />
        <Route path="area-cliente" element={<PlaceholderPage title="Área do Cliente" />} />
        <Route path="clientes" element={<AdminClientes />} />
        <Route path="clientes/:id" element={<AdminClienteDetail />} />
        <Route path="projetos" element={<AdminProjetos />} />
        <Route path="convites" element={<PlaceholderPage title="Gestão de Convites" />} />
        <Route path="chamados" element={<PlaceholderPage title="Central de Chamados" />} />
        <Route path="chat" element={<PlaceholderPage title="Chat de Atendimento" />} />
        <Route path="alocacao" element={<PlaceholderPage title="Alocação de Recursos" />} />
        <Route path="trilhas" element={<AdminTrilhas />} />
        <Route path="questionarios" element={<PlaceholderPage title="Questionários" />} />
        <Route path="paginas" element={<PlaceholderPage title="Páginas Customizáveis" />} />
        <Route path="trilhas/nova" element={<AdminTrilhaBuilder />} />
        <Route path="trilhas/:id" element={<AdminTrilhaBuilder />} />
        <Route path="relatorios" element={<AdminRelatorios />} />
        <Route path="configuracoes" element={<AdminConfiguracoes />} />
      </Route>

      {/* Empresa (company_admin) Routes */}
      <Route
        path="/empresa"
        element={
          <ProtectedRoute role="company_admin">
            <LayoutEmpresa />
          </ProtectedRoute>
        }
      >
        <Route index element={<EmpresaDashboard />} />
        <Route path="projetos" element={<EmpresaProjetos />} />
        <Route path="membros" element={<EmpresaMembros />} />
      </Route>

      {/* Student Routes */}
      <Route
        path="/app"
        element={
          <ProtectedRoute role="student">
            <LayoutAluno />
          </ProtectedRoute>
        }
      >
        <Route index element={<AlunoDashboard />} />
        <Route path="aula/:id" element={<AlunoAulaPlayer />} />
      </Route>

      {/* Fallback */}
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}
