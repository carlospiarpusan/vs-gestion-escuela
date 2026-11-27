import { formatDateOnly, getTodayDateString } from "@/lib/date-utils";
import { normalizeStoredCourseCategories } from "@/lib/course-categories";
import type { SpreadsheetSheet } from "@/lib/spreadsheet-export";

export type AnalysisPeriod = { from: string; to: string };
export type AnalysisWindow = {
  year: number;
  month: number | null;
  today: string;
  current: AnalysisPeriod;
  previous: AnalysisPeriod;
  partial: boolean;
};
export type PeriodMetrics = {
  enrollments: number;
  collected: number;
  collectedCount: number;
  paidExpenses: number;
  expenseCount: number;
  pendingExpenses: number;
  cashFlow: number;
};
export type AnalysisPayload = {
  periods: Array<PeriodMetrics & { key: "current" | "previous" }>;
  monthly: Array<{ month: string; enrollments: number; collected: number; paidExpenses: number }>;
  courses: Array<{ categories: string[] | null; count: number }>;
  expenses: Array<{ category: string; current: number; previous: number; count: number }>;
  portfolio: {
    balance: number;
    obligations: number;
    overdue: number;
    withoutSchedule: number;
    aging: Array<{ bucket: string; balance: number; count: number }>;
  };
  quality: {
    students: number;
    incompleteContact: number;
    duplicateDocuments: number;
    contractsWithoutValue: number;
    regularsWithoutContract: number;
    unlinkedCollections: number;
    firstActivity: string | null;
  };
  branches: Array<{ id: string; name: string }>;
  schools?: Array<{ id: string; name: string }>;
};
export type AnalysisAlert = {
  id: string;
  tone: "attention" | "info";
  title: string;
  detail: string;
  href: string;
};
export type SchoolAnalysis = Omit<AnalysisPayload, "periods" | "courses"> & {
  generatedAt: string;
  window: AnalysisWindow;
  current: PeriodMetrics;
  previous: PeriodMetrics;
  courses: Array<{ label: string; count: number }>;
  changes: { enrollments: number | null; collected: number | null; paidExpenses: number | null };
  alerts: AnalysisAlert[];
  scope: { schoolId: string | null; branchId: string | null };
};

function lastDay(year: number, month: number) {
  return new Date(Date.UTC(year, month, 0)).getUTCDate();
}

export function buildAnalysisWindow(
  year: number,
  month: number | null,
  now = new Date()
): AnalysisWindow {
  const today = getTodayDateString(now);
  const [todayYear, todayMonth, todayDay] = today.split("-").map(Number);
  if (
    !Number.isInteger(year) ||
    year < 2000 ||
    year > todayYear ||
    (month !== null && (!Number.isInteger(month) || month < 1 || month > 12))
  )
    throw new Error("Selecciona un año y mes válidos.");
  const from = formatDateOnly(year, month ?? 1, 1);
  if (from > today) throw new Error("El período seleccionado todavía no ha comenzado.");
  const endMonth = month ?? 12;
  const end = formatDateOnly(year, endMonth, lastDay(year, endMonth));
  const partial = end >= today;
  let previousYear = year - 1;
  let previousMonth = month;
  if (month !== null) {
    previousYear = month === 1 ? year - 1 : year;
    previousMonth = month === 1 ? 12 : month - 1;
  }
  const previousEndMonth = previousMonth ?? (partial ? todayMonth : 12);
  const previousDay = partial
    ? Math.min(todayDay, lastDay(previousYear, previousEndMonth))
    : lastDay(previousYear, previousEndMonth);
  return {
    year,
    month,
    today,
    partial,
    current: { from, to: partial ? today : end },
    previous: {
      from: formatDateOnly(previousYear, previousMonth ?? 1, 1),
      to: formatDateOnly(previousYear, previousEndMonth, previousDay),
    },
  };
}

export function percentageChange(current: number, previous: number) {
  return previous > 0 ? Math.round(((current - previous) / previous) * 1000) / 10 : null;
}

const emptyMetrics = (): PeriodMetrics => ({
  enrollments: 0,
  collected: 0,
  collectedCount: 0,
  paidExpenses: 0,
  expenseCount: 0,
  pendingExpenses: 0,
  cashFlow: 0,
});

export function createSchoolAnalysis(
  payload: AnalysisPayload,
  window: AnalysisWindow,
  scope: SchoolAnalysis["scope"],
  now = new Date()
): SchoolAnalysis {
  const { periods, courses: categoryRows, ...aggregates } = payload;
  const current = periods.find((row) => row.key === "current") ?? emptyMetrics();
  const previous = periods.find((row) => row.key === "previous") ?? emptyMetrics();
  const courses = new Map<string, number>();
  for (const row of categoryRows) {
    const label = normalizeStoredCourseCategories(row.categories).join(" + ") || "Sin categoría";
    courses.set(label, (courses.get(label) ?? 0) + row.count);
  }
  const changes = {
    enrollments: percentageChange(current.enrollments, previous.enrollments),
    collected: percentageChange(current.collected, previous.collected),
    paidExpenses: percentageChange(current.paidExpenses, previous.paidExpenses),
  };
  const alerts: AnalysisAlert[] = [];
  if (payload.portfolio.overdue > 0)
    alerts.push({
      id: "overdue",
      tone: "attention",
      title: "Vencimientos pendientes",
      detail: "Hay cuotas registradas con fecha de vencimiento anterior a hoy y saldo por cobrar.",
      href: "#analysis-debt",
    });
  if (payload.portfolio.withoutSchedule > 0)
    alerts.push({
      id: "schedule",
      tone: "info",
      title: "Saldo sin programación completa",
      detail:
        "Parte de la cartera no tiene cuotas registradas que cubran su saldo. No se considera automáticamente vencida.",
      href: "#analysis-debt",
    });
  if (previous.expenseCount >= 3 && current.expenseCount >= 3 && (changes.paidExpenses ?? 0) >= 25)
    alerts.push({
      id: "expenses",
      tone: "attention",
      title: "Aumentaron los gastos pagados",
      detail: `Subieron ${changes.paidExpenses}% frente al período comparado. Hay al menos tres gastos en cada corte.`,
      href: "#analysis-expenses",
    });
  if (
    previous.collectedCount >= 3 &&
    current.collectedCount >= 3 &&
    (changes.collected ?? 0) <= -20
  )
    alerts.push({
      id: "collections",
      tone: "attention",
      title: "Disminuyó el recaudo",
      detail: `Bajó ${Math.abs(changes.collected!)}% frente al período comparado. Hay al menos tres recaudos en cada corte.`,
      href: "#analysis-months",
    });
  if (previous.enrollments >= 5 && (changes.enrollments ?? 0) <= -20)
    alerts.push({
      id: "enrollments",
      tone: "info",
      title: "Menos matrículas registradas",
      detail: `La cantidad bajó ${Math.abs(changes.enrollments!)}% frente al período comparado; revisa también la cobertura del historial.`,
      href: "#analysis-courses",
    });
  const issues =
    payload.quality.incompleteContact +
    payload.quality.duplicateDocuments +
    payload.quality.contractsWithoutValue +
    payload.quality.regularsWithoutContract +
    payload.quality.unlinkedCollections;
  if (issues > 0)
    alerts.push({
      id: "quality",
      tone: "info",
      title: "Datos por revisar",
      detail:
        "Hay registros incompletos o sin vínculo. Pueden limitar la interpretación; no se corrigen ni se eliminan automáticamente.",
      href: "#calidad-datos",
    });
  return {
    ...aggregates,
    generatedAt: now.toISOString(),
    window,
    scope,
    current,
    previous,
    changes,
    alerts,
    courses: [...courses]
      .map(([label, count]) => ({ label, count }))
      .sort((a, b) => b.count - a.count || a.label.localeCompare(b.label)),
  };
}

export function analysisSheets(report: SchoolAnalysis): SpreadsheetSheet[] {
  return [
    {
      name: "Corte",
      headers: ["Dato", "Valor"],
      rows: [
        ["Desde", report.window.current.from],
        ["Hasta", report.window.current.to],
        ["Comparación desde", report.window.previous.from],
        ["Comparación hasta", report.window.previous.to],
        ["Generado", report.generatedAt],
        ["Sede", report.scope.branchId ?? "Todas"],
        [
          "Base",
          "Registros ConduSoft; recaudo incluye posibles valores para terceros; flujo no es utilidad",
        ],
        ["Cartera al", report.window.today],
        ["Saldo", report.portfolio.balance],
        ["Cuotas vencidas registradas", report.portfolio.overdue],
        ["Saldo sin programación", report.portfolio.withoutSchedule],
      ],
    },
    {
      name: "Comparación",
      headers: ["Indicador", "Seleccionado", "Anterior", "Cambio %"],
      rows: [
        [
          "Matrículas",
          report.current.enrollments,
          report.previous.enrollments,
          report.changes.enrollments,
        ],
        ["Recaudo", report.current.collected, report.previous.collected, report.changes.collected],
        [
          "Gastos pagados",
          report.current.paidExpenses,
          report.previous.paidExpenses,
          report.changes.paidExpenses,
        ],
        ["Flujo registrado", report.current.cashFlow, report.previous.cashFlow, null],
        [
          "Gastos pendientes",
          report.current.pendingExpenses,
          report.previous.pendingExpenses,
          null,
        ],
      ],
    },
    {
      name: "Evolución",
      headers: ["Mes", "Matrículas", "Recaudo", "Gastos pagados"],
      rows: report.monthly.map((r) => [r.month, r.enrollments, r.collected, r.paidExpenses]),
    },
    {
      name: "Cursos",
      headers: ["Categorías", "Matrículas"],
      rows: report.courses.map((r) => [r.label, r.count]),
    },
    {
      name: "Gastos",
      headers: ["Categoría", "Pagado seleccionado", "Pagado anterior", "Cantidad seleccionada"],
      rows: report.expenses.map((r) => [r.category, r.current, r.previous, r.count]),
    },
    {
      name: "Calidad",
      headers: ["Indicador", "Registros"],
      rows: [
        ["Alumnos revisados", report.quality.students],
        ["Contacto incompleto", report.quality.incompleteContact],
        ["Documentos duplicados adicionales", report.quality.duplicateDocuments],
        ["Contratos sin valor positivo", report.quality.contractsWithoutValue],
        ["Alumnos regulares sin matrícula", report.quality.regularsWithoutContract],
        ["Recaudos regulares sin contrato", report.quality.unlinkedCollections],
      ],
    },
    {
      name: "Señales",
      headers: ["Señal", "Detalle"],
      rows: report.alerts.map((r) => [r.title, r.detail]),
    },
  ];
}
