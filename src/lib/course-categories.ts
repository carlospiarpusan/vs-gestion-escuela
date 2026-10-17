import type { TipoPermiso } from "@/types/database";

export const SELECTABLE_COURSE_CATEGORIES = ["A1", "A2", "B1", "C1", "RC1", "C2", "C3"] as const;

const LEGACY_COMBINED_CATEGORY_MAP: Record<string, string[]> = {
  "A2 Y B1": ["A2", "B1"],
  "A2 Y C1": ["A2", "C1"],
  "A2 Y RC1": ["A2", "RC1"],
  "A2 Y C2": ["A2", "C2"],
  "A2 Y C3": ["A2", "C3"],
  "A1 Y B1": ["A1", "B1"],
  "A1 Y C1": ["A1", "C1"],
  "A1 Y RC1": ["A1", "RC1"],
  "A1 Y C2": ["A1", "C2"],
  "A1 Y C3": ["A1", "C3"],
};

const CATEGORY_ALIASES: Record<string, string> = {
  AM: "AM",
  A: "A",
  A1: "A1",
  A2: "A2",
  B: "B",
  B1: "B1",
  C: "C",
  C1: "C1",
  RC: "RC",
  RC1: "RC1",
  C2: "C2",
  C3: "C3",
  D: "D",
};

const CATEGORY_ORDER = ["AM", "A", "A1", "A2", "B", "B1", "C", "C1", "RC", "RC1", "C2", "C3", "D"];
const CATEGORY_ORDER_INDEX = new Map(CATEGORY_ORDER.map((value, index) => [value, index]));

function normalizeCategoryLabel(value: string) {
  return value
    .normalize("NFD")
    .replace(/\p{Diacritic}/gu, "")
    .toUpperCase()
    .replace(/\s+/g, " ")
    .trim();
}

function sortNormalizedCategories(values: string[]) {
  return [...values].sort((left, right) => {
    const leftIndex = CATEGORY_ORDER_INDEX.get(left) ?? Number.MAX_SAFE_INTEGER;
    const rightIndex = CATEGORY_ORDER_INDEX.get(right) ?? Number.MAX_SAFE_INTEGER;
    if (leftIndex !== rightIndex) return leftIndex - rightIndex;
    return left.localeCompare(right, "es");
  });
}

export function expandLegacyCourseCategory(value: string) {
  const normalized = normalizeCategoryLabel(String(value || ""));
  if (!normalized) return [];

  const expanded = LEGACY_COMBINED_CATEGORY_MAP[normalized];
  if (expanded) return expanded;

  const alias = CATEGORY_ALIASES[normalized];
  return alias ? [alias] : [normalized];
}

export function normalizeStoredCourseCategories(categorias: string[] | null | undefined) {
  const seen = new Set<string>();
  const normalized: string[] = [];

  for (const rawValue of categorias ?? []) {
    for (const value of expandLegacyCourseCategory(rawValue)) {
      if (!value || seen.has(value)) continue;
      seen.add(value);
      normalized.push(value);
    }
  }

  return sortNormalizedCategories(normalized);
}

export function toggleCourseCategorySelection(
  categorias: string[] | null | undefined,
  categoria: string
) {
  const selected = normalizeStoredCourseCategories(categorias);
  const normalizedCategory = normalizeStoredCourseCategories([categoria])[0];

  if (!normalizedCategory) return selected;

  return selected.includes(normalizedCategory)
    ? selected.filter((value) => value !== normalizedCategory)
    : normalizeStoredCourseCategories([...selected, normalizedCategory]);
}

export function isMotoCourseCategory(value: string) {
  return /^(AM|A|A1|A2)$/.test(value);
}

export function isCarCourseCategory(value: string) {
  return /^(B|B1|C|C1|RC|RC1|C2|C3|D)$/.test(value);
}

export function inferTipoPermisoFromCategories(
  categorias: string[] | null | undefined
): TipoPermiso {
  const [first = ""] = normalizeStoredCourseCategories(categorias);

  if (first === "AM") return "AM";
  if (first === "A1") return "A1";
  if (first === "A2") return "A2";
  if (first.startsWith("A")) return "A";
  if (first.startsWith("RC") || first.startsWith("C") || first === "D") return "C";
  return "B";
}
