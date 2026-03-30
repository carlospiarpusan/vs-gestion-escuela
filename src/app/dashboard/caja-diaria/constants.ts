import type { Alumno, CategoriaIngreso, EstadoIngreso, MetodoPago } from "@/types/database";
import { buildAccountingYears, getCurrentAccountingYear } from "@/lib/accounting-dashboard";
import type { DailyCashStats } from "@/lib/finance/types";

export type AlumnoOption = Pick<Alumno, "id" | "nombre" | "apellidos">;

export const inputCls = "apple-input";
export const labelCls = "apple-label";

const CASH_DASHBOARD_TIME_ZONE = "America/Bogota";

function getTimeZoneDateParts(date: Date, timeZone: string) {
  const formatter = new Intl.DateTimeFormat("en-CA", {
    timeZone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  });

  const parts = formatter.formatToParts(date);
  return {
    year: Number(parts.find((part) => part.type === "year")?.value ?? 0),
    month: Number(parts.find((part) => part.type === "month")?.value ?? 0),
    day: Number(parts.find((part) => part.type === "day")?.value ?? 0),
  };
}

function formatDateOnly(year: number, month: number, day: number) {
  return `${String(year).padStart(4, "0")}-${String(month).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
}

const currentDateParts = getTimeZoneDateParts(new Date(), CASH_DASHBOARD_TIME_ZONE);

export const currentYear = currentDateParts.year || getCurrentAccountingYear();
export const currentMonth = currentDateParts.month || new Date().getMonth() + 1;
export const currentDate = formatDateOnly(
  currentYear,
  currentMonth,
  currentDateParts.day || new Date().getDate()
);
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
