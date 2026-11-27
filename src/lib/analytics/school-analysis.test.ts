import { describe, expect, it } from "vitest";
import {
  analysisSheets,
  buildAnalysisWindow,
  createSchoolAnalysis,
  percentageChange,
  type AnalysisPayload,
} from "./school-analysis";

const now = new Date("2026-10-26T15:00:00Z");
export function samplePayload(): AnalysisPayload {
  return {
    periods: [
      {
        key: "current",
        enrollments: 4,
        collected: 700,
        collectedCount: 3,
        paidExpenses: 150,
        expenseCount: 3,
        pendingExpenses: 25,
        cashFlow: 550,
      },
      {
        key: "previous",
        enrollments: 10,
        collected: 1000,
        collectedCount: 3,
        paidExpenses: 100,
        expenseCount: 3,
        pendingExpenses: 0,
        cashFlow: 900,
      },
    ],
    monthly: [{ month: "2026-10", enrollments: 4, collected: 700, paidExpenses: 150 }],
    courses: [
      { categories: ["A2 Y B1"], count: 1 },
      { categories: ["B1", "A2"], count: 3 },
    ],
    expenses: [{ category: "otros", current: 150, previous: 100, count: 3 }],
    portfolio: {
      balance: 400,
      obligations: 2,
      overdue: 50,
      withoutSchedule: 200,
      aging: [{ bucket: "90+", balance: 400, count: 2 }],
    },
    quality: {
      students: 4,
      incompleteContact: 1,
      duplicateDocuments: 0,
      contractsWithoutValue: 0,
      regularsWithoutContract: 0,
      unlinkedCollections: 0,
      firstActivity: "2025-01-01",
    },
    branches: [{ id: "branch", name: "Centro" }],
  };
}
describe("analysis periods", () => {
  it("compares the same cutoff day, never a partial month against a complete month", () => {
    expect(buildAnalysisWindow(2026, 10, now)).toMatchObject({
      partial: true,
      current: { from: "2026-10-01", to: "2026-10-26" },
      previous: { from: "2026-09-01", to: "2026-09-26" },
    });
  });
  it("uses Bogotá at the UTC day/month boundary", () => {
    expect(buildAnalysisWindow(2026, 10, new Date("2026-11-01T02:00:00Z"))).toMatchObject({
      today: "2026-10-31",
      partial: true,
      current: { to: "2026-10-31" },
      previous: { to: "2026-09-30" },
    });
  });
  it("keeps the last day of the year partial until the Bogotá date changes", () => {
    expect(buildAnalysisWindow(2026, null, new Date("2027-01-01T02:00:00Z"))).toMatchObject({
      partial: true,
      current: { to: "2026-12-31" },
    });
    expect(buildAnalysisWindow(2026, null, new Date("2027-01-01T05:00:00Z")).partial).toBe(false);
  });
  it("handles January, complete months, leap years and partial annual periods", () => {
    expect(buildAnalysisWindow(2026, 1, now).previous).toEqual({
      from: "2025-12-01",
      to: "2025-12-31",
    });
    expect(buildAnalysisWindow(2024, 2, now).current.to).toBe("2024-02-29");
    expect(buildAnalysisWindow(2026, null, now).previous).toEqual({
      from: "2025-01-01",
      to: "2025-10-26",
    });
    expect(buildAnalysisWindow(2024, null, now).previous.to).toBe("2023-12-31");
    expect(buildAnalysisWindow(2024, null, new Date("2024-02-29T18:00:00Z")).previous.to).toBe(
      "2023-02-28"
    );
  });
  it("rejects future or unbounded periods", () => {
    for (const [year, month] of [
      [1999, 1],
      [2027, 1],
      [2026, 11],
      [2026, 0],
      [2026, 13],
      [2026, 1.1],
    ])
      expect(() => buildAnalysisWindow(year, month, now)).toThrow();
  });
});
it("never invents growth percentages with a zero base", () => {
  expect(percentageChange(100, 0)).toBeNull();
  expect(percentageChange(0, 0)).toBeNull();
  expect(percentageChange(0, 100)).toBe(-100);
  expect(percentageChange(125, 100)).toBe(25);
});
it("merges historic combo aliases without duplicating enrollments and produces actionable signals", () => {
  const report = createSchoolAnalysis(
    samplePayload(),
    buildAnalysisWindow(2026, 10, now),
    { schoolId: "school", branchId: null },
    now
  );
  expect(report.courses).toEqual([{ label: "A2 + B1", count: 4 }]);
  expect(report.alerts.map((r) => r.id)).toEqual([
    "overdue",
    "schedule",
    "expenses",
    "collections",
    "enrollments",
    "quality",
  ]);
  expect(report.alerts.map((r) => r.href)).toEqual([
    "#analysis-debt",
    "#analysis-debt",
    "#analysis-expenses",
    "#analysis-months",
    "#analysis-courses",
    "#calidad-datos",
  ]);
});
it("does not hide a complete drop to zero enrollments", () => {
  const payload = samplePayload();
  payload.periods[0].enrollments = 0;
  const report = createSchoolAnalysis(payload, buildAnalysisWindow(2026, 10, now), {
    schoolId: "s",
    branchId: null,
  });
  expect(report.alerts.find((alert) => alert.id === "enrollments")?.detail).toContain("100%");
});
it("requires a minimum observation base before raising comparative signals", () => {
  const payload = samplePayload();
  payload.periods.forEach((p) => {
    p.collectedCount = 1;
    p.expenseCount = 1;
    p.enrollments = 1;
  });
  const report = createSchoolAnalysis(payload, buildAnalysisWindow(2026, 10, now), {
    schoolId: "s",
    branchId: null,
  });
  expect(report.alerts.map((r) => r.id)).not.toContain("expenses");
  expect(report.alerts.map((r) => r.id)).not.toContain("collections");
});
it("exports aggregated source and comparison dates, current debt and no student identities", () => {
  const report = createSchoolAnalysis(
    samplePayload(),
    buildAnalysisWindow(2026, 10, now),
    { schoolId: "s", branchId: null },
    now
  );
  const sheets = analysisSheets(report);
  expect(sheets.map((s) => s.name)).toContain("Calidad");
  expect(sheets[0].rows).toContainEqual(["Cartera al", "2026-10-26"]);
  expect(sheets[0].rows).toContainEqual(["Comparación hasta", "2026-09-26"]);
  expect(JSON.stringify(sheets)).not.toMatch(/\bdni\b|@|contraseña|teléfono del alumno/i);
});
