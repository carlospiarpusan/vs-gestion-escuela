import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, beforeEach, expect, it, vi } from "vitest";
import type { ReactNode } from "react";
import { HoursScreen } from "../src/components/hours-screen";
import { bogotaToday } from "../src/lib/hours";
import { deferred, profile } from "./fixtures";

const mocks = vi.hoisted(() => ({ load: vi.fn(), user: { id: "a" } }));
vi.mock("../src/lib/data", () => ({ loadWorkHours: mocks.load }));
vi.mock("../src/context/app-context", () => ({
  useApp: () => ({ profile: { ...profile(mocks.user.id), rol: "instructor" }, isOnline: true }),
}));
vi.mock("lucide-react-native", () => ({
  ChevronLeft: () => null,
  ChevronRight: () => null,
  RefreshCw: () => null,
}));
vi.mock("react-native", () => ({
  View: ({ children }: { children: ReactNode }) => <div>{children}</div>,
  Text: ({ children, accessibilityRole }: { children: ReactNode; accessibilityRole?: string }) => (
    <span role={accessibilityRole}>{children}</span>
  ),
  TextInput: ({
    accessibilityLabel,
    value,
    onChangeText,
  }: {
    accessibilityLabel: string;
    value: string;
    onChangeText: (value: string) => void;
  }) => (
    <input
      aria-label={accessibilityLabel}
      value={value}
      onChange={(e) => onChangeText(e.target.value)}
    />
  ),
  Pressable: ({
    children,
    onPress,
    accessibilityLabel,
    accessibilityRole,
    accessibilityState,
    disabled,
  }: {
    children: ReactNode;
    onPress: () => void;
    accessibilityLabel?: string;
    accessibilityRole?: string;
    accessibilityState?: { selected: boolean };
    disabled?: boolean;
  }) => (
    <button
      role={accessibilityRole}
      aria-label={accessibilityLabel}
      aria-selected={accessibilityState?.selected}
      disabled={disabled}
      onClick={onPress}
    >
      {children}
    </button>
  ),
  ActivityIndicator: () => <span>Loading</span>,
  StyleSheet: { create: (styles: unknown) => styles },
}));
vi.mock("../src/components/primitives", () => ({
  AppScreen: ({ children }: { children: ReactNode }) => <main>{children}</main>,
  Panel: ({ title, children }: { title: string; children: ReactNode }) => (
    <section>
      <h2>{title}</h2>
      {children}
    </section>
  ),
  StatGrid: ({ items }: { items: { label: string; value: string }[] }) => (
    <div>
      {items.map((item) => (
        <span key={item.label}>
          {item.label}: {item.value}
        </span>
      ))}
    </div>
  ),
  Tag: ({ label }: { label: string }) => <span>{label}</span>,
  EmptyState: ({ title }: { title: string }) => <span>{title}</span>,
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
  SecondaryButton: ({
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
}));
const rows = [{ id: "h", fecha: "2026-10-02", horas: "7.5", instructor_id: "i" }];
beforeEach(() => {
  mocks.user.id = "a";
  mocks.load.mockReset().mockResolvedValue({ rows, fromCache: false });
});
afterEach(cleanup);
it("muestra el total del mes actual y filtra dia, mes y ano", async () => {
  render(<HoursScreen />);
  await screen.findByText("Horas trabajadas: 7,5");
  expect(mocks.load).toHaveBeenCalledWith({ mode: "month", date: bogotaToday() });
  fireEvent.click(screen.getByRole("tab", { name: "D\u00eda" }));
  fireEvent.change(screen.getByLabelText("Periodo"), { target: { value: "2026-09-30" } });
  fireEvent.click(screen.getByText("Aplicar filtro"));
  await waitFor(() =>
    expect(mocks.load).toHaveBeenLastCalledWith({ mode: "day", date: "2026-09-30" })
  );
  fireEvent.click(screen.getByRole("tab", { name: "A\u00f1o" }));
  fireEvent.change(screen.getByLabelText("Periodo"), { target: { value: "2025" } });
  fireEvent.click(screen.getByText("Aplicar filtro"));
  await waitFor(() =>
    expect(mocks.load).toHaveBeenLastCalledWith({ mode: "year", date: "2025-01-01" })
  );
  fireEvent.click(screen.getByRole("button", { name: "Periodo anterior" }));
  await waitFor(() =>
    expect(mocks.load).toHaveBeenLastCalledWith({ mode: "year", date: "2024-01-01" })
  );
});
it("no muestra cero ni datos anteriores si falla la consulta", async () => {
  mocks.load.mockRejectedValue(new Error("permission denied"));
  render(<HoursScreen />);
  await screen.findByText("permission denied");
  expect(screen.queryByText(/Horas trabajadas:/)).toBeNull();
  expect(screen.queryByText("Sin horas registradas")).toBeNull();
});
it("rechaza fechas imposibles sin pedir otro periodo", async () => {
  render(<HoursScreen />);
  await screen.findByText("Horas trabajadas: 7,5");
  fireEvent.change(screen.getByLabelText("Periodo"), { target: { value: "2026-13" } });
  fireEvent.click(screen.getByText("Aplicar filtro"));
  expect(screen.getByText("Selecciona una fecha valida.")).toBeDefined();
  expect(mocks.load).toHaveBeenCalledTimes(1);
});
it("el control compacto Actualizar sigue cargando las horas del periodo", async () => {
  render(<HoursScreen />);
  await screen.findByText("Horas trabajadas: 7,5");
  fireEvent.click(screen.getByRole("button", { name: "Actualizar" }));
  await waitFor(() => expect(mocks.load).toHaveBeenCalledTimes(2));
  await screen.findByText("Horas trabajadas: 7,5");
});
it("ignora respuestas tardias de otro periodo o cuenta", async () => {
  const delayed = deferred<{ rows: typeof rows; fromCache: boolean }>();
  mocks.load.mockReturnValueOnce(delayed.promise).mockResolvedValue({ rows: [], fromCache: false });
  const view = render(<HoursScreen />);
  mocks.user.id = "b";
  view.rerender(<HoursScreen />);
  await screen.findByText("Horas trabajadas: 0");
  delayed.resolve({ rows, fromCache: false });
  await waitFor(() => expect(screen.queryByText("Horas trabajadas: 7,5")).toBeNull());
});
