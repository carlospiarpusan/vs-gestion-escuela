import type { CategoriaIngreso, EstadoIngreso } from "@/types/database";

export type IncomeView =
  | "all"
  | "matriculas"
  | "practicas"
  | "examenes"
  | "with_invoice"
  | "without_invoice";

export const MATRICULA_INCOME_CATEGORIES: CategoriaIngreso[] = [
  "matricula",
  "mensualidad",
  "material",
  "tasas_dgt",
];
export const PRACTICA_INCOME_CATEGORIES: CategoriaIngreso[] = ["clase_suelta"];
export const EXAMEN_INCOME_CATEGORIES: CategoriaIngreso[] = [
  "examen_teorico",
  "examen_practico",
  "examen_aptitud",
];

export const INCOME_VIEW_ITEMS: Array<{ id: IncomeView; label: string; description: string }> = [
  { id: "all", label: "Todo", description: "Todos los ingresos del periodo." },
  { id: "matriculas", label: "Cursos", description: "Matrícula, mensualidad, material y tasas." },
  {
    id: "practicas",
    label: "Práctica adicional",
    description: "Horas o prácticas sueltas fuera del curso.",
  },
  { id: "examenes", label: "Exámenes", description: "Teóricos, prácticos y aptitud." },
  {
    id: "with_invoice",
    label: "Con factura",
    description: "Solo ingresos con soporte documental.",
  },
  {
    id: "without_invoice",
    label: "Sin factura",
    description: "Solo ingresos sin soporte documental.",
  },
];

type IncomeSupabaseQueryable<T> = {
  in(column: string, values: readonly string[]): T;
  eq(column: string, value: string): T;
  not(column: string, operator: string, value: string | null): T;
  neq(column: string, value: string): T;
  or(filters: string): T;
};

export function applyIncomeViewToSupabaseQuery<T extends IncomeSupabaseQueryable<T>>(
  query: T,
  view: IncomeView
): T {
  switch (view) {
    case "matriculas":
      return query.in("categoria", MATRICULA_INCOME_CATEGORIES);
    case "practicas":
      return query.in("categoria", PRACTICA_INCOME_CATEGORIES);
    case "examenes":
      return query.in("categoria", EXAMEN_INCOME_CATEGORIES);
    case "with_invoice":
      return query.not("numero_factura", "is", null).neq("numero_factura", "");
    case "without_invoice":
      return query.or("numero_factura.is.null,numero_factura.eq.");
    default:
      return query;
  }
}

export function resolveIncomeViewStateFilter(_view: IncomeView): EstadoIngreso | null {
  void _view;
  return null;
}
