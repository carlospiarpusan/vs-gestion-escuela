import type { PlanEscuela } from "@/types/database";

export type SchoolPlanDescriptor = {
  id: PlanEscuela;
  label: string;
  badge: string;
  audience: string;
  summary: string;
  dashboardDescription: string;
  publicDescription: string;
  recommendedFor: string;
  capacityGuide: string;
  focusPoints: string[];
  badgeClassName: string;
  panelClassName: string;
  progressClassName: string;
  accentClassName: string;
};

export const SCHOOL_PLAN_ORDER: PlanEscuela[] = ["gratuito", "basico", "profesional", "enterprise"];

export const SCHOOL_PLAN_DESCRIPTORS: Record<PlanEscuela, SchoolPlanDescriptor> = {
  gratuito: {
    id: "gratuito",
    label: "Gratuito",
    badge: "Arranque",
    audience: "Escuelas que están empezando a ordenar su operación.",
    summary:
      "Sirve para arrancar con una sola sede, validar el flujo base y dejar organizada la escuela sin cargar una estructura más compleja de la necesaria.",
    dashboardDescription:
      "Plan de entrada para escuelas nuevas o equipos que quieren probar la operación base con control.",
    publicDescription:
      "Ideal para una autoescuela que apenas está formalizando alumnos, clases y recaudo inicial.",
    recommendedFor:
      "Recomendado cuando la prioridad es empezar con orden, no abrir complejidad antes de tiempo.",
    capacityGuide: "Sede única y una base inicial controlada.",
    focusPoints: [
      "Alumnos, matrículas y agenda base",
      "Clases, exámenes y operación esencial",
      "Recaudo inicial sin desorden operativo",
    ],
    badgeClassName: "bg-slate-100 text-slate-700 dark:bg-slate-900/40 dark:text-slate-300",
    panelClassName: "border-slate-200 bg-slate-50/80 dark:border-slate-800 dark:bg-slate-950/30",
    progressClassName: "bg-slate-500",
    accentClassName: "text-slate-700 dark:text-slate-300",
  },
  basico: {
    id: "basico",
    label: "Básico",
    badge: "Operación estable",
    audience: "Escuelas con una operación diaria constante en crecimiento.",
    summary:
      "Pensado para una escuela que ya necesita controlar mejor su recaudo, su cartera y el trabajo diario del equipo sin perder simplicidad.",
    dashboardDescription:
      "El mejor punto de partida para una escuela activa que quiere ordenar operación y finanzas del día a día.",
    publicDescription:
      "Encaja cuando ya manejas volumen constante y necesitas una operación clara en una escuela principal.",
    recommendedFor:
      "Recomendado para consolidar una escuela activa antes de saltar a una estructura multi-sede.",
    capacityGuide: "Escuela principal con crecimiento sostenido.",
    focusPoints: [
      "Ingresos, cartera y caja diaria visibles",
      "Seguimiento más claro de instructores y horas",
      "Mejor control del alumno durante todo el proceso",
    ],
    badgeClassName: "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300",
    panelClassName: "border-blue-200 bg-blue-50/75 dark:border-blue-900/40 dark:bg-blue-950/25",
    progressClassName: "bg-blue-500",
    accentClassName: "text-blue-700 dark:text-blue-300",
  },
  profesional: {
    id: "profesional",
    label: "Profesional",
    badge: "Escala operativa",
    audience: "Escuelas que ya operan con más volumen, sedes o flota visible.",
    summary:
      "Diseñado para equipos que ya necesitan una lectura más madura del negocio, más estructura interna y seguimiento más fino sobre gastos, flota y reportes.",
    dashboardDescription:
      "Plan recomendado para escuelas en expansión que ya necesitan control operativo y financiero más robusto.",
    publicDescription:
      "Pensado para escuelas con crecimiento real, más equipo interno y necesidad de lectura gerencial.",
    recommendedFor:
      "Recomendado cuando ya no basta con ordenar; ahora necesitas escalar con criterio y visibilidad.",
    capacityGuide: "Expansión multi-sede o con operación más intensa.",
    focusPoints: [
      "Más protagonismo de flota, gastos e informes",
      "Estructura interna más clara por sedes y roles",
      "Automatización y lectura gerencial más útiles",
    ],
    badgeClassName: "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-300",
    panelClassName:
      "border-emerald-200 bg-emerald-50/75 dark:border-emerald-900/40 dark:bg-emerald-950/25",
    progressClassName: "bg-emerald-500",
    accentClassName: "text-emerald-700 dark:text-emerald-300",
  },
  enterprise: {
    id: "enterprise",
    label: "Enterprise",
    badge: "Gobierno central",
    audience: "Grupos o estructuras amplias que requieren control global.",
    summary:
      "Orientado a organizaciones que necesitan gobernanza de plataforma, alta capacidad operativa y una estructura central que mantenga orden al crecer.",
    dashboardDescription:
      "Plan de control central para redes amplias, múltiples sedes y decisiones más estratégicas sobre capacidad y estructura.",
    publicDescription:
      "Para operaciones grandes que ya necesitan mirada central, escalabilidad y una estructura sólida de crecimiento.",
    recommendedFor:
      "Recomendado cuando la prioridad deja de ser solo operar y pasa a ser gobernar una estructura más amplia.",
    capacityGuide: "Capacidad amplia y estructura ajustable a la operación.",
    focusPoints: [
      "Gobierno central de escuelas, sedes y accesos",
      "Mayor visibilidad estratégica sobre crecimiento",
      "Base preparada para estructuras operativas complejas",
    ],
    badgeClassName: "bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-300",
    panelClassName: "border-amber-200 bg-amber-50/75 dark:border-amber-900/40 dark:bg-amber-950/25",
    progressClassName: "bg-amber-500",
    accentClassName: "text-amber-700 dark:text-amber-300",
  },
};

export function isSchoolPlan(value: string | null | undefined): value is PlanEscuela {
  return Boolean(value && SCHOOL_PLAN_ORDER.includes(value as PlanEscuela));
}

export function getSchoolPlanDescriptor(plan: string | null | undefined) {
  return isSchoolPlan(plan) ? SCHOOL_PLAN_DESCRIPTORS[plan] : null;
}
