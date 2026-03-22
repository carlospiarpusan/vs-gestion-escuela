import { describe, expect, it } from "vitest";
import {
  SCHOOL_PLAN_DESCRIPTORS,
  SCHOOL_PLAN_ORDER,
  getSchoolPlanDescriptor,
  isPaidSchoolPlan,
  isSchoolPlan,
} from "./school-plans";

describe("school plans", () => {
  it("keeps the expected commercial order of plans", () => {
    expect(SCHOOL_PLAN_ORDER).toEqual(["gratuito", "basico", "profesional", "enterprise"]);
  });

  it("returns descriptors with human labels for every supported plan", () => {
    expect(SCHOOL_PLAN_DESCRIPTORS.gratuito.label).toBe("Gratuito");
    expect(SCHOOL_PLAN_DESCRIPTORS.basico.label).toBe("Básico");
    expect(SCHOOL_PLAN_DESCRIPTORS.profesional.label).toBe("Profesional");
    expect(SCHOOL_PLAN_DESCRIPTORS.enterprise.label).toBe("Enterprise");
  });

  it("guards unknown plan ids", () => {
    expect(isSchoolPlan("basico")).toBe(true);
    expect(isSchoolPlan("legacy")).toBe(false);
    expect(getSchoolPlanDescriptor("legacy")).toBeNull();
  });

  it("distinguishes paid plans from the free tier", () => {
    expect(isPaidSchoolPlan("gratuito")).toBe(false);
    expect(isPaidSchoolPlan("basico")).toBe(true);
    expect(isPaidSchoolPlan("enterprise")).toBe(true);
  });
});
