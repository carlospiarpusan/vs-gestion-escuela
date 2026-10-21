import { fireEvent, render, screen } from "@testing-library/react";
import { expect, it } from "vitest";
import DashboardIncomeChart from "./DashboardIncomeChart";
import { formatCop } from "@/lib/intl-formatters";

const initialDimension = { width: 500, height: 220 };

it("shows exact Colombian amounts with pointer, keyboard and touch selection", () => {
  render(
    <DashboardIncomeChart
      initialDimension={initialDimension}
      data={[
        { date: 1, monto: 125000 },
        { date: 31, monto: 2500000 },
      ]}
    />
  );
  const first = screen.getByRole("button", { name: `Día 1: ${formatCop(125000)}` });
  const last = screen.getByRole("button", { name: `Día 31: ${formatCop(2500000)}` });
  fireEvent.pointerEnter(first);
  expect(screen.getByRole("tooltip").textContent).toBe(`Día 1: ${formatCop(125000)}`);
  fireEvent.focus(last);
  expect(screen.getByRole("tooltip").textContent).toBe(`Día 31: ${formatCop(2500000)}`);
  fireEvent.keyDown(last, { key: "Escape" });
  expect(screen.queryByRole("tooltip")).not.toBeInTheDocument();
  fireEvent.click(first);
  expect(screen.getByRole("tooltip").textContent).toBe(`Día 1: ${formatCop(125000)}`);
});

it.each([
  { data: [{ date: 8, monto: 0 }] },
  {
    data: [
      { date: 1, monto: -500 },
      { date: 30, monto: 500 },
    ],
  },
])("draws finite coordinates for a single zero day and adjustments", ({ data }) => {
  const { container } = render(
    <DashboardIncomeChart initialDimension={initialDimension} data={data} />
  );
  expect(container.innerHTML).not.toMatch(/NaN|Infinity/);
  expect(screen.getAllByRole("button")).toHaveLength(data.length);
});

it("shows an explicit empty state instead of an empty or misleading chart", () => {
  render(<DashboardIncomeChart initialDimension={initialDimension} data={[]} />);
  expect(screen.getByText("No hay ingresos registrados en este mes.")).toBeInTheDocument();
  expect(screen.queryByRole("button")).not.toBeInTheDocument();
});
