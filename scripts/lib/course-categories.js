const LEGACY_COMBINED_CATEGORY_MAP = {
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

const CATEGORY_ALIASES = {
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

function normalizeCategoryLabel(value) {
  return String(value || "")
    .normalize("NFD")
    .replace(/\p{Diacritic}/gu, "")
    .toUpperCase()
    .replace(/\s+/g, " ")
    .trim();
}

function sortNormalizedCategories(values) {
  return [...values].sort((left, right) => {
    const leftIndex = CATEGORY_ORDER_INDEX.get(left) ?? Number.MAX_SAFE_INTEGER;
    const rightIndex = CATEGORY_ORDER_INDEX.get(right) ?? Number.MAX_SAFE_INTEGER;
    if (leftIndex !== rightIndex) return leftIndex - rightIndex;
    return left.localeCompare(right, "es");
  });
}

function expandLegacyCourseCategory(value) {
  const normalized = normalizeCategoryLabel(value);
  if (!normalized) return [];

  const expanded = LEGACY_COMBINED_CATEGORY_MAP[normalized];
  if (expanded) return expanded;

  const alias = CATEGORY_ALIASES[normalized];
  return alias ? [alias] : [normalized];
}

function normalizeStoredCourseCategories(categorias) {
  const seen = new Set();
  const normalized = [];

  for (const rawValue of categorias || []) {
    for (const value of expandLegacyCourseCategory(rawValue)) {
      if (!value || seen.has(value)) continue;
      seen.add(value);
      normalized.push(value);
    }
  }

  return sortNormalizedCategories(normalized);
}

function isMotoCourseCategory(value) {
  return /^(AM|A|A1|A2)$/.test(value);
}

function isCarCourseCategory(value) {
  return /^(B|B1|C|C1|RC|RC1|C2|C3|D)$/.test(value);
}

module.exports = {
  expandLegacyCourseCategory,
  normalizeStoredCourseCategories,
  isMotoCourseCategory,
  isCarCourseCategory,
};
