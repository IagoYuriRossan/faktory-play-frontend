OPENAPI — instruções para o agente AI (frontend)

Resumo rápido
- Spec (OpenAPI 3.0.1) disponível (local): `openapi.json`
- Use esse JSON para descobrir rotas, parâmetros, e exemplos de payloads.

Autenticação
- Rotas protegidas usam `Authorization: Bearer <ID_TOKEN>` (JWT do Firebase).

Endpoints importantes
1. `GET /api/trails` — lista trilhas permitidas ao usuário autenticado.
2. `GET /api/trails/{id}` — obtém trilha por id (docId ou campo `id`).
3. `GET /api/companies/{id}/trails-with-users` — trilhas da empresa com usuários e progresso (company_admin/superadmin).
4. `GET /api/companies/{id}/report` — relatório consolidado por empresa.

Notas rápidas
- `userTrails` pode não existir para usuários recém-criados: backend retorna defaults `not_started` quando ausente.
- Prefira `/api/trails` para listar trilhas do usuário; use endpoints de empresa apenas com credenciais admin.

Exemplo (curl):
```
curl -H "Authorization: Bearer $ID_TOKEN" https://api.example.com/api/trails
```

— Fim —
