import { describe, expect, it } from "vitest";
import {
  DASHBOARD_MODULES,
  findDashboardModuleByPath,
  getDashboardDefaultRoute,
  getDashboardHomePriorityModules,
  getDashboardNavigationForRole,
  getDashboardPageMeta,
  getDashboardPrimaryMobileModules,
} from "./dashboard-nav";

describe("dashboard navigation config", () => {
  it("removes Classes from the module catalog and all navigation surfaces", () => {
    expect(DASHBOARD_MODULES.map((module) => module.id)).not.toContain("classes");
    for (const role of [
      "super_admin",
      "admin_escuela",
      "admin_sede",
      "administrativo",
      "recepcion",
      "instructor",
      "alumno",
    ] as const) {
      expect(
        getDashboardNavigationForRole(role).flatMap((area) =>
          area.modules.map((module) => module.id)
        )
      ).not.toContain("classes");
      expect(getDashboardHomePriorityModules(role).map((module) => module.id)).not.toContain(
        "classes"
      );
    }
    expect(findDashboardModuleByPath("/dashboard/clases")).toBeNull();
  });
  it("keeps the billing connector hidden unless explicitly enabled for the school", () => {
    const ids = (rol: "admin_escuela" | "instructor", enabled: boolean) =>
      getDashboardNavigationForRole(rol, { vsBilling: enabled }).flatMap((area) =>
        area.modules.map((module) => module.id)
      );
    expect(ids("admin_escuela", false)).not.toContain("invoicing");
    expect(ids("admin_escuela", true)).toContain("invoicing");
    expect(ids("instructor", true)).not.toContain("invoicing");
    expect(findDashboardModuleByPath("/dashboard/facturacion")).toMatchObject({ id: "invoicing" });
  });
  it("keeps super_admin navigation limited to global modules", () => {
    const navigation = getDashboardNavigationForRole("super_admin");

    expect(navigation.map((area) => area.id)).toEqual([
      "overview",
      "exams",
      "configuration",
      "platform",
    ]);
    expect(navigation[1]?.modules.map((module) => module.id)).toEqual(["exams"]);
    expect(navigation[2]?.modules.map((module) => module.id)).toEqual([
      "permissions",
      "contracts",
      "compliance",
      "arco",
    ]);
    expect(navigation[3]?.modules.map((module) => module.id)).toEqual([
      "schools",
      "subscriptions",
      "analytics",
    ]);
  });

  it("groups admin_escuela modules by priority area order", () => {
    const navigation = getDashboardNavigationForRole("admin_escuela");

    expect(navigation.map((area) => area.id)).toEqual([
      "overview",
      "operation",
      "finance",
      "exams",
      "configuration",
      "platform",
    ]);
    expect(navigation[1]?.modules.map((module) => module.id)).toEqual([
      "students",
      "vehicles",
      "hours",
    ]);
    expect(navigation[2]?.modules.map((module) => module.id)).toEqual([
      "income",
      "portfolio",
      "cash",
      "payroll",
      "expenses",
      "automation",
      "reports",
    ]);
    expect(navigation[3]?.modules.map((module) => module.id)).toEqual(["exams"]);
    expect(navigation[4]?.modules.map((module) => module.id)).toEqual([
      "instructors",
      "staff",
      "contracts",
      "compliance",
      "branches",
      "arco",
    ]);
    expect(navigation[5]?.modules.map((module) => module.id)).toEqual(["subscriptions"]);
  });

  it("matches dashboard routes to the most specific module", () => {
    expect(findDashboardModuleByPath("/dashboard")).toMatchObject({ id: "home" });
    expect(findDashboardModuleByPath("/dashboard/gastos")).toMatchObject({ id: "expenses" });
    expect(findDashboardModuleByPath("/dashboard/automatizacion")).toMatchObject({
      id: "automation",
    });
    expect(findDashboardModuleByPath("/dashboard/permisos")).toMatchObject({
      id: "permissions",
    });
    expect(findDashboardModuleByPath("/dashboard/cumplimiento")).toMatchObject({
      id: "compliance",
    });
    expect(findDashboardModuleByPath("/dashboard/contratos")).toMatchObject({
      id: "contracts",
    });
    expect(findDashboardModuleByPath("/dashboard/suscripciones")).toMatchObject({
      id: "subscriptions",
    });
    expect(findDashboardModuleByPath("/dashboard/bitacora")).toMatchObject({ id: "logbook" });
  });

  it("returns stable primary mobile modules and home priorities", () => {
    expect(getDashboardPrimaryMobileModules("admin_escuela").map((module) => module.id)).toEqual([
      "home",
      "students",
      "income",
      "vehicles",
    ]);
    expect(getDashboardHomePriorityModules("admin_escuela").map((module) => module.id)).toEqual([
      "students",
      "income",
      "hours",
      "vehicles",
      "portfolio",
      "cash",
      "expenses",
    ]);
  });

  it("keeps the instructor fallback route", () => {
    expect(getDashboardDefaultRoute("instructor")).toBe("/dashboard/vehiculos?tab=bitacora");
    expect(getDashboardDefaultRoute("admin_escuela")).toBe("/dashboard");
  });
  it("prioritizes actual role tasks rather than Contracts for everyone", () => {
    for (const role of [
      "super_admin",
      "admin_escuela",
      "admin_sede",
      "administrativo",
      "recepcion",
      "instructor",
      "alumno",
    ] as const) {
      const priorities = getDashboardHomePriorityModules(role);
      expect(priorities.map((module) => module.id)).not.toContain("contracts");
      expect(priorities.every((module) => module.roles.includes(role))).toBe(true);
    }
    expect(getDashboardHomePriorityModules("recepcion")[0]?.id).toBe("students");
    expect(getDashboardHomePriorityModules("alumno").map((module) => module.id)).toEqual(["exams"]);
    expect(getDashboardHomePriorityModules("super_admin")[0]?.id).toBe("schools");
  });

  it("returns page meta for the dedicated account workspace", () => {
    expect(getDashboardPageMeta("/dashboard/mi-cuenta")).toMatchObject({
      title: "Mi cuenta",
      area: { id: "configuration" },
      module: null,
    });
  });
});
