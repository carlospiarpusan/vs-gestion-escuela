import { act, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { beforeEach, afterEach, expect, it, vi } from "vitest";
import Page from "./page";
import {
  buildAnalysisWindow,
  createSchoolAnalysis,
  type AnalysisPayload,
} from "@/lib/analytics/school-analysis";

const mock = vi.hoisted(() => ({
  fetch: vi.fn(),
  download: vi.fn(),
  search: "",
  profile: { id: "user", rol: "admin_escuela", escuela_id: "school", sede_id: "branch" },
}));
vi.mock("@/hooks/useAuth", () => ({ useAuth: () => ({ perfil: mock.profile }) }));
vi.mock("next/navigation", () => ({ useSearchParams: () => new URLSearchParams(mock.search) }));
vi.mock("@/lib/spreadsheet-export", () => ({ downloadSpreadsheetWorkbook: mock.download }));

function report(collected = 1000) {
  const payload: AnalysisPayload = {
    periods: [
      {
        key: "current",
        enrollments: 3,
        collected,
        collectedCount: 2,
        paidExpenses: 100,
        expenseCount: 2,
        pendingExpenses: 20,
        cashFlow: collected - 100,
      },
      {
        key: "previous",
        enrollments: 0,
        collected: 0,
        collectedCount: 0,
        paidExpenses: 0,
        expenseCount: 0,
        pendingExpenses: 0,
        cashFlow: 0,
      },
    ],
    monthly: [{ month: "2026-10", enrollments: 3, collected, paidExpenses: 100 }],
    courses: [{ categories: ["A2 Y B1"], count: 3 }],
    expenses: [],
    portfolio: {
      balance: 200,
      obligations: 1,
      overdue: 0,
      withoutSchedule: 200,
      aging: [{ bucket: "90+", balance: 200, count: 1 }],
    },
    quality: {
      students: 3,
      incompleteContact: 0,
      duplicateDocuments: 0,
      contractsWithoutValue: 0,
      regularsWithoutContract: 0,
      unlinkedCollections: 0,
      firstActivity: "2025-01-01",
    },
    branches: [
      { id: "branch", name: "Centro" },
      { id: "north", name: "Norte" },
    ],
  };
  const now = new Date("2026-10-26T15:00:00Z");
  return createSchoolAnalysis(
    payload,
    buildAnalysisWindow(2026, 10, now),
    { schoolId: "school", branchId: null },
    now
  );
}
beforeEach(() => {
  vi.clearAllMocks();
  mock.search = "";
  vi.useFakeTimers({ toFake: ["Date"] });
  vi.setSystemTime(new Date("2026-10-26T15:00:00Z"));
  mock.profile = { id: "user", rol: "admin_escuela", escuela_id: "school", sede_id: "branch" };
  vi.stubGlobal("fetch", mock.fetch);
  mock.fetch.mockResolvedValue({ ok: true, json: async () => report() });
  mock.download.mockResolvedValue(undefined);
});
afterEach(() => {
  vi.useRealTimers();
  vi.unstubAllGlobals();
});

it("shows the real comparison, honest cashflow definitions, current portfolio and working navigation", async () => {
  render(<Page />);
  await screen.findByRole("heading", { name: "Evolución del período" });
  expect(screen.getAllByText("Sin base comparable").length).toBe(3);
  expect(screen.getByText(/No es utilidad/)).toBeInTheDocument();
  expect(screen.getByText("Antigüedad desde el registro, no días de mora")).toBeInTheDocument();
  expect(screen.getByRole("link", { name: "Informes" })).toHaveAttribute(
    "href",
    "/dashboard/informes"
  );
  expect(
    screen.getByRole("link", { name: "Revisar: Saldo sin programación completa" })
  ).toHaveAttribute("href", "#analysis-debt");
  for (const link of screen.getAllByRole("link", { name: /^Revisar:/ })) {
    expect(document.getElementById(link.getAttribute("href")!.slice(1))).not.toBeNull();
  }
  expect(screen.getByText("A2 + B1")).toBeInTheDocument();
});
it("shows a recoverable message instead of a JSON parser error when a proxy returns HTML", async () => {
  mock.fetch.mockResolvedValueOnce({
    ok: false,
    json: async () => {
      throw new SyntaxError("Unexpected token '<'");
    },
  });
  render(<Page />);
  await screen.findByText("No se pudo cargar el análisis. Vuelve a intentarlo.");
  expect(screen.queryByText(/Unexpected token/)).not.toBeInTheDocument();
  expect(screen.getByRole("button", { name: "Excel" })).toBeDisabled();
});
it("clears branch choices from the previous school instead of sending its branch to the new one", async () => {
  const view = render(<Page />);
  await screen.findByRole("heading", { name: "Señales" });
  fireEvent.change(screen.getByRole("combobox", { name: "Sede" }), { target: { value: "north" } });
  fireEvent.click(screen.getByRole("button", { name: "Actualizar" }));
  await screen.findByRole("heading", { name: "Señales" });
  mock.profile = { ...mock.profile, escuela_id: "new-school" };
  view.rerender(<Page />);
  await waitFor(() => expect(mock.fetch).toHaveBeenCalledTimes(3));
  expect(mock.fetch.mock.calls[2][0]).not.toContain("sede_id=north");
  await screen.findByRole("heading", { name: "Señales" });
  expect(screen.getByRole("combobox", { name: "Sede" })).toHaveValue("");
});
it("reads new URL filters when navigating to another analysis without leaving the page", async () => {
  const view = render(<Page />);
  await screen.findByRole("heading", { name: "Señales" });
  mock.search = "year=2025&month=all";
  view.rerender(<Page />);
  await waitFor(() => expect(mock.fetch).toHaveBeenCalledTimes(2));
  expect(mock.fetch.mock.calls[1][0]).toContain("year=2025&month=all");
  expect(screen.getByRole("combobox", { name: "Año" })).toHaveValue("2025");
});
it("only applies draft filters on submit and explicitly refreshes even with the same filters", async () => {
  render(<Page />);
  await screen.findByRole("heading", { name: "Señales" });
  fireEvent.change(screen.getByRole("combobox", { name: "Mes" }), { target: { value: "09" } });
  fireEvent.change(screen.getByRole("combobox", { name: "Sede" }), { target: { value: "north" } });
  expect(mock.fetch).toHaveBeenCalledTimes(1);
  fireEvent.click(screen.getByRole("button", { name: "Actualizar" }));
  await waitFor(() => expect(mock.fetch).toHaveBeenCalledTimes(2));
  expect(mock.fetch.mock.calls[1][0]).toContain("month=09");
  expect(mock.fetch.mock.calls[1][0]).toContain("sede_id=north");
  expect(mock.fetch.mock.calls[1][0]).toContain("fresh=1");
  await screen.findByRole("heading", { name: "Señales" });
  fireEvent.click(screen.getByRole("button", { name: "Actualizar" }));
  await waitFor(() => expect(mock.fetch).toHaveBeenCalledTimes(3));
});
it("retries failed requests and never turns a failed query into a successful zero report", async () => {
  mock.fetch.mockResolvedValueOnce({ ok: false, json: async () => ({ error: "Error temporal" }) });
  render(<Page />);
  await screen.findByText("Error temporal");
  expect(screen.queryByRole("heading", { name: "Cartera actual" })).not.toBeInTheDocument();
  expect(screen.getByRole("button", { name: "Excel" })).toBeDisabled();
  fireEvent.click(screen.getByRole("button", { name: "Reintentar" }));
  await screen.findByRole("heading", { name: "Señales" });
  expect(mock.fetch).toHaveBeenCalledTimes(2);
});
it("exports the displayed snapshot, not the unapplied filter choices", async () => {
  render(<Page />);
  await screen.findByRole("heading", { name: "Señales" });
  fireEvent.change(screen.getByRole("combobox", { name: "Mes" }), { target: { value: "09" } });
  fireEvent.click(screen.getByRole("button", { name: "Excel" }));
  await waitFor(() => expect(mock.download).toHaveBeenCalledTimes(1));
  expect(mock.download.mock.calls[0][0]).toBe("analisis-2026-10.xlsx");
  expect(mock.download.mock.calls[0][1][0].rows).toContainEqual(["Hasta", "2026-10-26"]);
});
it("cancels a queued export when its account context is replaced", async () => {
  const view = render(<Page />);
  await screen.findByRole("heading", { name: "Señales" });
  fireEvent.click(screen.getByRole("button", { name: "Excel" }));
  mock.profile = { ...mock.profile, id: "different-user" };
  view.rerender(<Page />);
  await screen.findByRole("heading", { name: "Señales" });
  expect(mock.download).not.toHaveBeenCalled();
});
it("does not fetch or render financial data for students, instructors or reception", () => {
  for (const rol of ["alumno", "instructor", "recepcion"]) {
    mock.profile = { ...mock.profile, rol };
    const view = render(<Page />);
    expect(screen.getByRole("alert")).toHaveTextContent("Tu rol no tiene acceso");
    view.unmount();
  }
  expect(mock.fetch).not.toHaveBeenCalled();
});
it("locks the branch selector for branch-limited staff and leaves scoping to the server", async () => {
  mock.profile = { ...mock.profile, rol: "administrativo" };
  render(<Page />);
  await screen.findByRole("heading", { name: "Señales" });
  expect(screen.getByRole("combobox", { name: "Sede" })).toBeDisabled();
  expect(mock.fetch.mock.calls[0][0]).not.toContain("sede_id");
});
it("aborts old requests and ignores a late successful response after the account changes", async () => {
  let finish!: (value: unknown) => void;
  mock.fetch.mockImplementationOnce(
    () =>
      new Promise((resolve) => {
        finish = resolve;
      })
  );
  const view = render(<Page />);
  await waitFor(() => expect(mock.fetch).toHaveBeenCalledTimes(1));
  mock.profile = { ...mock.profile, id: "new-user" };
  view.rerender(<Page />);
  await screen.findByRole("heading", { name: "Señales" });
  const newReport = screen.getAllByText(/1\.000/).length;
  await act(async () => finish({ ok: true, json: async () => report(987654) }));
  expect(screen.getAllByText(/1\.000/)).toHaveLength(newReport);
  expect(screen.queryByText(/987\.654/)).not.toBeInTheDocument();
  expect(mock.fetch.mock.calls[0][1].signal.aborted).toBe(true);
});
