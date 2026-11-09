import { render } from "@testing-library/react";
import { expect, it } from "vitest";
import DashboardIncomeChart from "./DashboardIncomeChart";

const initialDimension = { width: 500, height: 220 };

it("renders without crashing with valid data", () => {
  const { container } = render(
    <DashboardIncomeChart
      initialDimension={initialDimension}
      data={[
        { date: 1, monto: 125000 },
        { date: 15, monto: 300000 },
        { date: 31, monto: 2500000 },
      ]}
    />
  );
  expect(container.querySelector(".recharts-responsive-container")).toBeTruthy();
});

it("renders without crashing with empty data", () => {
  const { container } = render(
    <DashboardIncomeChart initialDimension={initialDimension} data={[]} />
  );
  expect(container.querySelector(".recharts-responsive-container")).toBeTruthy();
});

it("renders without crashing with a single data point", () => {
  const { container } = render(
    <DashboardIncomeChart initialDimension={initialDimension} data={[{ date: 8, monto: 50000 }]} />
  );
  expect(container.querySelector(".recharts-responsive-container")).toBeTruthy();
});
