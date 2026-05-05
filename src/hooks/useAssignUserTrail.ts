import { useState } from 'react';
import { api } from '../utils/api';

function wait(ms: number) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

async function retry<T>(fn: () => Promise<T>, attempts = 5, initialDelay = 500, label = ''): Promise<T> {
  let attempt = 0;
  let delay = initialDelay;
  while (true) {
    try {
      if (attempt > 0) console.debug(`[retry] ${label} attempt #${attempt + 1}`);
      return await fn();
    } catch (err: any) {
      attempt++;
      const shouldRetry = attempt < attempts;
      console.debug(`[retry] ${label} failed attempt #${attempt}:`, err?.message || err, `willRetry=${shouldRetry}`);
      if (!shouldRetry) throw err;
      // exponential backoff with jitter
      const jitter = Math.floor(Math.random() * 200);
      const waitMs = delay + jitter;
      console.debug(`[retry] ${label} waiting ${waitMs}ms before next attempt`);
      await wait(waitMs);
      delay *= 2;
    }
  }
}

export default function useAssignUserTrail(opts?: { attempts?: number; initialDelay?: number }) {
  const [loading, setLoading] = useState(false);
  const attempts = opts?.attempts ?? 5;
  const initialDelay = opts?.initialDelay ?? 500;

  async function assign(companyId: string, uid: string, trailId: string, _op?: { title?: string; description?: string; startedAt?: string; source?: string; initialProgress?: any }) {
    setLoading(true);
    try {
      console.debug('[assign] matriculando usuário em trilha', { companyId, uid, trailId });
      const res = await retry(
        () => api.post(`/api/companies/${companyId}/users/${uid}/trails`, { trailId }),
        attempts,
        initialDelay,
        `assign ${uid}:${trailId}`
      );
      console.debug('[assign] success', { uid, trailId });
      return res;
    } finally {
      setLoading(false);
    }
  }

  async function unassign(companyId: string, uid: string, trailId: string) {
    setLoading(true);
    try {
      console.debug('[unassign] starting unassign', { companyId, uid, trailId });
      await retry(() => api.delete(`/api/companies/${companyId}/users/${uid}/trails/${trailId}`), attempts, initialDelay, `unassign ${uid}:${trailId}`);
      console.debug('[unassign] success', { companyId, uid, trailId });
      return true;
    } finally {
      setLoading(false);
    }
  }

  return { assign, unassign, loading };
}
