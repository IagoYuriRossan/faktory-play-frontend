export interface OptionDTO {
  id: string;
  text: string;
}

export type QuestionType = 'single_choice' | 'multiple_choice' | 'open';

export interface QuestionDTO {
  id: string;
  questionnaireId: string;
  type: QuestionType;
  text: string;
  points?: number;
  options?: OptionDTO[]; // for choice questions
}

export interface QuestionnaireSummary {
  id: string;
  projectId: string;
  moduleId?: string | null;
  title: string;
  description?: string;
}

export interface QuestionnaireProgress {
  questionnaireId: string;
  title: string;
  completedByUser: boolean;
  userScore?: number | null;
  maxScore?: number | null;
}

export interface ModuleProgress {
  moduleId: string;
  title: string;
  order?: number;
  totalQuestionnaires: number;
  completedByUserCount?: number; // aggregated across users
  completionRate?: number; // 0-1
  avgScore?: number | null;
  questionnaires: QuestionnaireProgress[];
}

export interface ProjectProgressResponse {
  projectId: string;
  totalQuestionnaires: number;
  modules: ModuleProgress[];
}

export interface AttemptAnswerDTO {
  questionId: string;
  selectedOptionIds?: string[];
  textAnswer?: string;
}
