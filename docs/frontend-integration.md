# Guia de Integração Frontend

Exemplos práticos e código pronto para integrar o frontend com a API.

## 📦 Instalação de Dependências

```bash
npm install axios @tanstack/react-query
# ou
yarn add axios @tanstack/react-query
```

> **Nota:** Estamos usando `@tanstack/react-query` (v4+), a versão moderna e mantida. Se você usa a versão antiga `react-query` (v3), ajuste os imports conforme necessário.

## 🔧 Configuração Inicial

### 1. Configure a Base URL

```typescript
// src/config/api.ts
export const API_BASE_URL = process.env.REACT_APP_API_URL || 'http://localhost:3001';
export const API_PREFIX = '/api';
```

### 2. Cliente HTTP com Interceptors

```typescript
// src/lib/apiClient.ts
import axios from 'axios';
import { API_BASE_URL, API_PREFIX } from '../config/api';
import { getAuth } from 'firebase/auth';

const apiClient = axios.create({
  baseURL: `${API_BASE_URL}${API_PREFIX}`,
  timeout: 15000,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Interceptor para adicionar token automaticamente
apiClient.interceptors.request.use(async (config) => {
  try {
    const auth = getAuth();
    const user = auth.currentUser;
    
    if (user) {
      const token = await user.getIdToken();
      config.headers.Authorization = `Bearer ${token}`;
    }
    
    // Adiciona timestamp para tracking de performance
    (config as any).metadata = { startTime: Date.now() };
  } catch (error) {
    console.error('Erro ao obter token:', error);
  }
  
  return config;
});

// Interceptor para tratamento de erros
apiClient.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      // Token expirado ou inválido
      console.error('Não autenticado');
      // Redirecionar para login ou renovar token
    }
    
    if (error.response?.status === 403) {
      console.error('Sem permissão');
    }
    
    return Promise.reject(error);
  }
);

export default apiClient;
```

## 📘 Tipos TypeScript

```typescript
// src/types/api.ts

export type UserRole = 'member' | 'company_admin' | 'admin' | 'superadmin';
export type UserStatus = 'active' | 'inactive';
export type TrailStatus = 'not_started' | 'in_progress' | 'completed' | 'overdue';

export interface User {
  uid: string;
  name: string;
  email: string;
  companyId: string;
  role: UserRole;
  status: UserStatus;
  allowedTrails?: string[];
  photoURL?: string;
  lastAccessAt?: string;
  createdAt?: string;
}

export interface Company {
  id: string;
  name: string;
  allowedTrails: string[];
  createdAt?: string;
  updatedAt?: string;
}

export interface LessonProgress {
  lessonId: string;
  moduleId: string;
  trailId: string;
  completed: boolean;
  watchedSeconds?: number;
  updatedAt: string;
}

export interface TrailProgress {
  uid: string;
  trailId: string;
  companyId: string;
  currentModuleId: string;
  completedLessons: number;
  totalLessons: number;
  totalModules: number;
  totalProgress: number;
  currentModuleProgress: number;
  status: TrailStatus;
  startedAt: string;
  lastActivityAt: string;
  completedAt: string | null;
}

export interface CompanyMember {
  type: 'member';
  uid: string;
  name: string;
  email: string;
  role: string;
  status: string;
  companyId: string;
}

export interface PendingInvite {
  type: 'invite';
  inviteId: string;
  email: string;
  name: string | null;
  expiresAt: string;
  status: 'pending';
}

export interface CompanyMembers {
  members: CompanyMember[];
  pendingInvites: PendingInvite[];
}

export interface ProjectProgress {
  projectId: string;
  userId: string;
  totalQuestionnaires: number;
  completedQuestionnaires: number;
  completionRate: number;
  modules: ModuleProgress[];
}

export interface ModuleProgress {
  moduleId: string | null;
  moduleTitle: string | null;
  totalQuestionnaires: number;
  completedQuestionnaires: number;
  completionRate: number;
  score: number;
  maxScore: number;
  avgScore: number;
}

export interface ApiError {
  error: string;
  details?: any;
}
```

## 🎯 API Services

```typescript
// src/services/userService.ts
import apiClient from '../lib/apiClient';
import type { User, LessonProgress, TrailProgress } from '../types/api';

export const userService = {
  // Lista todos os usuários visíveis
  async getAll(): Promise<User[]> {
    const { data } = await apiClient.get<User[]>('/users');
    return data;
  },

  // Busca um usuário específico (OTIMIZADO)
  async getById(uid: string): Promise<User> {
    const { data } = await apiClient.get<User>(`/users/${uid}`);
    return data;
  },

  // Atualiza usuário
  async update(uid: string, updates: Partial<User>): Promise<void> {
    await apiClient.put(`/users/${uid}`, updates);
  },

  // Deleta usuário
  async delete(uid: string): Promise<void> {
    await apiClient.delete(`/users/${uid}`);
  },

  // Busca progresso de lições
  async getProgress(uid: string): Promise<LessonProgress[]> {
    const { data } = await apiClient.get<LessonProgress[]>(`/users/${uid}/progress`);
    return data;
  },

  // Busca progresso de trilhas (OTIMIZADO)
  async getTrails(uid: string): Promise<TrailProgress[]> {
    const { data } = await apiClient.get<TrailProgress[]>(`/users/${uid}/trails`);
    return data;
  },

  // Atualiza progresso de lição
  async updateLessonProgress(
    uid: string,
    lessonId: string,
    progress: {
      completed: boolean;
      trailId: string;
      moduleId: string;
      totalLessonsInModule: number;
      totalLessonsInTrail: number;
      totalModulesInTrail: number;
      watchedSeconds?: number;
    }
  ): Promise<void> {
    await apiClient.put(`/users/${uid}/progress/${lessonId}`, progress);
  },

  // Conta usuários visíveis (OTIMIZADO para métricas)
  async count(): Promise<number> {
    const { data } = await apiClient.get<{ count: number }>('/users/count');
    return data.count;
  },

  // Busca múltiplos usuários em batch (OTIMIZADO para relatórios)
  async getBatch(uids: string[]): Promise<User[]> {
    if (uids.length === 0) return [];
    if (uids.length > 100) {
      throw new Error('Máximo de 100 uids por chamada. Use múltiplas chamadas.');
    }
    const { data } = await apiClient.post<User[]>('/users/batch', { uids });
    return data;
  },
};
```

```typescript
// src/services/companyService.ts
import apiClient from '../lib/apiClient';
import type { Company, CompanyMembers, UserStatus } from '../types/api';

export const companyService = {
  async getAll(): Promise<Company[]> {
    const { data } = await apiClient.get<Company[]>('/companies');
    return data;
  },

  async getById(id: string): Promise<Company> {
    const { data } = await apiClient.get<Company>(`/companies/${id}`);
    return data;
  },

  async create(company: Omit<Company, 'id'>): Promise<{ id: string }> {
    const { data } = await apiClient.post<{ id: string }>('/companies', company);
    return data;
  },

  async update(id: string, updates: Partial<Company>): Promise<void> {
    await apiClient.put(`/companies/${id}`, updates);
  },

  async patch(id: string, updates: { allowedTrails?: string[] }): Promise<void> {
    await apiClient.patch(`/companies/${id}`, updates);
  },

  async delete(id: string): Promise<void> {
    await apiClient.delete(`/companies/${id}`);
  },

  async getMembers(id: string): Promise<CompanyMembers> {
    const { data } = await apiClient.get<CompanyMembers>(`/companies/${id}/members`);
    return data;
  },

  async updateMemberStatus(
    companyId: string,
    uid: string,
    status: UserStatus
  ): Promise<void> {
    await apiClient.patch(`/companies/${companyId}/members/${uid}/status`, { status });
  },
};
```

```typescript
// src/services/projectService.ts
import apiClient from '../lib/apiClient';
import type { ProjectProgress } from '../types/api';

export const projectService = {
  async getUserProgress(projectId: string, userId: string): Promise<ProjectProgress> {
    const { data } = await apiClient.get<ProjectProgress>(
      `/projects/${projectId}/users/${userId}/progress`
    );
    return data;
  },
};
```

## ⚛️ React Hooks com React Query

```typescript
// src/hooks/useUsers.ts
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { userService } from '../services/userService';
import type { User } from '../types/api';

export function useUsers() {
  return useQuery('users', userService.getAll);
}

export function useUser(uid: string) {
  return useQuery(['user', uid], () => userService.getById(uid), {
    enabled: !!uid, // Só busca se uid existir
  });
}

export function useUpdateUser() {
  const queryClient = useQueryClient();

  return useMutation(
    ({ uid, updates }: { uid: string; updates: Partial<User> }) =>
      userService.update(uid, updates),
    {
      onSuccess: (_, { uid }) => {
        // Invalida cache do usuário específico e lista
        queryClient.invalidateQueries(['user', uid]);
        queryClient.invalidateQueries('users');
      },
    }
  );
}

export function useDeleteUser() {
  const queryClient = useQueryClient();

  return useMutation((uid: string) => userService.delete(uid), {
    onSuccess: () => {
      queryClient.invalidateQueries('users');
    },
  });
}

export function useUserTrails(uid: string) {
  return useQuery(['userTrails', uid], () => userService.getTrails(uid), {
    enabled: !!uid,
  });
}

export function useUsersCount() {
  return useQuery('usersCount', userService.count);
}

export function useUsersBatch(uids: string[]) {
  return useQuery(
    ['usersBatch', uids.sort().join(',')], // sort para cache consistente
    () => userService.getBatch(uids),
    {
      enabled: uids.length > 0,
      staleTime: 2 * 60 * 1000, // cache por 2 minutos
    }
  );
}
```

```typescript
// src/hooks/useCompanies.ts
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { companyService } from '../services/companyService';
import type { Company, UserStatus } from '../types/api';

export function useCompanies() {
  return useQuery('companies', companyService.getAll);
}

export function useCompany(id: string) {
  return useQuery(['company', id], () => companyService.getById(id), {
    enabled: !!id,
  });
}

export function useUpdateCompany() {
  const queryClient = useQueryClient();

  return useMutation(
    ({ id, updates }: { id: string; updates: Partial<Company> }) =>
      companyService.update(id, updates),
    {
      onSuccess: (_, { id }) => {
        queryClient.invalidateQueries(['company', id]);
        queryClient.invalidateQueries('companies');
      },
    }
  );
}

export function useDeleteCompany() {
  const queryClient = useQueryClient();

  return useMutation((id: string) => companyService.delete(id), {
    onSuccess: () => {
      queryClient.invalidateQueries('companies');
    },
  });
}

export function useCompanyMembers(id: string) {
  return useQuery(['companyMembers', id], () => companyService.getMembers(id), {
    enabled: !!id,
  });
}

export function useUpdateMemberStatus() {
  const queryClient = useQueryClient();

  return useMutation(
    ({
      companyId,
      uid,
      status,
    }: {
      companyId: string;
      uid: string;
      status: UserStatus;
    }) => companyService.updateMemberStatus(companyId, uid, status),
    {
      onSuccess: (_, { companyId }) => {
        queryClient.invalidateQueries(['companyMembers', companyId]);
        queryClient.invalidateQueries('users');
      },
    }
  );
}
```

## 🎨 Componentes de Exemplo

### Perfil de Usuário (Otimizado)

```tsx
// src/pages/UserProfile.tsx
import { useUser, useUserTrails } from '../hooks/useUsers';
import { ProgressBar } from '../components/ProgressBar';

interface UserProfileProps {
  uid: string;
}

export function UserProfile({ uid }: UserProfileProps) {
  const { data: user, isLoading: userLoading, error: userError } = useUser(uid);
  const { data: trails, isLoading: trailsLoading } = useUserTrails(uid);

  if (userLoading || trailsLoading) {
    return <div>Carregando perfil...</div>;
  }

  if (userError || !user) {
    return <div>Erro ao carregar usuário</div>;
  }

  return (
    <div className="user-profile">
      <div className="profile-header">
        {user.photoURL && <img src={user.photoURL} alt={user.name} />}
        <h1>{user.name}</h1>
        <p>{user.email}</p>
        <span className={`badge badge-${user.status}`}>{user.status}</span>
        <span className={`badge badge-${user.role}`}>{user.role}</span>
      </div>

      <div className="trails-progress">
        <h2>Progresso nas Trilhas</h2>
        {trails && trails.length > 0 ? (
          trails.map((trail) => (
            <div key={trail.trailId} className="trail-card">
              <h3>Trilha: {trail.trailId}</h3>
              <ProgressBar value={trail.totalProgress} max={100} />
              <p>
                {trail.completedLessons} / {trail.totalLessons} lições
              </p>
              <span className={`status status-${trail.status}`}>
                {trail.status}
              </span>
              {trail.completedAt && (
                <p>Concluído em: {new Date(trail.completedAt).toLocaleDateString()}</p>
              )}
            </div>
          ))
        ) : (
          <p>Nenhuma trilha iniciada</p>
        )}
      </div>
    </div>
  );
}
```

### Editar Usuário

```tsx
// src/pages/EditUser.tsx
import { useState, useEffect } from 'react';
import { useUser, useUpdateUser } from '../hooks/useUsers';
import { useNavigate } from 'react-router-dom';
import toast from 'react-hot-toast';
import type { UserRole } from '../types/api';

interface EditUserProps {
  uid: string;
}

export function EditUser({ uid }: EditUserProps) {
  const navigate = useNavigate();
  const { data: user, isLoading } = useUser(uid);
  const updateUser = useUpdateUser();

  const [formData, setFormData] = useState({
    name: '',
    email: '',
    role: 'member' as UserRole,
  });

  // Atualiza form quando dados do usuário carregam
  useEffect(() => {
    if (user) {
      setFormData({
        name: user.name || '',
        email: user.email || '',
        role: user.role || 'member',
      });
    }
  }, [user]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    try {
      await updateUser.mutateAsync({ uid, updates: formData });
      toast.success('Usuário atualizado com sucesso!');
      navigate(`/users/${uid}`);
    } catch (error) {
      toast.error('Erro ao atualizar usuário');
      console.error(error);
    }
  };

  if (isLoading) return <div>Carregando...</div>;

  return (
    <form onSubmit={handleSubmit}>
      <h1>Editar Usuário</h1>

      <div className="form-group">
        <label>Nome</label>
        <input
          type="text"
          value={formData.name}
          onChange={(e) => setFormData({ ...formData, name: e.target.value })}
          required
        />
      </div>

      <div className="form-group">
        <label>Email</label>
        <input
          type="email"
          value={formData.email}
          onChange={(e) => setFormData({ ...formData, email: e.target.value })}
          required
        />
      </div>

      <div className="form-group">
        <label>Função</label>
        <select
          value={formData.role}
          onChange={(e) => setFormData({ ...formData, role: e.target.value as any })}
        >
          <option value="member">Membro</option>
          <option value="company_admin">Admin da Empresa</option>
          <option value="admin">Admin</option>
          <option value="superadmin">Super Admin</option>
        </select>
      </div>

      <button type="submit" disabled={updateUser.isLoading}>
        {updateUser.isLoading ? 'Salvando...' : 'Salvar'}
      </button>
    </form>
  );
}
```

### Lista de Membros da Empresa

```tsx
// src/pages/CompanyMembers.tsx
import { useCompanyMembers, useUpdateMemberStatus } from '../hooks/useCompanies';
import { useDeleteUser } from '../hooks/useUsers';
import toast from 'react-hot-toast';

interface CompanyMembersProps {
  companyId: string;
}

export function CompanyMembers({ companyId }: CompanyMembersProps) {
  const { data, isLoading } = useCompanyMembers(companyId);
  const updateStatus = useUpdateMemberStatus();
  const deleteUser = useDeleteUser();

  const handleToggleStatus = async (uid: string, currentStatus: string) => {
    const newStatus = currentStatus === 'active' ? 'inactive' : 'active';

    try {
      await updateStatus.mutateAsync({ companyId, uid, status: newStatus });
      toast.success(`Usuário ${newStatus === 'active' ? 'ativado' : 'desativado'}`);
    } catch (error) {
      toast.error('Erro ao atualizar status');
    }
  };

  const handleDeleteUser = async (uid: string, userName: string) => {
    if (!confirm(`ATENÇÃO: Deseja deletar permanentemente ${userName}?`)) {
      return;
    }

    try {
      await deleteUser.mutateAsync(uid);
      toast.success('Usuário removido');
    } catch (error) {
      toast.error('Erro ao deletar usuário');
    }
  };

  if (isLoading) return <div>Carregando membros...</div>;

  return (
    <div className="company-members">
      <h1>Membros da Empresa</h1>

      <div className="members-list">
        <h2>Membros Ativos</h2>
        {data?.members.map((member) => (
          <div key={member.uid} className="member-card">
            <div className="member-info">
              <h3>{member.name}</h3>
              <p>{member.email}</p>
              <span className={`badge badge-${member.role}`}>{member.role}</span>
              <span className={`badge badge-${member.status}`}>
                {member.status}
              </span>
            </div>

            <div className="member-actions">
              <button onClick={() => handleToggleStatus(member.uid, member.status)}>
                {member.status === 'active' ? 'Desativar' : 'Ativar'}
              </button>
              <button
                className="danger"
                onClick={() => handleDeleteUser(member.uid, member.name)}
              >
                Deletar
              </button>
            </div>
          </div>
        ))}
      </div>

      <div className="pending-invites">
        <h2>Convites Pendentes</h2>
        {data?.pendingInvites.map((invite) => (
          <div key={invite.inviteId} className="invite-card">
            <p>
              <strong>{invite.name || invite.email}</strong>
            </p>
            <p>Expira em: {new Date(invite.expiresAt).toLocaleDateString()}</p>
          </div>
        ))}
      </div>
    </div>
  );
}
```

## 🔄 Migração Progressiva

### Antes (Ineficiente)

```typescript
// ❌ Busca todos os usuários e filtra
const users = await fetch('/api/users').then(r => r.json());
const user = users.find(u => u.uid === targetUid);
```

### Depois (Otimizado)

```typescript
// ✅ Busca diretamente o usuário
const user = await userService.getById(targetUid);

// Ou com React Query
const { data: user } = useUser(targetUid);
```

### Checklist de Migração

- [ ] Substituir `GET /users` + filter por `GET /users/:uid` em:
  - [ ] Página de perfil
  - [ ] Formulário de edição
  - [ ] Dashboard individual
  - [ ] Cards de usuário

- [ ] Usar `GET /users/:uid/trails` para:
  - [ ] Dashboard "Meu Progresso"
  - [ ] Relatórios individuais
  - [ ] Cards de progresso

- [ ] Confirmar distinção entre:
  - [ ] Progresso de trilhas → `/users/:uid/progress` e `/users/:uid/trails`
  - [ ] Progresso de projetos → `/projects/:projectId/users/:userId/progress`

- [ ] Implementar tratamento de erros para:
  - [ ] 404 (usuário não encontrado)
  - [ ] 403 (sem permissão)
  - [ ] 500 (erro interno)

## � Exemplos de Uso dos Novos Endpoints

### Dashboard com Métricas (useUsersCount)

```tsx
// src/pages/Dashboard.tsx
import { useUsersCount } from '../hooks/useUsers';
import { useCompanies } from '../hooks/useCompanies';

export function Dashboard() {
  const { data: usersCount, isLoading: loadingUsers } = useUsersCount();
  const { data: companies, isLoading: loadingCompanies } = useCompanies();

  if (loadingUsers || loadingCompanies) {
    return <LoadingSpinner />;
  }

  return (
    <div className="dashboard">
      <div className="metrics">
        <MetricCard
          title="Total de Usuários"
          value={usersCount || 0}
          icon="👥"
        />
        <MetricCard
          title="Total de Empresas"
          value={companies?.length || 0}
          icon="🏢"
        />
      </div>
    </div>
  );
}
```

### Relatório de Múltiplos Usuários (useUsersBatch)

```tsx
// src/pages/UsersReport.tsx
import { useState } from 'react';
import { useUsersBatch } from '../hooks/useUsers';

export function UsersReport() {
  const [selectedUserIds, setSelectedUserIds] = useState<string[]>([
    'user1', 'user2', 'user3', // IDs vindos de outra query
  ]);

  const { data: users, isLoading, error } = useUsersBatch(selectedUserIds);

  if (isLoading) return <LoadingSpinner />;
  if (error) return <ErrorMessage error={error} />;

  return (
    <div className="report">
      <h1>Relatório de {users?.length} Usuários</h1>
      <table>
        <thead>
          <tr>
            <th>Nome</th>
            <th>Email</th>
            <th>Empresa</th>
            <th>Status</th>
          </tr>
        </thead>
        <tbody>
          {users?.map(user => (
            <tr key={user.uid}>
              <td>{user.name}</td>
              <td>{user.email}</td>
              <td>{user.companyId}</td>
              <td>
                <span className={`badge badge-${user.status}`}>
                  {user.status}
                </span>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
```

### Carregamento Otimizado de Usuários em Lote

```tsx
// src/utils/userLoader.ts
import { userService } from '../services/userService';

/**
 * Carrega múltiplos usuários em paralelo respeitando o limite de 100 por chamada
 */
export async function loadUsersInBatches(uids: string[]) {
  const BATCH_SIZE = 100;
  const batches: string[][] = [];

  // Divide em chunks de 100
  for (let i = 0; i < uids.length; i += BATCH_SIZE) {
    batches.push(uids.slice(i, i + BATCH_SIZE));
  }

  // Carrega todos os batches em paralelo
  const results = await Promise.all(
    batches.map(batch => userService.getBatch(batch))
  );

  // Flatten results
  return results.flat();
}

// Uso
const allUsers = await loadUsersInBatches(hugeListOfUserIds); // pode ser 1000+ ids
```

### Comparação de Performance: Antes vs Depois

```tsx
// ❌ ANTES: N requisições individuais (lento, caro)
async function loadUserDetails(userIds: string[]) {
  const users = [];
  for (const uid of userIds) {
    const user = await fetch(`/api/users/${uid}`).then(r => r.json());
    users.push(user);
  }
  return users; // 50 usuários = 50 requisições
}

// ✅ DEPOIS: 1 requisição batch (rápido, barato)
async function loadUserDetails(userIds: string[]) {
  return fetch('/api/users/batch', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ uids: userIds })
  }).then(r => r.json()); // 50 usuários = 1 requisição
}
```

### Métricas em Tempo Real

```tsx
// src/components/UserCounter.tsx
import { useUsersCount } from '../hooks/useUsers';
import { useEffect } from 'react';

export function UserCounter() {
  const { data: count, refetch } = useUsersCount();

  // Atualiza a cada 30 segundos
  useEffect(() => {
    const interval = setInterval(() => {
      refetch();
    }, 30000);

    return () => clearInterval(interval);
  }, [refetch]);

  return (
    <div className="user-counter">
      <h3>Usuários Ativos</h3>
      <div className="count">{count || 0}</div>
    </div>
  );
}
```

---

## �📊 Monitoramento

### Metrificar uso dos endpoints

```typescript
// src/utils/analytics.ts
export function trackAPICall(endpoint: string, method: string, duration: number) {
  // Enviar para seu serviço de analytics
  console.log(`[API] ${method} ${endpoint} - ${duration}ms`);
}

// No interceptor do axios (adicione no arquivo apiClient.ts)
apiClient.interceptors.response.use(
  (response) => {
    const metadata = (response.config as any).metadata;
    if (metadata?.startTime) {
      const duration = Date.now() - metadata.startTime;
      trackAPICall(response.config.url!, response.config.method!, duration);
    }
    return response;
  },
  (error) => {
    // Também pode trackar erros
    const metadata = (error.config as any)?.metadata;
    if (metadata?.startTime) {
      const duration = Date.now() - metadata.startTime;
      trackAPICall(
        error.config?.url || 'unknown',
        error.config?.method || 'unknown',
        duration
      );
    }
    return Promise.reject(error);
  }
);
```

---

## ⚠️ Observações Importantes

### 1. Configuração do React Query

Adicione o QueryClientProvider na raiz da aplicação:

```tsx
// src/App.tsx ou src/main.tsx
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { ReactQueryDevtools } from '@tanstack/react-query-devtools';

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: 1,
      refetchOnWindowFocus: false,
      staleTime: 5 * 60 * 1000, // 5 minutos
    },
  },
});

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      {/* Seu app */}
      <ReactQueryDevtools initialIsOpen={false} />
    </QueryClientProvider>
  );
}
```

### 2. Tratamento de Erros Melhorado

```typescript
// src/lib/apiClient.ts - Adicione este tratamento mais robusto

apiClient.interceptors.response.use(
  (response) => {
    // Tracking de performance
    const metadata = (response.config as any).metadata;
    if (metadata?.startTime) {
      const duration = Date.now() - metadata.startTime;
      console.log(`[API] ${response.config.method?.toUpperCase()} ${response.config.url} - ${duration}ms`);
    }
    return response;
  },
  async (error) => {
    if (error.response?.status === 401) {
      // Token expirado - tentar renovar
      try {
        const auth = getAuth();
        const user = auth.currentUser;
        if (user) {
          const newToken = await user.getIdToken(true); // force refresh
          error.config.headers.Authorization = `Bearer ${newToken}`;
          return apiClient.request(error.config); // retry
        }
      } catch (refreshError) {
        // Se falhar, redirecionar para login
        window.location.href = '/login';
      }
    }

    if (error.response?.status === 403) {
      console.error('[API] Acesso negado:', error.response.data);
    }

    if (error.response?.status === 404) {
      console.error('[API] Recurso não encontrado:', error.config.url);
    }

    return Promise.reject(error);
  }
);
```

### 3. Loading States nos Componentes

Sempre trate os estados de loading, error e empty:

```tsx
function UserList() {
  const { data: users, isLoading, error } = useUsers();

  if (isLoading) {
    return <LoadingSpinner />;
  }

  if (error) {
    return <ErrorMessage error={error} retry={() => refetch()} />;
  }

  if (!users || users.length === 0) {
    return <EmptyState message="Nenhum usuário encontrado" />;
  }

  return (
    <div>
      {users.map(user => <UserCard key={user.uid} user={user} />)}
    </div>
  );
}
```

### 4. Invalidação de Cache Inteligente

```typescript
// Após criar um recurso relacionado
export function useCreateUserTrail() {
  const queryClient = useQueryClient();

  return useMutation(
    (data: CreateTrailData) => createTrailAPI(data),
    {
      onSuccess: (newTrail, variables) => {
        // Invalida cache do usuário específico
        queryClient.invalidateQueries(['userTrails', variables.uid]);
        
        // Atualiza cache otimisticamente
        queryClient.setQueryData<TrailProgress[]>(
          ['userTrails', variables.uid],
          (old) => old ? [...old, newTrail] : [newTrail]
        );
      },
    }
  );
}
```

### 5. Variáveis de Ambiente

Crie arquivo `.env` no frontend:

```env
# Frontend .env
REACT_APP_API_URL=http://localhost:3001
REACT_APP_FIREBASE_API_KEY=your_key
REACT_APP_FIREBASE_PROJECT_ID=your_project_id
```

---

## 🔒 Segurança

### 1. Nunca Exponha Tokens

```typescript
// ❌ ERRADO
localStorage.setItem('token', idToken);

// ✅ CORRETO - Use Firebase SDK que gerencia tokens automaticamente
const user = auth.currentUser;
const token = await user.getIdToken(); // sempre fresco
```

### 2. Validação de Permissões no Frontend

```typescript
// src/hooks/useAuth.ts
export function useAuth() {
  const user = useCurrentUser();

  return {
    user,
    isAdmin: user?.role === 'admin' || user?.role === 'superadmin',
    isCompanyAdmin: user?.role === 'company_admin',
    isSuperAdmin: user?.role === 'superadmin',
    canEditUser: (targetUid: string) => {
      if (!user) return false;
      if (user.role === 'superadmin' || user.role === 'admin') return true;
      if (user.role === 'company_admin') {
        // Verificar se é da mesma empresa
        return true; // implementar lógica
      }
      return user.uid === targetUid;
    },
  };
}
```

### 3. Componentes Protegidos

```tsx
// src/components/ProtectedRoute.tsx
import { Navigate } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';

interface ProtectedRouteProps {
  children: React.ReactNode;
  requireAdmin?: boolean;
}

export function ProtectedRoute({ children, requireAdmin }: ProtectedRouteProps) {
  const { user, isAdmin } = useAuth();

  if (!user) {
    return <Navigate to="/login" />;
  }

  if (requireAdmin && !isAdmin) {
    return <Navigate to="/unauthorized" />;
  }

  return <>{children}</>;
}
```

---

## 🧪 Testes

### Exemplo de Teste com Mock

```typescript
// src/services/__tests__/userService.test.ts
import { vi, describe, it, expect, beforeEach } from 'vitest';
import { userService } from '../userService';
import apiClient from '../../lib/apiClient';

vi.mock('../../lib/apiClient');

describe('userService', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('deve buscar usuário por ID', async () => {
    const mockUser = {
      uid: 'user123',
      name: 'João Silva',
      email: 'joao@example.com',
      companyId: 'company1',
      role: 'member' as const,
      status: 'active' as const,
    };

    vi.mocked(apiClient.get).mockResolvedValueOnce({ data: mockUser });

    const result = await userService.getById('user123');

    expect(result).toEqual(mockUser);
    expect(apiClient.get).toHaveBeenCalledWith('/users/user123');
  });

  it('deve deletar usuário', async () => {
    vi.mocked(apiClient.delete).mockResolvedValueOnce({ data: { success: true } });

    await userService.delete('user123');

    expect(apiClient.delete).toHaveBeenCalledWith('/users/user123');
  });
});
```

---

**Pronto para produção!** 🚀

Use este guia para integrar o frontend com todos os endpoints do backend de forma otimizada e type-safe.
