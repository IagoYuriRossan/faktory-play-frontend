# Fluxo de Upload (presigned) — Resumo para o Frontend

**Autenticação**
- Enviar header `Authorization: Bearer <TOKEN>` em todas as chamadas abaixo.

**Limites**
- Uploads de imagem validados pelo backend — máximo de 5MB; contentType permitido (ex.: `image/jpeg`).

## Fluxo recomendado (presigned)

### Passo 1 — Solicitar URL de upload (presign)
- Endpoint (lesson): `POST /api/trails/:trailId/modules/:moduleId/lessons/:lessonId/image/presign`
- Body JSON: `{"contentType":"image/jpeg","size":12345}`
- Resposta: `{"uploadUrl":"...","filePath":"trails/.../image","expiresAt":"ISO"}`
- Erros: `400` (tipo inválido), `413` (tamanho > 5MB)

### Passo 2 — Fazer upload direto ao storage (PUT)
- Use a `uploadUrl` retornada com `PUT`. Enviar o mesmo `Content-Type` usado no presign.
- A URL expira em ~15 minutos; faça o upload antes de expirar.

Exemplo (curl):

```
curl -X PUT "<uploadUrl>" \
  -H "Content-Type: image/jpeg" \
  --data-binary "@/caminho/para/imagem.jpg"
```

### Passo 3 — Confirmar e persistir a URL no backend (confirm)
- Endpoint (lesson): `POST /api/trails/:trailId/modules/:moduleId/lessons/:lessonId/image/confirm`
- Body JSON: `{"filePath":"trails/.../image"}`
- Resposta: `{"imageUrl":"https://storage.googleapis.com/..."}` (URL pública persistida no documento da lesson)
- Observações: o backend valida que `filePath` corresponde ao caminho esperado e que o arquivo existe no storage. Após confirmação, o backend aplica `cache-control: public, max-age=31536000` e torna o arquivo público.

## Rotas equivalentes
- Steps: `POST /api/trails/:id/modules/:moduleId/steps/:stepId/image/presign` e `/confirm`
- Substeps: `POST /api/trails/:id/modules/:moduleId/steps/:stepId/substeps/:substepId/image/presign` e `/confirm`

## Validações importantes
- Backend valida `contentType` e `size` antes de gerar a URL assinada.
- `uploadUrl` expira em ~15 minutos — faça o upload antes de expirar.
- No `/confirm`, backend verifica existência e caminho do arquivo.
- Após confirmação, arquivo é tornado público com cache longo; se a organização não permitir objetos públicos, podemos trocar para signed read URLs — peça para ajustar se necessário.

## Curl completo (exemplo)

1) Presign:

```
curl -X POST "https://seu-backend/api/trails/TRAIL_ID/modules/MOD_ID/lessons/LESSON_ID/image/presign" \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"contentType":"image/jpeg","size":12345}'
```

2) Upload (usar `uploadUrl` retornada):

```
curl -X PUT "<uploadUrl>" -H "Content-Type: image/jpeg" --data-binary "@/caminho/para/imagem.jpg"
```

3) Confirm:

```
curl -X POST "https://seu-backend/api/trails/TRAIL_ID/modules/MOD_ID/lessons/LESSON_ID/image/confirm" \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"filePath":"trails/TRAIL_ID/modules/MOD_ID/lessons/LESSON_ID/image"}'
```
