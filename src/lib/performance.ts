export type PerformanceRouteGroup =
  | "public"
  | "dashboard-home"
  | "dashboard-listados"
  | "dashboard-reportes";

export type PerformanceBudget = {
  lcpMs: number;
  inpMs: number;
  cls: number;
  ttfbMs: number;
  apiP95Ms: number;
  initialJsKb: number;
};

export type ReportableWebVital = {
  id: string;
  name: string;
  value: number;
  rating?: "good" | "needs-improvement" | "poor";
  delta?: number;
  navigationType?: string;
};

export const PERFORMANCE_BUDGETS: Record<PerformanceRouteGroup, PerformanceBudget> = {
  public: {
    lcpMs: 2500,
    inpMs: 200,
    cls: 0.1,
    ttfbMs: 800,
    apiP95Ms: 600,
    initialJsKb: 250,
  },
  "dashboard-home": {
    lcpMs: 3000,
    inpMs: 200,
    cls: 0.1,
    ttfbMs: 800,
    apiP95Ms: 600,
    initialJsKb: 250,
  },
  "dashboard-listados": {
    lcpMs: 3000,
    inpMs: 200,
    cls: 0.1,
    ttfbMs: 800,
    apiP95Ms: 600,
    initialJsKb: 250,
  },
  "dashboard-reportes": {
    lcpMs: 3000,
    inpMs: 200,
    cls: 0.1,
    ttfbMs: 800,
    apiP95Ms: 1500,
    initialJsKb: 250,
  },
};

const REPORT_PATH_PREFIXES = [
  "/dashboard/informes",
  "/dashboard/ingresos",
  "/dashboard/gastos",
  "/dashboard/cartera",
  "/dashboard/caja-diaria",
];

export function resolvePerformanceRouteGroup(
  pathname: string | null | undefined
): PerformanceRouteGroup {
  if (!pathname || !pathname.startsWith("/dashboard")) {
    return "public";
  }

  if (pathname === "/dashboard") {
    return "dashboard-home";
  }

  if (REPORT_PATH_PREFIXES.some((prefix) => pathname.startsWith(prefix))) {
    return "dashboard-reportes";
  }

  return "dashboard-listados";
}

export function formatWebVitalValue(metric: Pick<ReportableWebVital, "name" | "value">) {
  if (metric.name === "CLS") {
    return metric.value.toFixed(3);
  }

  return `${Math.round(metric.value)}ms`;
}

export function getBudgetForMetric(
  routeGroup: PerformanceRouteGroup,
  metricName: ReportableWebVital["name"]
) {
  const budget = PERFORMANCE_BUDGETS[routeGroup];

  switch (metricName) {
    case "LCP":
      return budget.lcpMs;
    case "INP":
      return budget.inpMs;
    case "CLS":
      return budget.cls;
    case "TTFB":
      return budget.ttfbMs;
    default:
      return null;
  }
}

export function isMetricOverBudget(routeGroup: PerformanceRouteGroup, metric: ReportableWebVital) {
  const budget = getBudgetForMetric(routeGroup, metric.name);
  if (budget === null) {
    return { budget: null, overBudget: false };
  }

  return {
    budget,
    overBudget: metric.value > budget,
  };
}
