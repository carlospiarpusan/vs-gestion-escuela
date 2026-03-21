import type { AlumnoDashboardExamen } from "@/lib/dashboard-admin-summary";

export const fmt = (n: number) =>
  new Intl.NumberFormat("es-CO", {
    style: "currency",
    currency: "COP",
    maximumFractionDigits: 0,
  }).format(n);

export const ESTADO_PAGO: Record<string, string> = {
  cobrado: "Pagado",
  pendiente: "Pendiente",
  anulado: "Anulado",
};

export const ESTADO_COLOR: Record<string, string> = {
  cobrado: "text-green-600 bg-green-50 dark:bg-green-900/20 dark:text-green-400",
  pendiente: "text-amber-600 bg-amber-50 dark:bg-amber-900/20 dark:text-amber-400",
  anulado: "text-gray-400 bg-gray-100 dark:bg-gray-800",
};

export const METODO_LABEL: Record<string, string> = {
  efectivo: "Efectivo",
  datafono: "Datáfono",
  nequi: "Nequi",
  sistecredito: "Sistecrédito",
  otro: "Otro",
};

export const TIPO_EXAMEN: Record<AlumnoDashboardExamen["tipo"], string> = {
  teorico: "Teórico",
  practico: "Práctico",
};

export const RESULTADO_LABEL: Record<AlumnoDashboardExamen["resultado"], string> = {
  pendiente: "Pendiente",
  aprobado: "Aprobado",
  suspendido: "Suspendido",
};

export const RESULTADO_COLOR: Record<AlumnoDashboardExamen["resultado"], string> = {
  pendiente: "text-amber-600 bg-amber-50 dark:bg-amber-900/20 dark:text-amber-400",
  aprobado: "text-green-600 bg-green-50 dark:bg-green-900/20 dark:text-green-400",
  suspendido: "text-red-600 bg-red-50 dark:bg-red-900/20 dark:text-red-400",
};

export function formatComparisonDelta(value: number, kind: "count" | "currency") {
  if (value === 0) return "Sin cambio vs mes anterior";

  const absolute = Math.abs(value);
  const formatted = kind === "currency" ? fmt(absolute) : absolute.toLocaleString("es-CO");
  return value > 0 ? `${formatted} más vs mes anterior` : `${formatted} menos vs mes anterior`;
}

export function getShareLabel(value: number, total: number) {
  if (total <= 0) return "0% del mes";
  return `${Math.round((value / total) * 100)}% del mes`;
}

export function DashboardLoadingState() {
  return (
    <div className="flex items-center justify-center py-20">
      <div className="h-8 w-8 animate-spin rounded-full border-2 border-[var(--blue-apple)] border-t-transparent" />
    </div>
  );
}
