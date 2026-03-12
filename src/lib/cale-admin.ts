import type { CategoriaExamen, PreguntaExamen } from "@/types/database";

export type CaleAnalyticsGranularity = "day" | "month";

export type CaleAnalyticsSummary = {
  totalAttempts: number;
  uniqueStudents: number;
  approvedAttempts: number;
  failedAttempts: number;
  passRate: number;
  averageScore: number;
  averageTimeSeconds: number;
  lastAttemptAt: string | null;
  trackedQuestions: number;
};

export type CaleAnalyticsTrendPoint = {
  bucket: string;
  label: string;
  attempts: number;
  passRate: number;
  averageScore: number;
};

export type CaleAnalyticsDistributionRow = {
  label: string;
  count: number;
};

export type CaleAnalyticsCategoryRow = {
  name: string;
  totalSeen: number;
  wrongCount: number;
  omittedCount: number;
  accuracy: number;
};

export type CaleAnalyticsQuestionRow = {
  preguntaId: string | null;
  codigoExterno: string | null;
  categoriaNombre: string;
  pregunta: string;
  totalSeen: number;
  wrongCount: number;
  omittedCount: number;
  errorRate: number;
  lastSeenAt: string | null;
};

export type CaleAnalyticsStudentRow = {
  alumnoId: string;
  alumnoNombre: string;
  attempts: number;
  averageScore: number;
  lastScore: number;
  approvedAttempts: number;
  failedAttempts: number;
  recentFailures: number;
  lastAttemptAt: string | null;
};

export type CaleAnalyticsAttemptRow = {
  id: string;
  alumnoId: string;
  alumnoNombre: string;
  resultado: string;
  porcentaje: number;
  totalPreguntas: number;
  respuestasCorrectas: number;
  tiempoSegundos: number;
  fechaPresentacion: string | null;
};

export type CaleAdminAnalyticsResponse = {
  period: {
    year: string;
    month: string;
    from: string | null;
    to: string | null;
    granularity: CaleAnalyticsGranularity;
  };
  summary: CaleAnalyticsSummary;
  trend: CaleAnalyticsTrendPoint[];
  distribution: CaleAnalyticsDistributionRow[];
  categories: CaleAnalyticsCategoryRow[];
  toughestQuestions: CaleAnalyticsQuestionRow[];
  studentsToCoach: CaleAnalyticsStudentRow[];
  recentAttempts: CaleAnalyticsAttemptRow[];
};

export type CaleBankCategorySummary = CategoriaExamen & {
  questionCount: number;
  activeCount: number;
};

export type CaleBankStats = {
  total: number;
  active: number;
  inactive: number;
  withImage: number;
  withLegalBasis: number;
  facil: number;
  media: number;
  dificil: number;
  updatedAt: string | null;
};

export type CaleBankQuestionRow = PreguntaExamen & {
  categoria_nombre: string | null;
};

export type CaleBankAdminResponse = {
  stats: CaleBankStats;
  categories: CaleBankCategorySummary[];
  questions: CaleBankQuestionRow[];
  total: number;
  page: number;
  pageSize: number;
  canEdit: boolean;
};

export type CaleQuestionMutationInput = {
  categoria_id: string;
  pregunta: string;
  imagen_url: string;
  opcion_a: string;
  opcion_b: string;
  opcion_c: string;
  opcion_d: string;
  respuesta_correcta: "a" | "b" | "c" | "d";
  explicacion: string;
  fundamento_legal: string;
  tipo_permiso: string;
  dificultad: "facil" | "media" | "dificil";
  activa: boolean;
  codigo_externo: string;
};

export function normalizeCaleQuestionPrompt(value: string) {
  const trimmed = value.trim();
  if (!trimmed) return trimmed;
  if (trimmed.endsWith("?")) return trimmed;
  return `${trimmed.replace(/[.:;!]+$/, "")}?`;
}

export function buildManualCaleQuestionCode() {
  return `CALE-MANUAL-${Date.now().toString(36).toUpperCase()}`;
}
