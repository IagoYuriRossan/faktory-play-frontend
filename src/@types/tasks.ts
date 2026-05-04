// ── Sistema de Tarefas ────────────────────────────────────────────────────────

export type TaskType = 'questionnaire' | 'signature' | 'image_upload';

export type TaskStatus = 'pending' | 'completed' | 'failed';

/** Configuração específica por tipo de tarefa */
export interface TaskConfig {
  // Questionário
  questionnaireId?: string;

  // Assinatura digital
  /** Texto/declaração que o usuário confirma que leu e entendeu */
  signatureText?: string;
  /** Se verdadeiro, o usuário precisa digitar exatamente a frase confirmada */
  requireTypedConfirmation?: boolean;
  /** Frase que o usuário deve digitar para confirmar (ex: "CONFIRMO") */
  confirmationPhrase?: string;

  // Upload de imagem/arquivo
  /** Formatos aceitos ex: ['jpg','png','pdf'] */
  acceptedFormats?: string[];
  /** Tamanho máximo em MB */
  maxSizeMB?: number;
  /** Texto instrucional exibido ao usuário */
  uploadPrompt?: string;
}

/** Tarefa vinculada a uma etapa ou subetapa */
export interface Task {
  id: string;
  type: TaskType;
  title: string;
  description?: string;
  config: TaskConfig;
  order: number;

  // Vinculação na hierarquia
  /** ID do projeto ou trilha raiz */
  projectId: string;
  moduleId: string;
  etapaId: string;
  /** Quando a tarefa está dentro de uma subetapa; null se diretamente na etapa */
  subetapaId?: string | null;

  /** Se verdadeiro, a tarefa precisa ser concluída para completar a etapa */
  isRequired: boolean;
  pointsValue?: number;

  createdBy: string;
  createdAt: string;
  updatedAt: string;
}

/** Dados de completamento específicos por tipo */
export interface TaskCompletionData {
  // Questionário
  attemptId?: string;
  score?: number;
  maxScore?: number;

  // Assinatura
  signedText?: string;

  // Upload
  uploadedFileUrl?: string;
  fileName?: string;
  fileSize?: number;
  fileMimeType?: string;
}

/** Registro de completamento de uma tarefa por um usuário */
export interface TaskCompletion {
  id: string;
  taskId: string;
  userId: string;
  status: TaskStatus;

  projectId: string;
  trailId?: string | null;
  moduleId: string;
  etapaId: string;
  subetapaId?: string | null;

  completionData?: TaskCompletionData;

  startedAt: string;
  completedAt?: string | null;
  /** Para tarefas image_upload: admin que revisou */
  reviewedBy?: string | null;
  reviewedAt?: string | null;
  /** Notas do revisor (aprovação/rejeição) */
  reviewNotes?: string | null;
}

/** Snapshot de progresso de uma tarefa para exibição ao aluno */
export interface TaskProgress {
  taskId: string;
  type: TaskType;
  title: string;
  isRequired: boolean;
  status: TaskStatus | 'not_started';
  completion?: TaskCompletion;
}

/** Payload para completar uma assinatura */
export interface SignatureCompletionPayload {
  signedText: string;
}

/** Payload para completar um upload */
export interface ImageUploadCompletionPayload {
  uploadedFileUrl: string;
  fileName: string;
  fileSize: number;
  fileMimeType?: string;
}

/** Revisão de tarefa pelo admin */
export interface TaskReviewPayload {
  status: 'completed' | 'failed';
  notes?: string;
}
