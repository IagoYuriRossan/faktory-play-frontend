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

export interface Lesson {
  id: string;
  title: string;
  videoUrl: string;
  content: string;
  quiz?: Quiz;
  videoOptions?: {
    subtitlesUrl?: string;
    autoplay?: boolean;
    loop?: boolean;
    controls?: boolean;
  };
  // position of the lesson video relative to the content/title
  videoPosition?: 'title-top' | 'top' | 'bottom';
  sublessons?: Lesson[];
}

export interface Module {
  id: string;
  title: string;
  lessons: Lesson[];
}

export interface Trail {
  id: string;
  title: string;
  description: string;
  isPublic?: boolean;
  modules: Module[];
}

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
  clientId: string;
  trailId: string;
  status: 'active' | 'inactive';
  createdAt: any;
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
