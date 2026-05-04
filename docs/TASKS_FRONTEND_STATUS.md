# Status da Implementação de Tarefas — Frontend

**Data:** 2026-05-04  
**Status:** ✅ **Completo** (exceto dependência de endpoints backend)

---

## ✅ Implementado e Funcional

### Tipos TypeScript
- [x] `src/@types/tasks.ts` — todos os tipos (Task, TaskCompletion, TaskConfig, etc.)
- [x] `src/@types/index.ts` — campo `tasks?: string[]` em Etapa/Subetapa

### Serviços
- [x] `src/services/taskService.ts` — CRUD completo, completamento, revisão

### Componentes
- [x] `src/components/tasks/TaskCard.tsx` — card genérico com status
- [x] `src/components/tasks/SignatureTask.tsx` — assinatura digital
- [x] `src/components/tasks/ImageUploadTask.tsx` — upload de imagem/PDF
- [x] `src/components/tasks/QuestionnaireTask.tsx` — questionários
- [x] `src/components/tasks/TaskList.tsx` — lista e orquestra tarefas
- [x] `src/components/tasks/TaskReviewPanel.tsx` — painel de revisão admin

### Páginas e Rotas
- [x] `src/pages/admin/TasksReview.tsx` — página de revisão (`/admin/tarefas`)
  - ✅ Proteção de permissões (company_admin/superadmin)
- [x] `src/pages/aluno/AulaPlayer.tsx` — sidebar integrado com TaskList
- [x] `src/pages/admin/TrilhaBuilder.tsx` — aba "Tarefas" no sidebar direito
  - ✅ Recarrega trilha após criar tarefa
  - ✅ Validações rigorosas por tipo
- [x] `src/routes/index.tsx` — rota `/admin/tarefas`
- [x] `src/components/layouts/LayoutAdmin.tsx` — menu item + breadcrumb

### Validações e UX
- [x] Validação de formulários (título obrigatório, campos específicos por tipo)
- [x] Estados de loading, erro e sucesso
- [x] Feedback com toast messages
- [x] Sincronização de estado via eventos (`project:progress-updated`)
- [x] Atualização local de `enrollment.completedTasks` (AulaPlayer)

---

## ⚠️ Dependências do Backend (Bloqueadores)

### 1. **Endpoint de Upload de Arquivos** 🚨 CRÍTICO
**Usado em:** [src/components/tasks/ImageUploadTask.tsx:87](c:/faktory-play-frontend/src/components/tasks/ImageUploadTask.tsx#L87)

```typescript
POST /api/uploads/task
Content-Type: multipart/form-data
Body: { file: File, taskId: string }
Response: { url: string; fileName: string }
```

**Ação necessária:**
- Criar endpoint no backend que faz upload para Firebase Storage
- Gerar URL pública do arquivo
- Retornar URL e nome do arquivo

---

### 2. **Endpoints de Tasks** 🚨 CRÍTICO
Todos os endpoints chamados por `taskService.ts`:

#### Admin — CRUD
- `POST /api/projects/:projectId/modules/:moduleId/etapas/:etapaId/tasks`
- `POST /api/projects/:projectId/modules/:moduleId/etapas/:etapaId/subetapas/:subetapaId/tasks`
- `GET /api/projects/:projectId/modules/:moduleId/etapas/:etapaId/tasks` (com `?subetapaId=`)
- `PUT /api/tasks/:taskId`
- `DELETE /api/tasks/:taskId`
- `GET /api/tasks/:taskId`

#### Aluno — Completamento
- `POST /api/tasks/:taskId/start` — inicia tarefa (cria TaskCompletion pendente)
- `POST /api/tasks/:taskId/complete` — completa auto-corrigida (signature/questionnaire)
- `POST /api/tasks/:taskId/submit` — submete para revisão (image_upload)
- `GET /api/users/:userId/tasks/:taskId/status` — retorna TaskCompletion ou 404
- `GET /api/users/:userId/tasks?projectId=&status=&type=` — lista completamentos

#### Admin — Revisão
- `GET /api/projects/:projectId/tasks/pending` — lista image_upload pendentes
- `PUT /api/tasks/:taskId/completions/:completionId/review` — aprova/reprova

---

### 3. **Modelos e Validadores Backend**
Precisam ser criados em `c:/faktory-play-backend/src/`:

#### Modelos (`src/models/index.ts`)
```typescript
export type TaskType = 'questionnaire' | 'signature' | 'image_upload';
export type TaskStatus = 'pending' | 'completed' | 'failed';

export interface TaskConfig {
  // questionnaire
  questionnaireId?: string;
  // signature
  signatureText?: string;
  requireTypedConfirmation?: boolean;
  confirmationPhrase?: string;
  // image_upload
  acceptedFormats?: string[];
  maxSizeMB?: number;
  uploadPrompt?: string;
}

export interface TaskRecord {
  id: string;
  type: TaskType;
  title: string;
  description?: string;
  config: TaskConfig;
  order: number;
  projectId: string;
  moduleId: string;
  etapaId: string;
  subetapaId?: string | null;
  isRequired: boolean;
  pointsValue?: number;
  createdBy: string;
  createdAt: FirebaseFirestore.Timestamp;
  updatedAt: FirebaseFirestore.Timestamp;
}

export interface TaskCompletionRecord {
  id: string;
  taskId: string;
  userId: string;
  status: TaskStatus;
  projectId: string;
  trailId?: string;
  moduleId: string;
  etapaId: string;
  subetapaId?: string | null;
  completionData?: {
    // signature
    signedText?: string;
    typedConfirmation?: string;
    // questionnaire
    attemptId?: string;
    score?: number;
    maxScore?: number;
    // image_upload
    uploadedFileUrl?: string;
    fileName?: string;
    fileSize?: number;
    fileMimeType?: string;
  };
  startedAt: FirebaseFirestore.Timestamp;
  completedAt?: FirebaseFirestore.Timestamp;
  reviewedBy?: string;
  reviewedAt?: FirebaseFirestore.Timestamp;
  reviewNotes?: string;
}
```

#### Validadores (`src/validators/tasks.ts`)
```typescript
export function validateTaskPayload(body: any): { valid: boolean; error?: string }
export function validateTaskCompletionPayload(body: any, taskType: TaskType): { valid: boolean; error?: string }
export function validateReviewPayload(body: any): { valid: boolean; error?: string }
```

---

### 4. **Firestore Collections**
```
/tasks/{taskId} — TaskRecord
/taskCompletions/{completionId} — TaskCompletionRecord
/userTrails/{enrollmentId}/tasks/{taskId} — mirror para queries rápidas
```

**Update necessário em Etapa/Subetapa:**
Adicionar campo `tasks?: string[]` quando criar/atualizar trilhas.

---

### 5. **Permissões e Middlewares**
- `requireAuth` — já existe
- `requireAdmin` — já existe (company_admin ou superadmin)
- Verificações específicas nos endpoints (ex: company_admin só vê tarefas da própria empresa)

---

## 📊 Resumo de Dependências

| Item | Status Backend | Criticidade |
|------|---------------|-------------|
| `POST /api/uploads/task` | ❌ Não existe | 🚨 CRÍTICA |
| Rotas de Tasks (13 endpoints) | ❌ Não existe | 🚨 CRÍTICA |
| Modelos TypeScript | ❌ Não existe | 🚨 CRÍTICA |
| Validadores | ❌ Não existe | ⚠️ Alta |
| Collections Firestore | ❌ Não existe | 🚨 CRÍTICA |
| Atualização de Etapa/Subetapa | ⚠️ Parcial | ⚠️ Alta |

---

## ✅ Checklist de Prontidão Frontend

- [x] Tipos completos e sem erros TS
- [x] Todos os componentes criados
- [x] Integração com AulaPlayer (sidebar)
- [x] Integração com TrilhaBuilder (aba Tarefas)
- [x] Página de revisão admin (`/admin/tarefas`)
- [x] Proteção de rotas admin
- [x] Validações de formulário
- [x] Estados de loading/erro
- [x] Sincronização de estado
- [x] Recarga automática após criar tarefa
- [ ] **Backend implementado** ← próxima etapa

---

## 🚀 Próxima Etapa: Backend

**Ordem sugerida:**
1. Criar modelos TypeScript (`src/models/index.ts`)
2. Criar validadores (`src/validators/tasks.ts`)
3. Criar endpoint de upload (`src/routes/uploads.ts`)
4. Criar rotas de tasks (`src/routes/tasks.ts`)
5. Registrar router em `src/routes/index.ts`
6. Testar endpoints com Postman/Insomnia
7. Validar integração end-to-end com frontend
