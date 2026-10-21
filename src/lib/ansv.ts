import { z } from "zod";
import { getTodayDateString, isValidDateOnly } from "./date-utils";
import { normalizeStoredCourseCategories } from "./course-categories";

export const ansvSexSchema = z.enum(["M", "F"]);
export type AnsvSex = z.infer<typeof ansvSexSchema>;
// Coefficients in thousandths of UVB, art. 3.8.1.3, Res. 20243040003125/2024.
const coefficients = {
  M: [
    [731, 731, 722, 744, 726],
    [756, 756, 744, 774, 752],
    [778, 774, 765, 795, 769],
    [748, 748, 744, 765, 744],
    [722, 722, 713, 735, 718],
    [718, 713, 705, 726, 709],
  ],
  F: [
    [705, 701, 692, 722, 701],
    [744, 744, 726, 765, 735],
    [769, 765, 752, 795, 761],
    [731, 731, 722, 756, 722],
    [696, 692, 679, 713, 688],
    [683, 679, 670, 701, 679],
  ],
} as const;
const categoryColumns: Record<string, number> = {
  A1: 0,
  A2: 0,
  B1: 1,
  C1: 2,
  RC1: 2,
  B2: 3,
  C2: 3,
  B3: 4,
  C3: 4,
};
// Res. 3488/2025 confirms both values. Never reuse a tariff for an unknown year.
const uvbByYear: Record<number, number> = { 2025: 11552, 2026: 12110 };

export const ansvSnapshotSchema = z.object({
  version: z.literal(1),
  status: z.enum(["calculated", "review_required"]),
  fechaNacimiento: z.string().refine(isValidDateOnly),
  sexo: ansvSexSchema,
  fechaMatricula: z.string().refine(isValidDateOnly),
  edad: z.number().int().min(0).max(130),
  categoria: z.string().min(1),
  vigencia: z.number().int(),
  uvbPesos: z.number().int().positive().nullable(),
  coeficienteMilesimas: z.number().int().positive().nullable(),
  valorPesos: z.number().int().positive().multipleOf(100).nullable(),
  motivo: z.string().nullable(),
  alternativas: z
    .array(z.object({ categoria: z.string(), valorPesos: z.number().int().positive().nullable() }))
    .optional(),
});
export type AnsvSnapshot = z.infer<typeof ansvSnapshotSchema>;

export function resolveAnsvCategory(categories: string[], selected?: string | null) {
  const normalized = normalizeStoredCourseCategories(categories);
  const category = selected?.trim().toUpperCase() || (normalized.length === 1 ? normalized[0] : "");
  if (!category || !normalized.includes(category))
    throw new Error("Selecciona la categoría para liquidar el único aporte ANSV del contrato.");
  return category;
}

function ansvAge(birth: string, date: string, today: string) {
  if (!isValidDateOnly(birth)) throw new Error("La fecha de nacimiento es obligatoria para ANSV.");
  if (!isValidDateOnly(date)) throw new Error("La fecha de inscripción es obligatoria para ANSV.");
  if (birth > date || date > today)
    throw new Error("Revisa las fechas: no pueden ser futuras ni anteriores al nacimiento.");
  const age =
    Number(date.slice(0, 4)) - Number(birth.slice(0, 4)) - Number(date.slice(5) < birth.slice(5));
  if (age < 0 || age > 130) throw new Error("Revisa la fecha de nacimiento del alumno.");
  return age;
}

export function validateEnrollmentBirthDate(
  birth: string | null | undefined,
  date = getTodayDateString(),
  today = getTodayDateString()
) {
  const age = ansvAge(birth || "", date, today);
  if (age < 16)
    throw new Error(
      "Revisa la fecha de nacimiento: el alumno debe tener al menos 16 años en la fecha de inscripción para liquidar ANSV."
    );
  return age;
}

export function calculateAnsv(
  input: {
    fechaNacimiento?: string | null;
    sexo?: string | null;
    fechaMatricula?: string | null;
    categorias: string[];
    categoria?: string | null;
  },
  today = getTodayDateString()
): AnsvSnapshot {
  const birth = input.fechaNacimiento || "";
  const date = input.fechaMatricula || "";
  const age = ansvAge(birth, date, today);
  const sex = ansvSexSchema.safeParse(input.sexo);
  if (!sex.success) throw new Error("Selecciona el sexo para calcular ANSV.");
  const category = resolveAnsvCategory(input.categorias, input.categoria);
  const year = Number(date.slice(0, 4));
  const uvb = uvbByYear[year] ?? null;
  // The published last band says >81, leaving age 81 ambiguous. Do not invent a rate.
  const reason =
    age < 16
      ? "La tabla ANSV comienza a los 16 años; requiere revisión."
      : age === 81
        ? "La tabla publicada no define claramente los 81 años; requiere revisión."
        : categoryColumns[category] === undefined
          ? "Esta categoría no tiene tarifa ANSV verificada."
          : !uvb
            ? `Falta verificar la tarifa UVB de ${year}.`
            : null;
  const band = age <= 25 ? 0 : age <= 35 ? 1 : age <= 50 ? 2 : age <= 65 ? 3 : age <= 80 ? 4 : 5;
  const coefficient = reason ? null : coefficients[sex.data][band][categoryColumns[category]];
  return {
    version: 1,
    status: reason ? "review_required" : "calculated",
    fechaNacimiento: birth,
    sexo: sex.data,
    fechaMatricula: date,
    edad: age,
    categoria: category,
    vigencia: year,
    uvbPesos: uvb,
    coeficienteMilesimas: coefficient,
    // Integer arithmetic: round each contribution up to the next COP 100.
    valorPesos: coefficient && uvb ? Math.ceil((coefficient * uvb) / 100000) * 100 : null,
    motivo: reason,
    alternativas: normalizeStoredCourseCategories(input.categorias).map((value) => {
      const rate =
        reason || categoryColumns[value] === undefined
          ? null
          : coefficients[sex.data][band][categoryColumns[value]];
      return {
        categoria: value,
        valorPesos: rate && uvb ? Math.ceil((rate * uvb) / 100000) * 100 : null,
      };
    }),
  };
}

export function readAnsvSnapshot(value: unknown): AnsvSnapshot | null {
  const parsed = ansvSnapshotSchema.safeParse(value);
  if (!parsed.success) return null;
  return parsed.data;
}

export function calculateEnrollmentAnsv(
  input: Parameters<typeof calculateAnsv>[0],
  today = getTodayDateString()
) {
  const snapshot = calculateAnsv(input, today);
  validateEnrollmentBirthDate(snapshot.fechaNacimiento, snapshot.fechaMatricula, today);
  return snapshot;
}

export function latestAnsvBirthDate(enrollmentDate: string) {
  if (!isValidDateOnly(enrollmentDate) || Number(enrollmentDate.slice(0, 4)) <= 16)
    return undefined;
  const year = String(Number(enrollmentDate.slice(0, 4)) - 16).padStart(4, "0");
  const date = `${year}${enrollmentDate.slice(4)}`;
  return isValidDateOnly(date) ? date : `${year}-02-28`;
}

export function isAnsvProduct(product: { code: string }) {
  return product.code.trim().toUpperCase() === "ANSV";
}

export function getAnsvProductAmount(
  product: { code: string },
  snapshot: AnsvSnapshot | null
): { categoria: string; valorPesos: number } | null {
  if (snapshot?.status !== "calculated" || !snapshot.valorPesos) return null;
  if (isAnsvProduct(product))
    return { categoria: snapshot.categoria, valorPesos: snapshot.valorPesos };
  if (product.code.trim().toUpperCase() !== "ANSV2") return null;
  const other =
    snapshot.alternativas?.filter((item) => item.categoria !== snapshot.categoria) ?? [];
  // ANSV2 is unambiguous only when there is exactly one other category.
  return other.length === 1 && other[0].valorPesos
    ? { categoria: other[0].categoria, valorPesos: other[0].valorPesos }
    : null;
}
