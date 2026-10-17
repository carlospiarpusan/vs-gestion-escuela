import { cleanup, render, screen } from "@testing-library/react";
import type { ReactNode } from "react";
import { afterEach, expect, it, vi } from "vitest";
import { StatGrid } from "../src/components/primitives";

const viewport = vi.hoisted(() => ({ width: 320 }));
vi.mock("react-native-safe-area-context", () => ({ SafeAreaView: () => null }));
vi.mock("react-native", () => ({
  useWindowDimensions: () => viewport,
  StyleSheet: { create: (styles: unknown) => styles },
  View: ({ children, style }: { children: ReactNode; style?: unknown }) => {
    const flat = Object.assign({}, ...[style].flat(Infinity).filter(Boolean));
    return <div data-basis={flat.flexBasis}>{children}</div>;
  },
  Text: ({ children }: { children: ReactNode }) => <span>{children}</span>,
}));
afterEach(cleanup);
const items = [{ id: "income", label: "Ingresos", value: "$12.450.000" }];

it("da una fila completa a los importes largos en pantallas pequenas", () => {
  viewport.width = 320;
  render(<StatGrid items={items} />);
  expect(screen.getByText("$12.450.000").parentElement?.getAttribute("data-basis")).toBe("100%");
});
it("conserva columnas para cifras cortas o pantallas amplias", () => {
  viewport.width = 640;
  render(<StatGrid items={items} />);
  expect(screen.getByText("$12.450.000").parentElement?.getAttribute("data-basis")).toBe("45%");
});
