import { expect, it } from "vitest";
import {
  buildDashboardListCacheKey,
  buildDashboardCatalogCacheKey,
  STAFF_SCOPE_CACHE_VERSION,
  FINANCE_INCOME_CACHE_PREFIX,
  FINANCE_REPORTS_CACHE_PREFIX,
} from "./dashboard-client-cache";

const scope = { id: "actor", rol: "admin_sede", escuelaId: "school", sedeId: "branch" };
it("does not reuse list/catalog entries from the old authorization scope", () => {
  const list = buildDashboardListCacheKey("alumnos-table", scope);
  const catalog = buildDashboardCatalogCacheKey("clases", scope);
  expect(list).not.toBe("dashboard-list:alumnos-table:actor:admin_sede:school:branch");
  expect(catalog).not.toBe("dashboard-catalog:clases:actor:admin_sede:school:branch");
  expect(list).toContain(STAFF_SCOPE_CACHE_VERSION);
  expect(catalog).toContain(STAFF_SCOPE_CACHE_VERSION);
  expect(list.startsWith("dashboard-list:alumnos-table:")).toBe(true);
  expect(catalog.startsWith("dashboard-catalog:clases:")).toBe(true);
});
it("finance versioning preserves existing invalidation prefixes", () => {
  expect(FINANCE_INCOME_CACHE_PREFIX).toContain(STAFF_SCOPE_CACHE_VERSION);
  expect(FINANCE_REPORTS_CACHE_PREFIX).toContain(STAFF_SCOPE_CACHE_VERSION);
  expect(FINANCE_INCOME_CACHE_PREFIX.startsWith("finance-income:")).toBe(true);
  expect(FINANCE_REPORTS_CACHE_PREFIX.startsWith("finance-reports:")).toBe(true);
});
