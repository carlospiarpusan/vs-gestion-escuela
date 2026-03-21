"use client";

import { useMemo } from "react";
import {
  ArrowDownCircle,
  ChevronDown,
  ChevronUp,
  Clock3,
  Filter,
  Layers,
  Wallet,
  X,
} from "lucide-react";
import DataTable from "@/components/dashboard/DataTable";
import AccountingBreakdownCard from "@/components/dashboard/AccountingBreakdownCard";
import {
  AccountingChipTabs,
  AccountingMiniList,
  AccountingPanel,
  AccountingStatCard,
} from "@/components/dashboard/accounting/AccountingWorkspace";
import { formatCompactDate } from "@/lib/accounting-dashboard";
import type { IncomeDashboardResponse, IncomeLedgerRow, IncomeSummary } from "@/lib/finance/types";
import type { IncomeView } from "@/lib/income-view";
import {
  AlumnoOption,
  categorias,
  estadosIngreso,
  formatIncomeText,
  getIncomeStatusClasses,
  inputCls,
  labelCls,
  metodos,
} from "./constants";

type IncomeViewMeta = {
  label: string;
  description: string;
};

export type IncomeInsightItem = {
  label: string;
  value: string;
  meta: string;
};

type IncomeOverviewSectionProps = {
  loading: boolean;
  summary: IncomeSummary | null | undefined;
  formatMoney: (value: number) => string;
};

type IncomeViewSectionProps = {
  value: IncomeView;
  items: Array<{ id: IncomeView; label: string; description: string }>;
  onChange: (value: IncomeView) => void;
};

type IncomeFiltersSectionProps = {
  filtroYear: string;
  years: Array<number | string>;
  filtroMes: string;
  mesesDelAno: Array<{ value: string; label: string }>;
  filtroAlumno: string;
  alumnos: AlumnoOption[];
  filtroMetodo: string;
  filtroCategoria: string;
  filtroEstado: string;
  isMobile: boolean;
  showAdvancedFiltersMobile: boolean;
  hayFiltros: boolean;
  onYearChange: (value: string) => void;
  onMesChange: (value: string) => void;
  onAlumnoChange: (value: string) => void;
  onMetodoChange: (value: string) => void;
  onCategoriaChange: (value: string) => void;
  onEstadoChange: (value: string) => void;
  onToggleAdvancedFilters: () => void;
  onClearFilters: () => void;
};

type IncomeBreakdownSectionProps = {
  loading: boolean;
  breakdown: IncomeDashboardResponse["breakdown"] | null | undefined;
  insightItems: IncomeInsightItem[];
  formatMoney: (value: number) => string;
};

type IncomeLedgerSectionProps = {
  loading: boolean;
  rows: IncomeLedgerRow[];
  totalCount: number;
  currentPage: number;
  searchTerm: string;
  selectedViewMeta: IncomeViewMeta;
  generatedAtLabel: string;
  pageSize: number;
  formatMoney: (value: number) => string;
  onPageChange: (page: number) => void;
  onSearchChange: (term: string) => void;
  onEdit: (row: IncomeLedgerRow) => void;
  onDelete: (row: IncomeLedgerRow) => void;
};

function renderIncomeLedgerMobileCard(
  row: IncomeLedgerRow,
  formatMoney: (value: number) => string
) {
  return (
    <div className="apple-panel-muted rounded-[24px] p-4">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="text-sm font-semibold text-[#111214] dark:text-[#f5f5f7]">{row.concepto}</p>
          <p className="mt-1 text-xs uppercase tracking-[0.16em] text-[#7b8591]">
            {formatIncomeText(row.categoria)}
          </p>
          <p className="mt-2 text-xs text-[#66707a] dark:text-[#aeb6bf]">
            {formatCompactDate(row.fecha)}
            {row.contraparte ? ` • ${row.contraparte}` : ""}
          </p>
        </div>
        <div className="text-right">
          <p className="text-base font-semibold text-emerald-600 dark:text-emerald-400">
            {formatMoney(row.monto)}
          </p>
          <span
            className={`mt-2 inline-flex rounded-full px-2.5 py-1 text-[11px] font-semibold capitalize ${getIncomeStatusClasses(row.estado)}`}
          >
            {row.estado}
          </span>
        </div>
      </div>

      <div className="mt-4 grid grid-cols-2 gap-3">
        <div>
          <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-[#7b8591]">
            Método
          </p>
          <p className="mt-1 text-sm text-[#111214] dark:text-[#f5f5f7]">
            {formatIncomeText(row.metodo_pago)}
          </p>
        </div>
        <div>
          <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-[#7b8591]">
            Factura
          </p>
          <p className="mt-1 text-sm text-[#111214] dark:text-[#f5f5f7]">
            {row.numero_factura || "Sin soporte"}
          </p>
        </div>
        <div>
          <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-[#7b8591]">
            Contrato
          </p>
          <p className="mt-1 text-sm text-[#111214] dark:text-[#f5f5f7]">
            {row.contrato || "Sin contrato"}
          </p>
        </div>
        <div>
          <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-[#7b8591]">
            Documento
          </p>
          <p className="mt-1 text-sm text-[#111214] dark:text-[#f5f5f7]">
            {row.documento || "Sin documento"}
          </p>
        </div>
      </div>
    </div>
  );
}

export function IncomeOverviewSection({
  loading,
  summary,
  formatMoney,
}: IncomeOverviewSectionProps) {
  return (
    <div className="mb-4 grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-4">
      <AccountingStatCard
        eyebrow="Periodo"
        label="Ingresos cobrados"
        value={loading ? "..." : formatMoney(summary?.ingresosCobrados || 0)}
        detail={`${summary?.movimientosCobrados || 0} cobrado${(summary?.movimientosCobrados || 0) === 1 ? "" : "s"} en el rango.`}
        tone="success"
        icon={<ArrowDownCircle size={18} />}
      />
      <AccountingStatCard
        eyebrow="Periodo"
        label="Pendiente por cobrar"
        value={loading ? "..." : formatMoney(summary?.ingresosPendientes || 0)}
        detail={`${summary?.movimientosPendientes || 0} registro${(summary?.movimientosPendientes || 0) === 1 ? "" : "s"} con saldo pendiente.`}
        tone="warning"
        icon={<Clock3 size={18} />}
      />
      <AccountingStatCard
        eyebrow="Periodo"
        label="Ticket promedio"
        value={loading ? "..." : formatMoney(summary?.ticketPromedio || 0)}
        detail={`${summary?.totalIngresos || 0} movimiento${(summary?.totalIngresos || 0) === 1 ? "" : "s"} registrado${(summary?.totalIngresos || 0) === 1 ? "" : "s"}.`}
        tone="primary"
        icon={<Wallet size={18} />}
      />
      <AccountingStatCard
        eyebrow="Periodo"
        label="Cobranza efectiva"
        value={loading ? "..." : `${(summary?.cobranzaPorcentaje || 0).toFixed(1)}%`}
        detail={`Anulado: ${formatMoney(summary?.ingresosAnulados || 0)}`}
        tone="default"
        icon={<Layers size={18} />}
      />
    </div>
  );
}

export function IncomeViewSection({ value, items, onChange }: IncomeViewSectionProps) {
  return (
    <AccountingPanel
      title="Segmenta la lectura"
      description="Mantén la vista enfocada en cursos, práctica, exámenes o soportes con factura antes de filtrar en detalle."
    >
      <AccountingChipTabs value={value} items={items} onChange={onChange} />
    </AccountingPanel>
  );
}

export function IncomeFiltersSection({
  filtroYear,
  years,
  filtroMes,
  mesesDelAno,
  filtroAlumno,
  alumnos,
  filtroMetodo,
  filtroCategoria,
  filtroEstado,
  isMobile,
  showAdvancedFiltersMobile,
  hayFiltros,
  onYearChange,
  onMesChange,
  onAlumnoChange,
  onMetodoChange,
  onCategoriaChange,
  onEstadoChange,
  onToggleAdvancedFilters,
  onClearFilters,
}: IncomeFiltersSectionProps) {
  return (
    <AccountingPanel
      title="Filtros del periodo"
      description="Deja visibles solo los ingresos que necesitas revisar. En móvil se priorizan los filtros clave para que la vista no se sature."
    >
      <div className="grid grid-cols-1 gap-3 md:grid-cols-3">
        <div>
          <label className={labelCls}>Año</label>
          <select value={filtroYear} onChange={(e) => onYearChange(e.target.value)} className={inputCls}>
            {years.map((year) => (
              <option key={year} value={year}>
                {year}
              </option>
            ))}
          </select>
        </div>
        <div>
          <label className={labelCls}>Mes</label>
          <select value={filtroMes} onChange={(e) => onMesChange(e.target.value)} className={inputCls}>
            {mesesDelAno.map((mes) => (
              <option key={mes.value} value={mes.value}>
                {mes.label}
              </option>
            ))}
          </select>
        </div>
        <div>
          <label className={labelCls}>Alumno</label>
          <select
            value={filtroAlumno}
            onChange={(e) => onAlumnoChange(e.target.value)}
            className={inputCls}
          >
            <option value="">Todos</option>
            {alumnos.map((alumno) => (
              <option key={alumno.id} value={alumno.id}>
                {alumno.nombre} {alumno.apellidos}
              </option>
            ))}
          </select>
        </div>
      </div>

      <div className="mt-4 flex flex-wrap items-center gap-2">
        {isMobile ? (
          <button
            type="button"
            onClick={onToggleAdvancedFilters}
            className="inline-flex items-center gap-2 rounded-full border border-[var(--surface-border)] bg-[var(--surface-strong)] px-3.5 py-2 text-xs font-semibold text-[#1d1d1f] transition-colors hover:border-[var(--surface-border-strong)] dark:text-[#f5f5f7]"
          >
            <Filter size={14} />
            Filtros avanzados
            {showAdvancedFiltersMobile ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
          </button>
        ) : (
          <span className="inline-flex items-center rounded-full bg-[#111214] px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.16em] text-white dark:bg-[#f5f5f7] dark:text-[#111214]">
            Segmentación avanzada visible
          </span>
        )}
        {hayFiltros && (
          <button
            onClick={onClearFilters}
            className="inline-flex items-center gap-1.5 rounded-full border border-gray-200 px-3 py-2 text-xs text-[#86868b] transition-colors hover:bg-red-50 hover:text-red-500 dark:border-gray-700 dark:hover:bg-red-900/20"
          >
            <X size={12} />
            Limpiar filtros
          </button>
        )}
      </div>

      {(!isMobile || showAdvancedFiltersMobile) && (
        <div className="mt-4 border-t border-[var(--surface-border)] pt-4">
          <div className="grid grid-cols-1 gap-3 md:grid-cols-3">
            <div>
              <label className={labelCls}>Método de pago</label>
              <select
                value={filtroMetodo}
                onChange={(e) => onMetodoChange(e.target.value)}
                className={inputCls}
              >
                <option value="">Todos</option>
                {metodos.map((metodo) => (
                  <option key={metodo.value} value={metodo.value}>
                    {metodo.label}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className={labelCls}>Categoría</label>
              <select
                value={filtroCategoria}
                onChange={(e) => onCategoriaChange(e.target.value)}
                className={inputCls}
              >
                <option value="">Todas</option>
                {categorias.map((categoria) => (
                  <option key={categoria} value={categoria}>
                    {formatIncomeText(categoria)}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className={labelCls}>Estado</label>
              <select
                value={filtroEstado}
                onChange={(e) => onEstadoChange(e.target.value)}
                className={inputCls}
              >
                <option value="">Todos</option>
                {estadosIngreso.map((estado) => (
                  <option key={estado} value={estado}>
                    {estado}
                  </option>
                ))}
              </select>
            </div>
          </div>
        </div>
      )}
    </AccountingPanel>
  );
}

export function IncomeBreakdownSection({
  loading,
  breakdown,
  insightItems,
  formatMoney,
}: IncomeBreakdownSectionProps) {
  if (!breakdown || loading) {
    return null;
  }

  return (
    <div className="mb-4 space-y-4">
      <div className="grid grid-cols-1 gap-4 xl:grid-cols-[minmax(0,1fr)_minmax(0,1fr)_360px]">
        <AccountingBreakdownCard
          title="Ingresos por categoría"
          subtitle="Qué tipo de servicio explica más recaudo en el periodo."
          rows={breakdown.ingresosPorCategoria}
          labelKey="categoria"
          emptyLabel="Sin datos de categorías."
        />
        <AccountingBreakdownCard
          title="Ingresos por método"
          subtitle="Cómo entró el dinero: efectivo, datáfono, Nequi y otros medios."
          rows={breakdown.ingresosPorMetodo}
          labelKey="metodo_pago"
          emptyLabel="Sin datos de métodos."
        />
        <AccountingPanel
          title="Lecturas clave"
          description="Una vista rápida de qué está moviendo el recaudo antes de entrar al libro."
        >
          <div className="space-y-3">
            {insightItems.map((item) => (
              <div
                key={item.label}
                className="rounded-[20px] bg-[#f7f9fc] px-4 py-3 dark:bg-[#111214]"
              >
                <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-[#7b8591]">
                  {item.label}
                </p>
                <p className="mt-2 text-sm font-semibold text-[#111214] dark:text-[#f5f5f7]">
                  {item.value}
                </p>
                <p className="mt-1 text-xs leading-5 text-[#66707a] dark:text-[#aeb6bf]">
                  {item.meta}
                </p>
              </div>
            ))}
          </div>
        </AccountingPanel>
      </div>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        <AccountingMiniList
          title="Líneas con mayor recaudo"
          description="Qué área del negocio está traccionando más dinero en el rango seleccionado."
          emptyLabel="Sin datos de líneas."
          items={(breakdown.ingresosPorLinea || []).slice(0, 5).map((row) => ({
            label: row.nombre || "Sin línea",
            value: formatMoney(row.total),
            meta: `${row.cantidad} movimiento${row.cantidad !== 1 ? "s" : ""}`,
          }))}
        />
        <AccountingMiniList
          title="Conceptos con mayor impacto"
          description="Los conceptos que más empujan el recaudo cuando llega el dinero."
          emptyLabel="Sin datos de conceptos."
          items={(breakdown.topConceptosIngreso || []).slice(0, 5).map((row) => ({
            label: row.concepto || "Sin concepto",
            value: formatMoney(row.total),
            meta: `${row.cantidad} movimiento${row.cantidad !== 1 ? "s" : ""}`,
          }))}
        />
      </div>
    </div>
  );
}

export function IncomeLedgerSection({
  loading,
  rows,
  totalCount,
  currentPage,
  searchTerm,
  selectedViewMeta,
  generatedAtLabel,
  pageSize,
  formatMoney,
  onPageChange,
  onSearchChange,
  onEdit,
  onDelete,
}: IncomeLedgerSectionProps) {
  const columns = useMemo(
    () => [
      {
        key: "fecha" as keyof IncomeLedgerRow,
        label: "Fecha",
        render: (row: IncomeLedgerRow) => (
          <span className="font-medium">{formatCompactDate(row.fecha)}</span>
        ),
      },
      {
        key: "categoria" as keyof IncomeLedgerRow,
        label: "Categoría",
        render: (row: IncomeLedgerRow) => (
          <span className="text-sm capitalize">{formatIncomeText(row.categoria)}</span>
        ),
      },
      {
        key: "concepto" as keyof IncomeLedgerRow,
        label: "Concepto",
        render: (row: IncomeLedgerRow) => (
          <div className="max-w-[200px]">
            <p className="truncate font-medium text-[#1d1d1f] dark:text-[#f5f5f7]">
              {row.concepto}
            </p>
            {row.contraparte ? (
              <p className="truncate text-xs text-[#86868b]">{row.contraparte}</p>
            ) : null}
          </div>
        ),
      },
      {
        key: "monto" as keyof IncomeLedgerRow,
        label: "Monto",
        render: (row: IncomeLedgerRow) => (
          <span className="font-semibold text-green-600 dark:text-green-400">
            {formatMoney(row.monto)}
          </span>
        ),
      },
      {
        key: "estado" as keyof IncomeLedgerRow,
        label: "Estado",
        render: (row: IncomeLedgerRow) => (
          <span
            className={`rounded-full px-2 py-0.5 text-xs font-medium capitalize ${getIncomeStatusClasses(row.estado)}`}
          >
            {row.estado}
          </span>
        ),
      },
      {
        key: "metodo_pago" as keyof IncomeLedgerRow,
        label: "Método",
        render: (row: IncomeLedgerRow) => (
          <span className="text-sm text-[#86868b] capitalize">
            {formatIncomeText(row.metodo_pago || "—")}
          </span>
        ),
      },
      {
        key: "numero_factura" as keyof IncomeLedgerRow,
        label: "Factura",
        render: (row: IncomeLedgerRow) => (
          <span className="text-sm text-[#86868b]">{row.numero_factura || "—"}</span>
        ),
      },
    ],
    [formatMoney]
  );

  return (
    <AccountingPanel
      title="Libro de ingresos"
      description="Detalle editable del periodo. Úsalo para revisar soportes, corregir movimientos y exportar el libro."
    >
      <div className="mb-4 grid grid-cols-1 gap-3 md:grid-cols-3">
        <div className="rounded-[20px] bg-[#f7f9fc] px-4 py-3 dark:bg-[#111214]">
          <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-[#7b8591]">
            Movimientos en consulta
          </p>
          <p className="mt-2 text-lg font-semibold text-[#111214] dark:text-[#f5f5f7]">
            {loading ? "..." : totalCount}
          </p>
          <p className="mt-1 text-xs text-[#66707a] dark:text-[#aeb6bf]">
            Resultado total para esta combinación de periodo, vista y filtros.
          </p>
        </div>
        <div className="rounded-[20px] bg-[#f7f9fc] px-4 py-3 dark:bg-[#111214]">
          <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-[#7b8591]">
            Alcance de la vista
          </p>
          <p className="mt-2 text-lg font-semibold text-[#111214] dark:text-[#f5f5f7]">
            {selectedViewMeta.label}
          </p>
          <p className="mt-1 text-xs text-[#66707a] dark:text-[#aeb6bf]">
            {selectedViewMeta.description}
          </p>
        </div>
        <div className="rounded-[20px] bg-[#f7f9fc] px-4 py-3 dark:bg-[#111214]">
          <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-[#7b8591]">
            Última actualización
          </p>
          <p className="mt-2 text-lg font-semibold text-[#111214] dark:text-[#f5f5f7]">
            {generatedAtLabel}
          </p>
          <p className="mt-1 text-xs text-[#66707a] dark:text-[#aeb6bf]">
            El libro se refresca con la misma lógica de filtros y paginación del módulo.
          </p>
        </div>
      </div>

      <DataTable
        key="libro-ingresos"
        columns={columns}
        data={rows}
        loading={loading}
        searchPlaceholder="Buscar por concepto, alumno, factura o contrato..."
        searchTerm={searchTerm}
        serverSide
        totalCount={totalCount}
        currentPage={currentPage}
        onPageChange={onPageChange}
        onSearchChange={onSearchChange}
        pageSize={pageSize}
        mobileCardRender={(row) => renderIncomeLedgerMobileCard(row, formatMoney)}
        onEdit={onEdit}
        onDelete={onDelete}
      />
    </AccountingPanel>
  );
}
