import { auth } from './firebase';

const BASE_URL = import.meta.env.VITE_API_URL || 'http://127.0.0.1:3001';

const STATUS_MESSAGES: Record<number, string> = {
  400: 'Requisição inválida (400)',
  401: 'Não autenticado — token ausente ou expirado (401)',
  403: 'Acesso negado — sem permissão para este recurso (403)',
  404: 'Recurso não encontrado (404)',
  409: 'Conflito — recurso já existe (409)',
  422: 'Dados inválidos enviados ao servidor (422)',
  500: 'Erro interno do servidor (500) — verifique os logs do backend',
  502: 'Backend indisponível (502)',
  503: 'Serviço indisponível (503)',
};

export class ApiError extends Error {
  status: number;
  path: string;
  serverMessage?: string;

  constructor(status: number, path: string, serverMessage?: string) {
    const base = STATUS_MESSAGES[status] || `Erro HTTP ${status}`;
    const detail = serverMessage ? ` — ${serverMessage}` : '';
    super(`[API] ${path} → ${base}${detail}`);
    this.name = 'ApiError';
    this.status = status;
    this.path = path;
    this.serverMessage = serverMessage;
  }
}

async function getToken(): Promise<string> {
  const user = auth.currentUser;
  if (!user) throw new ApiError(401, 'getToken', 'Usuário não está logado');
  return user.getIdToken();
}

async function request<T>(method: string, path: string, body?: unknown): Promise<T> {
  const token = await getToken();

  let res: Response;
  try {
    res = await fetch(`${BASE_URL}${path}`, {
      method,
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`,
      },
      body: body !== undefined ? JSON.stringify(body) : undefined,
    });
  } catch (networkErr) {
    const msg = `Não foi possível conectar ao backend em ${BASE_URL}. Verifique se ele está rodando.`;
    console.error(`[API] ${method} ${path} → Erro de rede:`, msg);
    throw new ApiError(0, path, msg);
  }

  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    const serverMessage = err.message || err.error || undefined;
    const apiError = new ApiError(res.status, `${method} ${path}`, serverMessage);
    console.error(apiError.message, err);
    throw apiError;
  }

  return res.json();
}

export const api = {
  get: <T>(path: string) => request<T>('GET', path),
  post: <T>(path: string, body: unknown) => request<T>('POST', path, body),
  put: <T>(path: string, body: unknown) => request<T>('PUT', path, body),
  delete: <T>(path: string) => request<T>('DELETE', path),
};
