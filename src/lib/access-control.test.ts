import { describe, expect, it } from "vitest";
import { canAccessDashboardPath } from "./access-control";

describe("dashboard access control", () => {
  it("allows the dedicated account route for authenticated dashboard roles", () => {
    expect(canAccessDashboardPath("admin_escuela", "/dashboard/mi-cuenta")).toBe(true);
    expect(canAccessDashboardPath("alumno", "/dashboard/mi-cuenta")).toBe(true);
  });

  it("keeps the permissions page only for audited admin roles", () => {
    expect(canAccessDashboardPath("super_admin", "/dashboard/permisos")).toBe(true);
    expect(canAccessDashboardPath("admin_escuela", "/dashboard/permisos")).toBe(true);
    expect(canAccessDashboardPath("admin_sede", "/dashboard/permisos")).toBe(true);
    expect(canAccessDashboardPath("administrativo", "/dashboard/permisos")).toBe(true);
    expect(canAccessDashboardPath("instructor", "/dashboard/permisos")).toBe(false);
  });

  it("blocks super_admin from school-level operational modules", () => {
    expect(canAccessDashboardPath("super_admin", "/dashboard/alumnos")).toBe(false);
    expect(canAccessDashboardPath("super_admin", "/dashboard/ingresos")).toBe(false);
    expect(canAccessDashboardPath("super_admin", "/dashboard/examenes")).toBe(true);
    expect(canAccessDashboardPath("super_admin", "/dashboard/escuelas")).toBe(true);
    expect(canAccessDashboardPath("super_admin", "/dashboard/suscripciones")).toBe(true);
  });

  it("keeps unknown dashboard routes blocked", () => {
    expect(canAccessDashboardPath("admin_escuela", "/dashboard/otra-ruta")).toBe(false);
  });
});
