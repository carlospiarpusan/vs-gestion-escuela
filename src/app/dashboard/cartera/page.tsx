"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useAuth } from "@/hooks/useAuth";
import { createClient } from "@/lib/supabase";
import { fetchAllSupabaseRows } from "@/lib/supabase-pagination";
import {
  AccountingChipTabs,
  AccountingMiniList,
  AccountingPanel,
  AccountingStatCard,
  AccountingWorkspaceHeader,
} from "@/components/dashboard/accounting/AccountingWorkspace";
import AccountingBreakdownCard from "@/components/dashboard/AccountingBreakdownCard";
import DataTable from "@/components/dashboard/DataTable";
import {
  type AccountingBreakdownRow,
  type AccountingContractPendingRow,
  type AccountingReportResponse,
  downloadCsv,
  fetchAccountingReport,
  formatAccountingMoney,
  formatCompactDate,
} from "@/lib/accounting-dashboard";
import { INCOME_VIEW_ITEMS, type IncomeView } from "@/lib/income-view";
import type { Alumno } from "@/types/database";
import { AlertTriangle, BookOpen, Clock3, Download, Wallet, X } from "lucide-react";

// ─── Types ───────────────────────────────────────────────────────────

type AlumnoOption = Pick<Alumno, "id" | "nombre" | "apellidos">;
type CarteraTableRow = AccountingContractPendingRow & { id: string };

// ─── Constants ───────────────────────────────────────────────────────

const inputCls = "apple-input";
const labelCls = "apple-label";
const PAGE_SIZE = 10;

const VIEW_ITEMS = INCOME_VIEW_ITEMS.filter(
  (v) => v.id === "all" || v.id === "matriculas" || v.id === "practicas" || v.id === "examenes"
);

function getShare(value: number, total: number) {
  if (total <= 0) return "0%";
  return `${Math.round((value / total) * 100)}%`;
}

// ─── Component ───────────────────────────────────────────────────────

export default function CarteraPage() {
  const { perfil } = useAuth();
  const fmt = (v: number) => formatAccountingMoney(Number(v || 0));

  // ─── Filters ──────────────────────────────────────────────────────

  const [activeView, setActiveView] = useState<IncomeView>("all");
  const [filtroAlumno, setFiltroAlumno] = useState("");
  const [searchTerm, setSearchTerm] = useState("");
  const [currentPage, setCurrentPage] = useState(0);

  const hayFiltros = filtroAlumno || activeView !== "all";

  const limpiarFiltros = () => {
    setFiltroAlumno("");
    setActiveView("all");
    setSearchTerm("");
    setCurrentPage(0);
  };

  // ─── Catalogs ─────────────────────────────────────────────────────

  const [alumnos, setAlumnos] = useState<AlumnoOption[]>([]);
  const catalogFetchIdRef = useRef(0);

  useEffect(() => {
    if (!perfil?.escuela_id) return;
    const escuelaId = perfil.escuela_id;
    const fetchId = ++catalogFetchIdRef.current;
    const supabase = createClient();

    const load = async () => {
      try {
        const a = await fetchAllSupabaseRows<AlumnoOption>((from, to) =>
          supabase
            .from("alumnos")
            .select("id, nombre, apellidos")
            .eq("escuela_id", escuelaId)
            .order("nombre", { ascending: true })
            .order("apellidos", { ascending: true })
            .range(from, to)
            .then(({ data, error }) => ({ data: (data as AlumnoOption[]) ?? [], error }))
        );
        if (fetchId !== catalogFetchIdRef.current) return;
        setAlumnos(a);
      } catch (err) {
        console.error("[CarteraPage] Error cargando alumnos:", err);
      }
    };

    void load();
  }, [perfil?.escuela_id]);

  // ─── Data ─────────────────────────────────────────────────────────

  const [report, setReport] = useState<AccountingReportResponse | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const fetchIdRef = useRef(0);

  useEffect(() => {
    if (!perfil?.escuela_id) return;
    const fetchId = ++fetchIdRef.current;

    const load = async () => {
      setLoading(true);
      setError("");

      const params = new URLSearchParams({
        from: "2000-01-01",
        to: "2099-12-31",
        page: String(currentPage),
        pageSize: String(PAGE_SIZE),
        include: "contracts",
      });

      if (filtroAlumno) params.set("alumno_id", filtroAlumno);
      if (activeView !== "all") params.set("ingreso_view", activeView);
      if (searchTerm) params.set("q", searchTerm);

      try {
        const payload = await fetchAccountingReport(params);
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
  }, [perfil?.escuela_id, filtroAlumno, activeView, searchTerm, currentPage]);

  // ─── Derived data ─────────────────────────────────────────────────

  const contracts = report?.contracts;
  const rows = useMemo<CarteraTableRow[]>(
    () => (contracts?.pendingRows || []).map((r) => ({ ...r, id: r.obligationId })),
    [contracts?.pendingRows]
  );
  const totalCount = contracts?.pendingCount || 0;
  const pageTotal = useMemo(
    () => rows.reduce((sum, r) => sum + Number(r.saldoPendiente || 0), 0),
    [rows]
  );
  const monthly = contracts?.monthly || [];
  const oldPending = contracts?.oldestPending || [];
  const veryOldTotal = oldPending
    .filter((r) => r.diasPendiente >= 60)
    .reduce((s, r) => s + Number(r.saldoPendiente || 0), 0);
  const buckets = contracts?.buckets || [];
  const topDeudores = contracts?.topDeudores || [];

  // ─── Export CSV ───────────────────────────────────────────────────

  const [exporting, setExporting] = useState(false);

  const handleExportCsv = useCallback(async () => {
    if (!perfil?.escuela_id) return;
    setExporting(true);

    try {
      const params = new URLSearchParams({
        from: "2000-01-01",
        to: "2099-12-31",
        page: "0",
        pageSize: "10000",
        include: "contracts",
      });
      if (filtroAlumno) params.set("alumno_id", filtroAlumno);
      if (activeView !== "all") params.set("ingreso_view", activeView);
      if (searchTerm) params.set("q", searchTerm);

      const payload = await fetchAccountingReport(params);
      const allRows = payload.contracts?.pendingRows || [];
      if (allRows.length === 0) return;

      downloadCsv(
        "cartera-pendiente.csv",
        [
          "Registro",
          "Alumno",
          "Documento",
          "Referencia",
          "Tipo",
          "Esperado",
          "Cobrado",
          "Saldo",
          "Días pendiente",
        ],
        allRows.map((r) => [
          r.fechaRegistro,
          r.nombre,
          r.documento,
          r.referencia,
          r.tipoRegistro,
          Number(r.valorEsperado),
          Number(r.valorCobrado),
          Number(r.saldoPendiente),
          r.diasPendiente,
        ])
      );
    } catch {
      // silent
    } finally {
      setExporting(false);
    }
  }, [perfil?.escuela_id, filtroAlumno, activeView, searchTerm]);

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
          <button
            type="button"
            onClick={handleExportCsv}
            disabled={exporting || rows.length === 0}
            className="inline-flex items-center gap-2 rounded-2xl border border-[#0071e3]/20 bg-[#0071e3]/5 px-4 py-2.5 text-sm font-semibold text-[#0071e3] transition-colors hover:bg-[#0071e3]/10 disabled:cursor-not-allowed disabled:opacity-60 dark:border-[#0071e3]/30 dark:bg-[#0071e3]/10 dark:text-[#69a9ff]"
          >
            <Download size={16} />
            {exporting ? "Exportando..." : "Exportar CSV"}
          </button>
        }
      />

      {/* View chips + filters */}
      <div className="mb-4 space-y-3 rounded-2xl border border-gray-100 bg-white p-4 sm:p-6 dark:border-gray-800 dark:bg-[#1d1d1f]">
        <AccountingChipTabs
          value={activeView}
          items={VIEW_ITEMS}
          onChange={(v) => {
            setActiveView(v);
            setCurrentPage(0);
          }}
        />

        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
          <div>
            <label className={labelCls}>Alumno</label>
            <select
              value={filtroAlumno}
              onChange={(e) => {
                setFiltroAlumno(e.target.value);
                setCurrentPage(0);
              }}
              className={inputCls}
            >
              <option value="">Todos</option>
              {alumnos.map((a) => (
                <option key={a.id} value={a.id}>
                  {a.nombre} {a.apellidos}
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
          value={loading ? "..." : fmt(contracts?.totalEsperado || 0)}
          detail={`${contracts?.registros || 0} registro${(contracts?.registros || 0) === 1 ? "" : "s"} analizado${(contracts?.registros || 0) === 1 ? "" : "s"}.`}
          tone="primary"
          icon={<BookOpen size={18} />}
        />
        <AccountingStatCard
          eyebrow="Registros"
          label="Cobrado"
          value={loading ? "..." : fmt(contracts?.totalCobrado || 0)}
          detail={`${getShare(Number(contracts?.totalCobrado || 0), Number(contracts?.totalEsperado || 0))} del esperado.`}
          tone="success"
          icon={<Wallet size={18} />}
        />
        <AccountingStatCard
          eyebrow="Registros"
          label="Falta por pagar"
          value={loading ? "..." : fmt(contracts?.totalPendiente || 0)}
          detail={`${getShare(Number(contracts?.totalPendiente || 0), Number(contracts?.totalEsperado || 0))} del esperado.`}
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
      <div className="rounded-2xl bg-white p-4 sm:p-6 dark:bg-[#1d1d1f]">
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
