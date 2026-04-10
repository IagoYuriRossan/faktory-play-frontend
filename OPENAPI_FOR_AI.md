OPENAPI — instruções para o agente AI (frontend)

Resumo rápido
- Spec (OpenAPI 3.0.1) disponível aqui (raw):
  https://raw.githubusercontent.com/IagoYuriRossan/faktory-play-frontend/main/openapi.json
- Use esse JSON para descobrir rotas, parâmetros, e exemplos de payloads.

Autenticação
- Todas as rotas protegidas usam `Authorization: Bearer <ID_TOKEN>` (JWT do Firebase).
- Incluir header exatamente como: `Authorization: Bearer <token>`.

Endpoints importantes (prioridade para o agente)
1. GET /api/trails
   - Lista trilhas permitidas ao usuário autenticado.
   - Autorização: qualquer usuário autenticado.
2. GET /api/trails/{id}
   - Buscar trilha por id (suporta docId ou campo `id`).
   - Autorização: usuário com permissão na trilha.
3. GET /api/companies/{id}/trails-with-users
   - Retorna trilhas da empresa + usuários com `userTrail` (fallback `not_started` quando não houver progresso consolidado).
   - Autorização: `company_admin` ou `superadmin`.
4. GET /api/companies/{id}/report
   - Relatório consolidado por empresa (mais detalhado que `trails-with-users`).
   - Autorização: `company_admin` ou `superadmin`.
5. GET /api/users
   - Lista usuários (superadmin vê todos; company_admin só da própria empresa).
6. GET /api/users/{uid}/trails
   - Progresso consolidado de um usuário (útil para o painel do aluno).

Notas de implementação para o agente AI (frontend)
- Permissões: um `student` pode receber trilhas via `user.allowedTrails` ou via `company.allowedTrails`.
- `userTrails` pode não existir para usuários recém-criados: o backend agora retorna entradas padrão com `status: not_started` e `totalProgress: 0` quando não há documento consolidado.
- Para listar trilhas visíveis a um usuário, priorize `/api/trails` (é o endpoint do usuário). Use `/api/companies/{id}/trails-with-users` apenas quando for necessário relatório por empresa (e você tiver credenciais de admin).
- Evite chamadas muito frequentes (cache local recomendado); backend aplica rate-limits em produção.

Exemplos
- Buscar trilhas (curl):

```bash
curl -H "Authorization: Bearer $ID_TOKEN" \
  https://api.example.com/api/trails
```

- Obter trilhas com usuários (company_admin):

```bash
curl -H "Authorization: Bearer $ID_TOKEN" \
  https://api.example.com/api/companies/ksycKHYYCEmOI49OVl8x/trails-with-users
```

Resposta exemplo (resumida):

{
  "companyId": "ksycKHYYCEmOI49OVl8x",
  "trails": [
    {
      "trailId": "UVbi7glDGiJPKjYtV1vg",
      "title": "Faktory One - Implantação",
      "durationMonths": 3,
      "users": [
        { "uid": "lVrswF4A1zMtN40aJKAdk5z4kn53", "name": "UserTest Fak", "userTrail": { "status": "not_started", "totalProgress": 0 } }
      ]
    }
  ]
}

Boas práticas
- Carregue `openapi.json` (raw) e gere automaticamente as chamadas/validações no frontend para que o agente AI compreenda tipos e exemplos.
- Use caches e backoff exponencial ao encontrar rate-limit.
- Para ações administrativas (criar trilha, atualizar allowedTrails), confirme permissões antes de enviar requests.

Contato
- Se algo faltar na spec (ex.: exemplos mais ricos), atualize `openapi.json` no backend e solicite novo merge.
