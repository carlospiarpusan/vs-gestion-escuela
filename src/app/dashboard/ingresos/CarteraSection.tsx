"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import AccountingBreakdownCard from "@/components/dashboard/AccountingBreakdownCard";
import {
  AccountingChipTabs,
  AccountingMiniList,
  AccountingPanel,
  AccountingStatCard,
} from "@/components/dashboard/accounting/AccountingWorkspace";
import DataTable from "@/components/dashboard/DataTable";
import {
  type AccountingBreakdownRow,
  type AccountingReportResponse,
  downloadCsv,
  fetchAccountingReport,
  formatAccountingMoney,
  formatCompactDate,
} from "@/lib/accounting-dashboard";
import { INCOME_VIEW_ITEMS, type IncomeView } from "@/lib/income-view";
import { AlertTriangle, BookOpen, Clock3, Wallet } from "lucide-react";
import {
  type CarteraSectionProps,
  type CarteraTableRow,
  getShare,
  inputCls,
  labelCls,
  PAGE_SIZE,
} from "./shared";

const VIEW_ITEMS = INCOME_VIEW_ITEMS.filter(
  (v) => v.id === "all" || v.id === "matriculas" || v.id === "practicas" || v.id === "examenes"
);

export default function CarteraSection({
  escuelaId,
  alumnos,
  reloadKey,
  exportCsvRef,
}: CarteraSectionProps) {
  const [activeView, setActiveView] = useState<IncomeView>("all");
  const [filtroAlumno, setFiltroAlumno] = useState("");
  const [searchTerm, setSearchTerm] = useState("");
  const [currentPage, setCurrentPage] = useState(0);

  const [report, setReport] = useState<AccountingReportResponse | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const fetchIdRef = useRef(0);

  // ─── Fetch contracts ──────────────────────────────────────────────

  useEffect(() => {
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
  }, [escuelaId, filtroAlumno, activeView, searchTerm, currentPage, reloadKey]);

  // ─── Export CSV ───────────────────────────────────────────────────

  const handleExportCsv = useCallback(async () => {
    const allRows = report?.contracts?.pendingRows || [];
    if (allRows.length === 0) return;
    downloadCsv(
      `cartera-pendiente.csv`,
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
  }, [report?.contracts?.pendingRows]);

  useEffect(() => {
    exportCsvRef.current = handleExportCsv;
    return () => {
      exportCsvRef.current = null;
    };
  }, [handleExportCsv, exportCsvRef]);

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

  const hayFiltros = filtroAlumno || activeView !== "all";

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
          <span className="font-medium">{formatAccountingMoney(row.valorEsperado)}</span>
        ),
      },
      {
        key: "valorCobrado" as keyof CarteraTableRow,
        label: "Cobrado",
        render: (row: CarteraTableRow) => (
          <span className="font-semibold text-green-600 dark:text-green-400">
            {formatAccountingMoney(row.valorCobrado)}
          </span>
        ),
      },
      {
        key: "saldoPendiente" as keyof CarteraTableRow,
        label: "Saldo",
        render: (row: CarteraTableRow) => (
          <span className="font-semibold text-amber-600 dark:text-amber-400">
            {formatAccountingMoney(row.saldoPendiente)}
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

  return (
    <>
      {/* View chips + filtro alumno */}
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
            <p className="text-xs text-[#86868b]">
              {totalCount} registro{totalCount !== 1 ? "s" : ""} encontrado
              {totalCount !== 1 ? "s" : ""}
            </p>
            <p className="text-sm font-semibold text-green-600 dark:text-green-400">
              Total página: {formatAccountingMoney(pageTotal)}
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
      <div className="mb-4 space-y-4">
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-4">
          <AccountingStatCard
            eyebrow="Registros"
            label="Debería ingresar"
            value={loading ? "..." : formatAccountingMoney(contracts?.totalEsperado || 0)}
            detail={`${contracts?.registros || 0} registro${(contracts?.registros || 0) === 1 ? "" : "s"} analizado${(contracts?.registros || 0) === 1 ? "" : "s"}.`}
            tone="primary"
            icon={<BookOpen size={18} />}
          />
          <AccountingStatCard
            eyebrow="Registros"
            label="Cobrado"
            value={loading ? "..." : formatAccountingMoney(contracts?.totalCobrado || 0)}
            detail={`${getShare(Number(contracts?.totalCobrado || 0), Number(contracts?.totalEsperado || 0))} del esperado.`}
            tone="success"
            icon={<Wallet size={18} />}
          />
          <AccountingStatCard
            eyebrow="Registros"
            label="Falta por pagar"
            value={loading ? "..." : formatAccountingMoney(contracts?.totalPendiente || 0)}
            detail={`${getShare(Number(contracts?.totalPendiente || 0), Number(contracts?.totalEsperado || 0))} del esperado.`}
            tone="warning"
            icon={<Clock3 size={18} />}
          />
          <AccountingStatCard
            eyebrow="Morosidad"
            label="Pendiente > 60 días"
            value={loading ? "..." : formatAccountingMoney(veryOldTotal)}
            detail={`${oldPending.filter((r) => r.diasPendiente >= 60).length} caso${oldPending.filter((r) => r.diasPendiente >= 60).length === 1 ? "" : "s"} críticos.`}
            tone="danger"
            icon={<AlertTriangle size={18} />}
          />
        </div>

        {/* Aging + Top deudores */}
        <div className="grid grid-cols-1 gap-4 xl:grid-cols-2">
          <AccountingBreakdownCard
            title="Antigüedad de cartera"
            subtitle="Distribución de los saldos pendientes por estado de vencimiento."
            rows={buckets.map((r) => ({ ...r, concepto: r.bucket }) as AccountingBreakdownRow)}
            labelKey="concepto"
            emptyLabel="Sin cartera pendiente."
          />
          <AccountingBreakdownCard
            title="Top deudores"
            subtitle="Alumnos o referencias con mayor saldo pendiente."
            rows={topDeudores.map((r) => ({ ...r, concepto: r.nombre }) as AccountingBreakdownRow)}
            labelKey="concepto"
            emptyLabel="Sin deudores pendientes."
          />
        </div>

        {/* Cohort + Oldest pending */}
        <div className="grid grid-cols-1 gap-4 xl:grid-cols-2">
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
                          {formatAccountingMoney(row.valorEsperado)}
                        </p>
                      </div>
                      <div className="text-right">
                        <p className="text-sm font-semibold text-emerald-600 dark:text-emerald-400">
                          {formatAccountingMoney(row.valorCobrado)}
                        </p>
                        <p className="text-xs text-amber-600 dark:text-amber-400">
                          Pendiente {formatAccountingMoney(row.saldoPendiente)}
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
              value: formatAccountingMoney(Number(row.saldoPendiente || 0)),
              meta: `${row.diasPendiente} día${row.diasPendiente === 1 ? "" : "s"} · ${row.referencia || row.documento || "Sin referencia"}`,
            }))}
          />
        </div>
      </div>

      {/* DataTable */}
      <div className="rounded-2xl bg-white p-4 sm:p-6 dark:bg-[#1d1d1f]">
        {!hayFiltros && !loading && rows.length > 0 && (
          <div className="mb-3 flex justify-end">
            <p className="text-sm font-semibold text-green-600 dark:text-green-400">
              Total página: {formatAccountingMoney(pageTotal)}
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
    </>
  );
}
