import { act, cleanup, fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import type { ComponentType, ReactNode } from "react";
import { createClient as createSupabaseClient } from "@supabase/supabase-js";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import IngresosPage from "./ingresos/page";
import GastosPage from "./gastos/page";

const mock = vi.hoisted(() => ({
  renders: [] as string[],
  from: vi.fn(),
  writes: vi.fn(),
  income: vi.fn(),
  expenses: vi.fn(),
  params: new URLSearchParams(),
  queries: [] as Array<{ table: string; calls: Array<[string, unknown[]]> }>,
}));

vi.mock("next/dynamic", async () => {
  const { lazy, Suspense } = await import("react");
  return {
    default: (loader: () => Promise<{ default: ComponentType<Record<string, unknown>> }>) => {
      const Component = lazy(loader);
      return function Deferred(props: Record<string, unknown>) {
        mock.renders.push(loader.toString());
        return (
          <Suspense fallback={<span>Cargando formulario</span>}>
            <Component {...props} />
          </Suspense>
        );
      };
    },
  };
});
vi.mock("next/navigation", () => ({ useSearchParams: () => mock.params }));
vi.mock("@/hooks/useAuth", () => ({
  useAuth: () => ({
    perfil: {
      id: "actor",
      rol: "admin_escuela",
      escuela_id: "school",
      sede_id: "branch",
      email: "admin.personal@example.com",
    },
  }),
}));
vi.mock("@/hooks/useDeviceVariant", () => ({ useIsMobileVariant: () => false }));
vi.mock("@/lib/supabase", () => ({ createClient: () => ({ from: mock.from }) }));
vi.mock("@/lib/finance/income-service", () => ({ fetchIncomeDashboard: mock.income }));
vi.mock("@/lib/finance/expense-service", () => ({ fetchExpenseDashboard: mock.expenses }));
vi.mock("@/lib/dashboard-client-cache", () => ({
  getDashboardCatalogCached: ({ loader }: { loader: () => unknown }) => loader(),
  getDashboardListCached: ({ loader }: { loader: () => unknown }) => loader(),
  invalidateDashboardClientCaches: vi.fn(),
}));
vi.mock("@/lib/server-cache-client", () => ({ revalidateTaggedServerCaches: vi.fn() }));
vi.mock("@/components/dashboard/accounting/AccountingWorkspace", () => ({
  AccountingWorkspaceHeader: ({ actions }: { actions: ReactNode }) => <header>{actions}</header>,
}));
vi.mock("./ingresos/IncomeSections", () => ({
  IncomeFiltersSection: () => null,
  IncomeOverviewSection: () => null,
  IncomeViewSection: () => null,
  IncomeLedgerSection: ({ onDelete }: { onDelete: (row: unknown) => void }) => (
    <button onClick={() => onDelete({ id: "fixture", concepto: "Ingreso" })}>
      Eliminar ingreso de prueba
    </button>
  ),
}));
vi.mock("./gastos/GastosSections", () => ({
  buildExpenseColumns: () => [],
  buildExpenseTramitadorOptions: () => [],
  ExpenseFiltersSection: ({ onMesChange }: { onMesChange: (value: string) => void }) => (
    <button onClick={() => onMesChange("01")}>Consultar enero</button>
  ),
  ExpenseSearchHint: () => null,
  ExpenseSectionPanel: () => null,
  ExpenseStatusBanners: () => null,
  ExpenseSummarySection: ({
    summary,
    summaryLoading,
  }: {
    summary: { summary?: { gastosTotales?: number } } | null;
    summaryLoading: boolean;
  }) => (
    <output data-testid="expense-summary">
      {summaryLoading ? "cargando" : (summary?.summary?.gastosTotales ?? "vacio")}
    </output>
  ),
  ExpenseTableSection: ({
    totalCount,
    data,
    onPageChange,
  }: {
    totalCount: number;
    data: unknown[];
    onPageChange: (page: number) => void;
  }) => (
    <>
      <output data-testid="expense-count">
        {data.length}/{totalCount}
      </output>
      <button onClick={() => onPageChange(1)}>Segunda página de gastos</button>
    </>
  ),
  ExpenseFacturasSection: ({
    onOpenImportModal,
    onOpenIntegration,
    onOpenHistoricalSearch,
  }: {
    onOpenImportModal: () => void;
    onOpenIntegration: () => void;
    onOpenHistoricalSearch: () => void;
  }) => (
    <>
      <button onClick={onOpenImportModal}>Importar XML</button>
      <button onClick={onOpenIntegration}>Configurar correo</button>
      <button onClick={onOpenHistoricalSearch}>Busqueda historica</button>
    </>
  ),
}));

beforeEach(() => {
  vi.clearAllMocks();
  mock.renders.length = 0;
  mock.queries.length = 0;
  mock.params = new URLSearchParams();
  localStorage.clear();
  mock.income.mockResolvedValue({ ledger: { rows: [], totalCount: 0 }, summary: {} });
  mock.expenses.mockResolvedValue({ summary: {}, breakdown: {}, payables: {} });
  mock.from.mockImplementation((table: string) => {
    const calls: Array<[string, unknown[]]> = [];
    mock.queries.push({ table, calls });
    const result = { data: [{ id: "expense-fixture" }], count: 32, error: null };
    const query: Record<string, unknown> = {
      then: (resolve: (value: unknown) => unknown) => Promise.resolve(result).then(resolve),
    };
    for (const method of [
      "select",
      "eq",
      "gte",
      "lte",
      "order",
      "range",
      "in",
      "or",
      "neq",
      "not",
      "ilike",
      "is",
    ])
      query[method] = (...args: unknown[]) => {
        calls.push([method, args]);
        return query;
      };
    for (const method of ["insert", "update", "delete", "upsert"]) query[method] = mock.writes;
    return query;
  });
  vi.stubGlobal(
    "fetch",
    vi.fn(
      async () => new Response(JSON.stringify({ integration: null, history: [] }), { status: 200 })
    )
  );
});
afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
});

describe("finance dialogs are loaded only when opened", () => {
  it.each([
    ["Ingresos", IngresosPage],
    ["Gastos", GastosPage],
  ] as const)("does not mount or import hidden dialogs on the %s listing", async (_name, Page) => {
    render(<Page />);
    await waitFor(() => expect(_name === "Ingresos" ? mock.income : mock.from).toHaveBeenCalled());
    expect(mock.renders).toEqual([]);
    expect(screen.queryByRole("dialog")).toBeNull();
  });

  it("keeps income validation and draft values after closing and reopening", async () => {
    render(<IngresosPage />);
    fireEvent.click(screen.getByRole("button", { name: "Registrar ingreso" }));
    let dialog = await screen.findByRole("dialog", { name: "Nuevo ingreso" });
    fireEvent.click(within(dialog).getByRole("button", { name: "Crear ingreso" }));
    await within(dialog).findByText("Concepto y monto son obligatorios.");
    fireEvent.change(dialog.querySelector('input[type="text"]')!, {
      target: { value: "Borrador local" },
    });
    fireEvent.click(within(dialog).getByRole("button", { name: "Cancelar" }));
    expect(screen.queryByRole("dialog")).toBeNull();
    fireEvent.click(screen.getByRole("button", { name: "Registrar ingreso" }));
    dialog = await screen.findByRole("dialog", { name: "Nuevo ingreso" });
    expect(dialog.querySelector('input[type="text"]')).toHaveValue("Borrador local");
    expect(mock.renders.every((name) => name.includes("IngresoModal"))).toBe(true);
    expect(mock.writes).not.toHaveBeenCalled();
  });

  it("opens the real delete confirmation only on request and cancels without writing", async () => {
    render(<IngresosPage />);
    fireEvent.click(screen.getByRole("button", { name: "Eliminar ingreso de prueba" }));
    const dialog = await screen.findByRole("dialog", { name: "Eliminar registro" });
    expect(within(dialog).getByText(/¿Eliminar este ingreso/)).toBeDefined();
    fireEvent.click(within(dialog).getByRole("button", { name: "Cancelar" }));
    expect(screen.queryByRole("dialog")).toBeNull();
    expect(mock.renders.every((name) => name.includes("DeleteConfirm"))).toBe(true);
    expect(mock.writes).not.toHaveBeenCalled();
  });

  it("opens and preserves the expense draft without loading invoice or email forms", async () => {
    render(<GastosPage />);
    fireEvent.click(screen.getByRole("button", { name: "Nuevo gasto" }));
    let dialog = await screen.findByRole("dialog", { name: "Nuevo Gasto" });
    fireEvent.change(dialog.querySelector('input[type="text"]')!, {
      target: { value: "Compra pendiente" },
    });
    fireEvent.click(within(dialog).getByRole("button", { name: "Cancelar" }));
    fireEvent.click(screen.getByRole("button", { name: "Nuevo gasto" }));
    dialog = await screen.findByRole("dialog", { name: "Nuevo Gasto" });
    expect(dialog.querySelector('input[type="text"]')).toHaveValue("Compra pendiente");
    expect(mock.renders.every((name) => name.includes("GastoModal"))).toBe(true);
    expect(mock.writes).not.toHaveBeenCalled();
  });

  it.each([
    ["Importar XML", "Importar Factura Electronica", "ImportInvoiceModal"],
    ["Configurar correo", "Conectar correo de la empresa", "EmailIntegrationModal"],
    ["Busqueda historica", "Buscar Facturas Antiguas", "HistoricalSearchModal"],
  ])("opens only the requested invoice tool: %s", async (button, title, moduleName) => {
    mock.params = new URLSearchParams("section=facturas");
    render(<GastosPage />);
    fireEvent.click(screen.getByRole("button", { name: button }));
    const dialog = await screen.findByRole("dialog", { name: title });
    if (moduleName === "EmailIntegrationModal") {
      fireEvent.click(within(dialog).getByRole("button", { name: "Usar otro correo (IMAP)" }));
      expect(dialog.querySelector('input[type="email"]')).toHaveValue("");
    }
    fireEvent.click(within(dialog).getByRole("button", { name: "Cancelar" }));
    expect(screen.queryByRole("dialog")).toBeNull();
    expect(mock.renders.length).toBeGreaterThan(0);
    expect(mock.renders.every((name) => name.includes(moduleName))).toBe(true);
    expect(mock.writes).not.toHaveBeenCalled();
  });
});

describe("expense request efficiency and filter consistency", () => {
  it.each([
    ["libro", null],
    ["nomina", ["categoria", "nominas"]],
    ["cuentas", ["estado_pago", "pendiente"]],
    ["tramitadores", ["categoria", "tramitador"]],
  ])("loads rows and the full count in one request for %s", async (section, forcedFilter) => {
    mock.params = new URLSearchParams({ section });
    render(<GastosPage />);
    await waitFor(() => expect(screen.getByTestId("expense-count")).toHaveTextContent("1/32"));
    const queries = mock.queries.filter((q) => q.table === "gastos");
    expect(queries).toHaveLength(1);
    expect(queries[0].calls.find(([method]) => method === "select")?.[1][1]).toEqual({
      count: "exact",
    });
    if (forcedFilter) expect(queries[0].calls).toContainEqual(["eq", forcedFilter]);
    expect(queries[0].calls).toContainEqual(["eq", ["escuela_id", "school"]]);
    fireEvent.click(screen.getByRole("button", { name: "Segunda página de gastos" }));
    await waitFor(() => expect(mock.queries.filter((q) => q.table === "gastos")).toHaveLength(2));
    const second = mock.queries.filter((q) => q.table === "gastos")[1];
    const [from, to] = second.calls.find(([method]) => method === "range")![1] as number[];
    expect(from).toBeGreaterThan(0);
    expect(to - from + 1).toBe(from);
    expect(screen.getByTestId("expense-count")).toHaveTextContent("1/32");
  });

  it.each(["resolve", "reject"])(
    "ignores an obsolete summary that finishes with %s",
    async (outcome) => {
      let finishOld!: (value: unknown) => void;
      let failOld!: (error: Error) => void;
      mock.expenses.mockImplementationOnce(
        () =>
          new Promise((resolve, reject) => {
            finishOld = resolve;
            failOld = reject;
          })
      );
      mock.expenses.mockResolvedValue({ summary: { gastosTotales: 200 } });
      render(<GastosPage />);
      await waitFor(() => expect(mock.expenses).toHaveBeenCalledTimes(1));
      fireEvent.click(screen.getByRole("button", { name: "Consultar enero" }));
      await waitFor(() => expect(screen.getByTestId("expense-summary")).toHaveTextContent("200"));
      await act(async () => {
        if (outcome === "resolve") finishOld({ summary: { gastosTotales: 100 } });
        else failOld(new Error("respuesta antigua"));
      });
      expect(screen.getByTestId("expense-summary")).toHaveTextContent("200");
    }
  );
});

it("uses one HTTP GET with exact count and a bounded range through the real Supabase client", async () => {
  const requests: Array<{ url: URL; headers: Headers; method: string }> = [];
  const client = createSupabaseClient("https://fixture.supabase.co", "fixture-public-key", {
    auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false },
    global: {
      fetch: async (input, init) => {
        requests.push({
          url: new URL(String(input)),
          headers: new Headers(init?.headers),
          method: init?.method || "GET",
        });
        return new Response(JSON.stringify([{ id: "fixture", concepto: "Gasto de prueba" }]), {
          status: 200,
          headers: { "Content-Type": "application/json", "Content-Range": "0-14/32" },
        });
      },
    },
  });
  mock.from.mockImplementation((table) => client.from(table));
  mock.params = new URLSearchParams("section=cuentas");
  render(<GastosPage />);
  await waitFor(() => expect(screen.getByTestId("expense-count")).toHaveTextContent("1/32"));
  expect(requests).toHaveLength(1);
  expect(requests[0].method).toBe("GET");
  expect(requests[0].headers.get("prefer")).toContain("count=exact");
  expect(requests[0].url.pathname).toBe("/rest/v1/gastos");
  expect(requests[0].url.searchParams.get("escuela_id")).toBe("eq.school");
  expect(requests[0].url.searchParams.get("estado_pago")).toBe("eq.pendiente");
  expect(Number(requests[0].url.searchParams.get("limit"))).toBeGreaterThan(0);
});
