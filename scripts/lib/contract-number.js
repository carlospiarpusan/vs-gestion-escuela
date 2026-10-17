const {
  isCarCourseCategory,
  isMotoCourseCategory,
  normalizeStoredCourseCategories,
} = require("./course-categories");

function isHistoricalContract(value) {
  return /^\d{4}-(CAR|MOT|COM)-/.test(value);
}

function hasKnownPrefix(value) {
  return /^(CAR|MOT|COM|APT|PRA)-/.test(value) || isHistoricalContract(value);
}

function stripKnownPrefix(value) {
  if (isHistoricalContract(value)) return value;
  return value.replace(/^(CAR|CARRO|MOT|MOTO|COM|COMBO|COMBOS|A2|A1|AM|AUTO)-/i, "");
}

function getContractPrefix(categorias) {
  const normalized = normalizeStoredCourseCategories(categorias);
  const hasMoto = normalized.some((item) => isMotoCourseCategory(item));
  const hasCarro = normalized.some((item) => isCarCourseCategory(item));

  if (hasMoto && hasCarro) return "COM";
  if (hasMoto) return "MOT";
  return "CAR";
}

function normalizeContractNumber(rawValue, categorias) {
  const normalized = String(rawValue || "")
    .trim()
    .toUpperCase();
  if (!normalized) return null;
  if (hasKnownPrefix(normalized)) return normalized;

  const prefix = getContractPrefix(categorias);
  const suffix = stripKnownPrefix(normalized).replace(/\s+/g, "");
  if (!suffix) return null;

  return `${prefix}-${suffix}`;
}

module.exports = {
  getContractPrefix,
  normalizeContractNumber,
};
