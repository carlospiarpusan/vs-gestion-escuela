import type {
  Alumno,
  CategoriaIngreso,
  EstadoIngreso,
  MatriculaAlumno,
  MetodoPago,
} from "@/types/database";
import {
  buildAccountingYears,
  getCurrentAccountingYear,
} from "@/lib/accounting-dashboard";

export type AlumnoOption = Pick<Alumno, "id" | "nombre" | "apellidos">;
export type MatriculaOption = Pick<
  MatriculaAlumno,
  "id" | "alumno_id" | "numero_contrato" | "categorias" | "valor_total" | "fecha_inscripcion"
>;

export type IngresoFormData = {
  alumno_id: string;
  matricula_id: string;
  categoria: CategoriaIngreso;
  concepto: string;
  monto: string;
  metodo_pago: MetodoPago;
  medio_especifico: string;
  numero_factura: string;
  fecha: string;
  fecha_vencimiento: string;
  estado: EstadoIngreso;
  notas: string;
};

export const categorias: CategoriaIngreso[] = [
  "matricula",
  "mensualidad",
  "clase_suelta",
  "examen_teorico",
  "examen_practico",
  "examen_aptitud",
  "material",
  "tasas_dgt",
  "otros",
];

export const metodos: { value: MetodoPago; label: string }[] = [
  { value: "efectivo", label: "Efectivo" },
  { value: "datafono", label: "Datáfono" },
  { value: "nequi", label: "Nequi" },
  { value: "sistecredito", label: "Sistecrédito" },
  { value: "otro", label: "Otro" },
];

export const estadosIngreso: EstadoIngreso[] = ["cobrado", "pendiente", "anulado"];

export const inputCls = "apple-input";
export const labelCls = "apple-label";
export const PAGE_SIZE = 15;

export const currentYear = getCurrentAccountingYear();
export const currentMonth = new Date().getMonth() + 1;
export const years = buildAccountingYears();

export const emptyForm: IngresoFormData = {
  alumno_id: "",
  matricula_id: "",
  categoria: "mensualidad",
  concepto: "",
  monto: "",
  metodo_pago: "efectivo",
  medio_especifico: "",
  numero_factura: "",
  fecha: new Date().toISOString().split("T")[0],
  fecha_vencimiento: new Date().toISOString().split("T")[0],
  estado: "cobrado",
  notas: "",
};

export function formatMatriculaLabel(matricula: MatriculaOption) {
  if (matricula.numero_contrato) return `Contrato ${matricula.numero_contrato}`;
  if ((matricula.categorias ?? []).length > 0) return (matricula.categorias ?? []).join(", ");
  return "Sin contrato";
}

export function formatIncomeText(value?: string | null) {
  if (!value) return "Sin clasificar";
  return value.replace(/_/g, " ");
}

export function getIncomeStatusClasses(status: string) {
  const colors: Record<string, string> = {
    cobrado: "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400",
    pagado: "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400",
    pendiente: "bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400",
    anulado: "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400",
  };

  return colors[status] || "bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-300";
}
