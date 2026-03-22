"use client";

import { type ReactNode } from "react";
import {
  AlertTriangle,
  BarChart3,
  Clock3,
  Landmark,
  Link2,
  Mail,
  ReceiptText,
  RefreshCw,
  ShieldCheck,
  Unplug,
  Wallet,
  Repeat,
} from "lucide-react";
import DataTable from "@/components/dashboard/DataTable";
import AccountingBreakdownCard from "@/components/dashboard/AccountingBreakdownCard";
import {
  AccountingChipTabs,
  AccountingMiniList,
  AccountingPanel,
  AccountingStatCard,
} from "@/components/dashboard/accounting/AccountingWorkspace";
import { formatAccountingMoney, formatCompactDate } from "@/lib/accounting-dashboard";
import { EXPENSE_ADVANCED_SEARCH_HINT } from "@/lib/expense-search";
import type { ExpenseDashboardResponse, FinanceTramitadorPortfolioRow } from "@/lib/finance/types";
import type { FacturaCorreoImportacion, Gasto } from "@/types/database";
import {
  EXPENSE_SECTION_ITEMS,
  EXPENSE_VIEW_ITEMS,
  getEmailImportDisplayTitle,
  getExpenseDueMeta,
  type EmailInvoiceIntegrationView,
  type ExpenseSection,
  type ExpenseView,
} from "./constants";

type ExpenseTableColumn = {
  key: keyof Gasto | string;
  label: string;
  render?: (row: Gasto) => ReactNode;
};

type ExpenseStatusBannersProps = {
  linkedNotice: string;
  emailNotice: string;
  emailError: string;
  summaryError: string;
  tableError: string;
  activeSection: ExpenseSection;
};

type ExpenseSectionPanelProps = {
  activeSection: ExpenseSection;
  activeView: ExpenseView;
  onViewChange: (value: ExpenseView) => void;
};

type ExpenseFacturasSectionProps = {
  emailIntegration: EmailInvoiceIntegrationView | null;
  emailImportHistory: FacturaCorreoImportacion[];
  emailLoading: boolean;
  emailSyncing: boolean;
  emailSaving: boolean;
  onOpenImportModal: () => void;
  onOpenIntegration: () => void;
  onSync: () => void;
  onOpenHistoricalSearch: () => void;
  onDisconnect: () => void;
};

type ExpenseFiltersSectionProps = {
  activeSection: ExpenseSection;
  selectedTramitador: string;
  tramitadorOptions: string[];
  filtroCategoria: string;
  filtroMetodo: string;
  filtroEstadoPago: string;
  filtroYear: string;
  filtroMes: string;
  filtroRecurrente: boolean;
  years: Array<number | string>;
  mesesDelAno: Array<{ value: string; label: string }>;
  categorias: string[];
  metodos: string[];
  estadosPagoGasto: string[];
  hayFiltros: boolean;
  totalPagina: number;
  onSelectedTramitadorChange: (value: string) => void;
  onCategoriaChange: (value: string) => void;
  onMetodoChange: (value: string) => void;
  onEstadoPagoChange: (value: string) => void;
  onYearChange: (value: string) => void;
  onMesChange: (value: string) => void;
  onRecurrenteChange: (value: boolean) => void;
  onClearFilters: () => void;
};

type ExpenseSummarySectionProps = {
  activeSection: ExpenseSection;
  summary: ExpenseDashboardResponse | null;
  summaryLoading: boolean;
  selectedTramitador: string;
  onToggleSelectedTramitador: (name: string) => void;
  onClearSelectedTramitador: () => void;
};

type ExpenseSearchHintProps = {
  activeSection: ExpenseSection;
};

type ExpenseTableSectionProps = {
  activeSection: ExpenseSection;
  columns: ExpenseTableColumn[];
  data: Gasto[];
  loading: boolean;
  totalCount: number;
  currentPage: number;
  searchTerm: string;
  onEdit: (row: Gasto) => void;
  onDelete: (row: Gasto) => void;
  onPageChange: (page: number) => void;
  onSearchChange: (term: string) => void;
  pageSize: number;
};

export function buildExpenseTramitadorOptions(summary: ExpenseDashboardResponse | null) {
  const paidRows = summary?.breakdown.topTramitadoresGasto || [];
  const pendingRows = summary?.payables?.topTramitadores || [];
  const portfolioRows = summary?.breakdown.tramitadorPortfolio || [];

  return Array.from(
    new Set(
      [...portfolioRows, ...paidRows, ...pendingRows]
        .map((row) => row.nombre)
        .filter((value): value is string => Boolean(value))
    )
  );
}

export function buildExpenseColumns(activeSection: ExpenseSection): ExpenseTableColumn[] {
  if (activeSection === "tramitadores") {
    return [
      { key: "fecha", label: "Fecha" },
      {
        key: "proveedor",
        label: "Tramitador",
        render: (row) => (
          <div className="space-y-1">
            <p className="font-medium text-[#1d1d1f] dark:text-[#f5f5f7]">
              {row.proveedor || "Sin tramitador"}
            </p>
            <p className="text-xs text-[#86868b]">{row.estado_pago}</p>
          </div>
        ),
      },
      {
        key: "concepto",
        label: "Concepto",
        render: (row) => (
          <div className="space-y-1">
            <span className="font-medium">{row.concepto}</span>
            {row.numero_factura ? (
              <p className="text-xs text-[#86868b]">Factura {row.numero_factura}</p>
            ) : null}
          </div>
        ),
      },
      {
        key: "monto",
        label: "Monto",
        render: (row) => (
          <span className="font-medium text-red-500">
            {formatAccountingMoney(Number(row.monto))}
          </span>
        ),
      },
      {
        key: "fecha_vencimiento",
        label: "Vencimiento",
        render: (row) => {
          const dueMeta = getExpenseDueMeta(row.fecha_vencimiento);
          return (
            <div className="space-y-1">
              <p className="text-sm font-medium text-[#1d1d1f] dark:text-[#f5f5f7]">
                {row.fecha_vencimiento || "—"}
              </p>
              <span
                className={`inline-flex rounded-full px-2 py-0.5 text-[11px] font-semibold ${dueMeta.className}`}
              >
                {dueMeta.label}
              </span>
            </div>
          );
        },
      },
      { key: "metodo_pago", label: "Método" },
    ];
  }

  if (activeSection === "nomina") {
    return [
      { key: "fecha", label: "Fecha" },
      {
        key: "proveedor",
        label: "Colaborador",
        render: (row) => (
          <div className="space-y-1">
            <p className="font-medium text-[#1d1d1f] dark:text-[#f5f5f7]">
              {row.proveedor || "Sin nombre"}
            </p>
            <p className="text-xs text-[#86868b]">{row.concepto}</p>
          </div>
        ),
      },
      {
        key: "monto",
        label: "Monto",
        render: (row) => (
          <span className="font-medium text-red-500">
            {formatAccountingMoney(Number(row.monto))}
          </span>
        ),
      },
      {
        key: "estado_pago",
        label: "Estado pago",
        render: (row) => (
          <span
            className={`inline-flex rounded-full px-2 py-0.5 text-xs font-semibold ${
              row.estado_pago === "pagado"
                ? "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-300"
                : row.estado_pago === "anulado"
                  ? "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-300"
                  : "bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-300"
            }`}
          >
            {row.estado_pago}
          </span>
        ),
      },
      {
        key: "fecha_vencimiento",
        label: "Vencimiento",
        render: (row) => {
          const dueMeta = getExpenseDueMeta(row.fecha_vencimiento);
          return (
            <div className="space-y-1">
              <p className="text-sm font-medium text-[#1d1d1f] dark:text-[#f5f5f7]">
                {row.fecha_vencimiento || "—"}
              </p>
              <span
                className={`inline-flex rounded-full px-2 py-0.5 text-[11px] font-semibold ${dueMeta.className}`}
              >
                {dueMeta.label}
              </span>
            </div>
          );
        },
      },
      { key: "metodo_pago", label: "Método" },
    ];
  }

  const baseColumns: ExpenseTableColumn[] = [
    { key: "fecha", label: activeSection === "cuentas" ? "Registro" : "Fecha" },
    {
      key: "concepto",
      label: "Concepto",
      render: (row) => (
        <div className="space-y-1">
          <span className="font-medium">{row.concepto}</span>
          {row.mantenimiento_id ? (
            <span className="inline-flex rounded-full bg-[#0071e3]/10 px-2 py-0.5 text-[10px] font-semibold text-[#0071e3]">
              Bitácora
            </span>
          ) : null}
        </div>
      ),
    },
    {
      key: "categoria",
      label: "Categoría",
      render: (row) => (
        <span className="rounded-full bg-gray-100 px-2 py-0.5 text-xs font-medium text-[#86868b] dark:bg-gray-800">
          {row.categoria.replace(/_/g, " ")}
        </span>
      ),
    },
    {
      key: "monto",
      label: "Monto",
      render: (row) => (
        <span className="font-medium text-red-500">{formatAccountingMoney(Number(row.monto))}</span>
      ),
    },
    { key: "proveedor", label: "Proveedor" },
  ];

  if (activeSection === "cuentas") {
    return [
      ...baseColumns,
      {
        key: "fecha_vencimiento",
        label: "Vencimiento",
        render: (row) => {
          const dueMeta = getExpenseDueMeta(row.fecha_vencimiento);
          return (
            <div className="space-y-1">
              <p className="text-sm font-medium text-[#1d1d1f] dark:text-[#f5f5f7]">
                {row.fecha_vencimiento || "—"}
              </p>
              <span
                className={`inline-flex rounded-full px-2 py-0.5 text-[11px] font-semibold ${dueMeta.className}`}
              >
                {dueMeta.label}
              </span>
              <p className="text-[11px] text-[#86868b]">{dueMeta.detail}</p>
            </div>
          );
        },
      },
      {
        key: "estado_pago",
        label: "Estado pago",
        render: (row) => (
          <span
            className={`inline-flex rounded-full px-2 py-0.5 text-xs font-semibold ${
              row.estado_pago === "pagado"
                ? "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-300"
                : row.estado_pago === "anulado"
                  ? "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-300"
                  : "bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-300"
            }`}
          >
            {row.estado_pago}
          </span>
        ),
      },
    ];
  }

  return [...baseColumns, { key: "metodo_pago", label: "Método" }];
}

export function renderExpenseMobileCard(row: Gasto, activeSection: ExpenseSection) {
  const dueMeta =
    activeSection === "cuentas" || activeSection === "tramitadores"
      ? getExpenseDueMeta(row.fecha_vencimiento)
      : null;

  return (
    <div className="apple-panel-muted rounded-[24px] p-4">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="text-sm font-semibold text-[#111214] dark:text-[#f5f5f7]">{row.concepto}</p>
          <p className="mt-1 text-xs tracking-[0.16em] text-[#7b8591] uppercase">
            {row.categoria.replace(/_/g, " ")}
          </p>
          <p className="mt-2 text-xs text-[#66707a] dark:text-[#aeb6bf]">
            {formatCompactDate(row.fecha)}
            {row.proveedor ? ` • ${row.proveedor}` : ""}
          </p>
        </div>
        <div className="text-right">
          <p className="text-base font-semibold text-red-500 dark:text-red-400">
            {formatAccountingMoney(Number(row.monto))}
          </p>
          <span
            className={`mt-2 inline-flex rounded-full px-2.5 py-1 text-[11px] font-semibold capitalize ${
              row.estado_pago === "pagado"
                ? "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-300"
                : row.estado_pago === "anulado"
                  ? "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-300"
                  : "bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-300"
            }`}
          >
            {row.estado_pago}
          </span>
        </div>
      </div>

      <div className="mt-4 grid grid-cols-2 gap-3">
        <ExpenseMobileMeta label="Método" value={row.metodo_pago || "Sin método"} />
        <ExpenseMobileMeta label="Factura" value={row.numero_factura || "Sin soporte"} />
        <ExpenseMobileMeta label="Proveedor" value={row.proveedor || "Sin proveedor"} />
        <ExpenseMobileMeta label="Notas" value={row.notas || "Sin notas"} />
      </div>

      {dueMeta ? (
        <div className="mt-4 flex items-center justify-between gap-3 rounded-2xl border border-[var(--surface-border)] bg-[var(--surface-strong)] px-3 py-2">
          <div>
            <p className="text-[11px] font-semibold tracking-[0.16em] text-[#7b8591] uppercase">
              Vencimiento
            </p>
            <p className="mt-1 text-sm text-[#111214] dark:text-[#f5f5f7]">
              {row.fecha_vencimiento || "Sin fecha"}
            </p>
          </div>
          <span
            className={`inline-flex rounded-full px-2.5 py-1 text-[11px] font-semibold ${dueMeta.className}`}
          >
            {dueMeta.label}
          </span>
        </div>
      ) : null}
    </div>
  );
}

function ExpenseMobileMeta({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <p className="text-[11px] font-semibold tracking-[0.16em] text-[#7b8591] uppercase">
        {label}
      </p>
      <p className="mt-1 text-sm text-[#111214] dark:text-[#f5f5f7]">{value}</p>
    </div>
  );
}

export function ExpenseStatusBanners({
  linkedNotice,
  emailNotice,
  emailError,
  summaryError,
  tableError,
  activeSection,
}: ExpenseStatusBannersProps) {
  return (
    <>
      {linkedNotice ? (
        <div className="mb-4 rounded-2xl border border-[#0071e3]/15 bg-[#0071e3]/8 px-4 py-3 text-sm text-[#0b63c7] dark:text-[#69a9ff]">
          {linkedNotice}
        </div>
      ) : null}

      {emailNotice ? (
        <div className="mb-4 rounded-2xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-700 dark:border-emerald-900/30 dark:bg-emerald-900/10 dark:text-emerald-300">
          {emailNotice}
        </div>
      ) : null}

      {emailError ? (
        <div className="mb-4 rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-600 dark:border-red-900/30 dark:bg-red-900/10 dark:text-red-300">
          {emailError}
        </div>
      ) : null}

      {activeSection !== "facturas" && summaryError ? (
        <div className="mb-4 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-600 dark:border-red-900/40 dark:bg-red-900/10 dark:text-red-300">
          {summaryError}
        </div>
      ) : null}

      {activeSection !== "facturas" && tableError ? (
        <div className="mb-4 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-600 dark:border-red-900/40 dark:bg-red-900/10 dark:text-red-300">
          {tableError}
        </div>
      ) : null}
    </>
  );
}

export function ExpenseSectionPanel({
  activeSection,
  activeView,
  onViewChange,
}: ExpenseSectionPanelProps) {
  const currentSectionMeta =
    EXPENSE_SECTION_ITEMS.find((item) => item.id === activeSection) || EXPENSE_SECTION_ITEMS[0];
  const visibleViewItems =
    activeSection === "tramitadores" || activeSection === "facturas" || activeSection === "nomina"
      ? []
      : activeSection === "cuentas"
        ? EXPENSE_VIEW_ITEMS.filter(
            (item) =>
              item.id === "all" || item.id === "with_invoice" || item.id === "without_invoice"
          )
        : EXPENSE_VIEW_ITEMS;

  return (
    <AccountingPanel title={currentSectionMeta.label} description={currentSectionMeta.description}>
      {visibleViewItems.length > 0 ? (
        <AccountingChipTabs value={activeView} items={visibleViewItems} onChange={onViewChange} />
      ) : null}
    </AccountingPanel>
  );
}

export function ExpenseFacturasSection({
  emailIntegration,
  emailImportHistory,
  emailLoading,
  emailSyncing,
  emailSaving,
  onOpenImportModal,
  onOpenIntegration,
  onSync,
  onOpenHistoricalSearch,
  onDisconnect,
}: ExpenseFacturasSectionProps) {
  return (
    <div className="mb-4 grid grid-cols-1 gap-4 xl:grid-cols-[0.9fr_1.1fr]">
      <div className="space-y-4">
        <div className="apple-panel-muted rounded-[24px] p-5">
          <div className="flex items-start justify-between gap-4">
            <div>
              <div className="flex items-center gap-2">
                <ReceiptText size={18} className="text-[#0071e3]" />
                <h3 className="text-base font-semibold text-[#1d1d1f] dark:text-[#f5f5f7]">
                  Carga manual de facturas
                </h3>
              </div>
              <p className="mt-2 text-sm text-[#86868b]">
                Usa esta sección para subir XML o ZIP y convertirlos en gastos con soporte. La
                importación manual vive aquí para no competir con el libro operativo.
              </p>
            </div>
            <button
              type="button"
              onClick={onOpenImportModal}
              className="inline-flex items-center gap-2 rounded-2xl bg-[#0071e3] px-4 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-[#0077ED]"
            >
              <ReceiptText size={16} />
              Importar factura
            </button>
          </div>

          <div className="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-2">
            <AutomationStat
              label="Uso recomendado"
              value="Facturas puntuales"
              detail="Ideal para soportes que recibes manualmente o para reprocesar un XML específico."
            />
            <AutomationStat
              label="Resultado"
              value="Gasto documentado"
              detail="Cada importación crea o actualiza el gasto con su número de factura y contraparte."
            />
          </div>
        </div>

        <div className="apple-panel-muted rounded-[24px] p-5">
          <div className="flex items-center gap-2">
            <Clock3 size={18} className="text-[#0071e3]" />
            <h3 className="text-base font-semibold text-[#1d1d1f] dark:text-[#f5f5f7]">
              Últimas importaciones
            </h3>
          </div>
          <div className="mt-4 space-y-3">
            {emailImportHistory.length === 0 ? (
              <p className="text-sm text-[#86868b]">Aún no hay facturas importadas desde correo.</p>
            ) : null}
            {emailImportHistory.slice(0, 5).map((item) => (
              <div key={item.id} className="rounded-xl bg-[#f5f5f7] px-4 py-3 dark:bg-[#111]">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <p className="text-sm font-medium text-[#1d1d1f] dark:text-[#f5f5f7]">
                      {getEmailImportDisplayTitle(item)}
                    </p>
                    <p className="mt-1 text-xs text-[#86868b]">
                      {item.supplier_name || item.remitente || "Proveedor no identificado"}
                    </p>
                  </div>
                  <span
                    className={`inline-flex rounded-full px-2 py-0.5 text-[11px] font-semibold ${
                      item.status === "importada"
                        ? "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/20 dark:text-emerald-300"
                        : item.status === "duplicada"
                          ? "bg-amber-100 text-amber-700 dark:bg-amber-900/20 dark:text-amber-300"
                          : item.status === "omitida"
                            ? "bg-gray-100 text-[#86868b] dark:bg-gray-800 dark:text-gray-300"
                            : "bg-red-100 text-red-700 dark:bg-red-900/20 dark:text-red-300"
                    }`}
                  >
                    {item.status}
                  </span>
                </div>
                <p className="mt-2 text-xs text-[#86868b]">
                  {item.created_at
                    ? new Date(item.created_at).toLocaleString("es-CO")
                    : "Sin fecha"}
                  {item.detail ? ` • ${item.detail}` : ""}
                </p>
              </div>
            ))}
          </div>
        </div>
      </div>

      <div className="apple-panel-muted rounded-[24px] p-5">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
          <div>
            <div className="flex items-center gap-2">
              <Mail size={18} className="text-[#0071e3]" />
              <h3 className="text-base font-semibold text-[#1d1d1f] dark:text-[#f5f5f7]">
                Correo de facturas
              </h3>
              <span
                className={`inline-flex rounded-full px-2 py-0.5 text-[11px] font-semibold ${
                  emailIntegration?.activa
                    ? "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/20 dark:text-emerald-300"
                    : "bg-gray-100 text-[#86868b] dark:bg-gray-800"
                }`}
              >
                {emailIntegration?.activa ? "Activo" : "Sin conectar"}
              </span>
            </div>
            <p className="mt-2 text-sm text-[#86868b]">
              Conecta un buzón IMAP para leer adjuntos XML o ZIP y registrar automáticamente las
              facturas electrónicas en gastos.
            </p>
          </div>

          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              onClick={onOpenIntegration}
              className="inline-flex items-center gap-2 rounded-lg border border-[#0071e3]/20 bg-[#0071e3]/5 px-3 py-2 text-sm text-[#0071e3] dark:border-[#0071e3]/30 dark:bg-[#0071e3]/10"
            >
              <Link2 size={15} />
              {emailIntegration ? "Editar conexión" : "Conectar"}
            </button>
            <button
              type="button"
              onClick={onSync}
              disabled={!emailIntegration || emailSyncing || emailLoading}
              className="inline-flex items-center gap-2 rounded-lg border border-gray-200 px-3 py-2 text-sm text-[#1d1d1f] disabled:opacity-50 dark:border-gray-700 dark:text-[#f5f5f7]"
            >
              <RefreshCw size={15} className={emailSyncing ? "animate-spin" : ""} />
              {emailSyncing ? "Sincronizando..." : "Sincronizar ahora"}
            </button>
            <button
              type="button"
              onClick={onOpenHistoricalSearch}
              disabled={!emailIntegration || emailSyncing || emailLoading}
              className="inline-flex items-center gap-2 rounded-lg border border-gray-200 px-3 py-2 text-sm text-[#1d1d1f] disabled:opacity-50 dark:border-gray-700 dark:text-[#f5f5f7]"
            >
              <Clock3 size={15} />
              Buscar antiguas
            </button>
            {emailIntegration ? (
              <button
                type="button"
                onClick={onDisconnect}
                disabled={emailSaving}
                className="inline-flex items-center gap-2 rounded-lg border border-red-200 px-3 py-2 text-sm text-red-600 disabled:opacity-50 dark:border-red-900/30 dark:text-red-300"
              >
                <Unplug size={15} />
                Desconectar
              </button>
            ) : null}
          </div>
        </div>

        <div className="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-4">
          <AutomationStat
            label="Buzón"
            value={emailLoading ? "Cargando..." : emailIntegration?.correo || "Sin configurar"}
            detail={
              emailIntegration
                ? `${emailIntegration.imap_host}:${emailIntegration.imap_port}`
                : "Conecta un correo con IMAP habilitado"
            }
          />
          <AutomationStat
            label="Bandeja"
            value={emailIntegration?.mailbox || "INBOX"}
            detail={
              emailIntegration?.import_only_unseen
                ? "Solo correos no leídos"
                : "Correos nuevos por UID"
            }
          />
          <AutomationStat
            label="Última sincronización"
            value={
              emailIntegration?.last_synced_at
                ? new Date(emailIntegration.last_synced_at).toLocaleString("es-CO")
                : "Aún no sincronizado"
            }
            detail={`UID máximo: ${emailIntegration?.last_uid || "—"}`}
          />
          <AutomationStat
            label="Modo automático"
            value={emailIntegration?.auto_sync ? "Cron activo" : "Solo manual"}
            detail={
              emailIntegration?.subject_filter || emailIntegration?.from_filter
                ? `Filtros: ${emailIntegration?.from_filter || "sin remitente"} / ${emailIntegration?.subject_filter || "sin asunto"}`
                : "Sin filtros adicionales"
            }
          />
        </div>

        {emailIntegration?.last_error ? (
          <div className="mt-4 flex items-start gap-2 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-700 dark:border-amber-900/30 dark:bg-amber-900/10 dark:text-amber-300">
            <AlertTriangle size={16} className="mt-0.5 shrink-0" />
            <span>{emailIntegration.last_error}</span>
          </div>
        ) : null}
      </div>
    </div>
  );
}

function AutomationStat({
  label,
  value,
  detail,
}: {
  label: string;
  value: string;
  detail: string;
}) {
  return (
    <div className="rounded-2xl bg-[#f5f5f7] p-4 dark:bg-[#111]">
      <p className="text-xs tracking-[0.14em] text-[#86868b] uppercase">{label}</p>
      <p className="mt-1 text-sm font-semibold text-[#1d1d1f] dark:text-[#f5f5f7]">{value}</p>
      <p className="mt-1 text-xs text-[#86868b]">{detail}</p>
    </div>
  );
}

export function ExpenseFiltersSection({
  activeSection,
  selectedTramitador,
  tramitadorOptions,
  filtroCategoria,
  filtroMetodo,
  filtroEstadoPago,
  filtroYear,
  filtroMes,
  filtroRecurrente,
  years,
  mesesDelAno,
  categorias,
  metodos,
  estadosPagoGasto,
  hayFiltros,
  totalPagina,
  onSelectedTramitadorChange,
  onCategoriaChange,
  onMetodoChange,
  onEstadoPagoChange,
  onYearChange,
  onMesChange,
  onRecurrenteChange,
  onClearFilters,
}: ExpenseFiltersSectionProps) {
  if (activeSection === "facturas") return null;

  return (
    <div className="mb-4 rounded-xl bg-white px-4 py-3 dark:bg-[#1d1d1f]">
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-6">
        <div>
          <label className="apple-label">
            {activeSection === "tramitadores"
              ? "Tramitador"
              : activeSection === "nomina"
                ? "Sección"
                : "Categoría"}
          </label>
          {activeSection === "tramitadores" ? (
            <select
              value={selectedTramitador}
              onChange={(e) => onSelectedTramitadorChange(e.target.value)}
              className="apple-input"
            >
              <option value="">Todos</option>
              {tramitadorOptions.map((option) => (
                <option key={option} value={option}>
                  {option}
                </option>
              ))}
            </select>
          ) : activeSection === "nomina" ? (
            <input value="Nómina" readOnly className="apple-input" />
          ) : (
            <select
              value={filtroCategoria}
              onChange={(e) => onCategoriaChange(e.target.value)}
              className="apple-input"
            >
              <option value="">Todas</option>
              {categorias.map((categoria) => (
                <option key={categoria} value={categoria}>
                  {categoria.replace(/_/g, " ")}
                </option>
              ))}
            </select>
          )}
        </div>

        <div>
          <label className="apple-label">Método</label>
          <select
            value={filtroMetodo}
            onChange={(e) => onMetodoChange(e.target.value)}
            className="apple-input"
          >
            <option value="">Todos</option>
            {metodos.map((metodo) => (
              <option key={metodo} value={metodo}>
                {metodo}
              </option>
            ))}
          </select>
        </div>

        <div>
          <label className="apple-label">Estado pago</label>
          <select
            value={activeSection === "cuentas" ? "pendiente" : filtroEstadoPago}
            onChange={(e) => onEstadoPagoChange(e.target.value)}
            className="apple-input"
            disabled={activeSection === "cuentas"}
          >
            <option value="">Todos</option>
            {estadosPagoGasto.map((estado) => (
              <option key={estado} value={estado}>
                {estado}
              </option>
            ))}
          </select>
        </div>

        <div>
          <label className="apple-label">Año</label>
          <select
            value={filtroYear}
            onChange={(e) => onYearChange(e.target.value)}
            className="apple-input"
          >
            {years.map((year) => (
              <option key={year} value={year}>
                {year}
              </option>
            ))}
          </select>
        </div>

        <div>
          <label className="apple-label">Mes</label>
          <select
            value={filtroMes}
            onChange={(e) => onMesChange(e.target.value)}
            className="apple-input"
          >
            {mesesDelAno.map((mes) => (
              <option key={mes.value || "all"} value={mes.value}>
                {mes.label}
              </option>
            ))}
          </select>
        </div>

        <div className="flex items-end pb-1">
          <label className="flex cursor-pointer items-center gap-2 text-sm text-[#1d1d1f] dark:text-[#f5f5f7]">
            <input
              type="checkbox"
              checked={filtroRecurrente}
              onChange={(e) => onRecurrenteChange(e.target.checked)}
              className="rounded"
            />
            Solo recurrentes
          </label>
        </div>
      </div>

      {hayFiltros ? (
        <div className="mt-3 flex items-center justify-between gap-3 border-t border-gray-100 pt-3 dark:border-gray-800">
          <button
            type="button"
            onClick={onClearFilters}
            className="inline-flex items-center gap-2 rounded-lg border border-gray-200 px-3 py-2 text-xs font-medium text-[#86868b] dark:border-gray-700"
          >
            Limpiar filtros
          </button>
          <p className="text-sm font-semibold text-red-500 dark:text-red-400">
            Total página: {formatAccountingMoney(totalPagina)}
          </p>
        </div>
      ) : null}
    </div>
  );
}

export function ExpenseSummarySection({
  activeSection,
  summary,
  summaryLoading,
  selectedTramitador,
  onToggleSelectedTramitador,
  onClearSelectedTramitador,
}: ExpenseSummarySectionProps) {
  if (activeSection === "facturas") return null;
  if (activeSection === "nomina") {
    return <ExpenseNominaSummary summary={summary} summaryLoading={summaryLoading} />;
  }
  if (activeSection === "cuentas") {
    return <ExpensePayablesSummary summary={summary} summaryLoading={summaryLoading} />;
  }
  if (activeSection === "tramitadores") {
    return (
      <ExpenseTramitadoresSummary
        summary={summary}
        summaryLoading={summaryLoading}
        selectedTramitador={selectedTramitador}
        onToggleSelectedTramitador={onToggleSelectedTramitador}
        onClearSelectedTramitador={onClearSelectedTramitador}
      />
    );
  }
  return <ExpenseLibroSummary summary={summary} summaryLoading={summaryLoading} />;
}

function ExpenseNominaSummary({
  summary,
  summaryLoading,
}: {
  summary: ExpenseDashboardResponse | null;
  summaryLoading: boolean;
}) {
  const topCollaborator = summary?.breakdown.topProveedoresGasto[0];
  const totalNomina = summary?.summary.gastosTotales || 0;
  const totalPendiente = summary?.payables?.totalPendiente || 0;
  const totalPagado = Math.max(totalNomina - totalPendiente, 0);

  return (
    <div className="mb-4 space-y-4">
      <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-4">
        <AccountingStatCard
          eyebrow="Nómina"
          label="Causada del periodo"
          value={summaryLoading ? "..." : formatAccountingMoney(totalNomina)}
          detail="Total de pagos a instructores y colaboradores en el rango."
          tone="danger"
          icon={<Wallet size={18} />}
        />
        <AccountingStatCard
          eyebrow="Nómina"
          label="Pagado"
          value={summaryLoading ? "..." : formatAccountingMoney(totalPagado)}
          detail="Monto ya desembolsado dentro de la nómina del periodo."
          tone="success"
          icon={<ShieldCheck size={18} />}
        />
        <AccountingStatCard
          eyebrow="Pendiente"
          label="Por pagar"
          value={summaryLoading ? "..." : formatAccountingMoney(totalPendiente)}
          detail="Saldo abierto de nómina pendiente por salida."
          tone="warning"
          icon={<Clock3 size={18} />}
        />
        <AccountingStatCard
          eyebrow="Colaborador"
          label="Mayor peso"
          value={topCollaborator?.concepto || "Sin datos"}
          detail={summaryLoading ? "..." : formatAccountingMoney(topCollaborator?.total || 0)}
          tone="default"
          icon={<BarChart3 size={18} />}
        />
      </div>

      <div className="grid grid-cols-1 gap-4 xl:grid-cols-3">
        <AccountingMiniList
          title="Colaboradores principales"
          description="Quién concentra más valor de nómina en este corte."
          emptyLabel="No hay movimientos de nómina en este rango."
          items={(summary?.breakdown.topProveedoresGasto || []).slice(0, 6).map((row) => ({
            label: row.concepto || "Sin nombre",
            value: formatAccountingMoney(row.total),
            meta: `${row.cantidad} pago${row.cantidad === 1 ? "" : "s"}`,
          }))}
        />
        <AccountingMiniList
          title="Métodos de pago"
          description="Cómo se está desembolsando la nómina."
          emptyLabel="No hay métodos registrados para nómina."
          items={(summary?.breakdown.gastosPorMetodo || []).slice(0, 6).map((row) => ({
            label: row.metodo_pago || "Sin método",
            value: formatAccountingMoney(row.total),
            meta: `${row.cantidad} movimiento${row.cantidad === 1 ? "" : "s"}`,
          }))}
        />
        <AccountingMiniList
          title="Estado de salida"
          description="Lectura rápida de vencimientos y pagos pendientes."
          emptyLabel="No hay saldos pendientes de nómina."
          items={(summary?.payables?.buckets || []).slice(0, 6).map((row) => ({
            label: row.bucket,
            value: formatAccountingMoney(row.total),
            meta: `${row.cantidad} registro${row.cantidad === 1 ? "" : "s"}`,
          }))}
        />
      </div>
    </div>
  );
}

function ExpenseLibroSummary({
  summary,
  summaryLoading,
}: {
  summary: ExpenseDashboardResponse | null;
  summaryLoading: boolean;
}) {
  const topExpenseCategory = summary?.breakdown?.gastosPorCategoria?.[0];

  return (
    <div className="mb-4 space-y-4">
      <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-4">
        <AccountingStatCard
          eyebrow="Egreso"
          label="Gasto total"
          value={
            summaryLoading ? "..." : formatAccountingMoney(summary?.summary.gastosTotales || 0)
          }
          detail="Egreso consolidado del rango seleccionado."
          tone="danger"
          icon={<Landmark size={18} />}
        />
        <AccountingStatCard
          eyebrow="Promedio"
          label="Promedio por gasto"
          value={
            summaryLoading ? "..." : formatAccountingMoney(summary?.summary.gastoPromedio || 0)
          }
          detail={`${summary?.summary.totalGastos || 0} egreso${(summary?.summary.totalGastos || 0) === 1 ? "" : "s"} en el periodo.`}
          tone="primary"
          icon={<Wallet size={18} />}
        />
        <AccountingStatCard
          eyebrow="Control"
          label="Recurrentes"
          value={
            summaryLoading
              ? "..."
              : formatAccountingMoney(summary?.summary.gastosRecurrentesTotal || 0)
          }
          detail={`${summary?.summary.gastosRecurrentesCount || 0} movimiento${(summary?.summary.gastosRecurrentesCount || 0) === 1 ? "" : "s"} recurrente${(summary?.summary.gastosRecurrentesCount || 0) === 1 ? "" : "s"}.`}
          tone="warning"
          icon={<Repeat size={18} />}
        />
        <AccountingStatCard
          eyebrow="Concentración"
          label="Categoría líder"
          value={topExpenseCategory?.categoria || "Sin datos"}
          detail={summaryLoading ? "..." : formatAccountingMoney(topExpenseCategory?.total || 0)}
          tone="default"
          icon={<BarChart3 size={18} />}
        />
      </div>

      <div className="grid grid-cols-1 gap-4 xl:grid-cols-3">
        <AccountingMiniList
          title="Categorías dominantes"
          description="Dónde se concentra el gasto del periodo."
          emptyLabel="No hay categorías con movimiento."
          items={(summary?.breakdown.gastosPorCategoria || []).slice(0, 6).map((row) => ({
            label: row.categoria || "Sin categoría",
            value: formatAccountingMoney(row.total),
            meta: `${row.cantidad} movimiento${row.cantidad === 1 ? "" : "s"}`,
          }))}
        />
        <AccountingMiniList
          title="Proveedores principales"
          description="Contrapartes con mayor peso económico."
          emptyLabel="No hay proveedores con movimientos en este rango."
          items={(summary?.breakdown.topProveedoresGasto || []).slice(0, 6).map((row) => ({
            label: row.concepto || "Sin proveedor",
            value: formatAccountingMoney(row.total),
            meta: `${row.cantidad} gasto${row.cantidad === 1 ? "" : "s"}`,
          }))}
        />
        <AccountingMiniList
          title="Métodos dominantes"
          description="Cómo se están pagando los egresos."
          emptyLabel="No hay métodos de pago registrados."
          items={(summary?.breakdown.gastosPorMetodo || []).slice(0, 6).map((row) => ({
            label: row.metodo_pago || "Sin método",
            value: formatAccountingMoney(row.total),
            meta: `${row.cantidad} movimiento${row.cantidad === 1 ? "" : "s"}`,
          }))}
        />
      </div>
    </div>
  );
}

function ExpensePayablesSummary({
  summary,
  summaryLoading,
}: {
  summary: ExpenseDashboardResponse | null;
  summaryLoading: boolean;
}) {
  const topPendingProvider = summary?.payables?.topProveedores[0];

  return (
    <div className="mb-4 space-y-4">
      <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-4">
        <AccountingStatCard
          eyebrow="Por pagar"
          label="Total pendiente"
          value={
            summaryLoading ? "..." : formatAccountingMoney(summary?.payables?.totalPendiente || 0)
          }
          detail="Facturas y egresos pendientes de salida."
          tone="warning"
          icon={<ShieldCheck size={18} />}
        />
        <AccountingStatCard
          eyebrow="Riesgo"
          label="Vencido"
          value={summaryLoading ? "..." : formatAccountingMoney(summary?.payables?.vencido || 0)}
          detail="Obligaciones fuera del plazo esperado."
          tone="danger"
          icon={<AlertTriangle size={18} />}
        />
        <AccountingStatCard
          eyebrow="Agenda"
          label="Próximo a vencer"
          value={
            summaryLoading ? "..." : formatAccountingMoney(summary?.payables?.vencePronto || 0)
          }
          detail="Compromisos que vencen en 7 días o menos."
          tone="warning"
          icon={<Clock3 size={18} />}
        />
        <AccountingStatCard
          eyebrow="Proveedor"
          label="Proveedor líder"
          value={topPendingProvider?.nombre || "Sin datos"}
          detail={summaryLoading ? "..." : formatAccountingMoney(topPendingProvider?.total || 0)}
          tone="default"
          icon={<ReceiptText size={18} />}
        />
      </div>

      <div className="grid grid-cols-1 gap-4 xl:grid-cols-2">
        <AccountingBreakdownCard
          title="Antigüedad por pagar"
          subtitle="Distribución de cuentas por pagar según su vencimiento."
          rows={(summary?.payables?.buckets || []).map((row) => ({ ...row, concepto: row.bucket }))}
          labelKey="concepto"
          emptyLabel="No hay egresos pendientes para este rango."
        />
        <AccountingBreakdownCard
          title="Top proveedores por pagar"
          subtitle="Contrapartes con mayor saldo pendiente actualmente."
          rows={(summary?.payables?.topProveedores || []).map((row) => ({
            ...row,
            concepto: row.nombre,
          }))}
          labelKey="concepto"
          emptyLabel="No hay proveedores con saldo pendiente."
        />
      </div>
    </div>
  );
}

function ExpenseTramitadoresSummary({
  summary,
  summaryLoading,
  selectedTramitador,
  onToggleSelectedTramitador,
  onClearSelectedTramitador,
}: {
  summary: ExpenseDashboardResponse | null;
  summaryLoading: boolean;
  selectedTramitador: string;
  onToggleSelectedTramitador: (name: string) => void;
  onClearSelectedTramitador: () => void;
}) {
  const tramitadorRows = summary?.breakdown.topTramitadoresGasto || [];
  const tramitadorPortfolio = summary?.breakdown.tramitadorPortfolio || [];
  const pendingTramitadorRows = summary?.payables?.topTramitadores || [];
  const totalTramitador = (summary?.breakdown.gastosPorCategoria || [])
    .filter((row) => row.categoria === "tramitador")
    .reduce((sum, row) => sum + Number(row.total || 0), 0);
  const totalTramitadorPendiente = pendingTramitadorRows.reduce(
    (sum, row) => sum + Number(row.total || 0),
    0
  );
  const topTramitador = tramitadorRows[0];
  const topPendingTramitador = pendingTramitadorRows[0];
  const selectedTramitadorRow =
    tramitadorPortfolio.find((row) => row.nombre === selectedTramitador) || null;
  const tramitadoresActivos = tramitadorPortfolio.length;
  const tramitadoresConSaldo = tramitadorPortfolio.filter((row) => row.pendiente > 0).length;
  const unnamedTramitadorRow =
    tramitadorPortfolio.find((row) => row.nombre === "Sin tramitador") || null;
  const topTramitadorShare =
    totalTramitador > 0 && topTramitador
      ? (Number(topTramitador.total || 0) / totalTramitador) * 100
      : 0;

  return (
    <div className="mb-4 space-y-4">
      <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-4">
        <AccountingStatCard
          eyebrow="Tramitadores"
          label="Pagado del periodo"
          value={summaryLoading ? "..." : formatAccountingMoney(totalTramitador)}
          detail="Total ejecutado en categoría tramitador."
          tone="primary"
          icon={<ReceiptText size={18} />}
        />
        <AccountingStatCard
          eyebrow="Tramitadores"
          label="Pendiente por pagar"
          value={summaryLoading ? "..." : formatAccountingMoney(totalTramitadorPendiente)}
          detail="Saldo abierto con terceros."
          tone="warning"
          icon={<Clock3 size={18} />}
        />
        <AccountingStatCard
          eyebrow={selectedTramitadorRow ? "En foco" : "Cobertura"}
          label={selectedTramitadorRow ? selectedTramitadorRow.nombre : "Tramitadores activos"}
          value={
            selectedTramitadorRow
              ? formatAccountingMoney(
                  selectedTramitadorRow.pagado + selectedTramitadorRow.pendiente
                )
              : String(tramitadoresActivos)
          }
          detail={
            summaryLoading
              ? "..."
              : selectedTramitadorRow
                ? `Pagado ${formatAccountingMoney(selectedTramitadorRow.pagado)} · Pendiente ${formatAccountingMoney(selectedTramitadorRow.pendiente)}`
                : `${tramitadoresConSaldo} con saldo abierto. ${topTramitador ? `${topTramitador.nombre} concentra ${topTramitadorShare.toFixed(0)}% del pagado.` : ""}`
          }
          tone={selectedTramitadorRow ? "primary" : "default"}
          icon={<BarChart3 size={18} />}
        />
        <AccountingStatCard
          eyebrow="Urgencia"
          label="Más urgente por pagar"
          value={topPendingTramitador?.nombre || "Sin pendientes"}
          detail={
            summaryLoading ? "..." : formatAccountingMoney(Number(topPendingTramitador?.total || 0))
          }
          tone="danger"
          icon={<AlertTriangle size={18} />}
        />
      </div>

      {unnamedTramitadorRow ? (
        <div className="rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800 dark:border-amber-900/30 dark:bg-amber-900/10 dark:text-amber-300">
          Hay {unnamedTramitadorRow.movimientos} movimiento
          {unnamedTramitadorRow.movimientos === 1 ? "" : "s"} sin nombre de tramitador. Completa el
          nombre desde alumnos, matrículas o gastos manuales para no fragmentar la cartera.
        </div>
      ) : null}

      <div className="grid grid-cols-1 gap-4 xl:grid-cols-2">
        <AccountingBreakdownCard
          title="Gasto por tramitador"
          subtitle="Cuánto se ha causado o pagado a cada tramitador en el periodo."
          rows={tramitadorRows.map((row) => ({
            concepto: row.nombre,
            cantidad: row.cantidad,
            total: row.total,
          }))}
          labelKey="concepto"
          emptyLabel="No hay pagos a tramitador en este corte."
        />
        <AccountingBreakdownCard
          title="Pendiente por tramitador"
          subtitle="Cuánto falta por pagarle a cada tramitador."
          rows={pendingTramitadorRows.map((row) => ({
            concepto: row.nombre,
            cantidad: row.cantidad,
            total: row.total,
          }))}
          labelKey="concepto"
          emptyLabel="No hay saldos pendientes con tramitadores."
        />
      </div>

      <AccountingPanel
        title="Cartera operativa por tramitador"
        description="Haz clic en un tercero para enfocar la tabla, el resumen y la exportación. Aquí se ve lo pagado, lo pendiente y lo vencido por nombre normalizado."
        actions={
          selectedTramitador ? (
            <button
              type="button"
              onClick={onClearSelectedTramitador}
              className="rounded-full border border-gray-200 px-3 py-2 text-sm font-semibold text-[#4a4a4f] transition-colors hover:border-gray-300 dark:border-gray-700 dark:text-[#c7c7cc] dark:hover:border-gray-600"
            >
              Ver todos
            </button>
          ) : null
        }
      >
        {tramitadorPortfolio.length === 0 ? (
          <p className="text-sm text-[#86868b]">No hay cartera de tramitadores para este rango.</p>
        ) : (
          <div className="grid grid-cols-1 gap-3 lg:grid-cols-2 2xl:grid-cols-3">
            {tramitadorPortfolio.map((row) => (
              <ExpenseTramitadorCard
                key={`tramitador-portfolio-${row.nombre}`}
                row={row}
                active={selectedTramitador === row.nombre}
                onClick={() => onToggleSelectedTramitador(row.nombre)}
              />
            ))}
          </div>
        )}
      </AccountingPanel>
    </div>
  );
}

function ExpenseTramitadorCard({
  row,
  active,
  onClick,
}: {
  row: FinanceTramitadorPortfolioRow;
  active: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`rounded-2xl border px-4 py-4 text-left transition-colors ${
        active
          ? "border-[#0071e3]/40 bg-[#0071e3]/8 dark:border-[#0071e3]/50 dark:bg-[#0071e3]/12"
          : "border-gray-100 bg-[#f7f9fc] hover:border-gray-200 dark:border-gray-800 dark:bg-[#111214] dark:hover:border-gray-700"
      }`}
    >
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="truncate text-sm font-semibold text-[#1d1d1f] dark:text-[#f5f5f7]">
            {row.nombre}
          </p>
          <p className="mt-1 text-xs text-[#86868b]">
            {row.movimientos} movimiento{row.movimientos === 1 ? "" : "s"} · último{" "}
            {row.ultimaFecha ? formatCompactDate(row.ultimaFecha) : "sin fecha"}
          </p>
        </div>
        <span
          className={`inline-flex rounded-full px-2 py-0.5 text-[11px] font-semibold ${
            row.vencido > 0
              ? "bg-red-100 text-red-700 dark:bg-red-900/20 dark:text-red-300"
              : row.pendiente > 0
                ? "bg-amber-100 text-amber-700 dark:bg-amber-900/20 dark:text-amber-300"
                : "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/20 dark:text-emerald-300"
          }`}
        >
          {row.vencido > 0 ? "Vencido" : row.pendiente > 0 ? "Pendiente" : "Al día"}
        </span>
      </div>
      <div className="mt-4 grid grid-cols-2 gap-3 text-xs">
        <TramitadorMetric label="Pagado" value={formatAccountingMoney(row.pagado)} />
        <TramitadorMetric label="Pendiente" value={formatAccountingMoney(row.pendiente)} />
        <TramitadorMetric label="Vencido" value={formatAccountingMoney(row.vencido)} danger />
        <TramitadorMetric label="Promedio" value={formatAccountingMoney(row.ticketPromedio)} />
      </div>
    </button>
  );
}

function TramitadorMetric({
  label,
  value,
  danger = false,
}: {
  label: string;
  value: string;
  danger?: boolean;
}) {
  return (
    <div className="rounded-xl bg-white px-3 py-2 dark:bg-[#1d1d1f]">
      <p className="text-[#86868b]">{label}</p>
      <p
        className={`mt-1 font-semibold ${danger ? "text-red-500" : "text-[#1d1d1f] dark:text-[#f5f5f7]"}`}
      >
        {value}
      </p>
    </div>
  );
}

export function ExpenseSearchHint({ activeSection }: ExpenseSearchHintProps) {
  if (
    activeSection !== "libro" &&
    activeSection !== "nomina" &&
    activeSection !== "cuentas" &&
    activeSection !== "tramitadores"
  ) {
    return null;
  }

  return (
    <div className="mb-3 rounded-xl border border-gray-100 bg-white px-4 py-3 text-xs text-[#86868b] dark:border-gray-800 dark:bg-[#1d1d1f]">
      {activeSection === "nomina"
        ? "Busca por colaborador, concepto, fecha, factura o notas para revisar pagos de nómina sin mezclar otros egresos."
        : EXPENSE_ADVANCED_SEARCH_HINT}
    </div>
  );
}

export function ExpenseTableSection({
  activeSection,
  columns,
  data,
  loading,
  totalCount,
  currentPage,
  searchTerm,
  onEdit,
  onDelete,
  onPageChange,
  onSearchChange,
  pageSize,
}: ExpenseTableSectionProps) {
  if (
    activeSection !== "libro" &&
    activeSection !== "nomina" &&
    activeSection !== "cuentas" &&
    activeSection !== "tramitadores"
  ) {
    return null;
  }

  return (
    <div className="apple-panel rounded-[24px] p-4 sm:p-6">
      <DataTable
        key={activeSection}
        columns={columns}
        data={data}
        loading={loading}
        mobileCardRender={(row) => renderExpenseMobileCard(row, activeSection)}
        searchPlaceholder={
          activeSection === "cuentas"
            ? "Buscar por proveedor, concepto, factura o fecha de pago..."
            : activeSection === "nomina"
              ? "Buscar por colaborador, concepto, factura, fecha o notas..."
              : activeSection === "tramitadores"
                ? "Buscar por tramitador, concepto, factura o fecha..."
                : "Buscar por concepto, proveedor, factura, categoría, método o notas. Usa fecha: o monto: para filtros exactos."
        }
        searchTerm={searchTerm}
        onEdit={onEdit}
        onDelete={onDelete}
        serverSide
        totalCount={totalCount}
        currentPage={currentPage}
        onPageChange={onPageChange}
        onSearchChange={onSearchChange}
        pageSize={pageSize}
      />
    </div>
  );
}
