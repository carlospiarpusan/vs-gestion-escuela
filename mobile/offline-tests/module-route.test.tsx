import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, expect, it, vi } from "vitest";
import type { Rol } from "../src/lib/types";
import DashboardModuleRoute from "../app/(protected)/dashboard/[module]";

const state = vi.hoisted(() => ({ role: "instructor" as Rol, module: "hours" }));
vi.mock("expo-router", () => ({
  useLocalSearchParams: () => ({ module: state.module }),
  Redirect: ({ href }: { href: string }) => <span>Redirect:{href}</span>,
}));
vi.mock("../src/context/app-context", () => ({
  useApp: () => ({ profile: { rol: state.role } }),
}));
vi.mock("../src/components/module-screen", () => ({
  ModuleScreen: ({ moduleId }: { moduleId: string }) => <span>Module:{moduleId}</span>,
}));
afterEach(cleanup);
it.each([
  ["instructor", "students"],
  ["alumno", "income"],
  ["recepcion", "hours"],
  ["admin_escuela", "portfolio"],
  ["admin_escuela", "classes"],
  ["instructor", "classes"],
  ["alumno", "classes"],
] as const)("%s no abre la ruta retirada o no asignada %s", (role, module) => {
  state.role = role;
  state.module = module;
  render(<DashboardModuleRoute />);
  expect(screen.getByText("Redirect:/(protected)/dashboard")).toBeDefined();
  expect(screen.queryByText(/^Module:/)).toBeNull();
});
it.each([
  ["instructor", "hours"],
  ["alumno", "exams"],
  ["recepcion", "students"],
] as const)("%s conserva acceso al modulo funcional %s", (role, module) => {
  state.role = role;
  state.module = module;
  render(<DashboardModuleRoute />);
  expect(screen.getByText(`Module:${module}`)).toBeDefined();
});
