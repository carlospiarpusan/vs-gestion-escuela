export type ContractPrefix = "CAR" | "MOT" | "COM";

import {
  isCarCourseCategory,
  isMotoCourseCategory,
  normalizeStoredCourseCategories,
} from "./course-categories";

export function getContractPrefix(categorias: string[] | null | undefined): ContractPrefix {
  const normalized = normalizeStoredCourseCategories(categorias);
  const hasMoto = normalized.some((item) => isMotoCourseCategory(item));
  const hasCarro = normalized.some((item) => isCarCourseCategory(item));

  if (hasMoto && hasCarro) return "COM";
  if (hasMoto) return "MOT";
  return "CAR";
}
