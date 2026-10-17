import type { ReactNode, Dispatch, SetStateAction } from "react";
import { act, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { beforeEach, expect, it, vi } from "vitest";
import type { FilterState } from "./constants";
import Page from "./page";

const mock = vi.hoisted(() => ({ reports: vi.fn(), error: vi.fn() }));
vi.mock("@/hooks/useAuth", () => ({ useAuth: () => ({ perfil: { rol: "admin_escuela" } }) }));
vi.mock("@/hooks/useDeviceVariant", () => ({ useIsMobileVariant: () => false }));
vi.mock("next/navigation", () => ({ useSearchParams: () => new URLSearchParams() }));
vi.mock("sonner", () => ({ toast: { error: mock.error } }));
vi.mock("@/lib/finance/reports-service", () => ({ fetchFinanceReportsDashboard: mock.reports }));
vi.mock("@/components/dashboard/accounting/AccountingWorkspace", () => ({
  AccountingWorkspaceHeader: ({ actions }: { actions: ReactNode }) => <header>{actions}</header>,
}));
vi.mock("./InformesSections", () => ({
  InformesFiltersPanel: ({
    draftFilters,
    setDraftFilters,
  }: {
    draftFilters: FilterState;
    setDraftFilters: Dispatch<SetStateAction<FilterState>>;
  }) => (
    <select
      aria-label="Mes"
      value={draftFilters.month}
      onChange={(event) =>
        setDraftFilters((current) => ({ ...current, month: event.target.value }))
      }
    >
      <option value="all">Todos</option>
      <option value="10">Octubre</option>
    </select>
  ),
  InformesStatusBanner: () => null,
  InformesTabs: () => null,
  InformesStudentsSection: () => null,
  InformesSummarySection: ({ report }: { report: { generatedAt: string } | null }) => (
    <output data-testid="report">{report?.generatedAt || ""}</output>
  ),
}));
function report(name: string) {
  return {
    generatedAt: name,
    summary: { totalMovimientos: 1 },
    options: { escuelas: [], sedes: [], availableYears: [2026] },
    breakdown: { ingresosPorLinea: [], gastosPorCategoria: [] },
  };
}
beforeEach(() => {
  vi.clearAllMocks();
  mock.reports.mockResolvedValue(report("initial"));
});

it("Actualizar always sends a fresh request, even with unchanged filters", async () => {
  render(<Page />);
  await screen.findByText("initial");
  const button = screen.getByRole("button", { name: "Actualizar informe" });
  fireEvent.click(button);
  await waitFor(() => expect(mock.reports).toHaveBeenCalledTimes(2));
  expect(mock.reports.mock.calls[1][1]).toEqual({ forceFresh: true, useCache: false });
  await act(async () => {});
  fireEvent.click(button);
  await waitFor(() => expect(mock.reports).toHaveBeenCalledTimes(3));
});
it("Intentar de nuevo performs a request after an error with the same filters", async () => {
  mock.reports.mockRejectedValueOnce(Error("connection failure"));
  render(<Page />);
  fireEvent.click(await screen.findByRole("button", { name: "Intentar de nuevo" }));
  await screen.findByText("initial");
  expect(mock.reports).toHaveBeenCalledTimes(2);
});
it("only the newest report is displayed when requests finish out of order", async () => {
  let finishOld!: (value: unknown) => void;
  mock.reports.mockImplementationOnce(
    () =>
      new Promise((resolve) => {
        finishOld = resolve;
      })
  );
  mock.reports.mockResolvedValueOnce(report("new month"));
  render(<Page />);
  await waitFor(() => expect(mock.reports).toHaveBeenCalledTimes(1));
  fireEvent.change(screen.getByRole("combobox", { name: "Mes" }), { target: { value: "10" } });
  fireEvent.click(screen.getByRole("button", { name: "Actualizar informe" }));
  await screen.findByText("new month");
  expect((mock.reports.mock.calls[1][0] as URLSearchParams).get("from")).toBe("2026-10-01");
  await act(async () => finishOld(report("stale")));
  expect(screen.getByTestId("report")).toHaveTextContent("new month");
  expect(mock.error).not.toHaveBeenCalled();
});
it("an old failure does not erase the latest report or show a false error", async () => {
  let failOld!: (error: Error) => void;
  mock.reports.mockImplementationOnce(
    () =>
      new Promise((_resolve, reject) => {
        failOld = reject;
      })
  );
  mock.reports.mockResolvedValueOnce(report("latest"));
  render(<Page />);
  await waitFor(() => expect(mock.reports).toHaveBeenCalledTimes(1));
  fireEvent.click(screen.getByRole("button", { name: "Actualizar informe" }));
  await screen.findByText("latest");
  await act(async () => failOld(Error("stale error")));
  expect(screen.getByTestId("report")).toHaveTextContent("latest");
  expect(mock.error).not.toHaveBeenCalled();
});
