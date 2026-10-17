import { act, cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type { ReactNode } from "react";
import { ModuleScreen } from "../src/components/module-screen";
import { deferred, profile } from "./fixtures";
import type { MobileModuleId } from "../src/lib/types";

const mocks = vi.hoisted(() => ({
  rows: vi.fn(),
  read: vi.fn(),
  queue: vi.fn(),
  sync: vi.fn(),
  web: vi.fn(),
}));
vi.mock("expo-router", () => ({ router: { push: vi.fn(), back: vi.fn() } }));
vi.mock("../src/components/hours-screen", () => ({ HoursScreen: () => null }));
vi.mock("react-native", () => ({
  View: ({ children }: { children: ReactNode }) => <div>{children}</div>,
  Text: ({ children }: { children: ReactNode }) => <span>{children}</span>,
  Pressable: ({
    children,
    onPress,
    disabled,
  }: {
    children: ReactNode;
    onPress: () => void;
    disabled?: boolean;
  }) => (
    <button disabled={disabled} onClick={onPress}>
      {children}
    </button>
  ),
  ActivityIndicator: ({ accessibilityLabel }: { accessibilityLabel: string }) => (
    <span role="status" aria-label={accessibilityLabel} />
  ),
  Linking: { openURL: mocks.web },
  StyleSheet: { create: (styles: unknown) => styles },
}));
vi.mock("../src/components/primitives", () => ({
  AppScreen: ({ children }: { children: ReactNode }) => <main>{children}</main>,
  Panel: ({ title, children }: { title?: string; children: ReactNode }) => (
    <section>
      {title && <h2>{title}</h2>}
      {children}
    </section>
  ),
  PrimaryButton: ({
    label,
    onPress,
    disabled,
  }: {
    label: string;
    onPress: () => void;
    disabled?: boolean;
  }) => (
    <button onClick={onPress} disabled={disabled}>
      {label}
    </button>
  ),
  SecondaryButton: ({ label, onPress }: { label: string; onPress: () => void }) => (
    <button onClick={onPress}>{label}</button>
  ),
  Field: ({
    label,
    value,
    onChangeText,
  }: {
    label: string;
    value: string;
    onChangeText: (value: string) => void;
  }) => (
    <label>
      {label}
      <input value={value ?? ""} onChange={(e) => onChangeText(e.target.value)} />
    </label>
  ),
  Tag: () => null,
  StatGrid: () => null,
  EmptyState: ({ title }: { title: string }) => <span>{title}</span>,
}));
vi.mock("../src/context/app-context", () => ({
  useApp: () => ({
    profile: profile(),
    subscriptionAccess: { can_write: true },
    pendingCount: 0,
    isOnline: false,
    syncNow: mocks.sync,
  }),
}));
vi.mock("../src/lib/data", () => ({
  loadModuleRows: mocks.rows,
  queueModuleMutation: mocks.queue,
  formatCurrency: (value: unknown) => String(value),
  withTransition: (work: () => void) => work(),
}));
vi.mock("../src/lib/offline", () => ({ readEntityRows: mocks.read }));

const row = {
  id: "row",
  concepto: "Registro vigente",
  nombre: "Alumno",
  apellidos: "Fixture",
  monto: 1000,
  fecha: "2026-10-16",
};
beforeEach(() => {
  vi.clearAllMocks();
  mocks.rows.mockResolvedValue({ rows: [row], fromCache: false, online: true });
  mocks.read.mockResolvedValue([
    { payload: { id: "student", nombre: "Ana", apellidos: "Prueba" } },
  ]);
});
afterEach(cleanup);

async function open(moduleId: MobileModuleId) {
  const view = render(<ModuleScreen moduleId={moduleId} />);
  await screen.findByRole("button", { name: "Actualizar" });
  return view;
}

describe("on-demand native module catalogs", () => {
  it.each(["students", "income", "expenses", "vehicles", "instructors", "cash"] as const)(
    "does not read unrelated SQLite catalogs on the %s list",
    async (moduleId) => {
      await open(moduleId);
      expect(mocks.rows).toHaveBeenCalledWith(moduleId);
      expect(mocks.read).not.toHaveBeenCalled();
    }
  );

  it("loads only students when opening income and preserves the selected student", async () => {
    await open("income");
    fireEvent.click(screen.getByRole("button", { name: "Nuevo ingreso" }));
    fireEvent.click(await screen.findByRole("button", { name: "Ana Prueba" }));
    expect(mocks.read).toHaveBeenCalledTimes(1);
    expect(mocks.read).toHaveBeenCalledWith("students");
    expect((screen.getByLabelText("Alumno opcional") as HTMLInputElement).value).toBe("student");
    expect(screen.getByText("Registro vigente")).toBeDefined();
  });

  it("does not load any catalog when opening an expense or redirecting student creation", async () => {
    const expenses = await open("expenses");
    fireEvent.click(screen.getByRole("button", { name: "Nuevo gasto" }));
    expect(screen.getByLabelText("Concepto")).toBeDefined();
    expect(mocks.read).not.toHaveBeenCalled();
    expenses.unmount();
    await open("students");
    fireEvent.click(screen.getByRole("button", { name: "Crear alumno en web" }));
    expect(mocks.web).toHaveBeenCalledWith("https://condusoft.co/dashboard/alumnos");
    expect(mocks.read).not.toHaveBeenCalled();
  });

  it("keeps list data and typed fields on a catalog failure, and retries only that catalog", async () => {
    mocks.read.mockRejectedValueOnce(new Error("Storage unavailable"));
    await open("income");
    fireEvent.click(screen.getByRole("button", { name: "Nuevo ingreso" }));
    fireEvent.change(screen.getByLabelText("Concepto"), { target: { value: "Borrador" } });
    await screen.findByText("No se pudieron cargar los alumnos recientes.");
    expect(screen.getByText("Registro vigente")).toBeDefined();
    fireEvent.click(screen.getByRole("button", { name: "Reintentar" }));
    await screen.findByRole("button", { name: "Ana Prueba" });
    expect((screen.getByLabelText("Concepto") as HTMLInputElement).value).toBe("Borrador");
    expect(mocks.read).toHaveBeenCalledTimes(2);
    expect(mocks.rows).toHaveBeenCalledTimes(1);
    expect(mocks.queue).not.toHaveBeenCalled();
  });

  it("ignores an old catalog response after switching modules", async () => {
    const pending = deferred<Array<{ payload: Record<string, unknown> }>>();
    mocks.read.mockReturnValueOnce(pending.promise);
    const view = await open("income");
    fireEvent.click(screen.getByRole("button", { name: "Nuevo ingreso" }));
    await waitFor(() => expect(mocks.read).toHaveBeenCalledTimes(1));
    view.rerender(<ModuleScreen moduleId="expenses" />);
    await screen.findByRole("button", { name: "Nuevo gasto" });
    await act(async () => {
      pending.resolve([{ payload: { id: "old", nombre: "Anterior" } }]);
    });
    expect(screen.queryByText("Anterior")).toBeNull();
    expect(screen.queryByText("No se pudieron cargar los alumnos recientes.")).toBeNull();
    expect(screen.getByText("Registro vigente")).toBeDefined();
  });
});
