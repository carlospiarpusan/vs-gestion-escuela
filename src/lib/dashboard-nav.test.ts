import { describe, expect, it } from "vitest";
import {
  findDashboardModuleByPath,
  getDashboardDefaultRoute,
  getDashboardHomePriorityModules,
  getDashboardNavigationForRole,
  getDashboardPageMeta,
  getDashboardPrimaryMobileModules,
} from "./dashboard-nav";

describe("dashboard navigation config", () => {
  it("groups admin_escuela modules by priority area order", () => {
    const navigation = getDashboardNavigationForRole("admin_escuela");

    expect(navigation.map((area) => area.id)).toEqual([
      "overview",
      "operation",
      "finance",
      "exams",
      "configuration",
    ]);
    expect(navigation[1]?.modules.map((module) => module.id)).toEqual([
      "students",
      "classes",
      "vehicles",
      "hours",
    ]);
    expect(navigation[2]?.modules.map((module) => module.id)).toEqual([
      "income",
      "portfolio",
      "cash",
      "expenses",
      "automation",
      "reports",
    ]);
  });

  it("matches dashboard routes to the most specific module", () => {
    expect(findDashboardModuleByPath("/dashboard")).toMatchObject({ id: "home" });
    expect(findDashboardModuleByPath("/dashboard/gastos")).toMatchObject({ id: "expenses" });
    expect(findDashboardModuleByPath("/dashboard/automatizacion")).toMatchObject({
      id: "automation",
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
      "classes",
      "vehicles",
      "hours",
      "income",
      "automation",
    ]);
  });

  it("keeps the instructor fallback route", () => {
    expect(getDashboardDefaultRoute("instructor")).toBe("/dashboard/vehiculos?tab=bitacora");
    expect(getDashboardDefaultRoute("admin_escuela")).toBe("/dashboard");
  });

  it("returns page meta for the dedicated account workspace", () => {
    expect(getDashboardPageMeta("/dashboard/mi-cuenta")).toMatchObject({
      title: "Mi cuenta",
      area: { id: "configuration" },
      module: null,
    });
  });
});
