import { cleanup, fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import type { ComponentType, ReactNode } from "react";
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
    perfil: { id: "actor", rol: "admin_escuela", escuela_id: "school", sede_id: "branch" },
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
  ExpenseFiltersSection: () => null,
  ExpenseSearchHint: () => null,
  ExpenseSectionPanel: () => null,
  ExpenseStatusBanners: () => null,
  ExpenseSummarySection: () => null,
  ExpenseTableSection: () => null,
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
  mock.params = new URLSearchParams();
  localStorage.clear();
  mock.income.mockResolvedValue({ ledger: { rows: [], totalCount: 0 }, summary: {} });
  mock.expenses.mockResolvedValue({ summary: {}, breakdown: {}, payables: {} });
  mock.from.mockImplementation(() => {
    const result = { data: [], count: 0, error: null };
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
      query[method] = () => query;
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
    ["Configurar correo", "Conectar Correo de Facturas", "EmailIntegrationModal"],
    ["Busqueda historica", "Buscar Facturas Antiguas", "HistoricalSearchModal"],
  ])("opens only the requested invoice tool: %s", async (button, title, moduleName) => {
    mock.params = new URLSearchParams("section=facturas");
    render(<GastosPage />);
    fireEvent.click(screen.getByRole("button", { name: button }));
    const dialog = await screen.findByRole("dialog", { name: title });
    fireEvent.click(within(dialog).getByRole("button", { name: "Cancelar" }));
    expect(screen.queryByRole("dialog")).toBeNull();
    expect(mock.renders.length).toBeGreaterThan(0);
    expect(mock.renders.every((name) => name.includes(moduleName))).toBe(true);
    expect(mock.writes).not.toHaveBeenCalled();
  });
});
