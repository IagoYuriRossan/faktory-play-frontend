# API Endpoints - Faktory Play Backend

Documentação completa dos endpoints disponíveis para o frontend.

## Autenticação

Todos os endpoints protegidos requerem header de autenticação:
```typescript
Authorization: Bearer {ID_TOKEN_FIREBASE}
```

## Níveis de Permissão

- `requireAuth` — usuário autenticado
- `requireAdmin` — admin ou superadmin
- `requireSuperAdmin` — apenas superadmin
- `requireCompanyAdmin` — company_admin, admin ou superadmin

---

### POST /api/register (convite / criação)
Endpoint público usado pelo frontend para registrar novos usuários via convite ou criar nova empresa. O frontend deve sempre chamar este endpoint — não use o cliente Firebase diretamente para criar contas em fluxo de convite.

**Body (convite):**
```json
{ "email": "user@example.com", "password": "...", "name": "...", "inviteToken": "<token>" }
```

**Comportamento importante (robusto contra órfãos):**
- O servidor tenta criar o usuário no Firebase Auth via Admin SDK.
- Se `createUser` falhar com `auth/email-already-exists`, o backend reconcilia o usuário existente (cria/atualiza documentos Firestore `companies/{companyId}/users/{uid}` e `users/{uid}`) e marca o invite como usado.
- Se `createUser` tiver sucesso mas as escritas no Firestore falharem, o backend faz rollback removendo o usuário criado no Auth (para evitar órfãos) e retorna erro 500.

**Resposta útil em caso de usuário já existente sem credencial de senha:**
- HTTP 200 com corpo:
```json
{ "uid": "...", "companyId": "...", "providers": ["google.com"], "message": "existing_auth_no_password" }
```
- `providers` lista os providers associados ao Auth user (ex.: `google.com`). `message: existing_auth_no_password` indica que o usuário existe no Auth, mas não tem provider `password` — o frontend NÃO deve chamar `signInWithEmailAndPassword` nesse caso.

**Recomendações de frontend ao receber `existing_auth_no_password`:**
- Mostrar ao usuário os provedores possíveis (botões, ex.: "Entrar com Google").
- Oferecer botão para enviar link de redefinição de senha (`sendPasswordResetEmail(email)`) como fallback se apropriado; trate erros e mostre feedback claro.
- Como fallback adicional, o frontend pode chamar `fetchSignInMethodsForEmail(auth, email)` se `providers` não estiver presente na resposta.
- Auto-redirect para provedor externo (ex.: Google) deve ser opt-in via flag `AUTO_REDIRECT_TO_PROVIDER` no frontend; por padrão mostrar botão e deixar o usuário escolher.

**Erros importantes:**
- `409` — e-mail já cadastrado (caso o backend decida não reconciliar; ver comportamento acima).
- `410` — convite já utilizado ou expirado.


## 📋 USUÁRIOS

### GET /api/companies/:companyId/users
Lista usuários da empresa especificada. **A partir da migração, este é o endpoint preferido para listar membros da company.**

**Auth:** `requireAuth`

**Comportamento:**
- `company_admin` → usuários da própria empresa (companyId é inferido do token ou deve ser passado na rota)
- `superadmin` / `admin` → pode listar qualquer company
- `member` → 403 (somente admins podem listar todos membros)

**Query params opcionais:** `?usersCursor={cursor}&usersLimit={N}&includeTrails={true|false}`

**Resposta:**
```typescript
{
  companyId: string,
  users: Array<{
    id: string;
    name: string;
    email: string;
    role: string;
    companyId: string;
    migratedAt?: string;
    allowedTrails?: string[];
    // só presente quando includeTrails=true
    trails?: string[];
  }>,
  usersCursor: string | null
}
```

**Exemplo:**
```typescript
const resp = await fetch(`/api/companies/${companyId}/users?includeTrails=false`, {
  headers: { Authorization: `Bearer ${token}` }
}).then(r => r.json());
```

---

### GET /api/companies/:companyId/users/count
Retorna contagem de usuários da company (otimizado para métricas).

**Auth:** `requireAuth`

**Autorização:**
- `superadmin` / `admin` → pode consultar qualquer company
- `company_admin` → apenas própria company
- `member` → 403

**Resposta:**
```typescript
{
  companyId: string,
  count: number
}
```

**Exemplo:**
```typescript
const { count } = await fetch(`/api/companies/${companyId}/users/count`, {
  headers: { Authorization: `Bearer ${token}` }
}).then(r => r.json());

console.log(`Total de usuários na company: ${count}`);
```

**⚡ Performance:** Usa `.count()` do Firestore. Ideal para dashboards e métricas.

---

### POST /api/users/batch
Busca múltiplos usuários em uma única chamada.

**Auth:** `requireAuth`

**Autorização:**
- `superadmin` / `admin` → pode buscar qualquer usuário
- `company_admin` → retorna apenas usuários da própria empresa
- `member` → retorna apenas próprio perfil (se estiver nos uids)

**Body:**
```typescript
{
  uids: string[]; // máximo 100 uids por chamada
}
```

**Resposta:**
```typescript
Array<{
  uid: string;
  name: string;
  email: string;
  companyId: string;
  role: string;
  status: string;
  // ... outros campos
}>
```

**Exemplo:**
```typescript
const users = await fetch('/api/users/batch', {
  method: 'POST',
  headers: {
    Authorization: `Bearer ${token}`,
    'Content-Type': 'application/json'
  },
  body: JSON.stringify({
    uids: ['user1', 'user2', 'user3']
  })
}).then(r => r.json());

console.log(`Carregados ${users.length} usuários`);
```

**⚡ Performance:** Ideal para relatórios e listagens onde você precisa de múltiplos usuários específicos. Reduz N requisições para 1.

**Limite:** Máximo 100 uids por chamada. Para listas maiores, faça múltiplas chamadas em paralelo.

---

### GET /api/users/:uid
Busca dados de um usuário específico.

**Auth:** `requireAuth`

**Autorização:**
- Próprio usuário
- `admin` / `superadmin`
- `company_admin` (apenas da própria empresa)

**Resposta:**
```typescript
{
  uid: string;
  name: string;
  email: string;
  companyId: string;
  role: string;
  status: string;
  allowedTrails?: string[];
  lastAccessAt?: string;
}
```

**Exemplo:**
```typescript
const user = await fetch(`/api/users/${uid}`, {
  headers: { Authorization: `Bearer ${token}` }
}).then(r => r.json());
```

**⚡ Otimização:** Use este endpoint em vez de `GET /users` + filter quando buscar 1 usuário específico (99% menos reads no Firestore).

---

### PUT /api/users/:uid
Atualiza dados de um usuário.

**Auth:** `requireAuth`

**Autorização:**
- Próprio usuário (campos limitados)
- `company_admin` (usuários da própria empresa)
- `admin` / `superadmin` (qualquer usuário)

**Body:**
```typescript
{
  name?: string;
  email?: string;
  photoURL?: string;
  role?: string; // apenas admin/superadmin
  allowedTrails?: string[]; // apenas admin/superadmin
  status?: 'active' | 'inactive';
  // ... outros campos
}
```

**Resposta:**
```typescript
{ success: true }
```

**Exemplo:**
```typescript
await fetch(`/api/users/${uid}`, {
  method: 'PUT',
  headers: {
    Authorization: `Bearer ${token}`,
    'Content-Type': 'application/json'
  },
  body: JSON.stringify({
    name: 'João Silva',
    role: 'company_admin'
  })
});
```

---

### DELETE /api/users/:uid
Remove usuário e todos dados relacionados (cascata).

**Auth:** `requireAuth` + `requireAdmin`

**Autorização:**
- `superadmin` → qualquer usuário
- `company_admin` → apenas usuários da própria empresa

**Cascata (ordem):**
1. Remove `users/{uid}/progress/*`
2. Remove `userTrails` onde `uid == :uid`
3. Remove `invites` onde `invitedEmail == user.email`
4. Remove `users/{uid}`

**Resposta:**
```typescript
{ success: true }
```

**Erros:**
- `404` — usuário não encontrado
- `403` — sem permissão

**Exemplo:**
```typescript
await fetch(`/api/users/${uid}`, {
  method: 'DELETE',
  headers: { Authorization: `Bearer ${token}` }
});
```

---

### GET /api/users/:uid/progress
Busca progresso de todas as lições do usuário (trilhas).

**Auth:** `requireAuth`

**Autorização:**
- Próprio usuário
- `company_admin` (usuários da própria empresa)
- `admin` / `superadmin`

**Resposta:**
```typescript
Array<{
  lessonId: string;
  moduleId: string;
  trailId: string;
  completed: boolean;
  watchedSeconds?: number;
  updatedAt: string;
}>
```

**Exemplo:**
```typescript
const progress = await fetch(`/api/users/${uid}/progress`, {
  headers: { Authorization: `Bearer ${token}` }
}).then(r => r.json());
```

---

### GET /api/users/:uid/trails
Busca progresso consolidado de todas as trilhas do usuário.

**Auth:** `requireAuth`

**Autorização:**
- Próprio usuário
- `company_admin` (usuários da própria empresa)
- `admin` / `superadmin`

**Resposta:**
```typescript
Array<{
  uid: string;
  trailId: string;
  companyId: string;
  currentModuleId: string;
  completedLessons: number;
  totalLessons: number;
  totalModules: number;
  totalProgress: number; // 0-100
  currentModuleProgress: number; // 0-100
  status: 'not_started' | 'in_progress' | 'completed' | 'overdue';
  startedAt: string;
  lastActivityAt: string;
  completedAt: string | null;
}>
```

**Exemplo:**
```typescript
const trails = await fetch(`/api/users/${uid}/trails`, {
  headers: { Authorization: `Bearer ${token}` }
}).then(r => r.json());
```

**⚡ Use este endpoint:** Para exibir dashboard de progresso do usuário em vez de agregar manualmente.

---

### PUT /api/users/:uid/progress/:lessonId
Atualiza progresso de uma lição.

**Auth:** `requireAuth`

**Autorização:**
- Próprio usuário
- `admin` / `superadmin`

**Body:**
```typescript
{
  completed: boolean;
  trailId: string;
  moduleId: string;
  totalLessonsInModule: number;
  totalLessonsInTrail: number;
  totalModulesInTrail: number;
  watchedSeconds?: number;
}
```

**Efeitos colaterais:**
1. Atualiza `users/{uid}/progress/{lessonId}`
2. Atualiza `users/{uid}.lastAccessAt`
3. Recalcula e atualiza `companies/{companyId}/users/{uid}/userTrails/{trailId}` (preferido) ou `userTrails/{uid}_{trailId}` como fallback

**Resposta:**
```typescript
{ success: true }
```

---

## NOVOS ENDPOINTS — Progress (nova estrutura)

- `PUT /api/users/:uid/trails/:trailId/lessons/:lessonId`
  - Atualiza progresso da lição na nova estrutura.
  - Body (exemplo):
    ```json
    {
      "completed": true,
      "watchedSeconds": 120,
      "moduleId": "module_abc",
      "trailId": "trail_xyz"
    }
    ```
  - Efeitos:
    - Escreve em `users/{uid}/trails/{trailId}/lessons/{lessonId}` (novo esquema).
    - Também escreve em `users/{uid}/progress/{lessonId}` (legacy) — escrita dupla para compatibilidade.
    - Atualiza o documento resumo `users/{uid}/trails/{trailId}` (merge) com contadores e timestamps.
    - Dispara evento observability (opcional) e o Cloud Function que recalcula resumos por trilha.
  - Auth: `requireAuth` (próprio usuário, `company_admin` da mesma empresa ou `superadmin`).

- `PUT /api/users/:uid/trails/:trailId/subetapas/:subetapaId` e
  `PUT /api/users/:uid/trails/:trailId/tasks/:taskId`
  - Mesma semântica da rota de lição: escrita dupla (novo + legacy), atualização de resumo e publicação de evento.

- `GET /api/users/:uid/progress` e `GET /api/users/:uid/progress/:lessonId`
  - Mantidos como proxies/compatibilidade com o contrato existente (retornam dados de `users/{uid}/progress/*`).

- `GET /api/users/:uid/trails`
  - Retorna progresso consolidado por trilha (resumo). Os campos esperados permanecem os mesmos e são atualizados pelo trigger que escuta writes nas lições.

Implementação: consulte `src/routes/progress.ts` para contratos exatos de request/response e `functions/index.js` para a lógica de resumo/trigger.

---

## 🏢 EMPRESAS

### GET /api/companies
Lista empresas visíveis.

**Auth:** `requireAuth`

**Comportamento:**
- `superadmin` / `admin` → todas empresas
- `member` com `companyId` → apenas sua empresa

**Resposta:**
```typescript
Array<{
  id: string;
  name: string;
  allowedTrails: string[];
  // ... outros campos
}>
```

---

### GET /api/companies/:id
Busca dados de uma empresa.
---

### GET /api/companies/:companyId/users/:uid/trails
Busca trilhas (consolidadas) do usuário dentro da company. Use este endpoint quando quiser dados de trilhas paginadas ou com progresso detalhado.

**Auth:** `requireAuth`

**Autorização:**
- Próprio usuário (quando o `uid` for dele)
- `company_admin` da própria company
- `admin` / `superadmin`

**Query params:** `?usersCursor={cursor}&usersLimit={N}&fields=ids|full`

**Resposta:**
```typescript
{
  uid: string,
  companyId: string,
  trails: Array<{ id: string; progress?: any }>,
  usersCursor: string | null
}
```

**Exemplo:**
```typescript
const resp = await fetch(`/api/companies/${companyId}/users/${uid}/trails?fields=ids`, {
  headers: { Authorization: `Bearer ${token}` }
}).then(r => r.json());

---

### GET /api/companies/:companyId/users/:uid/progress
Busca progresso detalhado (aulas) de um usuário dentro da company. Este endpoint é preferido quando o frontend está exibindo o histórico de lições do usuário no contexto da company.

**Auth:** `requireAuth` + `requireCompanyAdmin` (ou `superadmin`)

**Comportamento:**
- Prefere retornar os documentos de progresso armazenados em `companies/{companyId}/users/{uid}/progress` quando presentes.
- Se não houver dados na path company-scoped, faz fallback para `users/{uid}/progress` (compatibilidade).
- Se nenhum dado for encontrado retorna `404`.

**Resposta:**
```typescript
Array<{
  lessonId: string;
  moduleId: string | null;
  trailId: string | null;
  completed: boolean;
  watchedSeconds?: number | null;
  updatedAt: string;
}>
```

**Exemplo:**
```typescript
const resp = await fetch(`/api/companies/${companyId}/users/${uid}/progress`, {
  headers: { Authorization: `Bearer ${token}` }
}).then(r => {
  if (!r.ok) throw new Error(`HTTP ${r.status}`);
  return r.json();
});

console.log('Progresso do usuário:', resp);
```

**Notas:**
- Frontend pode usar este endpoint quando estiver no contexto da company (p.ex. admin company view). Para perfis acessados fora do contexto da company, `GET /api/users/:uid/progress` permanece disponível como fallback.
- Permissões devem ser validadas: `company_admin` só pode acessar progresso de usuários da própria empresa; `superadmin` pode acessar qualquer empresa.
```


**Auth:** `requireAuth`

**Resposta:**
```typescript
{
  id: string;
  name: string;
  allowedTrails: string[];
  // ... outros campos
}
```

---

### POST /api/companies
Cria nova empresa.

**Auth:** `requireAuth` + `requireAdmin`

**Body:**
```typescript
{
  name: string;
  allowedTrails?: string[];
  // ... outros campos
}
```

**Resposta:**
```typescript
{ id: string }
```

---

### PUT /api/companies/:id
Atualiza empresa (update completo).

**Auth:** `requireAuth` + `requireAdmin`

**Body:** objeto completo da empresa

**Resposta:**
```typescript
{ success: true }
```

---

### PATCH /api/companies/:id
Atualiza campos específicos da empresa.

**Auth:** `requireAuth` + `requireAdmin`

**Body:**
```typescript
{
  allowedTrails?: string[]; // validado como array de strings
}
```

**Resposta:**
```typescript
{ success: true }
```

**Exemplo:**
```typescript
await fetch(`/api/companies/${companyId}`, {
  method: 'PATCH',
  headers: {
    Authorization: `Bearer ${token}`,
    'Content-Type': 'application/json'
  },
  body: JSON.stringify({
    allowedTrails: ['trail_1', 'trail_2', 'trail_3']
  })
});
```

---

### DELETE /api/companies/:id
Remove empresa.

**Auth:** `requireAuth` + `requireAdmin`

**⚠️ Atenção:** Não remove cascata. Considere remover/transferir usuários relacionados antes.

**Resposta:**
```typescript
{ success: true }
```

---

### GET /api/companies/:id/members
Lista membros e convites pendentes da empresa.

**Auth:** `requireAuth` + `requireCompanyAdmin`

**Autorização:**
- `superadmin` → qualquer empresa
- `company_admin` → apenas própria empresa

**Resposta:**
```typescript
{
  members: Array<{
    type: 'member';
    uid: string;
    id: string;            // alias de uid, para compatibilidade
    name: string;
    email: string;
    role: string;          // join com users/{uid} — sempre presente
    lastLoginAt: string | null; // join com users/{uid}
    companyId: string;
    status?: string;
    // ... outros campos do doc companies/{id}/users/{uid}
  }>;
  pendingInvites: Array<{
    type: 'invite';
    inviteId: string;
    id: string;            // alias de inviteId
    email: string;
    name: string | null;
    expiresAt: string;
    status: 'pending';
  }>;
}
```

> **Atualizado (2026-05-05):** Cada membro agora inclui `role` e `lastLoginAt` obtidos via join com a coleção global `users/{uid}`. Antes esses campos podiam estar ausentes quando o doc de subcoleção não os tinha.

---

### GET /api/companies/:companyId/trails/:trailId/users-report
Relatório detalhado de todos os usuários da empresa em uma trilha específica.

**Auth:** `requireAuth` + `requireCompanyAdmin`

**Autorização:**
- `superadmin` → qualquer empresa
- `company_admin` → apenas própria empresa

**Resposta:**
```typescript
{
  companyId: string;
  trailId: string;
  trailTitle: string | null;
  generatedAt: string;         // ISO timestamp
  users: Array<{
    userId: string;
    name: string | null;
    email: string | null;
    status: 'not_started' | 'in_progress' | 'completed' | 'overdue';
    totalProgress: number;     // 0–100
    startedAt: string | null;
    lastAccess: string | null;
    completedAt: string | null;
    moduleProgress: Array<{
      moduleId: string;
      title: string | null;
      progress: number;          // 0–100
      completedLessons: number;
      totalLessons: number;
      etapas: Array<{            // NOVO — hierarquia completa
        etapaId: string;
        title: string | null;
        completed: boolean;
        subetapas: Array<{
          subetapaId: string;
          title: string | null;
          completed: boolean;
        }>;
      }>;
    }>;
  }>;
}
```

> **Atualizado (2026-05-05):** `moduleProgress` agora inclui `etapas[]` e `subetapas[]` com status `completed` por item, além dos contadores de módulo já existentes.

**Exemplo:**
```typescript
const report = await fetch(
  `/api/companies/${companyId}/trails/${trailId}/users-report`,
  { headers: { Authorization: `Bearer ${token}` } }
).then(r => r.json());
```

---

### GET /api/companies/:companyId/trails/:trailId/users/:userId/detail
Progresso detalhado de **um único usuário** em uma trilha, com hierarquia completa módulo → etapa → subetapa.

**Auth:** `requireAuth` + `requireCompanyAdmin`

**Autorização:**
- `superadmin` → qualquer empresa/usuário
- `company_admin` → apenas própria empresa
- Próprio usuário (`userId == req.user.uid`) → acesso permitido

**Resposta:**
```typescript
{
  companyId: string;
  trailId: string;
  trailTitle: string | null;
  userId: string;
  name: string | null;
  email: string | null;
  totalProgress: number;       // 0–100
  status: 'not_started' | 'in_progress' | 'completed' | 'overdue';
  startedAt: string | null;
  lastAccessAt: string | null;
  completedAt: string | null;
  modules: Array<{
    moduleId: string;
    title: string | null;
    order: number | null;
    progress: number;            // 0–100
    completedLessons: number;
    totalLessons: number;
    etapas: Array<{
      etapaId: string;
      title: string | null;
      type: string | null;
      completed: boolean;
      completedAt: string | null;
      lastAccessAt: string | null;
      progress: number;          // % dentro da etapa (inclui subetapas)
      subetapas: Array<{
        subetapaId: string;
        title: string | null;
        type: string | null;
        completed: boolean;
        completedAt: string | null;
        lastAccessAt: string | null;
      }>;
    }>;
  }>;
}
```

**Exemplo:**
```typescript
const detail = await fetch(
  `/api/companies/${companyId}/trails/${trailId}/users/${userId}/detail`,
  { headers: { Authorization: `Bearer ${token}` } }
).then(r => r.json());
```

> **Novo endpoint (2026-05-05).** Ideal para a tela de detalhe de usuário dentro de um projeto/trilha no painel do cliente.

---

### PATCH /api/companies/:companyId/members/:uid/status
Altera status de um membro (ativar/desativar).

**Auth:** `requireAuth` + `requireSuperAdmin`

**Body:**
```typescript
{
  status: 'active' | 'inactive';
}
```

**Resposta:**
```typescript
{ success: true }
```

**Exemplo (soft delete):**
```typescript
// Desativar usuário (alternativa ao DELETE)
await fetch(`/api/companies/${companyId}/members/${uid}/status`, {
  method: 'PATCH',
  headers: {
    Authorization: `Bearer ${token}`,
    'Content-Type': 'application/json'
  },
  body: JSON.stringify({ status: 'inactive' })
});
```

---

## 📝 QUESTIONÁRIOS

### POST /api/projects/:projectId/questionnaires
Cria um questionário vinculado a um projeto (ou trilha — fallback automático se o ID pertencer a uma trilha).

**Auth:** `requireAuth` + `requireCompanyAdmin`

**Body:**
```typescript
{
  title: string;
  description?: string;
  moduleId?: string;
  questions: Array<{
    id?: string;         // gerado automaticamente se omitido
    text: string;
    type: 'single_choice' | 'multiple_choice' | 'open';
    points: number;
    order?: number;
    options: Array<{     // omitir para type='open'
      text: string;
      isCorrect: boolean;
    }>;
  }>;
}
```

**Resposta:** `{ id: string }`

---

### GET /api/projects/:projectId/questionnaires
Lista questionários do projeto. Alunos **não** recebem o campo `isCorrect` nas opções.

**Auth:** `requireAuth`

**Query params:** `?moduleId={id}` — filtra por módulo

**Autorização:**
- Admin/company_admin → dados completos (com `isCorrect`)
- Aluno com acesso ao projeto → dados sem `isCorrect`

**Resposta:** `QuestionnaireRecord[]`

---

### GET /api/questionnaires/:id
Busca um questionário pelo ID (root ou subcoleção de trilha — busca automática).

**Auth:** `requireAuth`

**Autorização:**
- Questionário de projeto: usuário precisa ter acesso ao projeto
- Questionário de trilha: usuário precisa ter a trilha em `allowedTrails` ou matrícula em `userTrails`
- Admin/company_admin: acesso irrestrito

**Resposta:** `QuestionnaireRecord` (sem `isCorrect` para alunos)

---

### PUT /api/questionnaires/:id
Atualiza título, descrição, moduleId e questões.

**Auth:** `requireAuth` + `requireCompanyAdmin`

**Body:** mesmo shape do POST (title, questions obrigatórios)

**Resposta:** `{ success: true }`

---

### DELETE /api/questionnaires/:id

**Auth:** `requireAuth` + `requireCompanyAdmin`

**Resposta:** `{ success: true }`

---

### POST /api/trails/:trailId/questionnaires
Cria questionário vinculado ao template de trilha (salvo em `trails/{trailId}/questionnaires`).

**Auth:** `requireAuth` + `requireCompanyAdmin`

**Body:** mesmo shape do POST de projeto

**Resposta:** `{ id: string }`

---

### GET /api/trails/:trailId/questionnaires
Lista questionários do template de trilha.

**Auth:** `requireAuth` + `requireCompanyAdmin`

**Resposta:** `QuestionnaireRecord[]`

---

### GET /api/trails/:trailId/questionnaires/:id
Busca questionário específico da trilha.

**Auth:** `requireAuth` + `requireCompanyAdmin`

**Resposta:** `QuestionnaireRecord`

---

### PUT /api/trails/:trailId/questionnaires/:id

**Auth:** `requireAuth` + `requireCompanyAdmin`

**Body:** mesmo shape do PUT raiz

**Resposta:** `{ success: true }`

---

## 🎯 TENTATIVAS (Aluno executa questionário)

### POST /api/questionnaires/:id/attempts
Inicia uma nova tentativa. Retorna `attemptId`.

**Auth:** `requireAuth`

**Body:**
```typescript
{
  trailId?: string;       // recomendado — usado para vincular ao enrollment
  enrollmentId?: string;  // alternativa mais eficiente ao trailId
}
```

**Resposta:**
```typescript
{
  attemptId: string;
  questionnaireId: string;
  startedAt: string;
}
```

---

### GET /api/attempts/:attemptId
Retorna status da tentativa.

**Auth:** `requireAuth`

**Autorização:** próprio usuário ou admin

**Resposta:** `AttemptRecord`

---

### POST /api/attempts/:attemptId/submit
Submete respostas e calcula score. Questões `open` ficam com `isCorrect: false` (revisão manual).

**Auth:** `requireAuth` (apenas o dono da tentativa)

**Body:**
```typescript
{
  answers: Array<{
    questionId: string;
    selectedOptionIds?: string[];  // para single/multiple_choice
    textAnswer?: string;           // para open
  }>;
  trailId?: string;       // para vincular ao enrollment
  enrollmentId?: string;
}
```

**Resposta:**
```typescript
{
  attemptId: string;
  submittedAt: string;
  score: number;
  maxScore: number;
  perQuestion: Array<{
    questionId: string;
    isCorrect: boolean;
    pointsAwarded: number;
  }>;
}
```

---

### GET /api/users/:userId/attempts
Lista tentativas do usuário, com filtros opcionais.

**Auth:** `requireAuth`

**Autorização:** próprio usuário ou admin

**Query params:** `?projectId=&questionnaireId=&status=`

**Resposta:** `AttemptRecord[]`

---

### GET /api/questionnaires/:id/results
Resultados agregados do questionário (admin).

**Auth:** `requireAuth` + `requireCompanyAdmin`

**Resposta:**
```typescript
{
  questionnaireId: string;
  title: string;
  totalAttempts: number;
  avgScore: number;
  questions: Array<{
    questionId: string;
    text: string;
    type: string;
    totalAnswers: number;
    correctRate: number;  // 0–1
  }>;
}
```

---

### POST /api/questionnaires/:id/duplicate

**Auth:** `requireAuth` + `requireCompanyAdmin`

**Resposta:** `{ id: string }` — ID do novo questionário criado

---

### GET /api/projects/:projectId/users-progress
Progresso de todos os usuários de um projeto (tabela admin).

**Auth:** `requireAuth` + `requireCompanyAdmin`

**Resposta:** array com progresso por usuário

---

### GET /api/projects/:projectId/attempts-to-grade
Lista tentativas com questões abertas pendentes de revisão manual.

**Auth:** `requireAuth` + `requireCompanyAdmin`

**Resposta:** `AttemptRecord[]` com status `submitted` e questões `open`

---

### POST /api/attempts/:attemptId/grade
Avalia manualmente uma tentativa com questões abertas.

**Auth:** `requireAuth` + `requireCompanyAdmin`

**Body:**
```typescript
{
  grades: Array<{
    questionId: string;
    pointsAwarded: number;
    feedback?: string;
  }>;
}
```

**Resposta:** `AttemptRecord` atualizado

---

## ✅ TAREFAS (Tasks)

> Tarefas são atividades vinculadas a etapas/subetapas de projetos. Tipos: `signature`, `questionnaire`, `image_upload`.

### POST /api/projects/:projectId/modules/:moduleId/etapas/:etapaId/tasks
Cria tarefa vinculada a uma etapa.

**Auth:** `requireAuth` + `requireAdmin`

**Body:**
```typescript
{
  type: 'signature' | 'questionnaire' | 'image_upload';
  title: string;
  description?: string;
  config: object;          // varia por tipo
  order?: number;
  isRequired?: boolean;    // default: true
  pointsValue?: number;
}
```

**Resposta:** `TaskRecord` (HTTP 201)

---

### POST /api/projects/:projectId/modules/:moduleId/etapas/:etapaId/subetapas/:subetapaId/tasks
Cria tarefa vinculada a uma subetapa.

**Auth:** `requireAuth` + `requireAdmin`

**Body:** mesmo shape acima

**Resposta:** `TaskRecord` (HTTP 201)

---

### GET /api/projects/:projectId/modules/:moduleId/etapas/:etapaId/tasks
Lista tarefas de uma etapa (ou subetapa via query param).

**Auth:** `requireAuth`

**Query params:** `?subetapaId={id}` — filtra por subetapa

**Resposta:** `TaskRecord[]` ordenado por `order`

---

### GET /api/tasks/:taskId

**Auth:** `requireAuth`

**Resposta:** `TaskRecord`

---

### PUT /api/tasks/:taskId

**Auth:** `requireAuth` + `requireAdmin`

**Body:** campos opcionais: `title`, `description`, `config`, `order`, `isRequired`, `pointsValue`

**Resposta:** `TaskRecord` atualizado

---

### DELETE /api/tasks/:taskId
Remove a tarefa e todos os `taskCompletions` vinculados. Remove referência da etapa/subetapa atomicamente (transação Firestore).

**Auth:** `requireAuth` + `requireAdmin`

**Resposta:** HTTP 204 (sem body)

---

### POST /api/tasks/:taskId/start
Inicia uma tarefa para o usuário autenticado (cria `taskCompletion` com status `pending`). Idempotente — retorna o existente se já iniciado.

**Auth:** `requireAuth`

**Body:**
```typescript
{
  trailId?: string;
  enrollmentId?: string;
}
```

**Resposta:** `TaskCompletionRecord` (HTTP 201 ou 200 se já existia)

---

### POST /api/tasks/:taskId/complete
Completa uma tarefa auto-corrigida (`signature` ou `questionnaire`).

**Auth:** `requireAuth`

**Body (signature):**
```typescript
{
  signedText: string;
  typedConfirmation?: string;
  ipAddress?: string;
  trailId?: string;
}
```

**Body (questionnaire):**
```typescript
{
  attemptId: string;
  score: number;
  maxScore: number;
  trailId?: string;
}
```

**Resposta:** `TaskCompletionRecord`

---

### POST /api/tasks/:taskId/submit
Submete tarefa do tipo `image_upload` para revisão manual (status → `pending`).

**Auth:** `requireAuth`

**Body:**
```typescript
{
  uploadedFileUrl: string;
  fileName: string;
  fileSize: number;
  fileMimeType: string;
  trailId?: string;
}
```

**Resposta:** `TaskCompletionRecord`

---

### GET /api/users/:userId/tasks/:taskId/status
Status atual de uma tarefa para o usuário.

**Auth:** `requireAuth` (próprio usuário ou admin)

**Resposta:** `TaskCompletionRecord`

---

### GET /api/users/:userId/tasks
Lista todos os completions de tarefas do usuário.

**Auth:** `requireAuth` (próprio usuário ou admin)

**Query params:** `?projectId=&status=pending|completed|rejected&type=signature|questionnaire|image_upload`

**Resposta:** `TaskCompletionRecord[]`

---

### GET /api/projects/:projectId/tasks/pending
Lista tarefas `image_upload` pendentes de revisão (admin).

**Auth:** `requireAuth` + `requireAdmin`

**Resposta:** array enriquecido com dados do usuário e da task:
```typescript
Array<TaskCompletionRecord & {
  user: { name: string; email: string } | null;
  task: { title: string; type: string } | null;
}>
```

---

### PUT /api/tasks/:taskId/completions/:completionId/review
Aprova ou reprova uma tarefa `image_upload`.

**Auth:** `requireAuth` + `requireAdmin`

**Body:**
```typescript
{
  status: 'completed' | 'rejected';
  notes?: string;
}
```

**Resposta:** `TaskCompletionRecord` atualizado

---

### GET /api/tasks/:taskId/completions
Histórico de todos os completamentos de uma tarefa.

**Auth:** `requireAuth` + `requireAdmin`

**Resposta:** `TaskCompletionRecord[]` ordenado por `startedAt` desc

---

## 🎯 PROGRESSO (Projetos / Questionários)

### GET /api/projects/:projectId/progress
Agregação de progresso global do projeto (admin).

**Auth:** `requireAuth` + `requireCompanyAdmin`

**Resposta:**
```typescript
{
  projectId: string;
  totalQuestionnaires: number;
  modules: Array<{
    moduleId: string | null;
    moduleTitle: string | null;
    totalQuestionnaires: number;
    totalSubmissions: number;
    distinctUsersCompleted: number;
    avgScore: number;
  }>;
}
```

**Contexto:** Para projetos com questionários/provas (não trilhas).

---

### GET /api/projects/:projectId/users/:userId/progress
Progresso de um usuário específico no projeto.

**Auth:** `requireAuth`

**Autorização:**
- Próprio usuário
- `company_admin` / `admin`

**Resposta:**
```typescript
{
  projectId: string;
  userId: string;
  totalQuestionnaires: number;
  completedQuestionnaires: number;
  completionRate: number; // 0-1
  modules: Array<{
    moduleId: string | null;
    moduleTitle: string | null;
    totalQuestionnaires: number;
    completedQuestionnaires: number;
    completionRate: number;
    score: number;
    maxScore: number;
    avgScore: number;
  }>;
}
```

**Contexto:** Para projetos com questionários/provas (não trilhas).

---

## 🔄 Diferença: Progresso de Trilhas vs Projetos

| Endpoint | Contexto | Dados |
|----------|----------|-------|
| `/api/users/:uid/progress` | Trilhas (vídeos/lições) | Subcoleção `users/{uid}/progress` |
| `/api/users/:uid/trails` | Trilhas consolidadas | Coleção `userTrails` |
| `/api/companies/:cId/trails/:tId/users-report` | Todos usuários de uma trilha (admin) | `userTrails` + `users/{uid}/progress` |
| `/api/companies/:cId/trails/:tId/users/:uId/detail` | Detalhe de um usuário (módulo→etapa→subetapa) | `userTrails` + `users/{uid}/progress` |
| `/api/projects/:projectId/users/:userId/progress` | Projetos (questionários) | Coleções `questionnaires` + `attempts` |

**Não confundir:** São sistemas paralelos para tipos diferentes de conteúdo.

---

## 📊 Otimizações Recomendadas

### 1. Buscar usuário específico

**❌ Atual (ineficiente):**
```typescript
const users = await fetch('/api/users').then(r => r.json());
const user = users.find(u => u.uid === targetUid);
// 500 reads no Firestore para empresa com 500 usuários
```

**✅ Otimizado:**
```typescript
const user = await fetch(`/api/users/${targetUid}`).then(r => r.json());
// 1 read no Firestore
```

**Economia:** 99.8% menos reads, 500× mais rápido, 500× menos custo.

**Quando usar:**
- Página de perfil de usuário
- Formulário de edição de usuário
- Dashboard individual

---

### 2. Progresso de trilhas do usuário

**✅ Use endpoint dedicado:**
```typescript
const trails = await fetch(`/api/users/${uid}/trails`).then(r => r.json());
// Retorna progresso consolidado pronto para UI
```

**Benefícios:**
- Dados pré-calculados (totalProgress, status, etc.)
- Menos processamento no frontend
- Única fonte de verdade

---

## 🛡️ Tratamento de Erros

Todos os endpoints podem retornar:

- `200` — sucesso
- `201` — criado (POST)
- `400` — bad request (validação falhou)
- `403` — acesso negado
- `404` — recurso não encontrado
- `500` — erro interno

**Exemplo de tratamento:**
```typescript
async function fetchUser(uid: string, token: string) {
  const response = await fetch(`/api/users/${uid}`, {
    headers: { Authorization: `Bearer ${token}` }
  });

  if (!response.ok) {
    if (response.status === 404) {
      throw new Error('Usuário não encontrado');
    }
    if (response.status === 403) {
      throw new Error('Sem permissão para acessar este usuário');
    }
    throw new Error('Erro ao buscar usuário');
  }

  return response.json();
}
```

---

## 📝 Tipos TypeScript

```typescript
// Crie um arquivo types/api.ts no frontend

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
  lastAccessAt?: string;
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

export interface Company {
  id: string;
  name: string;
  allowedTrails: string[];
}

export interface CompanyMembers {
  members: Array<{
    type: 'member';
    uid: string;
    name: string;
    email: string;
    role: string;
    status: string;
  }>;
  pendingInvites: Array<{
    type: 'invite';
    inviteId: string;
    email: string;
    name: string | null;
    expiresAt: string;
    status: 'pending';
  }>;
}
```

---

## 🚀 Helper Functions (Frontend)

```typescript
// utils/api.ts

const API_BASE = process.env.REACT_APP_API_URL || 'http://localhost:3001';

export async function apiRequest<T>(
  endpoint: string,
  options: RequestInit = {}
): Promise<T> {
  const token = await getAuthToken(); // sua função de obter token

  const response = await fetch(`${API_BASE}${endpoint}`, {
    ...options,
    headers: {
      ...options.headers,
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
  });

  if (!response.ok) {
    const error = await response.json().catch(() => ({}));
    throw new Error(error.error || `HTTP ${response.status}`);
  }

  return response.json();
}

// Funções específicas
export const userAPI = {
  getAll: () => apiRequest<User[]>('/api/users'),
  getOne: (uid: string) => apiRequest<User>(`/api/users/${uid}`),
  update: (uid: string, data: Partial<User>) =>
    apiRequest<{ success: boolean }>(`/api/users/${uid}`, {
      method: 'PUT',
      body: JSON.stringify(data),
    }),
  delete: (uid: string) =>
    apiRequest<{ success: boolean }>(`/api/users/${uid}`, {
      method: 'DELETE',
    }),
  getProgress: (uid: string) =>
    apiRequest<LessonProgress[]>(`/api/users/${uid}/progress`),
  getTrails: (uid: string) =>
    apiRequest<TrailProgress[]>(`/api/users/${uid}/trails`),
};

export const companyAPI = {
  getAll: () => apiRequest<Company[]>('/api/companies'),
  getOne: (id: string) => apiRequest<Company>(`/api/companies/${id}`),
  update: (id: string, data: Partial<Company>) =>
    apiRequest<{ success: boolean }>(`/api/companies/${id}`, {
      method: 'PUT',
      body: JSON.stringify(data),
    }),
  patch: (id: string, data: Partial<Company>) =>
    apiRequest<{ success: boolean }>(`/api/companies/${id}`, {
      method: 'PATCH',
      body: JSON.stringify(data),
    }),
  delete: (id: string) =>
    apiRequest<{ success: boolean }>(`/api/companies/${id}`, {
      method: 'DELETE',
    }),
  getMembers: (id: string) =>
    apiRequest<CompanyMembers>(`/api/companies/${id}/members`),
  updateMemberStatus: (companyId: string, uid: string, status: UserStatus) =>
    apiRequest<{ success: boolean }>(
      `/api/companies/${companyId}/members/${uid}/status`,
      {
        method: 'PATCH',
        body: JSON.stringify({ status }),
      }
    ),
};
```

---

## 📚 Exemplos Completos de Uso

### Exemplo 1: Página de perfil de usuário

```typescript
import { useEffect, useState } from 'react';
import { userAPI } from '../utils/api';

function UserProfile({ uid }: { uid: string }) {
  const [user, setUser] = useState<User | null>(null);
  const [trails, setTrails] = useState<TrailProgress[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function loadData() {
      try {
        // ✅ Busca otimizada
        const [userData, trailsData] = await Promise.all([
          userAPI.getOne(uid),
          userAPI.getTrails(uid),
        ]);
        setUser(userData);
        setTrails(trailsData);
      } catch (error) {
        console.error('Erro ao carregar perfil:', error);
      } finally {
        setLoading(false);
      }
    }
    loadData();
  }, [uid]);

  if (loading) return <div>Carregando...</div>;
  if (!user) return <div>Usuário não encontrado</div>;

  return (
    <div>
      <h1>{user.name}</h1>
      <p>Email: {user.email}</p>
      <p>Empresa: {user.companyId}</p>
      
      <h2>Progresso nas Trilhas</h2>
      {trails.map(trail => (
        <div key={trail.trailId}>
          <p>Trilha: {trail.trailId}</p>
          <p>Progresso: {trail.totalProgress}%</p>
          <p>Status: {trail.status}</p>
        </div>
      ))}
    </div>
  );
}
```

### Exemplo 2: Editar usuário

```typescript
async function handleUpdateUser(uid: string, updates: Partial<User>) {
  try {
    await userAPI.update(uid, updates);
    toast.success('Usuário atualizado com sucesso!');
  } catch (error) {
    toast.error('Erro ao atualizar usuário');
    console.error(error);
  }
}

// Uso
await handleUpdateUser('user_123', {
  name: 'João Silva Atualizado',
  role: 'company_admin',
});
```

### Exemplo 3: Desativar usuário (soft delete)

```typescript
async function handleDeactivateUser(companyId: string, uid: string) {
  if (!confirm('Tem certeza que deseja desativar este usuário?')) return;

  try {
    await companyAPI.updateMemberStatus(companyId, uid, 'inactive');
    toast.success('Usuário desativado');
  } catch (error) {
    toast.error('Erro ao desativar usuário');
  }
}
```

### Exemplo 4: Deletar usuário (hard delete)

```typescript
async function handleDeleteUser(uid: string) {
  if (!confirm('ATENÇÃO: Esta ação é irreversível! Deletar usuário?')) return;

  try {
    await userAPI.delete(uid);
    toast.success('Usuário removido permanentemente');
    navigate('/users');
  } catch (error) {
    toast.error('Erro ao deletar usuário');
  }
}
```

---

## 📖 Mais Informações

- Código-fonte das rotas: `src/routes/`
- Middlewares de auth: `src/middlewares/`
- Serviços auxiliares: `src/services/`

---

**Última atualização:** 27/04/2026
