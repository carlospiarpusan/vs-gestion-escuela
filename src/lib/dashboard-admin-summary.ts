import type { PlatformSchoolOverview } from "@/lib/platform-school-overviews";

export interface AdminDashboardStats {
  alumnos: number;
  cursosNuevosMes: number;
  clasesHoy: number;
  examenesPendientes: number;
  ingresosMes: number;
  lineasMesMoto: number;
  lineasMesCarro: number;
  lineasMesCombos: number;
  lineasMesSinCategoria: number;
  practicaAdicionalMes: number;
  evaluacionesAptitudMes: number;
}

export interface AdminDashboardComparativeStats {
  cursosNuevosMes: number;
  ingresosMes: number;
  practicaAdicionalMes: number;
  evaluacionesAptitudMes: number;
}

export interface AdminDashboardDailyIngresoPoint {
  date: number;
  monto: number;
}

export interface AdminDashboardSummaryResponse {
  stats: AdminDashboardStats;
  comparisonStats: AdminDashboardComparativeStats;
  dailyIngresos: AdminDashboardDailyIngresoPoint[];
}

export interface SuperAdminDashboardStats {
  escuelas: number;
  escuelasActivas: number;
  sedesActivas: number;
  adminsEscuela: number;
  alumnos: number;
  alumnosMes: number;
  ingresosMes: number;
}

export type SuperAdminSchoolOverview = PlatformSchoolOverview;

export interface SuperAdminDashboardResponse {
  stats: SuperAdminDashboardStats;
  schoolOverviews: SuperAdminSchoolOverview[];
}

export interface AlumnoDashboardStudent {
  id: string;
  nombre: string;
  apellidos: string;
  dni: string;
  email: string | null;
  estado: string;
  valor_total: number | null;
}

export interface AlumnoDashboardMatricula {
  id: string;
  numero_contrato: string | null;
  categorias: string[];
  valor_total: number | null;
  fecha_inscripcion: string | null;
  estado: "activo" | "cerrado" | "cancelado";
}

export interface AlumnoDashboardIngreso {
  id: string;
  matricula_id: string | null;
  concepto: string;
  monto: number;
  metodo_pago: string;
  fecha: string;
  estado: string;
  categoria: string;
}

export interface AlumnoDashboardExamen {
  id: string;
  tipo: "teorico" | "practico";
  fecha: string;
  hora: string | null;
  resultado: "pendiente" | "aprobado" | "suspendido";
  intentos: number;
  notas: string | null;
  total_respuestas: number;
  respuestas_correctas: number;
}

export interface AlumnoDashboardResponse {
  alumno: AlumnoDashboardStudent | null;
  matriculas: AlumnoDashboardMatricula[];
  ingresos: AlumnoDashboardIngreso[];
  examenes: AlumnoDashboardExamen[];
}

export type DashboardMonthRange = {
  start: string;
  end: string;
  label: string;
};

export const DASHBOARD_TIME_ZONE = "America/Bogota";
export const DASHBOARD_SUMMARY_CACHE_TTL_MS = 45 * 1000;
export const DASHBOARD_CATALOG_CACHE_TTL_MS = 60 * 1000;

function formatDateOnly(year: number, month: number, day: number) {
  return `${String(year).padStart(4, "0")}-${String(month).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
}

function getTimeZoneDateParts(date: Date, timeZone: string) {
  const formatter = new Intl.DateTimeFormat("en-CA", {
    timeZone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  });

  const parts = formatter.formatToParts(date);
  const year = Number(parts.find((part) => part.type === "year")?.value ?? 0);
  const month = Number(parts.find((part) => part.type === "month")?.value ?? 0);
  const day = Number(parts.find((part) => part.type === "day")?.value ?? 0);

  return { year, month, day };
}

function formatMonthLabel(year: number, month: number, timeZone: string) {
  return new Intl.DateTimeFormat("es-CO", {
    timeZone,
    month: "long",
    year: "numeric",
  }).format(new Date(Date.UTC(year, month - 1, 1, 12, 0, 0)));
}

export function getDashboardToday(now = new Date(), timeZone = DASHBOARD_TIME_ZONE) {
  const { year, month, day } = getTimeZoneDateParts(now, timeZone);
  return formatDateOnly(year, month, day);
}

export function getDashboardMonthRange(
  offset: number,
  now = new Date(),
  timeZone = DASHBOARD_TIME_ZONE
): DashboardMonthRange {
  const { year, month } = getTimeZoneDateParts(now, timeZone);
  const absoluteMonth = year * 12 + (month - 1) + offset;
  const startYear = Math.floor(absoluteMonth / 12);
  const startMonth = (absoluteMonth % 12) + 1;
  const endAbsoluteMonth = absoluteMonth + 1;
  const endYear = Math.floor(endAbsoluteMonth / 12);
  const endMonth = (endAbsoluteMonth % 12) + 1;

  return {
    start: formatDateOnly(startYear, startMonth, 1),
    end: formatDateOnly(endYear, endMonth, 1),
    label: formatMonthLabel(startYear, startMonth, timeZone),
  };
}

export function createEmptyAdminDashboardSummary(): AdminDashboardSummaryResponse {
  return {
    stats: {
      alumnos: 0,
      cursosNuevosMes: 0,
      clasesHoy: 0,
      examenesPendientes: 0,
      ingresosMes: 0,
      lineasMesMoto: 0,
      lineasMesCarro: 0,
      lineasMesCombos: 0,
      lineasMesSinCategoria: 0,
      practicaAdicionalMes: 0,
      evaluacionesAptitudMes: 0,
    },
    comparisonStats: {
      cursosNuevosMes: 0,
      ingresosMes: 0,
      practicaAdicionalMes: 0,
      evaluacionesAptitudMes: 0,
    },
    dailyIngresos: [],
  };
}

export function createEmptySuperAdminDashboardSummary(): SuperAdminDashboardResponse {
  return {
    stats: {
      escuelas: 0,
      escuelasActivas: 0,
      sedesActivas: 0,
      adminsEscuela: 0,
      alumnos: 0,
      alumnosMes: 0,
      ingresosMes: 0,
    },
    schoolOverviews: [],
  };
}

export function createEmptyAlumnoDashboardSummary(): AlumnoDashboardResponse {
  return {
    alumno: null,
    matriculas: [],
    ingresos: [],
    examenes: [],
  };
}

export function buildDashboardSummaryCacheKey(
  kind: "admin" | "superadmin" | "alumno",
  scope: {
    id?: string | null;
    rol?: string | null;
    escuela_id?: string | null;
    sede_id?: string | null;
  }
) {
  return `dashboard-summary:${kind}:${scope.id || "anon"}:${scope.rol || "unknown"}:${scope.escuela_id || "global"}:${scope.sede_id || "all"}`;
}
