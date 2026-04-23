import { Etapa, Subetapa, Trail, Module } from '../../../../@types';
import { api } from '../../../../utils/api';

export interface TrailMutationResponse {
  id?: string;
}

export interface PresignResponse {
  uploadUrl: string;
  filePath: string;
  expiresAt: string;
}

export interface ConfirmImageResponse {
  imageUrl: string;
}

export const trilhaBuilderApi = {
  // ── Trilhas ──
  getTrail(id: string) {
    return api.get<Trail>(`/api/trails/${id}`);
  },

  updateTrail(trailId: string, data: Trail) {
    return api.put(`/api/trails/${trailId}`, data);
  },

  createTrail(data: Partial<Trail>) {
    return api.post<TrailMutationResponse>('/api/trails', data);
  },

  deleteTrail(id: string) {
    return api.delete(`/api/trails/${id}`);
  },

  // ── Módulos ──
  createModule(trailId: string, payload: Partial<Module>) {
    return api.post<TrailMutationResponse>(`/api/trails/${trailId}/modules`, payload);
  },

  updateModule(trailId: string, moduleId: string, payload: Partial<Module>) {
    return api.put(`/api/trails/${trailId}/modules/${moduleId}`, payload);
  },

  deleteModule(trailId: string, moduleId: string) {
    return api.delete(`/api/trails/${trailId}/modules/${moduleId}`);
  },

  // ── Etapas ──
  createEtapa(trailId: string, moduleId: string, etapa: Partial<Etapa>) {
    return api.post<TrailMutationResponse>(
      `/api/trails/${trailId}/modules/${moduleId}/etapas`,
      etapa
    );
  },

  updateEtapa(trailId: string, moduleId: string, etapaId: string, data: Partial<Etapa>) {
    return api.put(
      `/api/trails/${trailId}/modules/${moduleId}/etapas/${etapaId}`,
      data
    );
  },

  deleteEtapa(trailId: string, moduleId: string, etapaId: string) {
    return api.delete(
      `/api/trails/${trailId}/modules/${moduleId}/etapas/${etapaId}`
    );
  },

  // ── Subetapas ──
  createSubetapa(trailId: string, moduleId: string, etapaId: string, subetapa: Partial<Subetapa>) {
    return api.post<TrailMutationResponse>(
      `/api/trails/${trailId}/modules/${moduleId}/etapas/${etapaId}/subetapas`,
      subetapa
    );
  },

  updateSubetapa(trailId: string, moduleId: string, etapaId: string, subetapaId: string, data: Partial<Subetapa>) {
    return api.put(
      `/api/trails/${trailId}/modules/${moduleId}/etapas/${etapaId}/subetapas/${subetapaId}`,
      data
    );
  },

  deleteSubetapa(trailId: string, moduleId: string, etapaId: string, subetapaId: string) {
    return api.delete(
      `/api/trails/${trailId}/modules/${moduleId}/etapas/${etapaId}/subetapas/${subetapaId}`
    );
  },

  // ── Upload de imagem (presigned URL via GCS) ──
  async uploadEtapaImage(
    trailId: string,
    moduleId: string,
    etapaId: string,
    file: File,
    onProgress?: (pct: number) => void
  ): Promise<string> {
    // 1. Get presigned URL
    const presign = await api.post<PresignResponse>(
      `/api/trails/${trailId}/modules/${moduleId}/etapas/${etapaId}/image/presign`,
      { contentType: file.type, size: file.size }
    );

    // 2. Upload directly to GCS
    await new Promise<void>((resolve, reject) => {
      const xhr = new XMLHttpRequest();
      xhr.open('PUT', presign.uploadUrl, true);
      xhr.setRequestHeader('Content-Type', file.type);
      if (onProgress) {
        xhr.upload.onprogress = (e) => {
          if (e.lengthComputable) onProgress(Math.round((e.loaded / e.total) * 100));
        };
      }
      xhr.onload = () => (xhr.status >= 200 && xhr.status < 300) ? resolve() : reject(new Error(`Upload failed (${xhr.status})`));
      xhr.onerror = () => reject(new Error('Upload request failed'));
      xhr.send(file);
    });

    // 3. Confirm upload
    const confirm = await api.post<ConfirmImageResponse>(
      `/api/trails/${trailId}/modules/${moduleId}/etapas/${etapaId}/image/confirm`,
      { filePath: presign.filePath }
    );

    return confirm.imageUrl;
  },
};
