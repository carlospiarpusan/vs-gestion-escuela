"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { useSearchParams } from "next/navigation";
import {
  BarChart3,
  CalendarRange,
  Clock3,
  Download,
  Landmark,
  ReceiptText,
  TrendingDown,
  TrendingUp,
  Wallet,
} from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import AccountingBreakdownCard from "@/components/dashboard/AccountingBreakdownCard";
import {
  AccountingMiniList,
  AccountingPanel,
  AccountingSectionTabs,
  AccountingStatCard,
  AccountingWorkspaceHeader,
} from "@/components/dashboard/accounting/AccountingWorkspace";
import {
  buildAccountingYears,
  fetchAccountingReport,
  formatAccountingMoney,
  getCurrentAccountingYear,
  getMonthDateRange,
  MONTH_OPTIONS,
  type AccountingBreakdownRow,
  type AccountingReportResponse,
} from "@/lib/accounting-dashboard";

type ReportSection = "resumen" | "analitica" | "estudiantes";

type FilterState = {
  escuelaId: string;
  sedeId: string;
  year: string;
  month: string;
  ingresoView: string;
  ingresoCategoria: string;
  ingresoMetodo: string;
  gastoView: string;
  gastoCategoria: string;
  gastoMetodo: string;
  gastoContraparte: string;
};

const REPORT_SECTIONS: Array<{ id: ReportSection; label: string; description: string }> = [
  {
    id: "resumen",
    label: "Resumen contable",
    description: "Resultado, cartera, cuentas por pagar y focos del periodo.",
  },
  {
    id: "analitica",
    label: "Analítica",
    description: "Distribución, series y concentración por líneas, métodos y terceros.",
  },
  {
    id: "estudiantes",
    label: "Estudiantes",
    description: "Detalle de alumnos, práctica extra y exámenes con su rendimiento.",
  },
];

const INGRESO_VIEW_OPTIONS = [
  { value: "", label: "Todas las líneas" },
  { value: "matriculas", label: "Cursos" },
  { value: "practicas", label: "Práctica adicional" },
  { value: "examenes", label: "Exámenes" },
];

const INGRESO_CATEGORY_OPTIONS = [
  { value: "", label: "Todas" },
  { value: "matricula", label: "Matrícula" },
  { value: "mensualidad", label: "Mensualidad" },
  { value: "clase_suelta", label: "Práctica adicional" },
  { value: "examen_teorico", label: "Examen teórico" },
  { value: "examen_practico", label: "Examen práctico" },
  { value: "examen_aptitud", label: "Examen aptitud" },
  { value: "material", label: "Material" },
  { value: "tasas_dgt", label: "Tasas" },
  { value: "otros", label: "Otros" },
];

const INGRESO_METODO_OPTIONS = [
  { value: "", label: "Todos" },
  { value: "efectivo", label: "Efectivo" },
  { value: "datafono", label: "Datafono" },
  { value: "nequi", label: "Nequi" },
  { value: "sistecredito", label: "Sistecrédito" },
  { value: "otro", label: "Otro" },
];

const GASTO_VIEW_OPTIONS = [
  { value: "", label: "Todas las líneas" },
  { value: "vehicular", label: "Operación vehicular" },
  { value: "administrativo", label: "Administrativos" },
  { value: "personal", label: "Personal y terceros" },
  { value: "tramitadores", label: "Tramitadores" },
];

const GASTO_CATEGORY_OPTIONS = [
  { value: "", label: "Todas" },
  { value: "combustible", label: "Combustible" },
  { value: "mantenimiento_vehiculo", label: "Mantenimiento vehicular" },
  { value: "alquiler", label: "Alquiler" },
  { value: "servicios", label: "Servicios" },
  { value: "nominas", label: "Nóminas" },
  { value: "seguros", label: "Seguros" },
  { value: "material_didactico", label: "Material didáctico" },
  { value: "marketing", label: "Marketing" },
  { value: "impuestos", label: "Impuestos" },
  { value: "suministros", label: "Suministros" },
  { value: "reparaciones", label: "Reparaciones" },
  { value: "tramitador", label: "Tramitador" },
  { value: "otros", label: "Otros" },
];

const GASTO_METODO_OPTIONS = [
  { value: "", label: "Todos" },
  { value: "efectivo", label: "Efectivo" },
  { value: "tarjeta", label: "Tarjeta" },
  { value: "transferencia", label: "Transferencia" },
  { value: "domiciliacion", label: "Domiciliación" },
];

function parseSection(value: string | null): ReportSection {
  if (value === "analitica") return "analitica";
  if (value === "estudiantes") return "estudiantes";
  return "resumen";
}

function createDefaultFilters(): FilterState {
  return {
    escuelaId: "",
    sedeId: "",
    year: String(getCurrentAccountingYear()),
    month: String(new Date().getMonth() + 1).padStart(2, "0"),
    ingresoView: "",
    ingresoCategoria: "",
    ingresoMetodo: "",
    gastoView: "",
    gastoCategoria: "",
    gastoMetodo: "",
    gastoContraparte: "",
  };
}

function buildParams(filters: FilterState, section: ReportSection) {
  let include = "options,summary,breakdown,series,payables,contracts";
  if (section === "estudiantes") include += ",students";

  const params = new URLSearchParams();
  const range = getMonthDateRange(
    Number(filters.year),
    filters.month === "all" ? "" : filters.month
  );

  params.set("from", range.from);
  params.set("to", range.to);
  params.set("include", include);

  if (filters.escuelaId) params.set("escuela_id", filters.escuelaId);
  if (filters.sedeId) params.set("sede_id", filters.sedeId);
  if (filters.ingresoView) params.set("ingreso_view", filters.ingresoView);
  if (filters.ingresoCategoria) params.set("ingreso_categoria", filters.ingresoCategoria);
  if (filters.ingresoMetodo) params.set("ingreso_metodo", filters.ingresoMetodo);
  if (filters.gastoView) params.set("gasto_view", filters.gastoView);
  if (filters.gastoCategoria) params.set("gasto_categoria", filters.gastoCategoria);
  if (filters.gastoMetodo) params.set("gasto_metodo", filters.gastoMetodo);
  if (filters.gastoContraparte.trim())
    params.set("gasto_contraparte", filters.gastoContraparte.trim());

  return params;
}

function mapBreakdownAsConcept(
  rows: Array<{ nombre?: string; categoria?: string; total: number; cantidad: number }>
) {
  return rows.map((row) => ({
    concepto: row.nombre || row.categoria || "Sin clasificar",
    total: row.total,
    cantidad: row.cantidad,
  })) as AccountingBreakdownRow[];
}

export default function InformesPage() {
  const { perfil } = useAuth();
  const searchParams = useSearchParams();
  const [activeSection, setActiveSection] = useState<ReportSection>(
    parseSection(searchParams.get("section"))
  );
  const [draftFilters, setDraftFilters] = useState<FilterState>(createDefaultFilters);
  const [appliedFilters, setAppliedFilters] = useState<FilterState>(createDefaultFilters);
  const [report, setReport] = useState<AccountingReportResponse | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [exporting, setExporting] = useState(false);

  useEffect(() => {
    setActiveSection(parseSection(searchParams.get("section")));
  }, [searchParams]);

  const loadReport = useCallback(async (filters: FilterState, section: ReportSection) => {
    setLoading(true);
    setError("");

    try {
      const nextReport = await fetchAccountingReport(buildParams(filters, section));
      setReport(nextReport);
    } catch (reportError: unknown) {
      setError(
        reportError instanceof Error
          ? reportError.message
          : "No se pudo generar el informe contable."
      );
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void loadReport(appliedFilters, activeSection);
  }, [appliedFilters, activeSection, loadReport]);

  useEffect(() => {
    if (!report?.options) return;
    const validSchool =
      !draftFilters.escuelaId ||
      report.options.escuelas.some((item) => item.id === draftFilters.escuelaId);
    const nextSchoolId = validSchool ? draftFilters.escuelaId : "";
    const sedes = report.options.sedes.filter(
      (item) => !nextSchoolId || item.escuela_id === nextSchoolId
    );
    const validSede = !draftFilters.sedeId || sedes.some((item) => item.id === draftFilters.sedeId);

    if (!validSchool || !validSede) {
      setDraftFilters((current) => ({
        ...current,
        escuelaId: nextSchoolId,
        sedeId: validSede ? current.sedeId : "",
      }));
    }
  }, [draftFilters.escuelaId, draftFilters.sedeId, report?.options]);

  const handleGenerate = () => {
    setAppliedFilters(draftFilters);
  };

  const handleReset = () => {
    const next = createDefaultFilters();
    setDraftFilters(next);
    setAppliedFilters(next);
  };

  const handleExportCsv = async () => {
    setExporting(true);
    setError("");
    try {
      const params = buildParams(appliedFilters, activeSection);
      params.set("format", "csv");
      const response = await fetch(`/api/reportes/contables?${params.toString()}`);
      if (!response.ok) {
        const payload = await response.json().catch(() => null);
        throw new Error(payload?.error || "No se pudo exportar el informe.");
      }
      const blob = await response.blob();
      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.download = `informe-contable-${appliedFilters.year}${appliedFilters.month && appliedFilters.month !== "all" ? `-${appliedFilters.month}` : ""}.csv`;
      link.click();
      URL.revokeObjectURL(url);
    } catch (exportError: unknown) {
      setError(
        exportError instanceof Error ? exportError.message : "No se pudo exportar el informe."
      );
    } finally {
      setExporting(false);
    }
  };

  const years = useMemo(() => buildAccountingYears(), []);
  const availableSedes = useMemo(() => {
    const schoolId = draftFilters.escuelaId;
    return (report?.options.sedes || []).filter(
      (item) => !schoolId || item.escuela_id === schoolId
    );
  }, [draftFilters.escuelaId, report?.options.sedes]);

  const ingresosLinea = report?.breakdown.ingresosPorLinea || [];
  const cursos = ingresosLinea.find((row) => row.nombre === "Cursos");
  const examenes = ingresosLinea.find((row) => row.nombre === "Examenes");
  const practicas = ingresosLinea.find((row) => row.nombre === "Practica adicional");
  const topIngresoCategoria = report?.breakdown.ingresosPorCategoria[0];
  const topGastoCategoria = report?.breakdown.gastosPorCategoria[0];
  const topDebtor = [...(report?.contracts?.oldestPending || [])].sort(
    (a, b) => b.saldoPendiente - a.saldoPendiente
  )[0];
  const topProvider = report?.payables?.topProveedores[0];

  const paidTramitadores = useMemo(
    () =>
      (report?.breakdown.topTramitadoresGasto || []).slice(0, 6).map((row) => ({
        label: row.nombre,
        value: formatAccountingMoney(row.total),
        meta: `${row.cantidad} gasto${row.cantidad === 1 ? "" : "s"} pagado${row.cantidad === 1 ? "" : "s"}`,
      })),
    [report?.breakdown.topTramitadoresGasto]
  );

  const pendingTramitadores = useMemo(
    () =>
      (report?.payables?.topTramitadores || []).slice(0, 6).map((row) => ({
        label: row.nombre,
        value: formatAccountingMoney(row.total),
        meta: `${row.cantidad} obligación${row.cantidad === 1 ? "" : "es"} pendiente${row.cantidad === 1 ? "" : "s"}`,
      })),
    [report?.payables?.topTramitadores]
  );

  const monthlyTrend = useMemo(
    () =>
      (report?.series.mensual || []).slice(0, 6).map((row) => ({
        label: row.periodo,
        value: formatAccountingMoney(row.balance),
        meta: `Ingresos ${formatAccountingMoney(row.ingresos)} · Gastos ${formatAccountingMoney(row.gastos)}`,
      })),
    [report?.series.mensual]
  );

  const debtorList = useMemo(
    () =>
      [...(report?.contracts?.oldestPending || [])]
        .sort((a, b) => b.saldoPendiente - a.saldoPendiente)
        .slice(0, 6)
        .map((row) => ({
          label: row.nombre,
          value: formatAccountingMoney(row.saldoPendiente),
          meta: `${row.diasPendiente} día${row.diasPendiente === 1 ? "" : "s"} de mora`,
        })),
    [report?.contracts?.oldestPending]
  );

  const providerList = useMemo(
    () =>
      (report?.payables?.topProveedores || []).slice(0, 6).map((row) => ({
        label: row.nombre,
        value: formatAccountingMoney(row.total),
        meta: `${row.cantidad} obligación${row.cantidad === 1 ? "" : "es"} pendiente${row.cantidad === 1 ? "" : "s"}`,
      })),
    [report?.payables?.topProveedores]
  );

  const periodLabel = `${appliedFilters.year}${appliedFilters.month && appliedFilters.month !== "all" ? ` · ${MONTH_OPTIONS.find((item) => item.value === appliedFilters.month)?.label || appliedFilters.month}` : " · Todo el año"}`;

  return (
    <div>
      <AccountingWorkspaceHeader
        badge="Informes"
        title="Informes contables"
        description="Lectura ejecutiva y analítica del negocio. Aquí solo queda lo que sirve para decidir: resultado, líneas de ingreso, gasto, cartera, tramitadores y cuentas por pagar."
        actions={
          <>
            <button
              type="button"
              onClick={handleGenerate}
              className="inline-flex items-center gap-2 rounded-2xl bg-[#0071e3] px-4 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-[#0077ED]"
            >
              <BarChart3 size={16} />
              Generar informe
            </button>
            <button
              type="button"
              onClick={handleExportCsv}
              disabled={exporting}
              className="inline-flex items-center gap-2 rounded-2xl border border-[#0071e3]/20 bg-[#0071e3]/5 px-4 py-2.5 text-sm font-semibold text-[#0071e3] transition-colors hover:bg-[#0071e3]/10 disabled:cursor-not-allowed disabled:opacity-60 dark:border-[#0071e3]/30 dark:bg-[#0071e3]/10 dark:text-[#69a9ff]"
            >
              <Download size={16} />
              {exporting ? "Exportando..." : "Exportar CSV"}
            </button>
          </>
        }
      />

      <AccountingSectionTabs
        value={activeSection}
        items={REPORT_SECTIONS}
        onChange={setActiveSection}
      />

      <AccountingPanel
        title="Filtros del informe"
        description="Aplica periodo, línea de ingreso, categoría, método y contraparte para construir el informe que realmente necesitas."
        actions={
          <button
            type="button"
            onClick={handleReset}
            className="rounded-2xl border border-gray-200 px-4 py-2 text-sm font-semibold text-[#4a4a4f] transition-colors hover:border-gray-300 dark:border-gray-700 dark:text-[#c7c7cc] dark:hover:border-gray-600"
          >
            Limpiar filtros
          </button>
        }
      >
        <div className="grid grid-cols-1 gap-3 md:grid-cols-2 xl:grid-cols-4">
          {perfil?.rol === "super_admin" ? (
            <label className="space-y-1.5">
              <span className="text-xs font-semibold tracking-[0.16em] text-[#86868b] uppercase">
                Escuela
              </span>
              <select
                value={draftFilters.escuelaId}
                onChange={(e) =>
                  setDraftFilters((current) => ({
                    ...current,
                    escuelaId: e.target.value,
                    sedeId: "",
                  }))
                }
                className="apple-input"
              >
                <option value="">Todas</option>
                {(report?.options.escuelas || []).map((item) => (
                  <option key={item.id} value={item.id}>
                    {item.nombre}
                  </option>
                ))}
              </select>
            </label>
          ) : null}

          <label className="space-y-1.5">
            <span className="text-xs font-semibold tracking-[0.16em] text-[#86868b] uppercase">
              Sede
            </span>
            <select
              value={draftFilters.sedeId}
              onChange={(e) =>
                setDraftFilters((current) => ({ ...current, sedeId: e.target.value }))
              }
              className="apple-input"
            >
              <option value="">Todas</option>
              {availableSedes.map((item) => (
                <option key={item.id} value={item.id}>
                  {item.nombre}
                </option>
              ))}
            </select>
          </label>

          <label className="space-y-1.5">
            <span className="text-xs font-semibold tracking-[0.16em] text-[#86868b] uppercase">
              Año
            </span>
            <select
              value={draftFilters.year}
              onChange={(e) => setDraftFilters((current) => ({ ...current, year: e.target.value }))}
              className="apple-input"
            >
              {years.map((year) => (
                <option key={year} value={year}>
                  {year}
                </option>
              ))}
            </select>
          </label>

          <label className="space-y-1.5">
            <span className="text-xs font-semibold tracking-[0.16em] text-[#86868b] uppercase">
              Mes
            </span>
            <select
              value={draftFilters.month}
              onChange={(e) =>
                setDraftFilters((current) => ({ ...current, month: e.target.value }))
              }
              className="apple-input"
            >
              <option value="all">Todo el año</option>
              {MONTH_OPTIONS.filter((item) => item.value).map((item) => (
                <option key={item.value} value={item.value}>
                  {item.label}
                </option>
              ))}
            </select>
          </label>

          <label className="space-y-1.5">
            <span className="text-xs font-semibold tracking-[0.16em] text-[#86868b] uppercase">
              Línea de ingreso
            </span>
            <select
              value={draftFilters.ingresoView}
              onChange={(e) =>
                setDraftFilters((current) => ({ ...current, ingresoView: e.target.value }))
              }
              className="apple-input"
            >
              {INGRESO_VIEW_OPTIONS.map((item) => (
                <option key={item.value} value={item.value}>
                  {item.label}
                </option>
              ))}
            </select>
          </label>

          <label className="space-y-1.5">
            <span className="text-xs font-semibold tracking-[0.16em] text-[#86868b] uppercase">
              Categoría de ingreso
            </span>
            <select
              value={draftFilters.ingresoCategoria}
              onChange={(e) =>
                setDraftFilters((current) => ({ ...current, ingresoCategoria: e.target.value }))
              }
              className="apple-input"
            >
              {INGRESO_CATEGORY_OPTIONS.map((item) => (
                <option key={item.value} value={item.value}>
                  {item.label}
                </option>
              ))}
            </select>
          </label>

          <label className="space-y-1.5">
            <span className="text-xs font-semibold tracking-[0.16em] text-[#86868b] uppercase">
              Método de ingreso
            </span>
            <select
              value={draftFilters.ingresoMetodo}
              onChange={(e) =>
                setDraftFilters((current) => ({ ...current, ingresoMetodo: e.target.value }))
              }
              className="apple-input"
            >
              {INGRESO_METODO_OPTIONS.map((item) => (
                <option key={item.value} value={item.value}>
                  {item.label}
                </option>
              ))}
            </select>
          </label>

          <label className="space-y-1.5">
            <span className="text-xs font-semibold tracking-[0.16em] text-[#86868b] uppercase">
              Línea de gasto
            </span>
            <select
              value={draftFilters.gastoView}
              onChange={(e) =>
                setDraftFilters((current) => ({ ...current, gastoView: e.target.value }))
              }
              className="apple-input"
            >
              {GASTO_VIEW_OPTIONS.map((item) => (
                <option key={item.value} value={item.value}>
                  {item.label}
                </option>
              ))}
            </select>
          </label>

          <label className="space-y-1.5">
            <span className="text-xs font-semibold tracking-[0.16em] text-[#86868b] uppercase">
              Categoría de gasto
            </span>
            <select
              value={draftFilters.gastoCategoria}
              onChange={(e) =>
                setDraftFilters((current) => ({ ...current, gastoCategoria: e.target.value }))
              }
              className="apple-input"
            >
              {GASTO_CATEGORY_OPTIONS.map((item) => (
                <option key={item.value} value={item.value}>
                  {item.label}
                </option>
              ))}
            </select>
          </label>

          <label className="space-y-1.5">
            <span className="text-xs font-semibold tracking-[0.16em] text-[#86868b] uppercase">
              Método de gasto
            </span>
            <select
              value={draftFilters.gastoMetodo}
              onChange={(e) =>
                setDraftFilters((current) => ({ ...current, gastoMetodo: e.target.value }))
              }
              className="apple-input"
            >
              {GASTO_METODO_OPTIONS.map((item) => (
                <option key={item.value} value={item.value}>
                  {item.label}
                </option>
              ))}
            </select>
          </label>

          <label className="space-y-1.5">
            <span className="text-xs font-semibold tracking-[0.16em] text-[#86868b] uppercase">
              Proveedor o tramitador
            </span>
            <input
              value={draftFilters.gastoContraparte}
              onChange={(e) =>
                setDraftFilters((current) => ({ ...current, gastoContraparte: e.target.value }))
              }
              className="apple-input"
              placeholder="Ej. Carlos, Tramitador X, Taller..."
            />
          </label>
        </div>
      </AccountingPanel>

      {error ? (
        <div className="mb-4 rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-600 dark:border-red-900/40 dark:bg-red-900/10 dark:text-red-300">
          {error}
        </div>
      ) : null}

      <div className="mb-4 rounded-2xl border border-[#0071e3]/15 bg-[#0071e3]/6 px-4 py-3 text-sm text-[#0b63c7] dark:border-[#0071e3]/20 dark:bg-[#0071e3]/10 dark:text-[#69a9ff]">
        {loading ? "Generando informe..." : `Informe aplicado para ${periodLabel}.`}
      </div>

      {activeSection === "resumen" ? (
        <div className="space-y-4">
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-6">
            <AccountingStatCard
              eyebrow="Resultado"
              label="Ingresos cobrados"
              value={loading ? "..." : formatAccountingMoney(report?.summary.ingresosCobrados || 0)}
              detail="Caja real del periodo."
              tone="primary"
              icon={<Wallet size={18} />}
            />
            <AccountingStatCard
              eyebrow="Resultado"
              label="Gastos totales"
              value={loading ? "..." : formatAccountingMoney(report?.summary.gastosTotales || 0)}
              detail="Egreso aplicado en el corte."
              tone="danger"
              icon={<TrendingDown size={18} />}
            />
            <AccountingStatCard
              eyebrow="Resultado"
              label="Balance neto"
              value={loading ? "..." : formatAccountingMoney(report?.summary.balanceNeto || 0)}
              detail="Ingresos cobrados menos gastos."
              tone={(report?.summary.balanceNeto || 0) >= 0 ? "success" : "danger"}
              icon={<Landmark size={18} />}
            />
            <AccountingStatCard
              eyebrow="Cobranza"
              label="Cartera pendiente"
              value={
                loading ? "..." : formatAccountingMoney(report?.contracts?.totalPendiente || 0)
              }
              detail="Saldo por cobrar del periodo filtrado."
              tone="warning"
              icon={<Clock3 size={18} />}
            />
            <AccountingStatCard
              eyebrow="Pagos"
              label="Cuentas por pagar"
              value={loading ? "..." : formatAccountingMoney(report?.payables?.totalPendiente || 0)}
              detail="Obligaciones abiertas con proveedores y terceros."
              tone="warning"
              icon={<ReceiptText size={18} />}
            />
            <AccountingStatCard
              eyebrow="Promedio"
              label="Ticket promedio"
              value={loading ? "..." : formatAccountingMoney(report?.summary.ticketPromedio || 0)}
              detail="Ingreso medio por movimiento cobrado."
              tone="default"
              icon={<BarChart3 size={18} />}
            />
          </div>

          <div className="grid grid-cols-1 gap-4 xl:grid-cols-3">
            <AccountingStatCard
              eyebrow="Estudiantes"
              label="Alumnos matriculados"
              value={loading ? "..." : String(report?.summary.alumnosNuevosRegulares || 0)}
              detail="Nuevos alumnos regulares (Cursos y licencias)"
              tone="primary"
              icon={<BarChart3 size={18} />}
            />
            <AccountingStatCard
              eyebrow="Estudiantes"
              label="Práctica extra"
              value={loading ? "..." : String(report?.summary.alumnosNuevosPractica || 0)}
              detail="Alumnos de clases prácticas adicionales"
              tone="default"
              icon={<BarChart3 size={18} />}
            />
            <AccountingStatCard
              eyebrow="Estudiantes"
              label="Examen de aptitud"
              value={loading ? "..." : String(report?.summary.alumnosNuevosAptitud || 0)}
              detail="Alumnos registrados para examen"
              tone="default"
              icon={<BarChart3 size={18} />}
            />
          </div>

          <div className="grid grid-cols-1 gap-4 xl:grid-cols-3">
            <AccountingPanel
              title="Líneas de ingreso"
              description="Qué está entrando por cursos, exámenes y práctica adicional."
            >
              <div className="grid grid-cols-1 gap-3">
                {[
                  { label: "Cursos", total: cursos?.total || 0, cantidad: cursos?.cantidad || 0 },
                  {
                    label: "Exámenes",
                    total: examenes?.total || 0,
                    cantidad: examenes?.cantidad || 0,
                  },
                  {
                    label: "Práctica adicional",
                    total: practicas?.total || 0,
                    cantidad: practicas?.cantidad || 0,
                  },
                ].map((item) => (
                  <div
                    key={item.label}
                    className="rounded-2xl bg-[#f7f9fc] px-4 py-3 dark:bg-[#111214]"
                  >
                    <p className="text-sm font-semibold text-[#1d1d1f] dark:text-[#f5f5f7]">
                      {item.label}
                    </p>
                    <p className="mt-1 text-lg font-semibold text-[#1d1d1f] dark:text-[#f5f5f7]">
                      {formatAccountingMoney(item.total)}
                    </p>
                    <p className="mt-1 text-xs text-[#86868b]">
                      {item.cantidad} movimiento{item.cantidad === 1 ? "" : "s"}
                    </p>
                  </div>
                ))}
              </div>
            </AccountingPanel>

            <AccountingMiniList
              title="Tramitadores pagados"
              description="Lo ejecutado en el periodo filtrado."
              emptyLabel="No hay pagos a tramitadores en este corte."
              items={paidTramitadores}
            />

            <AccountingMiniList
              title="Tramitadores pendientes"
              description="Lo que todavía falta pagar a terceros."
              emptyLabel="No hay tramitadores pendientes en este corte."
              items={pendingTramitadores}
            />
          </div>

          <div className="grid grid-cols-1 gap-4 xl:grid-cols-2">
            <AccountingMiniList
              title="Deudores prioritarios"
              description="Quién tiene el saldo pendiente más alto."
              emptyLabel="No hay cartera pendiente para este corte."
              items={debtorList}
            />
            <AccountingMiniList
              title="Proveedores por pagar"
              description="Contrapartes con mayor cuenta pendiente."
              emptyLabel="No hay cuentas por pagar pendientes."
              items={providerList}
            />
          </div>

          <div className="grid grid-cols-1 gap-4 xl:grid-cols-4">
            <AccountingStatCard
              eyebrow="Foco"
              label="Categoría de ingreso líder"
              value={topIngresoCategoria?.categoria || "Sin datos"}
              detail={loading ? "..." : formatAccountingMoney(topIngresoCategoria?.total || 0)}
              tone="primary"
              icon={<TrendingUp size={18} />}
            />
            <AccountingStatCard
              eyebrow="Foco"
              label="Categoría de gasto líder"
              value={topGastoCategoria?.categoria || "Sin datos"}
              detail={loading ? "..." : formatAccountingMoney(topGastoCategoria?.total || 0)}
              tone="danger"
              icon={<TrendingDown size={18} />}
            />
            <AccountingStatCard
              eyebrow="Cobranza"
              label="Deudor principal"
              value={topDebtor?.nombre || "Sin datos"}
              detail={loading ? "..." : formatAccountingMoney(topDebtor?.saldoPendiente || 0)}
              tone="warning"
              icon={<Clock3 size={18} />}
            />
            <AccountingStatCard
              eyebrow="Pagos"
              label="Proveedor principal"
              value={topProvider?.nombre || "Sin datos"}
              detail={loading ? "..." : formatAccountingMoney(topProvider?.total || 0)}
              tone="default"
              icon={<CalendarRange size={18} />}
            />
          </div>
        </div>
      ) : activeSection === "estudiantes" ? (
        <div className="space-y-4">
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">
            <AccountingStatCard
              eyebrow="Ingresos"
              label="Ingresos por Cursos"
              value={
                loading
                  ? "..."
                  : formatAccountingMoney(report?.students?.totalIngresosRegulares || 0)
              }
              detail={`${report?.students?.countRegulares || 0} alumnos matriculados.`}
              tone="primary"
              icon={<TrendingUp size={18} />}
            />
            <AccountingStatCard
              eyebrow="Ingresos"
              label="Ingresos Práctica Extra"
              value={
                loading
                  ? "..."
                  : formatAccountingMoney(report?.students?.totalIngresosPractica || 0)
              }
              detail={`${report?.students?.countPractica || 0} alumnos por horas.`}
              tone="default"
              icon={<Clock3 size={18} />}
            />
            <AccountingStatCard
              eyebrow="Ingresos"
              label="Ingresos Aptitud"
              value={
                loading ? "..." : formatAccountingMoney(report?.students?.totalIngresosAptitud || 0)
              }
              detail={`${report?.students?.countAptitud || 0} exámenes de aptitud.`}
              tone="default"
              icon={<Landmark size={18} />}
            />
          </div>

          <AccountingPanel
            title="Detalle de alumnos en el periodo"
            description="Lista de alumnos registrados con su estado de pago y categorías."
          >
            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm">
                <thead className="border-b border-gray-100 bg-[#f7f9fc] text-[#86868b] dark:border-gray-800 dark:bg-[#111214]">
                  <tr>
                    <th className="px-4 py-3 font-semibold tracking-wider uppercase">Alumno</th>
                    <th className="px-4 py-3 font-semibold tracking-wider uppercase">Tipo</th>
                    <th className="px-4 py-3 font-semibold tracking-wider uppercase">Categorías</th>
                    <th className="px-4 py-3 font-semibold tracking-wider uppercase">Fecha</th>
                    <th className="px-4 py-3 text-right font-semibold tracking-wider uppercase">
                      Total
                    </th>
                    <th className="px-4 py-3 text-right font-semibold tracking-wider uppercase">
                      Pagado
                    </th>
                    <th className="px-4 py-3 text-right font-semibold tracking-wider uppercase">
                      Pendiente
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-50 dark:divide-gray-800/50">
                  {report?.students?.rows.length ? (
                    report.students.rows.map((row) => (
                      <tr key={row.id} className="group hover:bg-[#f7f9fc] dark:hover:bg-[#111214]">
                        <td className="px-4 py-3">
                          <p className="font-semibold text-[#1d1d1f] dark:text-[#f5f5f7]">
                            {row.nombre}
                          </p>
                          <p className="text-xs text-[#86868b]">{row.dni}</p>
                        </td>
                        <td className="px-4 py-3 text-[#1d1d1f] dark:text-[#f5f5f7]">
                          {row.tipo_registro === "regular"
                            ? "Curso Regular"
                            : row.tipo_registro === "practica_adicional"
                              ? "Práctica Extra"
                              : "Aptitud"}
                        </td>
                        <td className="px-4 py-3">
                          <div className="flex flex-wrap gap-1">
                            {(row.categorias || []).map((cat) => (
                              <span
                                key={cat}
                                className="rounded-full bg-blue-50 px-2 py-0.5 text-[10px] font-semibold text-blue-600 dark:bg-blue-900/20 dark:text-blue-400"
                              >
                                {cat}
                              </span>
                            ))}
                          </div>
                        </td>
                        <td className="px-4 py-3 whitespace-nowrap text-[#1d1d1f] dark:text-[#f5f5f7]">
                          {row.fecha_inscripcion}
                        </td>
                        <td className="px-4 py-3 text-right font-medium text-[#1d1d1f] dark:text-[#f5f5f7]">
                          {formatAccountingMoney(row.valor_total)}
                        </td>
                        <td className="px-4 py-3 text-right text-green-600 dark:text-green-400">
                          {formatAccountingMoney(row.total_pagado)}
                        </td>
                        <td className="px-4 py-3 text-right font-semibold text-red-600 dark:text-red-400">
                          {formatAccountingMoney(row.saldo_pendiente)}
                        </td>
                      </tr>
                    ))
                  ) : (
                    <tr>
                      <td colSpan={7} className="px-4 py-8 text-center text-[#86868b]">
                        No hay alumnos registrados en el periodo seleccionado.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </AccountingPanel>
        </div>
      ) : (
        <div className="space-y-4">
          <div className="grid grid-cols-1 gap-4 xl:grid-cols-2">
            <AccountingBreakdownCard
              title="Ingresos por categoría"
              subtitle="Cómo se distribuye el recaudo en el corte actual."
              rows={report?.breakdown.ingresosPorCategoria || []}
              labelKey="categoria"
              emptyLabel="No hay ingresos en el periodo filtrado."
            />
            <AccountingBreakdownCard
              title="Ingresos por método"
              subtitle="Peso de cada medio de pago dentro del recaudo."
              rows={report?.breakdown.ingresosPorMetodo || []}
              labelKey="metodo_pago"
              emptyLabel="No hay métodos de ingreso en el periodo filtrado."
            />
          </div>

          <div className="grid grid-cols-1 gap-4 xl:grid-cols-2">
            <AccountingBreakdownCard
              title="Gastos por categoría"
              subtitle="Dónde se está yendo el gasto del periodo."
              rows={report?.breakdown.gastosPorCategoria || []}
              labelKey="categoria"
              emptyLabel="No hay gastos en el periodo filtrado."
            />
            <AccountingBreakdownCard
              title="Gastos por método"
              subtitle="Cómo se están pagando los egresos."
              rows={report?.breakdown.gastosPorMetodo || []}
              labelKey="metodo_pago"
              emptyLabel="No hay métodos de gasto en el periodo filtrado."
            />
          </div>

          <div className="grid grid-cols-1 gap-4 xl:grid-cols-3">
            <AccountingMiniList
              title="Tendencia mensual"
              description="Balance neto de los últimos periodos del rango."
              emptyLabel="No hay serie mensual disponible."
              items={monthlyTrend}
            />
            <AccountingMiniList
              title="Top conceptos de ingreso"
              description="Conceptos con mayor peso económico."
              emptyLabel="No hay conceptos de ingreso en el periodo."
              items={(report?.breakdown.topConceptosIngreso || []).slice(0, 6).map((row) => ({
                label: row.concepto || "Sin concepto",
                value: formatAccountingMoney(row.total),
                meta: `${row.cantidad} movimiento${row.cantidad === 1 ? "" : "s"}`,
              }))}
            />
            <AccountingMiniList
              title="Top conceptos de gasto"
              description="Conceptos con mayor impacto en egresos."
              emptyLabel="No hay conceptos de gasto en el periodo."
              items={(report?.breakdown.topConceptosGasto || []).slice(0, 6).map((row) => ({
                label: row.concepto || "Sin concepto",
                value: formatAccountingMoney(row.total),
                meta: `${row.cantidad} movimiento${row.cantidad === 1 ? "" : "s"}`,
              }))}
            />
          </div>

          <div className="grid grid-cols-1 gap-4 xl:grid-cols-2">
            <AccountingBreakdownCard
              title="Tramitadores pagados"
              subtitle="Distribución de pagos ejecutados a terceros."
              rows={mapBreakdownAsConcept(report?.breakdown.topTramitadoresGasto || [])}
              labelKey="concepto"
              emptyLabel="No hay pagos a tramitadores en el periodo."
            />
            <AccountingBreakdownCard
              title="Tramitadores pendientes"
              subtitle="Lo pendiente por pagar a terceros."
              rows={mapBreakdownAsConcept(report?.payables?.topTramitadores || [])}
              labelKey="concepto"
              emptyLabel="No hay tramitadores pendientes en el periodo."
            />
          </div>
        </div>
      )}
    </div>
  );
}
