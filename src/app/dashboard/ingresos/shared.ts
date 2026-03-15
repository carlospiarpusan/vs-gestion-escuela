import type {
  Alumno,
  CategoriaIngreso,
  EstadoIngreso,
  Ingreso,
  MatriculaAlumno,
  MetodoPago,
} from "@/types/database";
import type { AccountingContractPendingRow } from "@/lib/accounting-dashboard";
import { createClient } from "@/lib/supabase";
import { fetchAllSupabaseRows } from "@/lib/supabase-pagination";
import type { MutableRefObject } from "react";

// ─── Types ───────────────────────────────────────────────────────────

export type AlumnoOption = Pick<Alumno, "id" | "nombre" | "apellidos">;

export type MatriculaOption = Pick<
  MatriculaAlumno,
  "id" | "alumno_id" | "numero_contrato" | "categorias" | "valor_total" | "fecha_inscripcion"
>;

export type IngresoRow = Ingreso & { alumno_nombre: string; matricula_label: string };

export type CarteraTableRow = AccountingContractPendingRow & { id: string };

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

export type LibroSectionProps = {
  escuelaId: string;
  alumnos: AlumnoOption[];
  matriculas: MatriculaOption[];
  reloadKey: number;
  onEdit: (row: IngresoRow) => void;
  onDelete: (row: IngresoRow) => void;
  exportCsvRef: MutableRefObject<(() => Promise<void>) | null>;
};

export type CarteraSectionProps = {
  escuelaId: string;
  alumnos: AlumnoOption[];
  reloadKey: number;
  exportCsvRef: MutableRefObject<(() => Promise<void>) | null>;
};

export type CajaDiariaSectionProps = {
  escuelaId: string;
  alumnos: AlumnoOption[];
  reloadKey: number;
};

// ─── Constants ───────────────────────────────────────────────────────

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

export const PAGE_SIZE = 10;

export const inputCls = "apple-input";
export const labelCls = "apple-label";

export const estadoColors: Record<string, string> = {
  cobrado: "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400",
  pendiente: "bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400",
  anulado: "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400",
};

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

// ─── Helpers ─────────────────────────────────────────────────────────

export function formatMatriculaLabel(matricula: MatriculaOption) {
  if (matricula.numero_contrato) return `Contrato ${matricula.numero_contrato}`;
  if ((matricula.categorias ?? []).length > 0) return (matricula.categorias ?? []).join(", ");
  return "Sin contrato";
}

function getTodayDateString() {
  return new Date().toISOString().split("T")[0];
}

function getDaysUntil(dateValue: string | null) {
  if (!dateValue) return null;
  const target = new Date(`${dateValue}T00:00:00`);
  const today = new Date(`${getTodayDateString()}T00:00:00`);
  return Math.round((target.getTime() - today.getTime()) / 86_400_000);
}

export function getDueMeta(dateValue: string | null) {
  const daysUntil = getDaysUntil(dateValue);

  if (daysUntil === null) {
    return {
      label: "Sin vencimiento",
      detail: "Sin fecha definida",
      className: "bg-gray-100 text-[#86868b] dark:bg-gray-800 dark:text-gray-300",
    };
  }

  if (daysUntil < 0) {
    const overdueDays = Math.abs(daysUntil);
    return {
      label: "Vencido",
      detail: `${overdueDays} día${overdueDays === 1 ? "" : "s"} vencido`,
      className: "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-300",
    };
  }

  if (daysUntil <= 7) {
    return {
      label: "Próximo",
      detail:
        daysUntil === 0 ? "Vence hoy" : `Vence en ${daysUntil} día${daysUntil === 1 ? "" : "s"}`,
      className: "bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-300",
    };
  }

  return {
    label: "Al día",
    detail: `Vence en ${daysUntil} días`,
    className: "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-300",
  };
}

export function getShare(value: number, total: number) {
  if (total <= 0) return "0%";
  return `${Math.round((value / total) * 100)}%`;
}

export async function findMatchedAlumnoIds(
  supabase: ReturnType<typeof createClient>,
  escuelaId: string,
  search: string
) {
  const pattern = `%${search}%`;
  const { data } = await supabase
    .from("alumnos")
    .select("id")
    .eq("escuela_id", escuelaId)
    .or(`dni.ilike.${pattern},nombre.ilike.${pattern},apellidos.ilike.${pattern}`);

  return (data ?? []).map((alumno) => alumno.id);
}

export async function fetchAllAlumnoOptions(
  supabase: ReturnType<typeof createClient>,
  escuelaId: string
) {
  return fetchAllSupabaseRows<AlumnoOption>((from, to) =>
    supabase
      .from("alumnos")
      .select("id, nombre, apellidos")
      .eq("escuela_id", escuelaId)
      .order("nombre", { ascending: true })
      .order("apellidos", { ascending: true })
      .range(from, to)
      .then(({ data, error }) => ({ data: (data as AlumnoOption[]) ?? [], error }))
  );
}

export async function fetchAllMatriculaOptions(
  supabase: ReturnType<typeof createClient>,
  escuelaId: string
) {
  return fetchAllSupabaseRows<MatriculaOption>((from, to) =>
    supabase
      .from("matriculas_alumno")
      .select("id, alumno_id, numero_contrato, categorias, valor_total, fecha_inscripcion")
      .eq("escuela_id", escuelaId)
      .order("fecha_inscripcion", { ascending: false })
      .order("created_at", { ascending: false })
      .range(from, to)
      .then(({ data, error }) => ({ data: (data as MatriculaOption[]) ?? [], error }))
  );
}
