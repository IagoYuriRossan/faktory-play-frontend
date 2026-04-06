# Faktory Play — Frontend

React + Vite + TypeScript frontend application.

## Stack

- **React 19** — UI
- **Vite 6** — bundler e dev server
- **TypeScript** — tipagem estática
- **Tailwind CSS 4** — estilização
- **React Router 7** — roteamento
- **Zustand** — gerenciamento de estado
- **Firebase** — autenticação e Firestore

## Setup

### 1. Instalar dependências

```bash
npm install
```

### 2. Configurar variáveis de ambiente

Crie o arquivo `.env` na raiz com base no `.env.example`:

```bash
cp .env.example .env
```

Preencha com as credenciais do seu projeto Firebase (encontradas no Console Firebase → Configurações do projeto → Seus apps).

### 3. Rodar em desenvolvimento

```bash
npm run dev
```

A aplicação estará disponível em `http://127.0.0.1:8081`.

### 4. Build para produção

```bash
npm run build
```

## Variáveis de Ambiente

| Variável | Descrição |
|---|---|
| `VITE_FIREBASE_API_KEY` | Firebase API Key |
| `VITE_FIREBASE_AUTH_DOMAIN` | Firebase Auth Domain |
| `VITE_FIREBASE_PROJECT_ID` | Firebase Project ID |
| `VITE_FIREBASE_STORAGE_BUCKET` | Firebase Storage Bucket |
| `VITE_FIREBASE_MESSAGING_SENDER_ID` | Firebase Messaging Sender ID |
| `VITE_FIREBASE_APP_ID` | Firebase App ID |
| `VITE_FIREBASE_DATABASE_ID` | Firestore Database ID |
| `VITE_FIREBASE_MEASUREMENT_ID` | Firebase Measurement ID (opcional) |

## Estrutura

```
src/
├── @types/          # Tipos TypeScript globais
├── components/      # Componentes reutilizáveis
├── hooks/           # Custom hooks (store, etc.)
├── mocks/           # Dados mock para desenvolvimento
├── pages/           # Páginas por layout (admin, aluno, public)
├── routes/          # Configuração de rotas
└── utils/           # Utilitários (firebase, validators, etc.)
```
