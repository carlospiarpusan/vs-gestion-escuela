"use client";

import { useEffect, useState } from "react";
import { BookOpen, Calendar, CarFront, DollarSign, FileText, Users } from "lucide-react";
import {
  Area,
  AreaChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import {
  getDashboardMonthRange,
  type AdminDashboardComparativeStats as ComparativeStats,
  type AdminDashboardDailyIngresoPoint,
  type AdminDashboardStats as Stats,
  type AdminDashboardSummaryResponse,
} from "@/lib/dashboard-admin-summary";
import { getDashboardSummaryCached, readDashboardSummaryCache } from "@/lib/dashboard-client-cache";
import HomePriorityActions from "@/components/dashboard/HomePriorityActions";
import PageScaffold from "@/components/dashboard/PageScaffold";
import SummaryRow from "@/components/dashboard/SummaryRow";
import { useIsMobileVariant } from "@/hooks/useDeviceVariant";
import { useAuth } from "@/hooks/useAuth";
import {
  DashboardLoadingState,
  fmt,
  formatComparisonDelta,
  getShareLabel,
} from "@/components/dashboard/home/dashboard-home-shared";

export default function AdminDashboardHome() {
  const { perfil } = useAuth();
  const isMobile = useIsMobileVariant();
  const [stats, setStats] = useState<Stats>({
    alumnos: 0,
    cursosNuevosMes: 0,
    clasesHoy: 0,
    examenesPendientes: 0,
    ingresosMes: 0,
    lineasMesMoto: 0,
    lineasMesCarro: 0,
    lineasMesCombos: 0,
    lineasMesSinCategoria: 0,
    practicaAdicionalMes: 0,
    evaluacionesAptitudMes: 0,
  });
  const [comparisonStats, setComparisonStats] = useState<ComparativeStats>({
    cursosNuevosMes: 0,
    ingresosMes: 0,
    practicaAdicionalMes: 0,
    evaluacionesAptitudMes: 0,
  });
  const [dailyIngresos, setDailyIngresos] = useState<AdminDashboardDailyIngresoPoint[]>([]);
  const [loadingStats, setLoadingStats] = useState(true);

  useEffect(() => {
    if (!perfil) return;

    let isActive = true;
    const cacheScope = {
      id: perfil.id,
      rol: perfil.rol,
      escuelaId: perfil.escuela_id,
      sedeId: perfil.sede_id,
    };
    const cachedSnapshot = readDashboardSummaryCache<AdminDashboardSummaryResponse>(
      "admin",
      cacheScope
    );
    if (cachedSnapshot) {
      setStats((current) => ({ ...current, ...cachedSnapshot.stats }));
      setComparisonStats((current) => ({ ...current, ...cachedSnapshot.comparisonStats }));
      setDailyIngresos(cachedSnapshot.dailyIngresos);
      setLoadingStats(false);
    }

    const fetchStats = async () => {
      try {
        const snapshot = await getDashboardSummaryCached<AdminDashboardSummaryResponse>({
          kind: "admin",
          scope: cacheScope,
          loader: async () => {
            const response = await fetch("/api/dashboard/admin-summary", {
              cache: "default",
            });
            const payload = await response.json();
            if (!response.ok) {
              throw new Error(
                payload?.error || `No se pudo cargar el resumen del dashboard (${response.status}).`
              );
            }

            return payload as AdminDashboardSummaryResponse;
          },
        });
        if (!isActive) return;

        setDailyIngresos(snapshot.dailyIngresos);
        setStats((current) => ({ ...current, ...snapshot.stats }));
        setComparisonStats((current) => ({ ...current, ...snapshot.comparisonStats }));
      } catch (error) {
        console.error("Error al obtener estadísticas:", error);
      } finally {
        if (isActive) {
          setLoadingStats(false);
        }
      }
    };

    void fetchStats();

    return () => {
      isActive = false;
    };
  }, [perfil]);

  const nombre = perfil?.nombre || "Usuario";
  const previousMonthRange = getDashboardMonthRange(-1);

  const statCards = [
    {
      label: "Alumnos del mes",
      value: stats.cursosNuevosMes.toString(),
      icon: <Users size={20} />,
    },
    {
      label: "Clases Hoy",
      value: stats.clasesHoy.toString(),
      icon: <Calendar size={20} />,
    },
    {
      label: "Exámenes Pendientes",
      value: stats.examenesPendientes.toString(),
      icon: <FileText size={20} />,
    },
    {
      label: "Ingresos del Mes",
      value: `$${stats.ingresosMes.toLocaleString("es-CO")}`,
      icon: <DollarSign size={20} />,
    },
  ];

  const courseMixCards = [
    {
      label: "Moto",
      value: stats.lineasMesMoto,
      detail: "AM, A1 y A2",
      accent: "bg-[#0071e3]/10 text-[#0071e3]",
      valueClass: "text-[#0071e3]",
      icon: <Users size={16} />,
    },
    {
      label: "Carro",
      value: stats.lineasMesCarro,
      detail: "B1, C y RC",
      accent: "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-300",
      valueClass: "text-emerald-600 dark:text-emerald-300",
      icon: <CarFront size={16} />,
    },
    {
      label: "Combos",
      value: stats.lineasMesCombos,
      detail: "Matrículas mixtas",
      accent: "bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-300",
      valueClass: "text-amber-600 dark:text-amber-300",
      icon: <BookOpen size={16} />,
    },
  ];

  const comparisonCards = [
    {
      label: "Cursos nuevos",
      current: stats.cursosNuevosMes,
      previous: comparisonStats.cursosNuevosMes,
      kind: "count" as const,
    },
    {
      label: "Ingresos cobrados",
      current: stats.ingresosMes,
      previous: comparisonStats.ingresosMes,
      kind: "currency" as const,
    },
    {
      label: "Práctica adicional",
      current: stats.practicaAdicionalMes,
      previous: comparisonStats.practicaAdicionalMes,
      kind: "count" as const,
    },
    {
      label: "Evaluaciones de aptitud",
      current: stats.evaluacionesAptitudMes,
      previous: comparisonStats.evaluacionesAptitudMes,
      kind: "count" as const,
    },
  ];

  if (loadingStats && dailyIngresos.length === 0) {
    return <DashboardLoadingState />;
  }

  return (
    <div>
      <PageScaffold
        eyebrow="Centro operativo"
        title={`Hola, ${nombre}`}
        description="Resumen de la escuela con foco en alumnos del mes, agenda del día, exámenes pendientes y recaudo del mes."
        aside={
          <div className="rounded-[22px] border border-[rgba(15,23,42,0.08)] bg-white/72 px-4 py-4 dark:border-white/[0.08] dark:bg-white/[0.03]">
            <p className="text-[11px] font-semibold tracking-[0.16em] text-[#66707a] uppercase">
              Señales rápidas
            </p>
            <div className="mt-3 space-y-2 text-sm text-[#66707a] dark:text-[#aeb6bf]">
              <p>
                {stats.practicaAdicionalMes.toLocaleString("es-CO")} prácticas adicionales este mes.
              </p>
              <p>
                {stats.evaluacionesAptitudMes.toLocaleString("es-CO")} evaluaciones de aptitud
                registradas.
              </p>
            </div>
          </div>
        }
      >
        <SummaryRow
          columns={4}
          items={statCards.map((stat) => ({
            id: stat.label,
            label: stat.label,
            value: stat.value,
            detail:
              stat.label === "Alumnos del mes"
                ? "Regulares inscritos durante el mes actual."
                : stat.label === "Clases Hoy"
                  ? "Agenda práctica y teórica del día."
                  : stat.label === "Exámenes Pendientes"
                    ? "Seguimientos que necesitan acción."
                    : "Cobrado acumulado del mes vigente.",
            icon: stat.icon,
            tone:
              stat.label === "Clases Hoy"
                ? "success"
                : stat.label === "Exámenes Pendientes"
                  ? "warning"
                  : stat.label === "Ingresos del Mes"
                    ? "primary"
                    : "default",
          }))}
        />
      </PageScaffold>

      <div className="mt-6">
        <HomePriorityActions
          rol={perfil?.rol}
          title="Lo más importante primero"
          description="Accesos directos a los módulos donde normalmente se concentra la operación."
        />
      </div>

      <div className="animate-fade-in mb-10 grid grid-cols-1 gap-6 delay-150 xl:grid-cols-[1.05fr_0.95fr]">
        <section className="rounded-3xl border border-gray-100 bg-white p-6 shadow-sm dark:border-gray-800 dark:bg-[#1d1d1f]">
          <div className="mb-5 flex items-start justify-between gap-4">
            <div>
              <h3 className="text-lg font-semibold text-[#1d1d1f] dark:text-[#f5f5f7]">
                Base del mes por línea
              </h3>
              <p className="mt-1 text-sm text-[#86868b]">
                Matrículas regulares registradas en el mes actual, separadas entre moto, carro y
                combos.
              </p>
            </div>
            <div className="rounded-2xl bg-[#0071e3]/10 px-3 py-2 text-xs font-semibold text-[#0071e3]">
              {stats.cursosNuevosMes.toLocaleString("es-CO")} registro
              {stats.cursosNuevosMes === 1 ? "" : "s"}
            </div>
          </div>

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
            {courseMixCards.map((item) => (
              <div
                key={item.label}
                className="rounded-[1.75rem] border border-gray-100 bg-[#f7f9fc] p-4 dark:border-gray-800 dark:bg-[#111214]"
              >
                <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                  <div>
                    <p className="text-sm font-semibold text-[#1d1d1f] dark:text-[#f5f5f7]">
                      {item.label}
                    </p>
                    <p className="mt-1 text-xs text-[#86868b]">{item.detail}</p>
                  </div>
                  <div
                    className={`flex h-9 w-9 items-center justify-center rounded-2xl ${item.accent}`}
                  >
                    {item.icon}
                  </div>
                </div>
                <p className={`mt-5 text-3xl font-semibold ${item.valueClass}`}>{item.value}</p>
                <p className="mt-2 text-xs text-[#86868b]">
                  {getShareLabel(item.value, stats.cursosNuevosMes)}
                </p>
              </div>
            ))}
          </div>

          <div className="mt-5 flex flex-wrap gap-3 text-xs text-[#86868b]">
            <span className="rounded-full bg-gray-100 px-3 py-1.5 dark:bg-[#111214]">
              {stats.practicaAdicionalMes.toLocaleString("es-CO")} prácticas adicionales
            </span>
            <span className="rounded-full bg-gray-100 px-3 py-1.5 dark:bg-[#111214]">
              {stats.evaluacionesAptitudMes.toLocaleString("es-CO")} evaluaciones de aptitud
            </span>
            {stats.lineasMesSinCategoria > 0 ? (
              <span className="rounded-full bg-gray-100 px-3 py-1.5 dark:bg-[#111214]">
                {stats.lineasMesSinCategoria.toLocaleString("es-CO")} por clasificar este mes
              </span>
            ) : null}
          </div>
        </section>

        <section className="rounded-3xl border border-gray-100 bg-white p-6 shadow-sm dark:border-gray-800 dark:bg-[#1d1d1f]">
          <div className="mb-5">
            <h3 className="text-lg font-semibold text-[#1d1d1f] dark:text-[#f5f5f7]">
              Analítica comparativa
            </h3>
            <p className="mt-1 text-sm text-[#86868b]">
              Comparación del mes actual contra {previousMonthRange.label}.
            </p>
          </div>

          <div className="space-y-3">
            {comparisonCards.map((item) => {
              const diff = item.current - item.previous;
              const currentValue =
                item.kind === "currency" ? fmt(item.current) : item.current.toLocaleString("es-CO");
              const previousValue =
                item.kind === "currency"
                  ? fmt(item.previous)
                  : item.previous.toLocaleString("es-CO");

              return (
                <div
                  key={item.label}
                  className="rounded-[1.75rem] border border-gray-100 bg-[#f7f9fc] px-4 py-4 dark:border-gray-800 dark:bg-[#111214]"
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <p className="text-sm font-semibold text-[#1d1d1f] dark:text-[#f5f5f7]">
                        {item.label}
                      </p>
                      <p className="mt-1 text-xs text-[#86868b]">{previousValue} el mes anterior</p>
                    </div>
                    <span
                      className={`rounded-full px-3 py-1 text-xs font-semibold ${
                        diff > 0
                          ? "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-300"
                          : diff < 0
                            ? "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-300"
                            : "bg-gray-100 text-[#666] dark:bg-gray-800 dark:text-[#c7c7cc]"
                      }`}
                    >
                      {formatComparisonDelta(diff, item.kind)}
                    </span>
                  </div>
                  <p className="mt-4 text-2xl font-semibold text-[#1d1d1f] dark:text-[#f5f5f7]">
                    {currentValue}
                  </p>
                </div>
              );
            })}
          </div>
        </section>
      </div>

      <div className="animate-fade-in mb-10 rounded-3xl border border-gray-100 bg-white p-6 shadow-sm delay-200 dark:border-gray-800 dark:bg-[#1d1d1f]">
        <h3 className="mb-4 text-lg font-semibold text-[#1d1d1f] dark:text-[#f5f5f7]">
          Evolución de Ingresos del Mes
        </h3>
        {loadingStats ? (
          <div
            className={`w-full animate-pulse rounded-2xl bg-gray-100 dark:bg-gray-800 ${
              isMobile ? "h-[240px]" : "h-[300px]"
            }`}
          />
        ) : dailyIngresos.length === 0 ? (
          <div
            className={`flex items-center justify-center text-sm text-[#86868b] ${
              isMobile ? "h-[240px]" : "h-[300px]"
            }`}
          >
            No hay datos suficientes para graficar.
          </div>
        ) : (
          <div className={isMobile ? "h-[240px] w-full" : "h-[300px] w-full"}>
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={dailyIngresos} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
                <defs>
                  <linearGradient id="colorMonto" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#0071e3" stopOpacity={0.3} />
                    <stop offset="95%" stopColor="#0071e3" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e5e7eb" />
                <XAxis
                  dataKey="date"
                  axisLine={false}
                  tickLine={false}
                  tick={{ fontSize: 12, fill: "#86868b" }}
                  tickFormatter={(val) => `Día ${val}`}
                />
                <YAxis
                  axisLine={false}
                  tickLine={false}
                  tick={{ fontSize: 12, fill: "#86868b" }}
                  tickFormatter={(val) => `$${(val / 1000).toFixed(0)}k`}
                />
                <Tooltip
                  // eslint-disable-next-line @typescript-eslint/no-explicit-any
                  formatter={(value: any) => [`$${Number(value).toLocaleString()}`, "Ingreso"]}
                  labelFormatter={(val) => `Día ${val} del mes`}
                  contentStyle={{
                    borderRadius: "12px",
                    border: "none",
                    boxShadow: "0 4px 6px -1px rgb(0 0 0 / 0.1)",
                  }}
                />
                <Area
                  type="monotone"
                  dataKey="monto"
                  stroke="#0071e3"
                  strokeWidth={3}
                  fillOpacity={1}
                  fill="url(#colorMonto)"
                />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        )}
      </div>

      <div
        className={`animate-fade-in rounded-3xl border border-gray-100 bg-white delay-300 dark:border-gray-800 dark:bg-[#1d1d1f] ${
          isMobile ? "p-6 text-left" : "p-10 text-center"
        }`}
      >
        <h3 className="mb-2 text-lg font-semibold text-[#1d1d1f] dark:text-[#f5f5f7]">
          Panel de Gestión
        </h3>
        <p className={`text-sm text-[#86868b] ${isMobile ? "max-w-none" : "mx-auto max-w-md"}`}>
          Usa el menú lateral para navegar entre los módulos: alumnos, instructores, vehículos,
          clases, exámenes y finanzas.
        </p>
      </div>
    </div>
  );
}
