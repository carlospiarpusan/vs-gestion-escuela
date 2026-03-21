import type { Alumno, CategoriaIngreso, EstadoIngreso, MetodoPago } from "@/types/database";
import {
  buildAccountingYears,
  getCurrentAccountingYear,
} from "@/lib/accounting-dashboard";
import type { DailyCashStats } from "@/lib/finance/types";

export type AlumnoOption = Pick<Alumno, "id" | "nombre" | "apellidos">;

export const inputCls = "apple-input";
export const labelCls = "apple-label";

export const currentYear = getCurrentAccountingYear();
export const currentMonth = new Date().getMonth() + 1;
export const years = buildAccountingYears();

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

export const emptyStats: DailyCashStats = {
  totalEfectivo: 0,
  totalDatafono: 0,
  totalNequi: 0,
  totalSistecredito: 0,
  totalOtro: 0,
  totalRegistrado: 0,
  diasConMovimientos: 0,
  promedioPorDia: 0,
  mejorDiaFecha: null,
  mejorDiaMonto: 0,
};
