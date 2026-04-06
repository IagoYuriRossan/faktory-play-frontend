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
