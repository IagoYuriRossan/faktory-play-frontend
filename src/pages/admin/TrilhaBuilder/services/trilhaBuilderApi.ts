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

  createProject(uid: string, data: Partial<Trail>) {
    return api.post<TrailMutationResponse>(`/api/users/${uid}/projects`, {
      title: data.title,
      description: data.description,
      // outros campos como startAt, dueAt podem ser adicionados se disponíveis no trailData
    });
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

  // ── Upload de imagem (Cloudinary) ──
  async uploadEtapaImage(
    trailId: string,
    moduleId: string,
    etapaId: string,
    file: File,
    onProgress?: (pct: number) => void
  ): Promise<string> {
    const cloudName = import.meta.env.VITE_CLOUDINARY_CLOUD_NAME;
    const uploadPreset = import.meta.env.VITE_CLOUDINARY_UPLOAD_PRESET;

    if (!cloudName || !uploadPreset) {
      throw new Error('Variaveis VITE_CLOUDINARY_CLOUD_NAME e VITE_CLOUDINARY_UPLOAD_PRESET nao configuradas no .env');
    }

    const folder = `trails/${trailId}/modules/${moduleId}/etapas/${etapaId}`;
    const url = `https://api.cloudinary.com/v1_1/${cloudName}/image/upload`;

    const formData = new FormData();
    formData.append('file', file);
    formData.append('upload_preset', uploadPreset);
    formData.append('folder', folder);

    // 1. Upload unsigned para Cloudinary
    const cloudData = await new Promise<any>((resolve, reject) => {
      const xhr = new XMLHttpRequest();
      xhr.open('POST', url, true);
      if (onProgress) {
        xhr.upload.onprogress = (e) => {
          if (e.lengthComputable) onProgress(Math.round((e.loaded / e.total) * 100));
        };
      }
      xhr.onload = () => {
        if (xhr.status >= 200 && xhr.status < 300) {
          try {
            resolve(JSON.parse(xhr.responseText));
          } catch (err) {
            reject(new Error('Invalid JSON from Cloudinary'));
          }
        } else {
          let errorMsg = `Cloudinary upload failed (${xhr.status})`;
          try {
            const errObj = JSON.parse(xhr.responseText);
            if (errObj.error && errObj.error.message) {
              errorMsg = errObj.error.message;
            }
          } catch {}
          reject(new Error(errorMsg));
        }
      };
      xhr.onerror = () => reject(new Error('Upload request to Cloudinary failed'));
      xhr.send(formData);
    });

    if (!cloudData.secure_url) {
      throw new Error('Nenhuma URL segura retornada pelo Cloudinary');
    }

    // 2. Confirmar ao backend
    await api.post('/api/uploads/cloudinary/confirm', {
      target: {
        kind: 'etapa',
        trailId,
        moduleId,
        etapaId
      },
      imageUrl: cloudData.secure_url,
      publicId: cloudData.public_id,
      bytes: cloudData.bytes,
      format: cloudData.format
    });

    return { imageUrl: cloudData.secure_url, publicId: cloudData.public_id };
  },

  deleteCloudinaryImage(publicId: string, target?: { kind: 'etapa' | 'trail' | 'module'; trailId?: string; moduleId?: string; etapaId?: string }) {
    return api.delete('/api/uploads/cloudinary', { publicId, target });
  },
};
