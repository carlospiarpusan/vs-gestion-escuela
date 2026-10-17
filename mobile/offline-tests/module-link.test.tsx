import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import type { ReactNode } from "react";
import { afterEach, expect, it, vi } from "vitest";
import { ModuleLink } from "../src/components/module-link";

vi.mock("../src/components/app-icon", () => ({ AppIcon: () => null }));
vi.mock("lucide-react-native", () => ({ ChevronRight: () => null }));
vi.mock("react-native", () => ({
  View: ({ children }: { children: ReactNode }) => <div>{children}</div>,
  Text: ({ children }: { children: ReactNode }) => <span>{children}</span>,
  StyleSheet: { create: (styles: unknown) => styles },
  Pressable: ({
    children,
    onPress,
    accessibilityLabel,
  }: {
    children: ReactNode;
    onPress: () => void;
    accessibilityLabel: string;
  }) => (
    <button aria-label={accessibilityLabel} onClick={onPress}>
      {children}
    </button>
  ),
}));
afterEach(cleanup);

it("la fila compacta conserva el nombre accesible y abre el modulo", () => {
  const open = vi.fn();
  render(<ModuleLink label="Vehiculos" icon="car" onPress={open} />);
  fireEvent.click(screen.getByRole("button", { name: "Vehiculos" }));
  expect(open).toHaveBeenCalledTimes(1);
});
it("no elimina las advertencias de conexion al simplificar el menu", () => {
  render(
    <ModuleLink
      label="Bitacora"
      icon="clipboard"
      onPress={() => {}}
      trailing={<span>Requiere conexion</span>}
    />
  );
  expect(screen.getByRole("button", { name: "Bitacora" })).toBeDefined();
  expect(screen.getByText("Requiere conexion")).toBeDefined();
});
