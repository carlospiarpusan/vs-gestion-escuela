export type ContractPrefix = "CAR" | "MOT" | "COM";

import {
  isCarCourseCategory,
  isMotoCourseCategory,
  normalizeStoredCourseCategories,
} from "./course-categories";

function isHistoricalContract(value: string) {
  return /^\d{4}-(CAR|MOT|COM)-/.test(value);
}

function hasKnownPrefix(value: string) {
  return /^(CAR|MOT|COM|APT|PRA)-/.test(value) || isHistoricalContract(value);
}

function stripKnownPrefix(value: string) {
  if (isHistoricalContract(value)) return value;
  return value.replace(/^(CAR|CARRO|MOT|MOTO|COM|COMBO|COMBOS|A2|A1|AM|AUTO)-/i, "");
}

export function getContractPrefix(categorias: string[] | null | undefined): ContractPrefix {
  const normalized = normalizeStoredCourseCategories(categorias);
  const hasMoto = normalized.some((item) => isMotoCourseCategory(item));
  const hasCarro = normalized.some((item) => isCarCourseCategory(item));

  if (hasMoto && hasCarro) return "COM";
  if (hasMoto) return "MOT";
  return "CAR";
}

export function normalizeContractNumber(
  rawValue: string | null | undefined,
  categorias: string[] | null | undefined
) {
  const normalized = String(rawValue ?? "")
    .trim()
    .toUpperCase();
  if (!normalized) return null;
  if (hasKnownPrefix(normalized)) return normalized;

  const prefix = getContractPrefix(categorias);
  const suffix = stripKnownPrefix(normalized).replace(/\s+/g, "");
  if (!suffix) return null;

  return `${prefix}-${suffix}`;
}

export function getContractPrefixHint(categorias: string[] | null | undefined) {
  return `${getContractPrefix(categorias)}-123`;
}
