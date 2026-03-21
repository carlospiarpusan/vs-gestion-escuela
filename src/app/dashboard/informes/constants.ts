import {
  getCurrentAccountingYear,
  getMonthDateRange,
  type AccountingBreakdownRow,
} from "@/lib/accounting-dashboard";

export type ReportSection = "resumen" | "estudiantes";

export type FilterState = {
  escuelaId: string;
  sedeId: string;
  year: string;
  month: string;
  ingresoView: string;
  ingresoCategoria: string;
  ingresoMetodo: string;
  gastoView: string;
  gastoCategoria: string;
  gastoMetodo: string;
  gastoContraparte: string;
};

export const REPORT_SECTIONS: Array<{ id: ReportSection; label: string; description: string }> = [
  {
    id: "resumen",
    label: "Resumen ejecutivo",
    description: "Resultado, focos, cartera, pagos y señales del periodo en una sola lectura.",
  },
  {
    id: "estudiantes",
    label: "Detalle de estudiantes",
    description: "Ingresos y estado de pago por alumno, práctica adicional y aptitud.",
  },
];

export const INGRESO_VIEW_OPTIONS = [
  { value: "", label: "Todas las líneas" },
  { value: "matriculas", label: "Cursos" },
  { value: "practicas", label: "Práctica adicional" },
  { value: "examenes", label: "Exámenes" },
];

export const INGRESO_CATEGORY_OPTIONS = [
  { value: "", label: "Todas" },
  { value: "matricula", label: "Matrícula" },
  { value: "mensualidad", label: "Mensualidad" },
  { value: "clase_suelta", label: "Práctica adicional" },
  { value: "examen_teorico", label: "Examen teórico" },
  { value: "examen_practico", label: "Examen práctico" },
  { value: "examen_aptitud", label: "Examen aptitud" },
  { value: "material", label: "Material" },
  { value: "tasas_dgt", label: "Tasas" },
  { value: "otros", label: "Otros" },
];

export const INGRESO_METODO_OPTIONS = [
  { value: "", label: "Todos" },
  { value: "efectivo", label: "Efectivo" },
  { value: "datafono", label: "Datafono" },
  { value: "nequi", label: "Nequi" },
  { value: "sistecredito", label: "Sistecrédito" },
  { value: "otro", label: "Otro" },
];

export const GASTO_VIEW_OPTIONS = [
  { value: "", label: "Todas las líneas" },
  { value: "vehicular", label: "Operación vehicular" },
  { value: "administrativo", label: "Administrativos" },
  { value: "personal", label: "Personal y terceros" },
  { value: "tramitadores", label: "Tramitadores" },
];

export const GASTO_CATEGORY_OPTIONS = [
  { value: "", label: "Todas" },
  { value: "combustible", label: "Combustible" },
  { value: "mantenimiento_vehiculo", label: "Mantenimiento vehicular" },
  { value: "alquiler", label: "Alquiler" },
  { value: "servicios", label: "Servicios" },
  { value: "nominas", label: "Nóminas" },
  { value: "seguros", label: "Seguros" },
  { value: "material_didactico", label: "Material didáctico" },
  { value: "marketing", label: "Marketing" },
  { value: "impuestos", label: "Impuestos" },
  { value: "suministros", label: "Suministros" },
  { value: "reparaciones", label: "Reparaciones" },
  { value: "tramitador", label: "Tramitador" },
  { value: "otros", label: "Otros" },
];

export const GASTO_METODO_OPTIONS = [
  { value: "", label: "Todos" },
  { value: "efectivo", label: "Efectivo" },
  { value: "tarjeta", label: "Tarjeta" },
  { value: "transferencia", label: "Transferencia" },
  { value: "domiciliacion", label: "Domiciliación" },
];

export function parseSection(value: string | null): ReportSection {
  if (value === "estudiantes") return "estudiantes";
  return "resumen";
}

export function createDefaultFilters(): FilterState {
  return {
    escuelaId: "",
    sedeId: "",
    year: String(getCurrentAccountingYear()),
    month: "all",
    ingresoView: "",
    ingresoCategoria: "",
    ingresoMetodo: "",
    gastoView: "",
    gastoCategoria: "",
    gastoMetodo: "",
    gastoContraparte: "",
  };
}

export function buildParams(filters: FilterState, section: ReportSection) {
  const include =
    section === "estudiantes"
      ? "options,students"
      : "options,summary,breakdown,series,payables,contracts";

  const params = new URLSearchParams();
  const range = getMonthDateRange(
    Number(filters.year),
    filters.month === "all" ? "" : filters.month
  );

  params.set("from", range.from);
  params.set("to", range.to);
  params.set("include", include);

  if (filters.escuelaId) params.set("escuela_id", filters.escuelaId);
  if (filters.sedeId) params.set("sede_id", filters.sedeId);
  if (filters.ingresoView) params.set("ingreso_view", filters.ingresoView);
  if (filters.ingresoCategoria) params.set("ingreso_categoria", filters.ingresoCategoria);
  if (filters.ingresoMetodo) params.set("ingreso_metodo", filters.ingresoMetodo);
  if (filters.gastoView) params.set("gasto_view", filters.gastoView);
  if (filters.gastoCategoria) params.set("gasto_categoria", filters.gastoCategoria);
  if (filters.gastoMetodo) params.set("gasto_metodo", filters.gastoMetodo);
  if (filters.gastoContraparte.trim()) {
    params.set("gasto_contraparte", filters.gastoContraparte.trim());
  }

  return params;
}

export function mapBreakdownAsConcept(
  rows: Array<{ nombre?: string; categoria?: string; total: number; cantidad: number }>
) {
  return rows.map((row) => ({
    concepto: row.nombre || row.categoria || "Sin clasificar",
    total: row.total,
    cantidad: row.cantidad,
  })) as AccountingBreakdownRow[];
}
