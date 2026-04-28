export type UserRole = 'superadmin' | 'company_admin' | 'student';

export interface User {
  id: string;
  name: string;
  email: string;
  role: UserRole;
  companyId?: string;
}

export interface Company {
  id: string;
  name: string;
  cnpj: string;
  cep: string;
  address: string;
  number: string;
  complement?: string;
  city: string;
  uf: string;
  ownerUserId?: string;
  allowedTrails: string[]; // Trail IDs
}

export interface Quiz {
  id: string;
  question: string;
  options: string[];
  correctIndex: number;
}

// ── Novo modelo (pós-migração backend) ──────────────────────────────────────

export interface Component {
  id: string;
  type: 'text' | 'image' | 'video' | 'iframe' | 'quiz' | 'logo';
  payload: Record<string, any>;
  order?: number;
}

export interface Subetapa {
  id: string;
  title?: string;
  components?: Component[];
  imageUrl?: string;
  videoUrl?: string;
  videoOptions?: {
    autoplay?: boolean;
    loop?: boolean;
    controls?: boolean;
    subtitlesUrl?: string;
  };
}

export interface Etapa {
  id: string;
  title?: string;
  components?: Component[];
  subetapas?: Subetapa[];
  imageUrl?: string;
  videoUrl?: string;
  videoOptions?: {
    autoplay?: boolean;
    loop?: boolean;
    controls?: boolean;
    subtitlesUrl?: string;
  };
}

export interface Module {
  id: string;
  title: string;
  description?: string;
  etapas?: Etapa[];
  submodules?: Module[];
}

export interface Trail {
  id: string;
  title: string;
  description?: string;
  durationMonths?: number;
  moduleCount?: number;
  modules: Module[];
}

// ── Alias legado (será removido após migração completa do JSX) ──
/** @deprecated Use Etapa */
export type Lesson = Etapa & {
  /** @deprecated Use components[] com type='text' */
  content?: string;
  /** @deprecated Use components[] com type='video' */
  videoUrl?: string;
  videoPosition?: 'title-top' | 'top' | 'bottom';
  videoOptions?: {
    subtitlesUrl?: string;
    autoplay?: boolean;
    loop?: boolean;
    controls?: boolean;
  };
  questionnaireId?: string;
  imageOptions?: { size?: 'small' | 'medium' | 'full' };
  quiz?: Quiz;
  /** @deprecated Use Etapa.subetapas */
  sublessons?: Lesson[];
  /** @deprecated mapped from Etapa.subetapas */
  lessons?: Lesson[];
};

/** Shape retornado por GET /api/trails (listagem — sem módulos/aulas). */
export interface TrailSummary {
  id: string;
  title: string;
  description: string;
  imageUrl?: string;
  durationMonths?: number;
  moduleCount: number;
}

export interface Project {
  id: string;
  ownerUid: string;
  title: string;
  description?: string;
  startAt?: string;
  dueAt?: string;
  templateId?: string;
  metadata?: Record<string, any>;
  status?: 'active' | 'inactive';
  createdAt?: string;
}

export interface Enrollment {
  id: string;
  userId: string;
  trailId: string;
  progress: number; // 0 to 100
  completedLessons: string[]; // Lesson IDs
  status: 'completed' | 'in-progress' | 'not-started';
  lastAccess: string;
}

// ── Gestão de Projetos ──────────────────────────────────────────────────────

export type UserTrailStatus = 'not_started' | 'in_progress' | 'completed' | 'overdue';

/** Progresso de um usuário em uma trilha (doc userTrails/{uid}_{trailId}) */
export interface UserTrail {
  status: UserTrailStatus;
  /** 0–100 */
  totalProgress: number;
  lastAccess: string | null;       // ISO 8601
  startedAt: string | null;        // ISO 8601
  completedAt: string | null;      // ISO 8601
  currentModuleId: string | null;
  currentLessonId: string | null;  // pendente de lookup separado no backend
}

/** Usuário com dados de progresso, retornado em trails-with-users */
export interface TrailUser {
  id: string;
  name: string;
  email: string;
  avatarUrl: string | null;
  userTrail: UserTrail;
}

/** Trilha com usuários — retornada por GET /api/companies/:id/trails-with-users */
export interface TrailWithUsers {
  id: string;
  title: string;
  /** calculado como durationMonths * 30 * 24 * 60, ou campo direto do Firestore */
  estimatedDurationMinutes: number;
  modulesCount: number;
  /** média de totalProgress de todos os usuários da trilha (0–100) */
  averageProgress: number;
  /** total de usuários na trilha (pode vir null se não calculado pelo backend) */
  usersCount: number | null;
  users: TrailUser[];
  /** cursor de paginação — null indica que não há mais páginas */
  usersCursor: string | null;
}

/** Resposta de GET /api/companies/:id/trails-with-users
 *  Query params suportados: ?usersLimit={N}&usersCursor={cursor}
 */
export interface CompanyTrailsWithUsersResponse {
  companyId: string;
  trails: TrailWithUsers[];
}

/** Resposta de GET /api/companies/:id/trails-users-counts */
export interface TrailsUsersCountsResponse {
  companyId: string;
  counts: Array<{ trailId: string; count: number }>;
}

// ── Report ──────────────────────────────────────────────────────────────────

/** Usuário dentro do relatório por trilha */
export interface ReportTrailUser {
  id: string;
  name: string;
  email: string;
  status: UserTrailStatus;
  /** 0–100 */
  totalProgress: number;
  startedAt: string | null;    // ISO 8601
  completedAt: string | null;  // ISO 8601
  currentModule: { id: string; title: string } | null;
}

/** Contagens agregadas por status para uma trilha */
export interface TrailStatusCounts {
  notStarted: number;
  inProgress: number;
  completed: number;
  overdue: number;
}

/** Trilha dentro do relatório da empresa */
export interface ReportTrail {
  id: string;
  title: string;
  /** média de totalProgress (0–100) */
  avgProgress: number;
  counts: TrailStatusCounts;
  users: ReportTrailUser[];
}

/** Resposta de GET /api/companies/:id/report */
export interface CompanyReportResponse {
  companyId: string;
  /** min(startedAt) de todos os usuários em todas as trilhas */
  projectStartDate: string | null;   // ISO 8601
  /** max(completedAt) de todos os usuários em todas as trilhas */
  projectEndDate: string | null;     // ISO 8601
  trails: ReportTrail[];
}

// ── Relatório de progresso por trilha (users-report) ────────────────────────

/** Progresso de um usuário em um módulo específico */
export interface ModuleProgressEntry {
  moduleId: string;
  title: string;
  /** 0–100 — % de etapas concluídas neste módulo */
  progress: number;
  completedLessons: number;
  totalLessons: number;
}

/** Progresso completo de um usuário em uma trilha */
export interface UserTrailReport {
  userId: string;
  name: string;
  email: string;
  /** ISO 8601 — quando iniciou a trilha */
  startedAt: string | null;
  /** ISO 8601 — último acesso */
  lastAccess: string | null;
  /** ISO 8601 — quando concluiu (null se ainda não concluiu) */
  completedAt: string | null;
  status: UserTrailStatus;
  /** 0–100 — progresso total da trilha */
  totalProgress: number;
  moduleProgress: ModuleProgressEntry[];
}

/** Resposta de GET /api/companies/:companyId/trails/:trailId/users-report */
export interface UsersReportResponse {
  companyId: string;
  trailId: string;
  trailTitle: string;
  /** ISO 8601 — momento em que o relatório foi gerado */
  generatedAt: string;
  users: UserTrailReport[];
}
