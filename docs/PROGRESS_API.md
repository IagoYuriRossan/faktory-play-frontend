## API de Progresso — Especificação

Objetivo: contrato para gravação e leitura de progresso de usuários por trilha, com granularidade (lições/subetapas/tarefas) e documento resumo para dashboards.

1) Modelos principais (Firestore-style)

- `users/{uid}/trails/{trailId}` (documento resumo)
  - Campos: `userId`, `trailId`, `companyId?`, `progress` (number 0-100), `completedLessonsCount` (number), `totalLessons` (number), `completedModulesCount` (number), `lastAccess` (timestamp), `updatedAt` (timestamp), `completedLessonsPreview` (string[])

- `users/{uid}/trails/{trailId}/lessons/{lessonId}` (subcoleção granular)
  - Campos: `lessonId`, `completed` (boolean), `completedAt?` (timestamp), `type?` ('etapa'|'subetapa'), `lastViewedAt?`, `tasks?` (map)

- `attempts/{attemptId}` (coleção auditável)
  - Campos: `attemptId`, `userId`, `questionnaireId`, `projectId?`, `score`, `maxScore`, `status`, `createdAt`

---

2) Endpoints propostos

a) Marcar/atualizar lição (idempotente)

- Method: `PUT`
- Path: `/api/users/:uid/trails/:trailId/lessons/:lessonId`
- Body (exemplo):

```
{
  "completed": true,
  "source": "ui|player|auto|quiz",
  "lastViewedAt": "2026-04-29T12:34:56.000Z",
  "moduleId": "module-123",
  "meta": { "duration": 120 }
}
```
- Behavior:
  - Gravar documento `users/{uid}/trails/{trailId}/lessons/{lessonId}` com `completed` e `completedAt` quando true.
  - Atualizar resumo `users/{uid}/trails/{trailId}` de forma idempotente (transação ou via trigger).
  - Resposta: `{ "success": true, "updatedSummary": { ... } }`

b) Marcar subetapa (alternativa compatível)

- Method: `PUT`
- Path: `/api/users/:uid/trails/:trailId/lessons/:parentLessonId/subetapas/:subId`
- Body e comportamento: mesmo padrão do endpoint (a). Pode ser mapeado internamente para o documento da subetapa.

c) Marcar tarefa/quiz (score)

- Method: `PUT`
- Path: `/api/users/:uid/trails/:trailId/lessons/:lessonId/tasks/:taskId`
- Body (exemplo):

```
{ "completed": true, "score": 85, "source": "quiz", "meta": { "attemptId": "a1" } }
```

d) Buscar progresso granular (player)

- Method: `GET`
- Path: `/api/users/:uid/progress/trail/:trailId`
- Response (exemplo):

```
{
  "etapas": [{ "id":"l1","completed":true,"completedAt":"..." }],
  "subetapas": [...],
  "tasks": [...]
}
```

e) Buscar resumo de enrollments (dashboard do usuário)

- Method: `GET`
- Path: `/api/users/:uid/progress`
- Response: array de documentos resumo equivalentes a `users/{uid}/trails`.

f) Agregados por empresa (admin)

- Method: `GET`
- Path: `/api/companies/:companyId/trails/:trailId/progress`
- Response: `{ averageProgress, completedRate, userCount }` (cache 60s recomendado)

---

3) Regras e segurança

- Autenticação: token Firebase/OAuth em `Authorization: Bearer <token>`.
- Autorização:
  - Usuário pode alterar apenas seus próprios `users/:uid/...`.
  - `company_admin` pode alterar usuários da mesma company; `superadmin` pode alterar todos.
- Validação: aceitar apenas campos conhecidos; `completed` boolean obrigatório quando relevante.
- Idempotência: operações `PUT` devem ser idempotentes. Incrementar contadores apenas quando `completed` mudar de `false` → `true`.

---

4) Triggers / processamento assíncrono

- Trigger onWrite em `users/{uid}/trails/{trailId}/lessons/{lessonId}`:
  - Atualiza resumo `users/{uid}/trails/{trailId}` (idempotente).
  - Publica evento `progress.updated` com payload `{ userId, trailId, lessonId, delta }`.
- Job/CF para `companies/{companyId}/trails/{trailId}/stats` (cron ou acionado por eventos) para calcular média e contagens.
- Export periódico para BigQuery para relatórios históricos.

---

5) Contratos de teste / Checklist de aceitação

- Idempotência: chamada dupla de `PUT` com `completed:true` não aumenta `completedLessonsCount` duas vezes.
- Integração: marcar lição atualiza o documento resumo com `progress` correto.
- Segurança: usuário A não pode alterar usuário B.
- Observability: logs e métricas para cada trigger e erro de gravação.

---

6) Migração / compatibilidade

- Se o sistema atual usa outros paths (ex.: `/api/users/:uid/progress/:lessonId`), manter um adaptador temporário que escreva no novo esquema e retorne o contrato antigo, para transição sem downtime.
- Incluir script de migração para converter `userTrails` e `users/:uid/progress` para o novo layout de `users/{uid}/trails/{trailId}` + subcoleções `lessons`.

---

7) Entregáveis esperados do backend (retorno ao frontend)

- Lista de rotas implementadas (método + path) e exemplos de request/response.
- Descrição de triggers/CF implementadas e suas responsabilidades.
- Testes automatizados e instruções para rodar.
- Plano de migração executado (ou pendente) e scripts usados.
- Observability: onde verificar logs/metricas (links ou instruções).

---

Se quiser, o próximo passo que faço é atualizar `src/pages/aluno/AulaPlayer.tsx` para alinhar exemplos de request/response no README ou adicionar exemplos de Postman/OpenAPI no repo. Posso gerar agora um arquivo [docs/PROGRESS_API.md](docs/PROGRESS_API.md) (este arquivo) e uma collection Postman simples — qual prefere primeiro?
