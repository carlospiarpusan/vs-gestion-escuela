import type { CategoriaIngreso } from "@/types/database";

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
