"use client";

import { useState, type Dispatch, type SetStateAction } from "react";
import {
  AlertTriangle,
  ArrowDownUp,
  CalendarRange,
  ChevronDown,
  ChevronUp,
  Landmark,
  ReceiptText,
  TrendingUp,
  Wallet,
} from "lucide-react";
import AccountingBreakdownCard from "@/components/dashboard/AccountingBreakdownCard";
import {
  AccountingMiniList,
  AccountingPanel,
  AccountingSectionTabs,
  AccountingStatCard,
} from "@/components/dashboard/accounting/AccountingWorkspace";
import {
  formatAccountingMoney,
  MONTH_OPTIONS,
  type AccountingBreakdownRow,
  type AccountingReportResponse,
} from "@/lib/accounting-dashboard";
import {
  GASTO_CATEGORY_OPTIONS,
  GASTO_METODO_OPTIONS,
  GASTO_VIEW_OPTIONS,
  INGRESO_CATEGORY_OPTIONS,
  INGRESO_METODO_OPTIONS,
  INGRESO_VIEW_OPTIONS,
  type FilterState,
  type ReportSection,
} from "./constants";

type InformesTabsProps = {
  activeSection: ReportSection;
  items: Array<{ id: ReportSection; label: string; description: string }>;
  onChange: (value: ReportSection) => void;
};

type InformesFiltersPanelProps = {
  perfilRol: string | undefined;
  draftFilters: FilterState;
  setDraftFilters: Dispatch<SetStateAction<FilterState>>;
  years: Array<number | string>;
  availableSedes: Array<{ id: string; nombre: string }>;
  options: AccountingReportResponse["options"] | null | undefined;
  onReset: () => void;
};

type InformesStatusBannerProps = {
  loading: boolean;
  periodLabel: string;
  error?: string | null;
};

type InformesSummarySectionProps = {
  loading: boolean;
  report: AccountingReportResponse | null;
};

type InformesStudentsSectionProps = {
  loading: boolean;
  isMobile: boolean;
  report: AccountingReportResponse | null;
};

function formatPercent(value: number) {
  return `${value.toFixed(1)}%`;
}

function getCollectionRate(report: AccountingReportResponse | null) {
  const totalEsperado = report?.contracts?.totalEsperado || 0;
  const totalCobrado = report?.contracts?.totalCobrado || 0;
  if (totalEsperado <= 0) return 0;
  return (totalCobrado / totalEsperado) * 100;
}

function mapNamedRowsAsBreakdown(
  rows: Array<{ nombre: string; cantidad: number; total: number }>
): AccountingBreakdownRow[] {
  return rows.map((row) => ({
    concepto: row.nombre,
    cantidad: row.cantidad,
    total: row.total,
  }));
}

function formatStudentRegisterLabel(tipoRegistro: string) {
  if (tipoRegistro === "regular") return "Curso";
  if (tipoRegistro === "practica_adicional") return "Práctica";
  if (tipoRegistro === "aptitud_conductor") return "Aptitud";
  return tipoRegistro;
}

function ExecutivePriorityCard({
  title,
  value,
  detail,
  tone = "default",
}: {
  title: string;
  value: string;
  detail: string;
  tone?: "default" | "success" | "warning" | "danger";
}) {
  const toneClasses = {
    default:
      "border-[var(--surface-border)] bg-[var(--surface-muted)] text-foreground",
    success:
      "border-emerald-200/70 bg-emerald-50/80 text-emerald-900 dark:border-emerald-900/40 dark:bg-emerald-950/30 dark:text-emerald-200",
    warning:
      "border-amber-200/70 bg-amber-50/80 text-amber-900 dark:border-amber-900/40 dark:bg-amber-950/30 dark:text-amber-200",
    danger:
      "border-rose-200/70 bg-rose-50/80 text-rose-900 dark:border-rose-900/40 dark:bg-rose-950/30 dark:text-rose-200",
  } as const;

  return (
    <div className={`rounded-[22px] border px-4 py-4 ${toneClasses[tone]}`}>
      <p className="text-xs font-semibold uppercase tracking-[0.16em] opacity-75">{title}</p>
      <p className="mt-2 text-lg font-semibold tracking-tight">{value}</p>
      <p className="mt-2 text-sm leading-6 opacity-80">{detail}</p>
    </div>
  );
}

export function InformesTabs({ activeSection, items, onChange }: InformesTabsProps) {
  return <AccountingSectionTabs value={activeSection} items={items} onChange={onChange} />;
}

export function InformesFiltersPanel({
  perfilRol,
  draftFilters,
  setDraftFilters,
  years,
  availableSedes,
  options,
  onReset,
}: InformesFiltersPanelProps) {
  const [showAdvanced, setShowAdvanced] = useState(false);
  const hasAdvancedFilters = Boolean(
    draftFilters.ingresoView ||
      draftFilters.ingresoCategoria ||
      draftFilters.ingresoMetodo ||
      draftFilters.gastoView ||
      draftFilters.gastoCategoria ||
      draftFilters.gastoMetodo ||
      draftFilters.gastoContraparte.trim()
  );

  const activeFilterChips = [
    draftFilters.ingresoView &&
      `Ingreso: ${
        INGRESO_VIEW_OPTIONS.find((item) => item.value === draftFilters.ingresoView)?.label ||
        draftFilters.ingresoView
      }`,
    draftFilters.ingresoCategoria &&
      `Categoría ingreso: ${
        INGRESO_CATEGORY_OPTIONS.find((item) => item.value === draftFilters.ingresoCategoria)?.label ||
        draftFilters.ingresoCategoria
      }`,
    draftFilters.ingresoMetodo &&
      `Método ingreso: ${
        INGRESO_METODO_OPTIONS.find((item) => item.value === draftFilters.ingresoMetodo)?.label ||
        draftFilters.ingresoMetodo
      }`,
    draftFilters.gastoView &&
      `Gasto: ${
        GASTO_VIEW_OPTIONS.find((item) => item.value === draftFilters.gastoView)?.label ||
        draftFilters.gastoView
      }`,
    draftFilters.gastoCategoria &&
      `Categoría gasto: ${
        GASTO_CATEGORY_OPTIONS.find((item) => item.value === draftFilters.gastoCategoria)?.label ||
        draftFilters.gastoCategoria
      }`,
    draftFilters.gastoMetodo &&
      `Método gasto: ${
        GASTO_METODO_OPTIONS.find((item) => item.value === draftFilters.gastoMetodo)?.label ||
        draftFilters.gastoMetodo
      }`,
    draftFilters.gastoContraparte.trim() && `Contraparte: ${draftFilters.gastoContraparte.trim()}`,
  ].filter(Boolean) as string[];

  return (
    <AccountingPanel
      title="Contexto del informe"
      description="Primero define el corte. Los filtros detallados quedan disponibles solo cuando realmente necesitas profundizar."
      actions={
        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            onClick={() => setShowAdvanced((current) => !current)}
            className="apple-button-secondary min-h-[42px] px-4 text-sm font-semibold"
          >
            {showAdvanced || hasAdvancedFilters ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
            Filtros avanzados
          </button>
          <button
            type="button"
            onClick={onReset}
            className="apple-button-ghost min-h-[42px] px-4 text-sm font-semibold"
          >
            Limpiar
          </button>
        </div>
      }
    >
      <div className="grid grid-cols-1 gap-3 md:grid-cols-2 xl:grid-cols-4">
        {perfilRol === "super_admin" ? (
          <label className="space-y-1.5">
            <span className="apple-kicker">Escuela</span>
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
              {(options?.escuelas || []).map((item) => (
                <option key={item.id} value={item.id}>
                  {item.nombre}
                </option>
              ))}
            </select>
          </label>
        ) : null}

        <label className="space-y-1.5">
          <span className="apple-kicker">Sede</span>
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
          <span className="apple-kicker">Año</span>
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
          <span className="apple-kicker">Mes</span>
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
      </div>

      {activeFilterChips.length > 0 ? (
        <div className="mt-4 flex flex-wrap gap-2">
          {activeFilterChips.map((chip) => (
            <span
              key={chip}
              className="rounded-full border border-[var(--surface-border)] bg-[var(--surface-muted)] px-3 py-1.5 text-xs font-medium text-[var(--gray-600)]"
            >
              {chip}
            </span>
          ))}
        </div>
      ) : null}

      {(showAdvanced || hasAdvancedFilters) && (
        <div className="mt-4 grid grid-cols-1 gap-3 border-t border-[var(--surface-border)] pt-4 md:grid-cols-2 xl:grid-cols-4">
          <label className="space-y-1.5">
            <span className="apple-kicker">Línea de ingreso</span>
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
            <span className="apple-kicker">Categoría ingreso</span>
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
            <span className="apple-kicker">Método ingreso</span>
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
            <span className="apple-kicker">Línea de gasto</span>
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
            <span className="apple-kicker">Categoría gasto</span>
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
            <span className="apple-kicker">Método gasto</span>
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

          <label className="space-y-1.5 md:col-span-2">
            <span className="apple-kicker">Proveedor o tramitador</span>
            <input
              value={draftFilters.gastoContraparte}
              onChange={(e) =>
                setDraftFilters((current) => ({ ...current, gastoContraparte: e.target.value }))
              }
              className="apple-input"
              placeholder="Ej. Tramitador X, Taller Central, Carlos..."
            />
          </label>
        </div>
      )}
    </AccountingPanel>
  );
}

export function InformesStatusBanner({
  loading,
  periodLabel,
  error,
}: InformesStatusBannerProps) {
  return (
    <div
      className={`mb-4 rounded-[24px] px-4 py-4 ${
        error
          ? "border border-rose-200/70 bg-rose-50/80 text-rose-900 dark:border-rose-900/40 dark:bg-rose-950/30 dark:text-rose-200"
          : "apple-panel-muted"
      }`}
    >
      <div className="flex flex-col gap-3 xl:flex-row xl:items-start xl:justify-between">
        <div>
          <p className="apple-kicker">Lectura principal</p>
          <p className="mt-1 text-sm font-semibold text-foreground">
            {error
              ? "Hubo un problema al preparar la lectura ejecutiva."
              : loading
                ? "Actualizando el informe ejecutivo..."
                : `Informe ejecutivo activo para ${periodLabel}.`}
          </p>
          <p className="apple-copy mt-2 text-sm leading-6">
            {error
              ? "El reporte dejó de mostrar métricas para no darte una lectura engañosa. Vuelve a cargar el corte cuando el origen de datos esté disponible."
              : "Este reporte se enfoca en tres preguntas: si el periodo está dejando resultado, dónde se está quedando el dinero y qué riesgo necesita atención primero."}
          </p>
        </div>
        <div className="grid gap-2 sm:grid-cols-3 xl:min-w-[420px]">
          {(error
            ? ["Lectura pausada", "Sin métricas engañosas", "Reintento seguro"]
            : ["Resultado del corte", "Cobranza y cartera", "Gastos y pagos urgentes"]
          ).map((item) => (
            <div
              key={item}
              className={`rounded-2xl px-3 py-3 text-sm font-medium ${
                error
                  ? "border border-rose-300/60 bg-white/70 text-rose-900 dark:border-rose-900/50 dark:bg-rose-950/20 dark:text-rose-200"
                  : "border border-[var(--surface-border)] bg-[var(--surface-strong)] text-[var(--gray-600)]"
              }`}
            >
              {item}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

export function InformesSummarySection({ loading, report }: InformesSummarySectionProps) {
  const breakdown = report?.breakdown;
  const summary = report?.summary;
  const contracts = report?.contracts;
  const payables = report?.payables;

  const collectionRate = getCollectionRate(report);
  const topIncomeLine = breakdown?.ingresosPorLinea?.[0];
  const topExpenseCategory = breakdown?.gastosPorCategoria?.[0];
  const topDebtor = [...(contracts?.oldestPending || [])].sort(
    (left, right) => right.saldoPendiente - left.saldoPendiente
  )[0];
  const topProvider = payables?.topProveedores?.[0];
  const netTone = (summary?.balanceNeto || 0) >= 0 ? "success" : "danger";
  const payablePressureTone =
    (payables?.totalPendiente || 0) > (summary?.ingresosCobrados || 0) * 0.35 ? "warning" : "default";
  const monthlyTrend = (report?.series?.mensual || []).slice(0, 6).map((row) => ({
    label: row.periodo,
    value: formatAccountingMoney(row.balance),
    meta: `Ingresos ${formatAccountingMoney(row.ingresos)} · Gastos ${formatAccountingMoney(row.gastos)}`,
  }));
  const debtorList = [...(contracts?.oldestPending || [])]
    .sort((left, right) => right.saldoPendiente - left.saldoPendiente)
    .slice(0, 6)
    .map((row) => ({
      label: row.nombre,
      value: formatAccountingMoney(row.saldoPendiente),
      meta: `${row.diasPendiente} día${row.diasPendiente === 1 ? "" : "s"} de mora`,
    }));
  const providerList = (payables?.topProveedores || []).slice(0, 6).map((row) => ({
    label: row.nombre,
    value: formatAccountingMoney(row.total),
    meta: `${row.cantidad} obligación${row.cantidad === 1 ? "" : "es"} pendiente${row.cantidad === 1 ? "" : "s"}`,
  }));
  const tramitadoresPendientes = (payables?.topTramitadores || []).slice(0, 6).map((row) => ({
    label: row.nombre,
    value: formatAccountingMoney(row.total),
    meta: `${row.cantidad} obligación${row.cantidad === 1 ? "" : "es"} pendiente${row.cantidad === 1 ? "" : "s"}`,
  }));
  const topIncomeConcepts = (breakdown?.topConceptosIngreso || []).slice(0, 6).map((row) => ({
    label: row.concepto || "Sin concepto",
    value: formatAccountingMoney(row.total),
    meta: `${row.cantidad} movimiento${row.cantidad === 1 ? "" : "s"}`,
  }));
  const topExpenseConcepts = (breakdown?.topConceptosGasto || []).slice(0, 6).map((row) => ({
    label: row.concepto || "Sin concepto",
    value: formatAccountingMoney(row.total),
    meta: `${row.cantidad} movimiento${row.cantidad === 1 ? "" : "s"}`,
  }));

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-5">
        <AccountingStatCard
          eyebrow="Resultado"
          label="Ingresos cobrados"
          value={loading ? "..." : formatAccountingMoney(summary?.ingresosCobrados || 0)}
          detail="Caja real del periodo."
          tone="primary"
          icon={<Wallet size={18} />}
        />
        <AccountingStatCard
          eyebrow="Resultado"
          label="Balance neto"
          value={loading ? "..." : formatAccountingMoney(summary?.balanceNeto || 0)}
          detail="Ingresos cobrados menos gastos."
          tone={netTone}
          icon={<Landmark size={18} />}
        />
        <AccountingStatCard
          eyebrow="Resultado"
          label="Margen"
          value={loading ? "..." : formatPercent(summary?.margenPorcentaje || 0)}
          detail="Rentabilidad del corte actual."
          tone={netTone}
          icon={<TrendingUp size={18} />}
        />
        <AccountingStatCard
          eyebrow="Cobranza"
          label="Cartera pendiente"
          value={loading ? "..." : formatAccountingMoney(contracts?.totalPendiente || 0)}
          detail={`${loading ? "..." : formatPercent(collectionRate)} del esperado ya está cobrado.`}
          tone="warning"
          icon={<ArrowDownUp size={18} />}
        />
        <AccountingStatCard
          eyebrow="Pagos"
          label="Cuentas por pagar"
          value={loading ? "..." : formatAccountingMoney(payables?.totalPendiente || 0)}
          detail="Obligaciones abiertas con proveedores y terceros."
          tone={payablePressureTone}
          icon={<ReceiptText size={18} />}
        />
      </div>

      <AccountingPanel
        title="Qué mover primero"
        description="Una lectura ejecutiva breve para actuar sin navegar por varias pestañas ni perseguir detalles secundarios."
      >
        <div className="grid grid-cols-1 gap-3 md:grid-cols-2 xl:grid-cols-4">
          <ExecutivePriorityCard
            title="Fuente principal"
            value={topIncomeLine?.nombre || "Sin datos"}
            detail={
              topIncomeLine
                ? `${formatAccountingMoney(topIncomeLine.total)} en ${topIncomeLine.cantidad} movimientos.`
                : "Todavía no hay ingresos suficientes en el corte."
            }
            tone="success"
          />
          <ExecutivePriorityCard
            title="Presión de gasto"
            value={topExpenseCategory?.categoria || "Sin datos"}
            detail={
              topExpenseCategory
                ? `${formatAccountingMoney(topExpenseCategory.total)} es la categoría con más peso.`
                : "Todavía no hay egresos suficientes en el corte."
            }
            tone="warning"
          />
          <ExecutivePriorityCard
            title="Mayor riesgo de cobro"
            value={topDebtor?.nombre || "Sin cartera crítica"}
            detail={
              topDebtor
                ? `${formatAccountingMoney(topDebtor.saldoPendiente)} con ${topDebtor.diasPendiente} días de mora.`
                : "No hay deudores críticos en este periodo."
            }
            tone={topDebtor ? "danger" : "default"}
          />
          <ExecutivePriorityCard
            title="Pago a priorizar"
            value={topProvider?.nombre || "Sin pagos urgentes"}
            detail={
              topProvider
                ? `${formatAccountingMoney(topProvider.total)} es la cuenta pendiente más alta.`
                : "No hay proveedores pendientes en este corte."
            }
            tone={topProvider ? "warning" : "default"}
          />
        </div>
      </AccountingPanel>

      <div className="grid grid-cols-1 gap-4 xl:grid-cols-2">
        <AccountingBreakdownCard
          title="Dónde entra el dinero"
          subtitle="Distribución del recaudo por líneas de negocio, con lectura directa para operación."
          rows={mapNamedRowsAsBreakdown(breakdown?.ingresosPorLinea || [])}
          labelKey="concepto"
          emptyLabel="No hay ingresos en el periodo filtrado."
        />
        <AccountingBreakdownCard
          title="Dónde se va el dinero"
          subtitle="Las categorías de gasto con más impacto en el margen del periodo."
          rows={breakdown?.gastosPorCategoria || []}
          labelKey="categoria"
          emptyLabel="No hay gastos en el periodo filtrado."
        />
      </div>

      <div className="grid grid-cols-1 gap-4 xl:grid-cols-3">
        <AccountingMiniList
          title="Tendencia reciente"
          description="Balance neto de los últimos periodos del rango."
          emptyLabel="No hay serie mensual disponible."
          items={monthlyTrend}
        />
        <AccountingMiniList
          title="Deudores prioritarios"
          description="Quién tiene el saldo pendiente más relevante y requiere gestión."
          emptyLabel="No hay cartera pendiente en este corte."
          items={debtorList}
        />
        <AccountingMiniList
          title="Pagos por priorizar"
          description="Proveedores con mayor saldo pendiente."
          emptyLabel="No hay cuentas por pagar pendientes."
          items={providerList}
        />
      </div>

      <div className="grid grid-cols-1 gap-4 xl:grid-cols-3">
        <AccountingMiniList
          title="Conceptos que más venden"
          description="Los conceptos de ingreso que hoy explican más dinero."
          emptyLabel="No hay conceptos de ingreso disponibles."
          items={topIncomeConcepts}
        />
        <AccountingMiniList
          title="Conceptos que más gastan"
          description="Los conceptos de egreso que más presionan el resultado."
          emptyLabel="No hay conceptos de gasto disponibles."
          items={topExpenseConcepts}
        />
        <AccountingMiniList
          title="Tramitadores pendientes"
          description="Terceros que todavía requieren pago en el periodo."
          emptyLabel="No hay tramitadores pendientes."
          items={tramitadoresPendientes}
        />
      </div>
    </div>
  );
}

export function InformesStudentsSection({
  loading,
  isMobile,
  report,
}: InformesStudentsSectionProps) {
  const students = report?.students;

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">
        <AccountingStatCard
          eyebrow="Estudiantes"
          label="Ingresos por cursos"
          value={loading ? "..." : formatAccountingMoney(students?.totalIngresosRegulares || 0)}
          detail={`${students?.countRegulares || 0} alumnos regulares en el corte.`}
          tone="primary"
          icon={<TrendingUp size={18} />}
        />
        <AccountingStatCard
          eyebrow="Estudiantes"
          label="Práctica adicional"
          value={loading ? "..." : formatAccountingMoney(students?.totalIngresosPractica || 0)}
          detail={`${students?.countPractica || 0} alumnos por horas.`}
          tone="default"
          icon={<CalendarRange size={18} />}
        />
        <AccountingStatCard
          eyebrow="Estudiantes"
          label="Aptitud"
          value={loading ? "..." : formatAccountingMoney(students?.totalIngresosAptitud || 0)}
          detail={`${students?.countAptitud || 0} registros de aptitud.`}
          tone="default"
          icon={<AlertTriangle size={18} />}
        />
      </div>

      <AccountingPanel
        title="Detalle de alumnos del periodo"
        description="Lista de alumnos con su tipo de registro, categorías y estado de pago para entrar al detalle solo cuando haga falta."
      >
        {isMobile ? (
          students?.rows.length ? (
            <div className="space-y-3">
              {students.rows.map((row) => (
                <div
                  key={row.id}
                  className="apple-panel-muted rounded-[24px] p-4"
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <p className="font-semibold text-foreground">{row.nombre}</p>
                      <p className="text-xs text-[var(--gray-500)]">{row.dni}</p>
                    </div>
                    <span className="rounded-full border border-[var(--surface-border)] bg-[var(--surface-strong)] px-2.5 py-1 text-[10px] font-semibold text-[var(--gray-600)]">
                      {formatStudentRegisterLabel(row.tipo_registro)}
                    </span>
                  </div>

                  <div className="mt-3 flex flex-wrap gap-1.5">
                    {(row.categorias || []).map((cat) => (
                      <span
                        key={cat}
                        className="rounded-full border border-[var(--surface-border)] bg-[var(--surface-strong)] px-2.5 py-1 text-[10px] font-semibold text-[var(--gray-600)]"
                      >
                        {cat}
                      </span>
                    ))}
                  </div>

                  <div className="mt-4 grid grid-cols-2 gap-3 text-sm">
                    <div className="rounded-2xl bg-[var(--surface-strong)] px-3 py-3">
                      <p className="apple-kicker">Fecha</p>
                      <p className="mt-1 font-medium text-foreground">{row.fecha_inscripcion}</p>
                    </div>
                    <div className="rounded-2xl bg-[var(--surface-strong)] px-3 py-3">
                      <p className="apple-kicker">Total</p>
                      <p className="mt-1 font-medium text-foreground">
                        {formatAccountingMoney(row.valor_total)}
                      </p>
                    </div>
                    <div className="rounded-2xl bg-[var(--surface-strong)] px-3 py-3">
                      <p className="apple-kicker">Pagado</p>
                      <p className="mt-1 font-semibold text-emerald-600 dark:text-emerald-400">
                        {formatAccountingMoney(row.total_pagado)}
                      </p>
                    </div>
                    <div className="rounded-2xl bg-[var(--surface-strong)] px-3 py-3">
                      <p className="apple-kicker">Pendiente</p>
                      <p className="mt-1 font-semibold text-rose-600 dark:text-rose-400">
                        {formatAccountingMoney(row.saldo_pendiente)}
                      </p>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="rounded-2xl border border-[var(--surface-border)] bg-[var(--surface-muted)] px-4 py-8 text-center text-[var(--gray-500)]">
              No hay alumnos registrados en el periodo seleccionado.
            </div>
          )
        ) : (
          <div className="apple-table-shell">
            <table className="min-w-full text-left text-sm">
              <thead>
                <tr>
                  <th className="px-4 py-3 font-semibold tracking-wider uppercase">Alumno</th>
                  <th className="px-4 py-3 font-semibold tracking-wider uppercase">Tipo</th>
                  <th className="px-4 py-3 font-semibold tracking-wider uppercase">Categorías</th>
                  <th className="px-4 py-3 font-semibold tracking-wider uppercase">Fecha</th>
                  <th className="px-4 py-3 text-right font-semibold tracking-wider uppercase">Total</th>
                  <th className="px-4 py-3 text-right font-semibold tracking-wider uppercase">Pagado</th>
                  <th className="px-4 py-3 text-right font-semibold tracking-wider uppercase">Pendiente</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[var(--surface-border)]">
                {students?.rows.length ? (
                  students.rows.map((row) => (
                    <tr key={row.id} className="hover:bg-[var(--surface-muted)]/70">
                      <td className="px-4 py-3">
                        <p className="font-semibold text-foreground">{row.nombre}</p>
                        <p className="text-xs text-[var(--gray-500)]">{row.dni}</p>
                      </td>
                      <td className="px-4 py-3 text-foreground">
                        {formatStudentRegisterLabel(row.tipo_registro)}
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex flex-wrap gap-1">
                          {(row.categorias || []).map((cat) => (
                            <span
                              key={cat}
                              className="rounded-full border border-[var(--surface-border)] bg-[var(--surface-strong)] px-2 py-0.5 text-[10px] font-semibold text-[var(--gray-600)]"
                            >
                              {cat}
                            </span>
                          ))}
                        </div>
                      </td>
                      <td className="px-4 py-3 whitespace-nowrap text-foreground">
                        {row.fecha_inscripcion}
                      </td>
                      <td className="px-4 py-3 text-right font-medium text-foreground">
                        {formatAccountingMoney(row.valor_total)}
                      </td>
                      <td className="px-4 py-3 text-right font-medium text-emerald-600 dark:text-emerald-400">
                        {formatAccountingMoney(row.total_pagado)}
                      </td>
                      <td className="px-4 py-3 text-right font-semibold text-rose-600 dark:text-rose-400">
                        {formatAccountingMoney(row.saldo_pendiente)}
                      </td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan={7} className="px-4 py-8 text-center text-[var(--gray-500)]">
                      No hay alumnos registrados en el periodo seleccionado.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        )}
      </AccountingPanel>
    </div>
  );
}
