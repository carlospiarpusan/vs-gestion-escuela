import { describe, expect, it } from "vitest";
import { getContractPrefix } from "./contract-number";
import { normalizeStoredCourseCategories } from "./course-categories";
import { derivePrefixFromCategories, getContractTemplateTypeFromCategories } from "./contracts";

describe("contract prefix detection", () => {
  it("keeps moto-only categories as MOT", () => {
    expect(getContractPrefix(["A2"])).toBe("MOT");
    expect(derivePrefixFromCategories(["A2"])).toBe("MOT");
  });

  it("recognizes car categories with numeric variants as CAR", () => {
    expect(getContractPrefix(["B1"])).toBe("CAR");
    expect(getContractPrefix(["C1"])).toBe("CAR");
    expect(getContractPrefix(["RC1"])).toBe("CAR");
    expect(getContractPrefix(["C2"])).toBe("CAR");
    expect(getContractPrefix(["C3"])).toBe("CAR");
  });

  it("returns COM for mixed categories selected separately", () => {
    expect(getContractPrefix(["A2", "B1"])).toBe("COM");
    expect(derivePrefixFromCategories(["A2", "B1"])).toBe("COM");
    expect(getContractTemplateTypeFromCategories(["A2", "B1"])).toBe("combo");
  });

  it("still resolves legacy combined labels after normalization", () => {
    expect(getContractPrefix(normalizeStoredCourseCategories(["A2 y B1"]))).toBe("COM");
    expect(getContractPrefix(normalizeStoredCourseCategories(["A1 y C1"]))).toBe("COM");
    expect(getContractPrefix(normalizeStoredCourseCategories(["A2 y RC1"]))).toBe("COM");
    expect(getContractTemplateTypeFromCategories(["A2 y B1"])).toBe("combo");
  });

  it("keeps a later moto matricula independent from an existing car matricula", () => {
    expect(getContractPrefix(["B1"])).toBe("CAR");
    expect(getContractPrefix(["A2"])).toBe("MOT");
    expect(getContractTemplateTypeFromCategories(["A2"])).toBe("moto");
  });

  it("maps categories to the correct print template type", () => {
    expect(getContractTemplateTypeFromCategories(["A2"])).toBe("moto");
    expect(getContractTemplateTypeFromCategories(["B1"])).toBe("vehiculo");
    expect(getContractTemplateTypeFromCategories(["A1", "C1"])).toBe("combo");
  });
});
