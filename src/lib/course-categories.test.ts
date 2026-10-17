import { describe, expect, it } from "vitest";
import {
  inferTipoPermisoFromCategories,
  normalizeStoredCourseCategories,
  toggleCourseCategorySelection,
} from "./course-categories";

describe("course category normalization", () => {
  it("expands legacy combo labels into separate categories", () => {
    expect(normalizeStoredCourseCategories(["A2 y B1"])).toEqual(["A2", "B1"]);
    expect(normalizeStoredCourseCategories(["A2 y C1"])).toEqual(["A2", "C1"]);
    expect(normalizeStoredCourseCategories(["A2 y RC1"])).toEqual(["A2", "RC1"]);
    expect(normalizeStoredCourseCategories(["A2 y C2"])).toEqual(["A2", "C2"]);
    expect(normalizeStoredCourseCategories(["A2 y C3"])).toEqual(["A2", "C3"]);
    expect(normalizeStoredCourseCategories(["A1 y B1"])).toEqual(["A1", "B1"]);
    expect(normalizeStoredCourseCategories(["A1 y C1"])).toEqual(["A1", "C1"]);
    expect(normalizeStoredCourseCategories(["A1 y RC1"])).toEqual(["A1", "RC1"]);
    expect(normalizeStoredCourseCategories(["A1 y C2"])).toEqual(["A1", "C2"]);
    expect(normalizeStoredCourseCategories(["A1 y C3"])).toEqual(["A1", "C3"]);
  });

  it("deduplicates and sorts normalized categories canonically", () => {
    expect(normalizeStoredCourseCategories(["B1", "A2", "A2 y B1"])).toEqual(["A2", "B1"]);
    expect(normalizeStoredCourseCategories(["C1", "A1", "A1 y C1"])).toEqual(["A1", "C1"]);
  });

  it("keeps tipo_permiso stable for combos regardless of click order", () => {
    expect(inferTipoPermisoFromCategories(["B1", "A2"])).toBe("A2");
    expect(inferTipoPermisoFromCategories(["A2", "B1"])).toBe("A2");
    expect(inferTipoPermisoFromCategories(["C1", "A1"])).toBe("A1");
  });

  it("toggles categories using the canonical normalized values", () => {
    expect(toggleCourseCategorySelection(["A2 y B1"], "B1")).toEqual(["A2"]);
    expect(toggleCourseCategorySelection(["B1"], "A2")).toEqual(["A2", "B1"]);
  });
});
