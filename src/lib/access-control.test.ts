import { describe, expect, it } from "vitest";
import { canAccessDashboardPath } from "./access-control";

describe("dashboard access control", () => {
  it("allows the dedicated account route for authenticated dashboard roles", () => {
    expect(canAccessDashboardPath("admin_escuela", "/dashboard/mi-cuenta")).toBe(true);
    expect(canAccessDashboardPath("alumno", "/dashboard/mi-cuenta")).toBe(true);
  });

  it("keeps unknown dashboard routes blocked", () => {
    expect(canAccessDashboardPath("admin_escuela", "/dashboard/otra-ruta")).toBe(false);
  });
});
