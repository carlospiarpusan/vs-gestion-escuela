import { describe, expect, it } from "vitest";
import {
  canAuditedRolePerformAction,
  getAuditedRoleCapability,
  getAuditedRolesForCapabilityAction,
  getDashboardRolesForCapabilityModule,
} from "./role-capabilities";

describe("role capabilities", () => {
  it("grants global structural control only to super_admin", () => {
    expect(canAuditedRolePerformAction("super_admin", "schools", "edit")).toBe(true);
    expect(canAuditedRolePerformAction("admin_escuela", "schools", "edit")).toBe(false);
    expect(canAuditedRolePerformAction("admin_sede", "schools", "edit")).toBe(false);
    expect(canAuditedRolePerformAction("administrativo", "schools", "edit")).toBe(false);
  });

  it("keeps super_admin focused on global modules instead of daily school operation", () => {
    expect(canAuditedRolePerformAction("super_admin", "students", "view")).toBe(false);
    expect(canAuditedRolePerformAction("super_admin", "income", "view")).toBe(false);
    expect(canAuditedRolePerformAction("super_admin", "reports", "view")).toBe(true);
    expect(canAuditedRolePerformAction("super_admin", "exams", "configure")).toBe(true);
    expect(canAuditedRolePerformAction("super_admin", "subscriptions", "view")).toBe(true);
    expect(canAuditedRolePerformAction("admin_escuela", "subscriptions", "view")).toBe(false);
  });

  it("keeps admin_sede readonly in sedes and administrativos", () => {
    expect(getAuditedRoleCapability("admin_sede", "branches")).toMatchObject({
      state: "readonly",
      scope: "school",
    });
    expect(getAuditedRoleCapability("admin_sede", "staff")).toMatchObject({
      state: "readonly",
      scope: "branch",
    });
    expect(canAuditedRolePerformAction("admin_sede", "staff", "create")).toBe(false);
    expect(canAuditedRolePerformAction("admin_sede", "branches", "edit")).toBe(false);
  });

  it("keeps administrativo away from structural modules but active in daily operation", () => {
    expect(canAuditedRolePerformAction("administrativo", "staff", "create")).toBe(false);
    expect(canAuditedRolePerformAction("administrativo", "branches", "view")).toBe(false);
    expect(canAuditedRolePerformAction("administrativo", "income", "create")).toBe(true);
    expect(canAuditedRolePerformAction("administrativo", "automation", "sync")).toBe(true);
  });

  it("reserves CALE bank configuration to super_admin", () => {
    expect(getAuditedRolesForCapabilityAction("exams", "configure")).toEqual(["super_admin"]);
  });

  it("merges audited access with extra dashboard roles", () => {
    expect(getDashboardRolesForCapabilityModule("students", ["recepcion"])).toEqual(
      expect.arrayContaining(["admin_escuela", "admin_sede", "administrativo", "recepcion"])
    );
  });
});
