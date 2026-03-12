export type RespuestaCale = "a" | "b" | "c" | "d";

export interface CaleExamNotes {
  modulo: "cale_practica";
  source: string;
  questionCount: number;
  correctCount: number;
  percentage: number;
  elapsedSeconds: number;
  categoryIds: string[];
  categoryNames: string[];
  submittedAt: string;
}

export const CALE_BANK_SOURCE = "cale_editorial_v1";
export const CALE_BANK_LABEL = "CALE editorial v1";
export const CALE_EXAM_NOTES_PREFIX = "CALEJSON:";
export const CALE_PASSING_PERCENTAGE = 80;
export const CALE_QUESTION_COUNT_OPTIONS = [10, 20, 40] as const;
export const CALE_RESPONSE_OPTIONS: RespuestaCale[] = ["a", "b", "c", "d"];

export const CALE_CATEGORY_BLUEPRINT = [
  { nombre: "Actitudes", officialCount: 12 },
  { nombre: "Movilidad segura y sostenible", officialCount: 10 },
  { nombre: "Normas de transito", officialCount: 6 },
  { nombre: "Senalizacion vial e infraestructura", officialCount: 6 },
  { nombre: "El vehiculo", officialCount: 6 },
] as const;

export function buildCaleCategoryTargets(totalQuestions: number) {
  const safeTotal = Math.max(1, Math.floor(totalQuestions));
  const exactTargets = CALE_CATEGORY_BLUEPRINT.map((item, index) => {
    const exact = (item.officialCount / 40) * safeTotal;
    return {
      nombre: item.nombre,
      exact,
      assigned: Math.floor(exact),
      remainder: exact - Math.floor(exact),
      priority: index,
    };
  });

  let remaining = safeTotal - exactTargets.reduce((sum, item) => sum + item.assigned, 0);
  const sorted = [...exactTargets].sort((left, right) => {
    if (right.remainder !== left.remainder) return right.remainder - left.remainder;
    return left.priority - right.priority;
  });

  for (let index = 0; index < sorted.length && remaining > 0; index += 1) {
    sorted[index].assigned += 1;
    remaining -= 1;
  }

  return exactTargets.map((item) => ({
    nombre: item.nombre,
    count: sorted.find((candidate) => candidate.nombre === item.nombre)?.assigned ?? item.assigned,
  }));
}

export function normalizeCaleAnswer(value: unknown): RespuestaCale | null {
  if (typeof value !== "string") return null;
  const normalized = value.trim().toLowerCase();
  return CALE_RESPONSE_OPTIONS.includes(normalized as RespuestaCale)
    ? (normalized as RespuestaCale)
    : null;
}

export function buildCaleExamNotes(meta: CaleExamNotes) {
  return `${CALE_EXAM_NOTES_PREFIX}${JSON.stringify(meta)}`;
}

export function parseCaleExamNotes(notes: string | null | undefined): CaleExamNotes | null {
  if (!notes || !notes.startsWith(CALE_EXAM_NOTES_PREFIX)) return null;

  try {
    const parsed = JSON.parse(notes.slice(CALE_EXAM_NOTES_PREFIX.length)) as Partial<CaleExamNotes>;
    if (parsed.modulo !== "cale_practica") return null;
    if (typeof parsed.source !== "string") return null;
    if (typeof parsed.questionCount !== "number") return null;
    if (typeof parsed.correctCount !== "number") return null;
    if (typeof parsed.percentage !== "number") return null;
    if (typeof parsed.elapsedSeconds !== "number") return null;
    if (!Array.isArray(parsed.categoryIds) || !Array.isArray(parsed.categoryNames)) return null;
    if (typeof parsed.submittedAt !== "string") return null;
    return parsed as CaleExamNotes;
  } catch {
    return null;
  }
}

export function formatElapsedTime(totalSeconds: number) {
  const safeSeconds = Number.isFinite(totalSeconds) && totalSeconds > 0 ? Math.floor(totalSeconds) : 0;
  const hours = Math.floor(safeSeconds / 3600);
  const minutes = Math.floor((safeSeconds % 3600) / 60);
  const seconds = safeSeconds % 60;

  if (hours > 0) {
    return `${hours}:${String(minutes).padStart(2, "0")}:${String(seconds).padStart(2, "0")}`;
  }

  return `${String(minutes).padStart(2, "0")}:${String(seconds).padStart(2, "0")}`;
}

export function getCaleDifficultyLabel(value: string | null | undefined) {
  switch (value) {
    case "facil":
      return "Baja";
    case "dificil":
      return "Alta";
    default:
      return "Media";
  }
}

export function getCaleDifficultyTone(value: string | null | undefined) {
  switch (value) {
    case "facil":
      return "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-300";
    case "dificil":
      return "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-300";
    default:
      return "bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-300";
  }
}
