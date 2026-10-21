import { expect, it } from "vitest";
import {
  buildBroadDashboardInvalidationTags,
  buildBroadFinanceInvalidationTags,
  buildDashboardCacheTags,
  buildDashboardInvalidationTags,
  buildDashboardListCacheTags,
  buildDashboardListInvalidationTags,
  buildFinanceCacheTags,
  buildFinanceInvalidationTags,
  buildScopedMutationRevalidationTags,
  buildScopeCacheTags,
  expandMutationCacheTags,
  buildIncomeMutationInvalidationTags,
  buildExpenseMutationInvalidationTags,
} from "./server-cache-tags";

const school = { escuelaId: "school-a", sedeId: "branch-a" };
const otherSchool = { escuelaId: "school-b", sedeId: "branch-b" };
const isInvalidated = (readTags: string[], mutationTags: string[]) =>
  expandMutationCacheTags(mutationTags).some((tag) => readTags.includes(tag));

it("keeps unrelated modules cached when an income or expense is saved", () => {
  const income = buildIncomeMutationInvalidationTags(school);
  for (const kind of ["income", "portfolio", "cash", "reports"] as const) {
    expect(isInvalidated(buildFinanceCacheTags(kind, school), income)).toBe(true);
  }
  expect(isInvalidated(buildFinanceCacheTags("expense", school), income)).toBe(false);
  expect(isInvalidated(buildDashboardListCacheTags("alumnos", school), income)).toBe(true);
  expect(isInvalidated(buildDashboardListCacheTags("vehiculos", school), income)).toBe(false);
  expect(
    isInvalidated(buildDashboardCacheTags("alumno", { ...school, userId: "student" }), income)
  ).toBe(true);
  const expense = buildExpenseMutationInvalidationTags(school);
  for (const kind of ["expense", "cash", "reports"] as const) {
    expect(isInvalidated(buildFinanceCacheTags(kind, school), expense)).toBe(true);
  }
  expect(isInvalidated(buildFinanceCacheTags("income", school), expense)).toBe(false);
  expect(isInvalidated(buildFinanceCacheTags("cash", otherSchool), expense)).toBe(false);
});

it("updates school and branch totals without invalidating other schools or unrelated modules", () => {
  const mutation = buildFinanceInvalidationTags("income", school);
  for (const scope of [
    school,
    { ...school, sedeId: "branch-c" },
    { escuelaId: school.escuelaId },
  ]) {
    expect(isInvalidated(buildFinanceCacheTags("income", scope), mutation)).toBe(true);
  }
  expect(isInvalidated(buildFinanceCacheTags("income", otherSchool), mutation)).toBe(false);
  expect(isInvalidated(buildFinanceCacheTags("expense", school), mutation)).toBe(false);
  expect(isInvalidated(buildDashboardListCacheTags("vehiculos", school), mutation)).toBe(false);
});

it("updates global financial and management aggregates without expiring private schools", () => {
  const mutation = buildFinanceInvalidationTags("income", school);
  expect(isInvalidated(buildFinanceCacheTags("income"), mutation)).toBe(true);
  expect(isInvalidated(buildDashboardCacheTags("superadmin"), mutation)).toBe(true);
  expect(isInvalidated(buildDashboardListCacheTags("escuelas"), mutation)).toBe(true);
  expect(isInvalidated(buildDashboardCacheTags("admin", otherSchool), mutation)).toBe(false);
});

it("can invalidate all finance in one school while preserving its unrelated lists", () => {
  const mutation = buildBroadFinanceInvalidationTags(school);
  for (const kind of ["income", "expense", "portfolio", "cash", "reports"] as const) {
    expect(isInvalidated(buildFinanceCacheTags(kind, school), mutation)).toBe(true);
    expect(isInvalidated(buildFinanceCacheTags(kind, otherSchool), mutation)).toBe(false);
  }
  expect(isInvalidated(buildDashboardListCacheTags("vehiculos", school), mutation)).toBe(false);
});

it("updates scoped lists and student/admin dashboards without invalidating other schools", () => {
  const mutation = buildScopedMutationRevalidationTags({ scope: school, includeFinance: false });
  expect(isInvalidated(buildDashboardCacheTags("admin", school), mutation)).toBe(true);
  expect(
    isInvalidated(buildDashboardCacheTags("alumno", { ...school, userId: "student" }), mutation)
  ).toBe(true);
  expect(isInvalidated(buildDashboardListCacheTags("student-options", school), mutation)).toBe(
    true
  );
  expect(
    isInvalidated(buildDashboardCacheTags("alumno", { ...otherSchool, userId: "other" }), mutation)
  ).toBe(false);
  expect(isInvalidated(buildFinanceCacheTags("expense", school), mutation)).toBe(false);
});

it("supports one list, one user, whole-school configuration and deliberate global changes", () => {
  const listMutation = buildDashboardListInvalidationTags("instructores", school);
  expect(isInvalidated(buildDashboardListCacheTags("instructores", school), listMutation)).toBe(
    true
  );
  expect(isInvalidated(buildDashboardListCacheTags("vehiculos", school), listMutation)).toBe(false);
  const userMutation = buildDashboardInvalidationTags("alumno", { userId: "student" });
  expect(
    isInvalidated(buildDashboardCacheTags("alumno", { ...school, userId: "student" }), userMutation)
  ).toBe(true);
  expect(
    isInvalidated(buildDashboardCacheTags("alumno", { ...school, userId: "other" }), userMutation)
  ).toBe(false);
  expect(isInvalidated(buildFinanceCacheTags("expense", school), buildScopeCacheTags(school))).toBe(
    true
  );
  expect(
    isInvalidated(buildFinanceCacheTags("expense", otherSchool), buildScopeCacheTags(school))
  ).toBe(false);
  expect(
    isInvalidated(
      buildDashboardCacheTags("admin", otherSchool),
      buildBroadDashboardInvalidationTags()
    )
  ).toBe(true);
});
