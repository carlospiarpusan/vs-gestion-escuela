import { expect, it } from "vitest";
import {
  MODULES,
  ROLE_LABELS,
  canUseMobileModule,
  canEditMobileModule,
  getVisibleModulesForRole,
  getModuleById,
  getModulesForDestination,
  getModulesForMore,
  getRoleNavigationConfig,
} from "../src/lib/modules";
import type { Rol } from "../src/lib/types";

it.each(Object.keys(ROLE_LABELS) as Rol[])(
  "%s solo recibe modulos asignados y funcionales",
  (role) => {
    for (const descriptor of getVisibleModulesForRole(role)) {
      expect(descriptor.roles).toContain(role);
      expect(descriptor.mode).not.toBe("placeholder");
      expect(canUseMobileModule(role, descriptor.id)).toBe(true);
    }
    const navigation = getRoleNavigationConfig(role)!;
    expect(getModuleById("classes")).toBeNull();
    expect(
      navigation.destinations.flatMap((destination) => destination.moduleIds ?? [])
    ).not.toContain("classes");
    expect(getVisibleModulesForRole(role).map((d) => d.id)).not.toContain("classes");
    expect(canEditMobileModule(role, "classes")).toBe(false);
    expect(navigation.destinations.length).toBeGreaterThanOrEqual(3);
    expect(navigation.destinations.length).toBeLessThanOrEqual(5);
    expect(
      navigation.destinations.some(
        (destination) => destination.id === navigation.defaultDestination
      )
    ).toBe(true);
    for (const destination of navigation.destinations)
      if (destination.kind === "section") {
        expect(getModulesForDestination(role, destination.id).length).toBeGreaterThan(0);
      }
    expect(
      getModulesForMore(role).every((descriptor) => canUseMobileModule(role, descriptor.id))
    ).toBe(true);
    for (const descriptor of MODULES)
      if (!descriptor.roles.includes(role) || descriptor.mode === "placeholder") {
        expect(canUseMobileModule(role, descriptor.id)).toBe(false);
        expect(canEditMobileModule(role, descriptor.id)).toBe(false);
      }
  }
);
it("alumnos e instructores no reciben cobros, directorios ni formularios de personal", () => {
  expect(getVisibleModulesForRole("alumno").map((d) => d.id)).toEqual(["exams"]);
  expect(getVisibleModulesForRole("instructor").map((d) => d.id)).toEqual([
    "vehicles",
    "hours",
    "logbook",
  ]);
  for (const role of ["alumno", "instructor"] as const)
    for (const descriptor of MODULES) expect(canEditMobileModule(role, descriptor.id)).toBe(false);
});
it("Horas es un acceso principal del instructor, sin abrir un directorio vacio", () => {
  const hours = getRoleNavigationConfig("instructor")!.destinations.find(
    (destination) => destination.id === "activity"
  );
  expect(hours).toMatchObject({ label: "Horas", moduleIds: ["hours"] });
  expect(getRoleNavigationConfig("instructor")!.defaultDestination).toBe("activity");
});
it("recepcion no recibe gastos, horas ni configuracion", () => {
  expect(getVisibleModulesForRole("recepcion").map((d) => d.id)).toEqual([
    "students",
    "income",
    "cash",
  ]);
});
it("no modifica configuracion global ni muestra placeholders al superadministrador", () => {
  expect(getVisibleModulesForRole("super_admin").map((d) => d.id)).toEqual([
    "staff",
    "branches",
    "schools",
  ]);
  expect(getRoleNavigationConfig("super_admin")!.destinations.map((d) => d.id)).toEqual([
    "home",
    "schools",
    "more",
  ]);
});
it("no concede modulos a un rol inexistente o sin perfil", () => {
  expect(getRoleNavigationConfig("unknown" as Rol)).toBeNull();
  expect(getVisibleModulesForRole(null)).toEqual([]);
  expect(canUseMobileModule(undefined, "students")).toBe(false);
});
