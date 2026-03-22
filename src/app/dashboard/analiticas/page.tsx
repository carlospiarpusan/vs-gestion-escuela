"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import {
  Activity,
  BarChart3,
  Database,
  RefreshCw,
  School,
  TrendingUp,
  Users,
  Wallet,
  ArrowUpRight,
  ArrowDownRight,
  Clock,
  Shield,
  Server,
  Zap,
} from "lucide-react";
import { fetchJsonWithRetry } from "@/lib/retry";
import type { SuperAdminAnalyticsResponse } from "@/app/api/dashboard/superadmin-analytics/route";

// ── Helpers ────────────────────────────────────────────────────────────
function formatCOP(value: number) {
  return new Intl.NumberFormat("es-CO", {
    style: "currency",
    currency: "COP",
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(value);
}

function formatNumber(value: number) {
  return new Intl.NumberFormat("es-CO").format(value);
}

function formatPercent(value: number) {
  return `${value.toFixed(1)}%`;
}

const MONTH_NAMES: Record<string, string> = {
  "01": "Ene",
  "02": "Feb",
  "03": "Mar",
  "04": "Abr",
  "05": "May",
  "06": "Jun",
  "07": "Jul",
  "08": "Ago",
  "09": "Sep",
  "10": "Oct",
  "11": "Nov",
  "12": "Dic",
};

function shortMonth(mesStr: string) {
  const mm = mesStr.split("-")[1] ?? "";
  return MONTH_NAMES[mm] ?? mm;
}

const ROL_LABELS: Record<string, string> = {
  admin_escuela: "Admin Escuela",
  admin_sede: "Admin Sede",
  administrativo: "Administrativo",
  instructor: "Instructor",
  recepcion: "Recepcion",
  alumno: "Alumno",
};

const TABLE_LABELS: Record<string, string> = {
  alumnos: "Alumnos",
  clases: "Clases",
  instructores: "Instructores",
  vehiculos: "Vehiculos",
  ingresos: "Ingresos",
  gastos: "Gastos",
  perfiles: "Perfiles",
  escuelas: "Escuelas",
  sedes: "Sedes",
  horas_trabajo: "Horas trabajo",
  examenes: "Examenes",
  nominas: "Nominas",
};

const PLAN_COLORS: Record<string, string> = {
  gratuito: "bg-zinc-100 text-zinc-700",
  basico: "bg-blue-50 text-blue-700",
  profesional: "bg-violet-50 text-violet-700",
  enterprise: "bg-amber-50 text-amber-700",
};

// ── Mini bar chart ─────────────────────────────────────────────────────
function MiniBarChart({
  data,
  color = "bg-blue-500",
  height = 80,
}: {
  data: number[];
  color?: string;
  height?: number;
}) {
  const max = Math.max(...data, 1);
  return (
    <div className="flex items-end gap-1" style={{ height }}>
      {data.map((v, i) => (
        <div
          key={i}
          className={`flex-1 rounded-t ${color} min-w-[6px] transition-all duration-300`}
          style={{ height: `${Math.max((v / max) * 100, 4)}%` }}
          title={formatNumber(v)}
        />
      ))}
    </div>
  );
}

// ── Sparkline ──────────────────────────────────────────────────────────
function Sparkline({
  data,
  color = "#3b82f6",
  width = 120,
  height = 32,
}: {
  data: number[];
  color?: string;
  width?: number;
  height?: number;
}) {
  if (data.length < 2) return null;
  const max = Math.max(...data, 1);
  const min = Math.min(...data, 0);
  const range = max - min || 1;
  const padding = 2;

  const points = data
    .map((v, i) => {
      const x = padding + (i / (data.length - 1)) * (width - padding * 2);
      const y = height - padding - ((v - min) / range) * (height - padding * 2);
      return `${x},${y}`;
    })
    .join(" ");

  return (
    <svg width={width} height={height} className="overflow-visible">
      <polyline
        points={points}
        fill="none"
        stroke={color}
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

// ── Progress bar ───────────────────────────────────────────────────────
function ProgressBar({
  value,
  max,
  color = "bg-blue-500",
}: {
  value: number;
  max: number;
  color?: string;
}) {
  const pct = max > 0 ? Math.min((value / max) * 100, 100) : 0;
  return (
    <div className="h-2 w-full rounded-full bg-zinc-100">
      <div
        className={`h-full rounded-full ${color} transition-all duration-500`}
        style={{ width: `${pct}%` }}
      />
    </div>
  );
}

// ── KPI Card ───────────────────────────────────────────────────────────
function KpiCard({
  icon: Icon,
  label,
  value,
  subtitle,
  trend,
  color = "text-blue-600",
  bgColor = "bg-blue-50",
}: {
  icon: React.ComponentType<{ className?: string }>;
  label: string;
  value: string;
  subtitle?: string;
  trend?: { value: number; label: string };
  color?: string;
  bgColor?: string;
}) {
  return (
    <div className="rounded-2xl border border-zinc-200/60 bg-white p-5 shadow-sm">
      <div className="flex items-start justify-between">
        <div className={`rounded-xl ${bgColor} p-2.5`}>
          <Icon className={`h-5 w-5 ${color}`} />
        </div>
        {trend && (
          <div
            className={`flex items-center gap-0.5 text-xs font-medium ${
              trend.value >= 0 ? "text-emerald-600" : "text-red-500"
            }`}
          >
            {trend.value >= 0 ? (
              <ArrowUpRight className="h-3.5 w-3.5" />
            ) : (
              <ArrowDownRight className="h-3.5 w-3.5" />
            )}
            {Math.abs(trend.value)}%
          </div>
        )}
      </div>
      <div className="mt-3">
        <p className="text-2xl font-semibold tracking-tight text-zinc-900">{value}</p>
        <p className="mt-0.5 text-sm text-zinc-500">{label}</p>
        {subtitle && <p className="mt-0.5 text-xs text-zinc-400">{subtitle}</p>}
      </div>
    </div>
  );
}

// ── Main page ──────────────────────────────────────────────────────────
export default function AnaliticasPage() {
  const [data, setData] = useState<SuperAdminAnalyticsResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [refreshing, setRefreshing] = useState(false);

  const fetchData = useCallback(async (isRefresh = false) => {
    if (isRefresh) setRefreshing(true);
    else setLoading(true);
    setError(null);

    try {
      const res = await fetchJsonWithRetry<SuperAdminAnalyticsResponse>(
        "/api/dashboard/superadmin-analytics"
      );
      setData(res);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Error cargando analiticas");
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  // Compute growth trend (last month vs previous)
  const growthTrends = useMemo(() => {
    if (!data || data.monthlyGrowth.length < 2) return null;
    const last = data.monthlyGrowth[data.monthlyGrowth.length - 1];
    const prev = data.monthlyGrowth[data.monthlyGrowth.length - 2];

    const calcTrend = (cur: number, pre: number) =>
      pre > 0 ? Math.round(((cur - pre) / pre) * 100) : cur > 0 ? 100 : 0;

    return {
      alumnos: calcTrend(last.alumnos, prev.alumnos),
      clases: calcTrend(last.clases, prev.clases),
      ingresos: calcTrend(last.ingresos, prev.ingresos),
      examenes: calcTrend(last.examenes, prev.examenes),
    };
  }, [data]);

  const totalRecords = useMemo(
    () => data?.dataVolume.reduce((sum, t) => sum + t.registros, 0) ?? 0,
    [data]
  );

  // ── Loading skeleton ─────────────────────────────────────────────────
  if (loading && !data) {
    return (
      <div className="mx-auto max-w-7xl space-y-6 p-6">
        <div className="flex items-center justify-between">
          <div>
            <div className="h-8 w-48 animate-pulse rounded-lg bg-zinc-200" />
            <div className="mt-2 h-4 w-72 animate-pulse rounded bg-zinc-100" />
          </div>
        </div>
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {Array.from({ length: 8 }).map((_, i) => (
            <div key={i} className="h-32 animate-pulse rounded-2xl bg-zinc-100" />
          ))}
        </div>
        <div className="grid gap-6 lg:grid-cols-2">
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="h-80 animate-pulse rounded-2xl bg-zinc-100" />
          ))}
        </div>
      </div>
    );
  }

  if (error && !data) {
    return (
      <div className="mx-auto max-w-7xl p-6">
        <div className="rounded-2xl border border-red-200 bg-red-50 p-8 text-center">
          <Shield className="mx-auto h-12 w-12 text-red-400" />
          <h2 className="mt-4 text-lg font-semibold text-red-800">Error al cargar analiticas</h2>
          <p className="mt-1 text-sm text-red-600">{error}</p>
          <button
            onClick={() => fetchData()}
            className="mt-4 rounded-lg bg-red-600 px-4 py-2 text-sm font-medium text-white hover:bg-red-700"
          >
            Reintentar
          </button>
        </div>
      </div>
    );
  }

  if (!data) return null;

  const { usersByRole, dataVolume, monthlyGrowth, topSchools, systemHealth } = data;
  const margenMes = systemHealth.ingresos_plataforma_mes - systemHealth.gastos_plataforma_mes;

  return (
    <div className="mx-auto max-w-7xl space-y-8 p-6">
      {/* ── Header ──────────────────────────────────────────────────── */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-zinc-900">
            Analiticas de plataforma
          </h1>
          <p className="mt-1 text-sm text-zinc-500">
            Metricas de uso, crecimiento y consumo de recursos por tipo de usuario.
          </p>
        </div>
        <div className="flex items-center gap-3">
          {data.generatedAt && (
            <span className="flex items-center gap-1.5 text-xs text-zinc-400">
              <Clock className="h-3.5 w-3.5" />
              {new Date(data.generatedAt).toLocaleTimeString("es-CO", {
                hour: "2-digit",
                minute: "2-digit",
              })}
            </span>
          )}
          <button
            onClick={() => fetchData(true)}
            disabled={refreshing}
            className="flex items-center gap-2 rounded-xl border border-zinc-200 bg-white px-4 py-2 text-sm font-medium text-zinc-700 shadow-sm transition-colors hover:bg-zinc-50 disabled:opacity-50"
          >
            <RefreshCw className={`h-4 w-4 ${refreshing ? "animate-spin" : ""}`} />
            Actualizar
          </button>
        </div>
      </div>

      {/* ── KPI Cards ───────────────────────────────────────────────── */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <KpiCard
          icon={School}
          label="Escuelas activas"
          value={formatNumber(systemHealth.escuelas_activas)}
          subtitle={`${systemHealth.escuelas_inactivas} inactivas`}
          color="text-violet-600"
          bgColor="bg-violet-50"
        />
        <KpiCard
          icon={Users}
          label="Usuarios totales"
          value={formatNumber(systemHealth.usuarios_totales)}
          subtitle={`${formatNumber(systemHealth.usuarios_activos_30d)} activos (30d)`}
          trend={
            systemHealth.tasa_actividad > 0
              ? { value: systemHealth.tasa_actividad, label: "actividad" }
              : undefined
          }
          color="text-blue-600"
          bgColor="bg-blue-50"
        />
        <KpiCard
          icon={Wallet}
          label="Ingresos del mes"
          value={formatCOP(systemHealth.ingresos_plataforma_mes)}
          subtitle={`Gastos: ${formatCOP(systemHealth.gastos_plataforma_mes)}`}
          trend={
            growthTrends ? { value: growthTrends.ingresos, label: "vs mes anterior" } : undefined
          }
          color="text-emerald-600"
          bgColor="bg-emerald-50"
        />
        <KpiCard
          icon={Database}
          label="Registros totales"
          value={formatNumber(totalRecords)}
          subtitle={`${dataVolume.length} tablas monitoreadas`}
          color="text-amber-600"
          bgColor="bg-amber-50"
        />
      </div>

      {/* ── Margen operativo ────────────────────────────────────────── */}
      <div className="rounded-2xl border border-zinc-200/60 bg-white p-6 shadow-sm">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="rounded-xl bg-emerald-50 p-2.5">
              <TrendingUp className="h-5 w-5 text-emerald-600" />
            </div>
            <div>
              <h2 className="text-sm font-medium text-zinc-500">Margen operativo del mes</h2>
              <p
                className={`text-2xl font-bold tracking-tight ${
                  margenMes >= 0 ? "text-emerald-700" : "text-red-600"
                }`}
              >
                {formatCOP(margenMes)}
              </p>
            </div>
          </div>
          <div className="flex gap-8 text-sm">
            <div>
              <p className="text-zinc-400">Ingresos</p>
              <p className="font-semibold text-emerald-600">
                {formatCOP(systemHealth.ingresos_plataforma_mes)}
              </p>
            </div>
            <div>
              <p className="text-zinc-400">Gastos</p>
              <p className="font-semibold text-red-500">
                {formatCOP(systemHealth.gastos_plataforma_mes)}
              </p>
            </div>
            <div>
              <p className="text-zinc-400">Tasa actividad</p>
              <p className="font-semibold text-blue-600">
                {formatPercent(systemHealth.tasa_actividad)}
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* ── Two-column grid ─────────────────────────────────────────── */}
      <div className="grid gap-6 lg:grid-cols-2">
        {/* ── Crecimiento mensual ──────────────────────────────────── */}
        <div className="rounded-2xl border border-zinc-200/60 bg-white p-6 shadow-sm">
          <div className="flex items-center gap-2">
            <BarChart3 className="h-5 w-5 text-zinc-400" />
            <h2 className="text-base font-semibold text-zinc-800">Crecimiento mensual</h2>
          </div>
          <p className="mt-1 text-xs text-zinc-400">Ultimos 6 meses</p>

          <div className="mt-5 space-y-5">
            {/* Alumnos */}
            <div>
              <div className="mb-1 flex items-center justify-between text-sm">
                <span className="font-medium text-zinc-600">Nuevos alumnos</span>
                <span className="text-zinc-400">
                  {formatNumber(monthlyGrowth[monthlyGrowth.length - 1]?.alumnos ?? 0)} este mes
                </span>
              </div>
              <MiniBarChart
                data={monthlyGrowth.map((m) => m.alumnos)}
                color="bg-blue-500"
                height={48}
              />
              <div className="mt-1 flex justify-between text-[10px] text-zinc-400">
                {monthlyGrowth.map((m) => (
                  <span key={m.mes} className="flex-1 text-center">
                    {shortMonth(m.mes)}
                  </span>
                ))}
              </div>
            </div>

            {/* Clases */}
            <div>
              <div className="mb-1 flex items-center justify-between text-sm">
                <span className="font-medium text-zinc-600">Clases impartidas</span>
                <span className="text-zinc-400">
                  {formatNumber(monthlyGrowth[monthlyGrowth.length - 1]?.clases ?? 0)} este mes
                </span>
              </div>
              <MiniBarChart
                data={monthlyGrowth.map((m) => m.clases)}
                color="bg-violet-500"
                height={48}
              />
              <div className="mt-1 flex justify-between text-[10px] text-zinc-400">
                {monthlyGrowth.map((m) => (
                  <span key={m.mes} className="flex-1 text-center">
                    {shortMonth(m.mes)}
                  </span>
                ))}
              </div>
            </div>

            {/* Ingresos vs Gastos */}
            <div>
              <div className="mb-1 flex items-center justify-between text-sm">
                <span className="font-medium text-zinc-600">Ingresos cobrados</span>
                <span className="text-zinc-400">
                  {formatCOP(monthlyGrowth[monthlyGrowth.length - 1]?.ingresos ?? 0)}
                </span>
              </div>
              <MiniBarChart
                data={monthlyGrowth.map((m) => m.ingresos)}
                color="bg-emerald-500"
                height={48}
              />
              <div className="mt-1 flex justify-between text-[10px] text-zinc-400">
                {monthlyGrowth.map((m) => (
                  <span key={m.mes} className="flex-1 text-center">
                    {shortMonth(m.mes)}
                  </span>
                ))}
              </div>
            </div>
          </div>
        </div>

        {/* ── Usuarios por rol ─────────────────────────────────────── */}
        <div className="rounded-2xl border border-zinc-200/60 bg-white p-6 shadow-sm">
          <div className="flex items-center gap-2">
            <Users className="h-5 w-5 text-zinc-400" />
            <h2 className="text-base font-semibold text-zinc-800">Usuarios por rol</h2>
          </div>
          <p className="mt-1 text-xs text-zinc-400">Distribucion y actividad por tipo de usuario</p>

          <div className="mt-5 space-y-4">
            {usersByRole.map((row) => {
              const maxTotal = Math.max(...usersByRole.map((r) => r.total), 1);
              return (
                <div key={row.rol}>
                  <div className="mb-1.5 flex items-center justify-between">
                    <span className="text-sm font-medium text-zinc-700">
                      {ROL_LABELS[row.rol] ?? row.rol}
                    </span>
                    <div className="flex items-center gap-3 text-xs text-zinc-400">
                      <span>{row.activos} activos</span>
                      <span className="text-blue-500">{row.ultimo_7d} (7d)</span>
                      <span className="font-semibold text-zinc-600">{row.total}</span>
                    </div>
                  </div>
                  <div className="flex gap-1">
                    <div className="h-2 flex-1 rounded-full bg-zinc-100">
                      <div
                        className="h-full rounded-full bg-blue-500 transition-all duration-500"
                        style={{ width: `${(row.activos / maxTotal) * 100}%` }}
                      />
                    </div>
                  </div>
                  <div className="mt-1 flex gap-4 text-[10px] text-zinc-400">
                    <span>
                      Tasa actividad:{" "}
                      {row.total > 0 ? ((row.activos / row.total) * 100).toFixed(0) : 0}%
                    </span>
                    <span>Recientes (30d): {row.ultimo_30d}</span>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* ── Volumen de datos ─────────────────────────────────────── */}
        <div className="rounded-2xl border border-zinc-200/60 bg-white p-6 shadow-sm">
          <div className="flex items-center gap-2">
            <Server className="h-5 w-5 text-zinc-400" />
            <h2 className="text-base font-semibold text-zinc-800">Volumen de datos</h2>
          </div>
          <p className="mt-1 text-xs text-zinc-400">
            Registros por tabla principal — {formatNumber(totalRecords)} total
          </p>

          <div className="mt-5 space-y-3">
            {dataVolume.map((row) => (
              <div key={row.tabla}>
                <div className="mb-1 flex items-center justify-between text-sm">
                  <span className="text-zinc-600">{TABLE_LABELS[row.tabla] ?? row.tabla}</span>
                  <span className="font-medium text-zinc-800 tabular-nums">
                    {formatNumber(row.registros)}
                  </span>
                </div>
                <ProgressBar
                  value={row.registros}
                  max={dataVolume[0]?.registros ?? 1}
                  color={
                    row.registros > 10000
                      ? "bg-amber-500"
                      : row.registros > 1000
                        ? "bg-blue-500"
                        : "bg-zinc-300"
                  }
                />
              </div>
            ))}
          </div>
        </div>

        {/* ── Top 10 escuelas ──────────────────────────────────────── */}
        <div className="rounded-2xl border border-zinc-200/60 bg-white p-6 shadow-sm">
          <div className="flex items-center gap-2">
            <Zap className="h-5 w-5 text-zinc-400" />
            <h2 className="text-base font-semibold text-zinc-800">Top 10 escuelas mas activas</h2>
          </div>
          <p className="mt-1 text-xs text-zinc-400">Clasificadas por alumnos + clases este mes</p>

          <div className="mt-4 overflow-hidden">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-zinc-100 text-left text-xs text-zinc-400">
                  <th className="pb-2 font-medium">#</th>
                  <th className="pb-2 font-medium">Escuela</th>
                  <th className="pb-2 text-right font-medium">Alumnos</th>
                  <th className="pb-2 text-right font-medium">Clases</th>
                  <th className="pb-2 text-right font-medium">Ingresos</th>
                </tr>
              </thead>
              <tbody>
                {topSchools.map((school, idx) => (
                  <tr key={school.id} className="border-b border-zinc-50 last:border-0">
                    <td className="py-2.5 text-xs text-zinc-400">{idx + 1}</td>
                    <td className="py-2.5">
                      <div className="flex items-center gap-2">
                        <span className="max-w-[160px] truncate font-medium text-zinc-800">
                          {school.nombre}
                        </span>
                        <span
                          className={`inline-block rounded-full px-1.5 py-0.5 text-[10px] font-medium ${
                            PLAN_COLORS[school.plan] ?? "bg-zinc-100 text-zinc-600"
                          }`}
                        >
                          {school.plan}
                        </span>
                      </div>
                      <div className="mt-0.5 text-[10px] text-zinc-400">
                        {school.instructores_activos} instructores
                        {school.ultimo_acceso_admin && (
                          <>
                            {" "}
                            · Admin:{" "}
                            {new Date(school.ultimo_acceso_admin).toLocaleDateString("es-CO")}
                          </>
                        )}
                      </div>
                    </td>
                    <td className="py-2.5 text-right font-medium text-zinc-700 tabular-nums">
                      {formatNumber(school.alumnos_activos)}
                    </td>
                    <td className="py-2.5 text-right text-zinc-600 tabular-nums">
                      {formatNumber(school.clases_mes)}
                    </td>
                    <td className="py-2.5 text-right font-medium text-emerald-600 tabular-nums">
                      {formatCOP(school.ingresos_mes)}
                    </td>
                  </tr>
                ))}
                {topSchools.length === 0 && (
                  <tr>
                    <td colSpan={5} className="py-8 text-center text-zinc-400">
                      No hay escuelas activas con actividad este mes.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {/* ── Tendencias sparkline ─────────────────────────────────────── */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <div className="rounded-2xl border border-zinc-200/60 bg-white p-5 shadow-sm">
          <p className="text-xs font-medium text-zinc-400">Tendencia alumnos</p>
          <div className="mt-2 flex items-end justify-between">
            <div>
              <p className="text-lg font-semibold text-zinc-900">
                {formatNumber(monthlyGrowth[monthlyGrowth.length - 1]?.alumnos ?? 0)}
              </p>
              {growthTrends && (
                <p
                  className={`text-xs ${
                    growthTrends.alumnos >= 0 ? "text-emerald-600" : "text-red-500"
                  }`}
                >
                  {growthTrends.alumnos >= 0 ? "+" : ""}
                  {growthTrends.alumnos}% vs mes ant.
                </p>
              )}
            </div>
            <Sparkline data={monthlyGrowth.map((m) => m.alumnos)} color="#3b82f6" />
          </div>
        </div>

        <div className="rounded-2xl border border-zinc-200/60 bg-white p-5 shadow-sm">
          <p className="text-xs font-medium text-zinc-400">Tendencia clases</p>
          <div className="mt-2 flex items-end justify-between">
            <div>
              <p className="text-lg font-semibold text-zinc-900">
                {formatNumber(monthlyGrowth[monthlyGrowth.length - 1]?.clases ?? 0)}
              </p>
              {growthTrends && (
                <p
                  className={`text-xs ${
                    growthTrends.clases >= 0 ? "text-emerald-600" : "text-red-500"
                  }`}
                >
                  {growthTrends.clases >= 0 ? "+" : ""}
                  {growthTrends.clases}% vs mes ant.
                </p>
              )}
            </div>
            <Sparkline data={monthlyGrowth.map((m) => m.clases)} color="#8b5cf6" />
          </div>
        </div>

        <div className="rounded-2xl border border-zinc-200/60 bg-white p-5 shadow-sm">
          <p className="text-xs font-medium text-zinc-400">Tendencia ingresos</p>
          <div className="mt-2 flex items-end justify-between">
            <div>
              <p className="text-lg font-semibold text-zinc-900">
                {formatCOP(monthlyGrowth[monthlyGrowth.length - 1]?.ingresos ?? 0)}
              </p>
              {growthTrends && (
                <p
                  className={`text-xs ${
                    growthTrends.ingresos >= 0 ? "text-emerald-600" : "text-red-500"
                  }`}
                >
                  {growthTrends.ingresos >= 0 ? "+" : ""}
                  {growthTrends.ingresos}% vs mes ant.
                </p>
              )}
            </div>
            <Sparkline data={monthlyGrowth.map((m) => m.ingresos)} color="#10b981" />
          </div>
        </div>

        <div className="rounded-2xl border border-zinc-200/60 bg-white p-5 shadow-sm">
          <p className="text-xs font-medium text-zinc-400">Tendencia examenes</p>
          <div className="mt-2 flex items-end justify-between">
            <div>
              <p className="text-lg font-semibold text-zinc-900">
                {formatNumber(monthlyGrowth[monthlyGrowth.length - 1]?.examenes ?? 0)}
              </p>
              {growthTrends && (
                <p
                  className={`text-xs ${
                    growthTrends.examenes >= 0 ? "text-emerald-600" : "text-red-500"
                  }`}
                >
                  {growthTrends.examenes >= 0 ? "+" : ""}
                  {growthTrends.examenes}% vs mes ant.
                </p>
              )}
            </div>
            <Sparkline data={monthlyGrowth.map((m) => m.examenes)} color="#f59e0b" />
          </div>
        </div>
      </div>

      {/* ── Footer ──────────────────────────────────────────────────── */}
      <div className="flex items-center justify-center gap-2 pb-4 text-xs text-zinc-400">
        <Activity className="h-3.5 w-3.5" />
        <span>Datos actualizados cada 3 minutos · Cache del servidor</span>
      </div>
    </div>
  );
}
