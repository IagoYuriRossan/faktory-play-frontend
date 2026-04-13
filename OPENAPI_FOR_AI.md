OPENAPI — instruções para o agente AI (frontend)

Resumo rápido
- Spec (OpenAPI 3.0.1) disponível (local): `openapi.json`
- Use esse JSON para descobrir rotas, parâmetros, e exemplos de payloads.

Autenticação
- Rotas protegidas usam `Authorization: Bearer <ID_TOKEN>` (JWT do Firebase).

Endpoints importantes
Endpoints importantes
1. `GET /api/trails` — lista trilhas permitidas ao usuário autenticado.
2. `GET /api/trails/{id}` — obtém trilha por id (docId ou campo `id`).
3. `GET /api/trails/{id}/export` — exporta JSON da trilha (download).
4. `POST /api/trails` — cria uma nova trilha (requer `company_admin` ou `superadmin`). O servidor preencherá `id`, `lastUpdatedBy` e `lastUpdatedAt`.
5. `PUT /api/trails/{id}` — atualiza ou cria (upsert) a trilha identificada por `{id}`. Se existir, retorna 200; se não existir, cria e retorna 201. O servidor seta `lastUpdatedBy` e `lastUpdatedAt`.
6. `GET /api/projects` — lista projects (admin vê todos; outros filtram por company).
7. `GET /api/users/{userId}/progress` — retorna progresso do usuário.
8. `PUT /api/users/{userId}/progress/{lessonId}` — atualiza progresso de uma aula para o usuário.
9. `GET /api/companies/{id}` — retorna dados da empresa por id.

Notas rápidas
- `userTrails` pode não existir para usuários recém-criados: backend retorna defaults `not_started` quando ausente.
- Prefira `/api/trails` para listar trilhas do usuário; use endpoints de empresa apenas com credenciais admin.

Notas sobre salvamento/upsert
- O frontend pode chamar `PUT /api/trails/{id}` com um `id` lógico (ex.: `trail-...`). O backend tentará atualizar pelo document key e também fará fallback procurando um documento cujo campo `id` seja igual ao parâmetro. Se não existir, o `PUT` criará um novo documento com a chave igual ao `id` passado.
- Campos adicionados automaticamente pelo servidor: `lastUpdatedBy` (UID do usuário que salvou) e `lastUpdatedAt` (timestamp ISO).

Exemplo (curl):
```
curl -H "Authorization: Bearer $ID_TOKEN" https://api.example.com/api/trails
```

— Fim —
