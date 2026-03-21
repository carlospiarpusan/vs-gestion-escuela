"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useAuth } from "@/hooks/useAuth";
import {
  AccountingChipTabs,
  AccountingMiniList,
  AccountingPanel,
  AccountingStatCard,
  AccountingWorkspaceHeader,
} from "@/components/dashboard/accounting/AccountingWorkspace";
import AccountingBreakdownCard from "@/components/dashboard/AccountingBreakdownCard";
import DataTable from "@/components/dashboard/DataTable";
import ExportFormatActions from "@/components/dashboard/ExportFormatActions";
import {
  type AccountingBreakdownRow,
  buildAccountingYears,
  downloadCsv,
  formatAccountingMoney,
  formatCompactDate,
  getCurrentAccountingYear,
  getMonthDateRange,
  MONTH_OPTIONS,
} from "@/lib/accounting-dashboard";
import { fetchPortfolioDashboard } from "@/lib/finance/portfolio-service";
import type { PortfolioDashboardResponse, PortfolioPendingRow } from "@/lib/finance/types";
import { downloadSpreadsheetWorkbook } from "@/lib/spreadsheet-export";
import type { MetodoPago } from "@/types/database";
import { AlertTriangle, BookOpen, Clock3, Wallet, X } from "lucide-react";

// ─── Types ───────────────────────────────────────────────────────────

type CarteraTableRow = PortfolioPendingRow & { id: string };
type CarteraView = "all" | "matriculas" | "practicas" | "aptitud";

// ─── Constants ───────────────────────────────────────────────────────

const inputCls = "apple-input";
const labelCls = "apple-label";
const PAGE_SIZE = 10;

const currentYear = getCurrentAccountingYear();
const currentMonth = new Date().getMonth() + 1;
const years = buildAccountingYears();

const metodos: { value: MetodoPago; label: string }[] = [
  { value: "efectivo", label: "Efectivo" },
  { value: "datafono", label: "Datáfono" },
  { value: "nequi", label: "Nequi" },
  { value: "sistecredito", label: "Sistecrédito" },
  { value: "otro", label: "Otro" },
];

const VIEW_ITEMS: Array<{ id: CarteraView; label: string; description: string }> = [
  { id: "all", label: "Todo", description: "Toda la cartera pendiente del periodo." },
  {
    id: "matriculas",
    label: "Cursos",
    description: "Matrícula, mensualidad, material y tasas.",
  },
  {
    id: "practicas",
    label: "Práctica adicional",
    description: "Prácticas sueltas fuera del curso regular.",
  },
  {
    id: "aptitud",
    label: "Evaluaciones de aptitud",
    description: "Procesos y cobros del módulo de aptitud.",
  },
];

function getShare(value: number, total: number) {
  if (total <= 0) return "0%";
  return `${Math.round((value / total) * 100)}%`;
}

// ─── Component ───────────────────────────────────────────────────────

export default function CarteraPage() {
  const { perfil } = useAuth();
  const fmt = (v: number) => formatAccountingMoney(Number(v || 0));
  const defaultMonth = String(currentMonth).padStart(2, "0");

  // ─── Filters ──────────────────────────────────────────────────────

  const [activeView, setActiveView] = useState<CarteraView>("all");
  const [filtroYear, setFiltroYear] = useState(String(currentYear));
  const [filtroMes, setFiltroMes] = useState(defaultMonth);
  const [filtroMetodo, setFiltroMetodo] = useState("");
  const [searchTerm, setSearchTerm] = useState("");
  const [currentPage, setCurrentPage] = useState(0);

  const mesesDelAno =
    Number(filtroYear) === currentYear
      ? MONTH_OPTIONS.filter((m) => !m.value || Number(m.value) <= currentMonth)
      : MONTH_OPTIONS;

  const hayFiltros =
    activeView !== "all" ||
    Boolean(filtroMetodo) ||
    filtroYear !== String(currentYear) ||
    filtroMes !== defaultMonth ||
    Boolean(searchTerm);

  const limpiarFiltros = () => {
    setActiveView("all");
    setFiltroYear(String(currentYear));
    setFiltroMes(defaultMonth);
    setFiltroMetodo("");
    setSearchTerm("");
    setCurrentPage(0);
  };

  // ─── Data ─────────────────────────────────────────────────────────

  const [report, setReport] = useState<PortfolioDashboardResponse | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const fetchIdRef = useRef(0);

  useEffect(() => {
    if (!perfil?.escuela_id) return;
    const fetchId = ++fetchIdRef.current;

    const load = async () => {
      setLoading(true);
      setError("");

      const { from, to } = filtroYear
        ? getMonthDateRange(Number(filtroYear), filtroMes)
        : { from: "2000-01-01", to: "2099-12-31" };
      const params = new URLSearchParams({
        from,
        to,
        page: String(currentPage),
        pageSize: String(PAGE_SIZE),
      });

      if (activeView !== "all") params.set("view", activeView);
      if (filtroMetodo) params.set("metodo", filtroMetodo);
      if (searchTerm) params.set("q", searchTerm);

      try {
        const payload = await fetchPortfolioDashboard(params);
        if (fetchId !== fetchIdRef.current) return;
        setReport(payload);
      } catch (err: unknown) {
        if (fetchId !== fetchIdRef.current) return;
        setReport(null);
        setError(err instanceof Error ? err.message : "No se pudo cargar la cartera.");
      } finally {
        if (fetchId === fetchIdRef.current) setLoading(false);
      }
    };

    void load();
  }, [
    perfil?.escuela_id,
    activeView,
    filtroYear,
    filtroMes,
    filtroMetodo,
    searchTerm,
    currentPage,
  ]);

  // ─── Derived data ─────────────────────────────────────────────────

  const rows = useMemo<CarteraTableRow[]>(
    () => (report?.pendingRows || []).map((row) => ({ ...row, id: row.obligationId })),
    [report?.pendingRows]
  );
  const totalCount = report?.pendingCount || 0;
  const pageTotal = useMemo(
    () => rows.reduce((sum, r) => sum + Number(r.saldoPendiente || 0), 0),
    [rows]
  );
  const monthly = report?.monthly || [];
  const oldPending = report?.oldestPending || [];
  const veryOldTotal = oldPending
    .filter((r) => r.diasPendiente >= 60)
    .reduce((s, r) => s + Number(r.saldoPendiente || 0), 0);
  const buckets = report?.buckets || [];
  const topDeudores = report?.topDeudores || [];

  // ─── Export ───────────────────────────────────────────────────────

  const [exportingFormat, setExportingFormat] = useState<"csv" | "xls" | null>(null);

  const handleExport = useCallback(async (format: "csv" | "xls") => {
    if (!perfil?.escuela_id) return;
    setExportingFormat(format);

    try {
      const { from, to } = filtroYear
        ? getMonthDateRange(Number(filtroYear), filtroMes)
        : { from: "2000-01-01", to: "2099-12-31" };
      const params = new URLSearchParams({
        from,
        to,
        page: "0",
        pageSize: "10000",
      });
      if (activeView !== "all") params.set("view", activeView);
      if (filtroMetodo) params.set("metodo", filtroMetodo);
      if (searchTerm) params.set("q", searchTerm);

      const payload = await fetchPortfolioDashboard(params, { useCache: false });
      const allRows = payload.pendingRows || [];
      if (allRows.length === 0) return;
      const headers = [
        "Registro",
        "Alumno",
        "Documento",
        "Referencia",
        "Tipo",
        "Esperado",
        "Cobrado",
        "Saldo",
        "Días pendiente",
      ];
      const rows = allRows.map((r) => [
        r.fechaRegistro,
        r.nombre,
        r.documento,
        r.referencia,
        r.tipoRegistro,
        Number(r.valorEsperado),
        Number(r.valorCobrado),
        Number(r.saldoPendiente),
        r.diasPendiente,
      ]);

      if (format === "csv") {
        downloadCsv("cartera-pendiente.csv", headers, rows);
        return;
      }

      await downloadSpreadsheetWorkbook("cartera-pendiente.xls", [
        {
          name: "Resumen cartera",
          headers: ["Indicador", "Valor"],
          rows: [
            ["Registros pendientes", payload.summary?.registros || 0],
            ["Total esperado", payload.summary?.totalEsperado || 0],
            ["Total cobrado", payload.summary?.totalCobrado || 0],
            ["Total pendiente", payload.summary?.totalPendiente || 0],
          ],
        },
        {
          name: "Pendientes",
          headers,
          rows,
        },
      ]);
    } catch {
      // silent
    } finally {
      setExportingFormat(null);
    }
  }, [perfil?.escuela_id, activeView, filtroYear, filtroMes, filtroMetodo, searchTerm]);

  // ─── Columns ──────────────────────────────────────────────────────

  const columns = useMemo(
    () => [
      {
        key: "fechaRegistro" as keyof CarteraTableRow,
        label: "Registro",
        render: (row: CarteraTableRow) => (
          <span className="font-medium">{formatCompactDate(row.fechaRegistro)}</span>
        ),
      },
      {
        key: "nombre" as keyof CarteraTableRow,
        label: "Alumno",
        render: (row: CarteraTableRow) => (
          <div className="space-y-1">
            <p className="font-medium text-[#1d1d1f] dark:text-[#f5f5f7]">{row.nombre}</p>
            <p className="text-xs text-[#86868b]">{row.documento || "Sin documento"}</p>
          </div>
        ),
      },
      {
        key: "referencia" as keyof CarteraTableRow,
        label: "Referencia",
        render: (row: CarteraTableRow) => (
          <div className="space-y-1">
            <p className="text-sm font-medium text-[#1d1d1f] dark:text-[#f5f5f7]">
              {row.referencia || "Sin referencia"}
            </p>
            <p className="text-xs text-[#86868b] capitalize">
              {(row.tipoRegistro || "registro").replace(/_/g, " ")}
            </p>
          </div>
        ),
      },
      {
        key: "valorEsperado" as keyof CarteraTableRow,
        label: "Esperado",
        render: (row: CarteraTableRow) => (
          <span className="font-medium">{fmt(row.valorEsperado)}</span>
        ),
      },
      {
        key: "valorCobrado" as keyof CarteraTableRow,
        label: "Cobrado",
        render: (row: CarteraTableRow) => (
          <span className="font-semibold text-green-600 dark:text-green-400">
            {fmt(row.valorCobrado)}
          </span>
        ),
      },
      {
        key: "saldoPendiente" as keyof CarteraTableRow,
        label: "Saldo",
        render: (row: CarteraTableRow) => (
          <span className="font-semibold text-amber-600 dark:text-amber-400">
            {fmt(row.saldoPendiente)}
          </span>
        ),
      },
      {
        key: "fechaReferencia" as keyof CarteraTableRow,
        label: "Pendiente desde",
        render: (row: CarteraTableRow) => (
          <div className="space-y-1">
            <p className="text-sm font-medium text-[#1d1d1f] dark:text-[#f5f5f7]">
              {formatCompactDate(row.fechaReferencia)}
            </p>
            <p className="text-xs text-[#86868b]">
              {row.diasPendiente > 0
                ? `${row.diasPendiente} día${row.diasPendiente === 1 ? "" : "s"} de atraso`
                : "Pendiente reciente"}
            </p>
          </div>
        ),
      },
    ],
    []
  );

  // ─── Render ───────────────────────────────────────────────────────

  if (!perfil?.escuela_id) return null;

  return (
    <div>
      <AccountingWorkspaceHeader
        badge="Cuentas por cobrar"
        title="Cartera"
        description="Seguimiento de deuda pendiente, antigüedad y deudores."
        actions={
          <ExportFormatActions
            exportingFormat={exportingFormat}
            disabled={rows.length === 0}
            onExportCsv={() => void handleExport("csv")}
            onExportXls={() => void handleExport("xls")}
          />
        }
      />

      {/* View chips + filters */}
      <div className="apple-panel-muted mb-4 space-y-3 p-4 sm:p-6">
        <AccountingChipTabs
          value={activeView}
          items={VIEW_ITEMS}
          onChange={(v) => {
            setActiveView(v);
            setCurrentPage(0);
          }}
        />

        <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
          <div>
            <label className={labelCls}>Año</label>
            <select
              value={filtroYear}
              onChange={(e) => {
                setFiltroYear(e.target.value);
                setFiltroMes("");
                setCurrentPage(0);
              }}
              className={inputCls}
            >
              <option value="">Todos los años</option>
              {years.map((y) => (
                <option key={y} value={y}>
                  {y}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className={labelCls}>{filtroYear ? `Mes de ${filtroYear}` : "Mes"}</label>
            <select
              value={filtroMes}
              onChange={(e) => {
                setFiltroMes(e.target.value);
                setCurrentPage(0);
              }}
              className={inputCls}
              disabled={!filtroYear}
            >
              {mesesDelAno.map((m) => (
                <option key={m.value} value={m.value}>
                  {m.label}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className={labelCls}>Forma de pago</label>
            <select
              value={filtroMetodo}
              onChange={(e) => {
                setFiltroMetodo(e.target.value);
                setCurrentPage(0);
              }}
              className={inputCls}
            >
              <option value="">Todos</option>
              {metodos.map((m) => (
                <option key={m.value} value={m.value}>
                  {m.label}
                </option>
              ))}
            </select>
          </div>
        </div>

        {hayFiltros && (
          <div className="flex items-center justify-between border-t border-gray-100 pt-3 dark:border-gray-800">
            <div className="flex items-center gap-3">
              <p className="text-xs text-[#86868b]">
                {totalCount} registro{totalCount !== 1 ? "s" : ""} encontrado
                {totalCount !== 1 ? "s" : ""}
              </p>
              <button
                onClick={limpiarFiltros}
                className="flex items-center gap-1.5 rounded-lg border border-gray-200 px-3 py-1.5 text-xs text-[#86868b] transition-colors hover:bg-red-50 hover:text-red-500 dark:border-gray-700 dark:hover:bg-red-900/20"
              >
                <X size={12} />
                Limpiar
              </button>
            </div>
            <p className="text-sm font-semibold text-amber-600 dark:text-amber-400">
              Pendiente: {fmt(pageTotal)}
            </p>
          </div>
        )}
      </div>

      {error && (
        <div className="mb-4 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-600 dark:border-red-900/40 dark:bg-red-900/10 dark:text-red-300">
          {error}
        </div>
      )}

      {/* Stat cards */}
      <div className="mb-4 grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-4">
        <AccountingStatCard
          eyebrow="Registros"
          label="Debería ingresar"
          value={loading ? "..." : fmt(report?.summary.totalEsperado || 0)}
          detail={`${report?.summary.registros || 0} registro${(report?.summary.registros || 0) === 1 ? "" : "s"} analizado${(report?.summary.registros || 0) === 1 ? "" : "s"}.`}
          tone="primary"
          icon={<BookOpen size={18} />}
        />
        <AccountingStatCard
          eyebrow="Registros"
          label="Cobrado"
          value={loading ? "..." : fmt(report?.summary.totalCobrado || 0)}
          detail={`${getShare(Number(report?.summary.totalCobrado || 0), Number(report?.summary.totalEsperado || 0))} del esperado.`}
          tone="success"
          icon={<Wallet size={18} />}
        />
        <AccountingStatCard
          eyebrow="Registros"
          label="Pendiente por cobrar"
          value={loading ? "..." : fmt(report?.summary.totalPendiente || 0)}
          detail={`${getShare(Number(report?.summary.totalPendiente || 0), Number(report?.summary.totalEsperado || 0))} del esperado.`}
          tone="warning"
          icon={<Clock3 size={18} />}
        />
        <AccountingStatCard
          eyebrow="Morosidad"
          label="Pendiente > 60 días"
          value={loading ? "..." : fmt(veryOldTotal)}
          detail={`${oldPending.filter((r) => r.diasPendiente >= 60).length} caso${oldPending.filter((r) => r.diasPendiente >= 60).length === 1 ? "" : "s"} críticos.`}
          tone="danger"
          icon={<AlertTriangle size={18} />}
        />
      </div>

      {/* Aging + Top deudores */}
      {!loading && (buckets.length > 0 || topDeudores.length > 0) && (
        <div className="mb-4 grid grid-cols-1 gap-4 xl:grid-cols-2">
          <AccountingBreakdownCard
            title="Antigüedad de cartera"
            subtitle="Distribución de los saldos pendientes por estado de vencimiento."
            rows={buckets.map(
              (r) =>
                ({
                  ...r,
                  concepto: r.bucket,
                  cantidad: r.cantidad,
                  total: r.total,
                }) as AccountingBreakdownRow
            )}
            labelKey="concepto"
            emptyLabel="Sin cartera pendiente."
          />
          <AccountingBreakdownCard
            title="Top deudores"
            subtitle="Alumnos o referencias con mayor saldo pendiente."
            rows={topDeudores.map(
              (r) =>
                ({
                  ...r,
                  concepto: r.nombre,
                  cantidad: r.cantidad,
                  total: r.total,
                }) as AccountingBreakdownRow
            )}
            labelKey="concepto"
            emptyLabel="Sin deudores pendientes."
          />
        </div>
      )}

      {/* Cohort + Oldest pending */}
      {!loading && (monthly.length > 0 || oldPending.length > 0) && (
        <div className="mb-4 grid grid-cols-1 gap-4 xl:grid-cols-2">
          <AccountingPanel
            title="Esperado vs cobrado por cohorte"
            description="Cuánto debía entrar por registros creados en cada mes y cuánto sigue pendiente."
          >
            {monthly.length === 0 ? (
              <p className="text-sm text-[#86868b]">No hay registros contractuales.</p>
            ) : (
              <div className="space-y-3">
                {monthly.slice(0, 6).map((row) => (
                  <div
                    key={row.periodo}
                    className="rounded-2xl bg-[#f7f9fc] px-4 py-3 dark:bg-[#111214]"
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <p className="text-sm font-semibold text-[#1d1d1f] dark:text-[#f5f5f7]">
                          {row.periodo}
                        </p>
                        <p className="mt-1 text-xs text-[#86868b]">
                          {row.registros} registro{row.registros === 1 ? "" : "s"} · Esperado{" "}
                          {fmt(row.valorEsperado)}
                        </p>
                      </div>
                      <div className="text-right">
                        <p className="text-sm font-semibold text-emerald-600 dark:text-emerald-400">
                          {fmt(row.valorCobrado)}
                        </p>
                        <p className="text-xs text-amber-600 dark:text-amber-400">
                          Pendiente {fmt(row.saldoPendiente)}
                        </p>
                      </div>
                    </div>
                    <div className="mt-3 h-2 overflow-hidden rounded-full bg-gray-100 dark:bg-gray-800">
                      <div
                        className="h-full rounded-full bg-[#0071e3]"
                        style={{
                          width: `${Math.max(6, Math.min(100, row.valorEsperado > 0 ? Math.round((row.valorCobrado / row.valorEsperado) * 100) : 0))}%`,
                        }}
                      />
                    </div>
                  </div>
                ))}
              </div>
            )}
          </AccountingPanel>

          <AccountingMiniList
            title="Pendientes más antiguos"
            description="Saldos abiertos desde hace más tiempo para priorizar seguimiento."
            emptyLabel="No hay saldos antiguos pendientes."
            items={oldPending.slice(0, 5).map((row) => ({
              label: row.nombre,
              value: fmt(Number(row.saldoPendiente || 0)),
              meta: `${row.diasPendiente} día${row.diasPendiente === 1 ? "" : "s"} · ${row.referencia || row.documento || "Sin referencia"}`,
            }))}
          />
        </div>
      )}

      {/* DataTable */}
      <div className="apple-panel rounded-[24px] p-4 sm:p-6">
        {rows.length > 0 && (
          <div className="mb-3 flex justify-end">
            <p className="text-sm font-semibold text-amber-600 dark:text-amber-400">
              Pendiente en página: {fmt(pageTotal)}
            </p>
          </div>
        )}
        <DataTable
          key="cartera"
          columns={columns}
          data={rows}
          loading={loading}
          searchPlaceholder="Buscar por alumno, documento o contrato..."
          searchTerm={searchTerm}
          serverSide
          totalCount={totalCount}
          currentPage={currentPage}
          onPageChange={setCurrentPage}
          onSearchChange={(term) => {
            setSearchTerm(term);
            setCurrentPage(0);
          }}
          pageSize={PAGE_SIZE}
        />
      </div>
    </div>
  );
}
