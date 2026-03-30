"use client";

import { useMemo } from "react";
import { Banknote, Calendar, Star, TrendingUp, X } from "lucide-react";
import DataTable from "@/components/dashboard/DataTable";
import {
  AccountingPanel,
  AccountingStatCard,
} from "@/components/dashboard/accounting/AccountingWorkspace";
import { formatCompactDate } from "@/lib/accounting-dashboard";
import type { DailyCashRow, DailyCashStats } from "@/lib/finance/types";
import { AlumnoOption, categorias, estadosIngreso, inputCls, labelCls, metodos } from "./constants";

type CajaDiariaFiltersSectionProps = {
  filtroAlumno: string;
  filtroMetodo: string;
  filtroCategoria: string;
  filtroEstado: string;
  filtroYear: string;
  filtroMes: string;
  alumnos: AlumnoOption[];
  mesesDelAno: Array<{ value: string; label: string }>;
  years: Array<number | string>;
  hayFiltros: boolean;
  onAlumnoChange: (value: string) => void;
  onMetodoChange: (value: string) => void;
  onCategoriaChange: (value: string) => void;
  onEstadoChange: (value: string) => void;
  onYearChange: (value: string) => void;
  onMesChange: (value: string) => void;
  onClearFilters: () => void;
};

type CajaDiariaOverviewSectionProps = {
  loading: boolean;
  stats: DailyCashStats;
  todayRow: DailyCashRow | null;
  showTodaySummary: boolean;
  formatMoney: (value: number) => string;
  periodLabel: string;
};

type CajaDiariaLedgerSectionProps = {
  rows: DailyCashRow[];
  loading: boolean;
  formatMoney: (value: number) => string;
};

export function CajaDiariaFiltersSection({
  filtroAlumno,
  filtroMetodo,
  filtroCategoria,
  filtroEstado,
  filtroYear,
  filtroMes,
  alumnos,
  mesesDelAno,
  years,
  hayFiltros,
  onAlumnoChange,
  onMetodoChange,
  onCategoriaChange,
  onEstadoChange,
  onYearChange,
  onMesChange,
  onClearFilters,
}: CajaDiariaFiltersSectionProps) {
  return (
    <AccountingPanel
      title="Filtros de caja"
      description="Cruza periodo, método y categoría para entender qué cobro efectivo entró cada día y por qué canal."
    >
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6">
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
                {categoria.replace(/_/g, " ")}
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
        <div>
          <label className={labelCls}>Año</label>
          <select
            value={filtroYear}
            onChange={(e) => onYearChange(e.target.value)}
            className={inputCls}
          >
            {years.map((year) => (
              <option key={year} value={year}>
                {year}
              </option>
            ))}
          </select>
        </div>
        <div>
          <label className={labelCls}>Mes</label>
          <select
            value={filtroMes}
            onChange={(e) => onMesChange(e.target.value)}
            className={inputCls}
          >
            {mesesDelAno.map((mes) => (
              <option key={mes.value} value={mes.value}>
                {mes.label}
              </option>
            ))}
          </select>
        </div>
      </div>

      {hayFiltros ? (
        <div className="mt-4 flex">
          <button
            onClick={onClearFilters}
            className="flex items-center gap-1.5 rounded-lg border border-gray-200 px-3 py-2 text-xs text-[#86868b] transition-colors hover:bg-red-50 hover:text-red-500 dark:border-gray-700 dark:hover:bg-red-900/20"
          >
            <X size={12} />
            Limpiar filtros
          </button>
        </div>
      ) : null}
    </AccountingPanel>
  );
}

export function CajaDiariaOverviewSection({
  loading,
  stats,
  todayRow,
  showTodaySummary,
  formatMoney,
  periodLabel,
}: CajaDiariaOverviewSectionProps) {
  if (showTodaySummary) {
    const todayTotal = todayRow?.total_registrado || 0;
    const todayMovements = todayRow?.movimientos || 0;

    return (
      <div className="mb-4 grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <AccountingStatCard
          eyebrow="Hoy"
          label="Total de hoy"
          value={loading ? "..." : formatMoney(todayTotal)}
          detail={
            todayRow
              ? `Efectivo: ${formatMoney(todayRow.total_efectivo)} · Nequi: ${formatMoney(todayRow.total_nequi)}`
              : "Sin ingresos cobrados hoy."
          }
          tone="success"
          icon={<Banknote size={18} />}
        />
        <AccountingStatCard
          eyebrow="Hoy"
          label="Movimientos de hoy"
          value={loading ? "..." : String(todayMovements)}
          detail={
            todayRow
              ? `Datáfono: ${formatMoney(todayRow.total_datafono)} · Sistecrédito: ${formatMoney(todayRow.total_sistecredito)}`
              : "Todavía no hay movimientos cobrados en el día."
          }
          tone="primary"
          icon={<Calendar size={18} />}
        />
        <AccountingStatCard
          eyebrow={periodLabel}
          label="Acumulado del período"
          value={loading ? "..." : formatMoney(stats.totalRegistrado)}
          detail={`${stats.diasConMovimientos} día${stats.diasConMovimientos === 1 ? "" : "s"} con movimiento.`}
          tone="default"
          icon={<TrendingUp size={18} />}
        />
        <AccountingStatCard
          eyebrow={periodLabel}
          label="Mejor día"
          value={loading ? "..." : stats.mejorDiaFecha ? formatMoney(stats.mejorDiaMonto) : "—"}
          detail={stats.mejorDiaFecha ? formatCompactDate(stats.mejorDiaFecha) : "Sin movimientos"}
          tone="default"
          icon={<Star size={18} />}
        />
      </div>
    );
  }

  return (
    <div className="mb-4 grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
      <AccountingStatCard
        eyebrow={periodLabel}
        label="Total cobrado"
        value={loading ? "..." : formatMoney(stats.totalRegistrado)}
        detail={`Efectivo: ${formatMoney(stats.totalEfectivo)} · Nequi: ${formatMoney(stats.totalNequi)}`}
        tone="success"
        icon={<Banknote size={18} />}
      />
      <AccountingStatCard
        eyebrow={periodLabel}
        label="Promedio diario"
        value={loading ? "..." : formatMoney(stats.promedioPorDia)}
        detail={`${stats.diasConMovimientos} día${stats.diasConMovimientos === 1 ? "" : "s"} con movimiento.`}
        tone="primary"
        icon={<TrendingUp size={18} />}
      />
      <AccountingStatCard
        eyebrow={periodLabel}
        label="Mejor día"
        value={loading ? "..." : stats.mejorDiaFecha ? formatMoney(stats.mejorDiaMonto) : "—"}
        detail={stats.mejorDiaFecha ? formatCompactDate(stats.mejorDiaFecha) : "Sin movimientos"}
        tone="default"
        icon={<Star size={18} />}
      />
      <AccountingStatCard
        eyebrow={periodLabel}
        label="Días con movimiento"
        value={loading ? "..." : String(stats.diasConMovimientos)}
        detail={`Datáfono: ${formatMoney(stats.totalDatafono)} · Sistecrédito: ${formatMoney(stats.totalSistecredito)}`}
        tone="default"
        icon={<Calendar size={18} />}
      />
    </div>
  );
}

export function CajaDiariaLedgerSection({
  rows,
  loading,
  formatMoney,
}: CajaDiariaLedgerSectionProps) {
  const columns = useMemo(
    () => [
      {
        key: "fecha" as keyof DailyCashRow,
        label: "Fecha",
        render: (row: DailyCashRow) => (
          <span className="font-medium">{formatCompactDate(row.fecha)}</span>
        ),
      },
      {
        key: "movimientos" as keyof DailyCashRow,
        label: "Mov.",
        render: (row: DailyCashRow) => <span>{row.movimientos}</span>,
      },
      {
        key: "total_efectivo" as keyof DailyCashRow,
        label: "Efectivo",
        render: (row: DailyCashRow) => (
          <span className="font-semibold text-green-600 dark:text-green-400">
            {formatMoney(row.total_efectivo)}
          </span>
        ),
      },
      {
        key: "total_datafono" as keyof DailyCashRow,
        label: "Datáfono",
        render: (row: DailyCashRow) => (
          <span className="font-semibold text-blue-600 dark:text-blue-400">
            {formatMoney(row.total_datafono)}
          </span>
        ),
      },
      {
        key: "total_nequi" as keyof DailyCashRow,
        label: "Nequi",
        render: (row: DailyCashRow) => (
          <span className="font-semibold text-purple-600 dark:text-purple-400">
            {formatMoney(row.total_nequi)}
          </span>
        ),
      },
      {
        key: "total_sistecredito" as keyof DailyCashRow,
        label: "Sistecrédito",
        render: (row: DailyCashRow) => (
          <span className="font-semibold text-amber-600 dark:text-amber-400">
            {formatMoney(row.total_sistecredito)}
          </span>
        ),
      },
      {
        key: "total_otro" as keyof DailyCashRow,
        label: "Otro",
        render: (row: DailyCashRow) => (
          <span className="font-semibold text-gray-500 dark:text-gray-400">
            {formatMoney(row.total_otro)}
          </span>
        ),
      },
      {
        key: "total_registrado" as keyof DailyCashRow,
        label: "Total del día",
        render: (row: DailyCashRow) => (
          <span className="font-semibold">{formatMoney(row.total_registrado)}</span>
        ),
      },
    ],
    [formatMoney]
  );

  return (
    <AccountingPanel
      title="Detalle diario"
      description="Cada fila muestra el cierre diario de ingresos cobrados, separado por medio de pago."
    >
      <DataTable
        columns={columns}
        data={rows}
        loading={loading}
        searchPlaceholder="Buscar fecha..."
        searchKeys={["fecha"]}
        pageSize={12}
      />
    </AccountingPanel>
  );
}
