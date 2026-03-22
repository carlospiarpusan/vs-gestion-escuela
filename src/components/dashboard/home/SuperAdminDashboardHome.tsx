"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import {
  AlertTriangle,
  ArrowUpRight,
  BookOpenCheck,
  Building2,
  CreditCard,
  MapPin,
  ShieldAlert,
  Sparkles,
} from "lucide-react";
import {
  type SuperAdminDashboardResponse,
  type SuperAdminDashboardStats as PlatformStats,
} from "@/lib/dashboard-admin-summary";
import { getDashboardSummaryCached, readDashboardSummaryCache } from "@/lib/dashboard-client-cache";
import {
  buildPlatformSubscriptionSchools,
  type PlatformSubscriptionSchool,
} from "@/lib/platform-subscriptions";
import { getSchoolPlanDescriptor } from "@/lib/school-plans";
import { useAuth } from "@/hooks/useAuth";

function getHealthClasses(health: PlatformSubscriptionSchool["health"]) {
  switch (health) {
    case "risk":
      return "bg-rose-100 text-rose-700 dark:bg-rose-950/40 dark:text-rose-300";
    case "attention":
      return "bg-amber-100 text-amber-700 dark:bg-amber-950/40 dark:text-amber-300";
    default:
      return "bg-emerald-100 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-300";
  }
}

function getServiceClasses(state: PlatformSubscriptionSchool["estado"]) {
  switch (state) {
    case "suspendida":
      return "bg-rose-100 text-rose-700 dark:bg-rose-950/40 dark:text-rose-300";
    case "inactiva":
      return "bg-zinc-200 text-zinc-700 dark:bg-zinc-800 dark:text-zinc-300";
    default:
      return "bg-blue-100 text-blue-700 dark:bg-blue-950/40 dark:text-blue-300";
  }
}

export default function SuperAdminDashboardHome() {
  const { perfil } = useAuth();
  const [stats, setStats] = useState<PlatformStats>({
    escuelas: 0,
    escuelasActivas: 0,
    sedesActivas: 0,
    adminsEscuela: 0,
    alumnos: 0,
    alumnosMes: 0,
    ingresosMes: 0,
  });
  const [loading, setLoading] = useState(true);
  const [subscriptionSchools, setSubscriptionSchools] = useState<PlatformSubscriptionSchool[]>([]);

  useEffect(() => {
    if (!perfil) return;

    let isActive = true;
    const cacheScope = {
      id: perfil.id,
      rol: perfil.rol,
      escuelaId: perfil.escuela_id,
      sedeId: perfil.sede_id,
    };

    const cachedSnapshot = readDashboardSummaryCache<SuperAdminDashboardResponse>(
      "superadmin",
      cacheScope
    );
    if (cachedSnapshot) {
      setStats(cachedSnapshot.stats);
      setSubscriptionSchools(buildPlatformSubscriptionSchools(cachedSnapshot.schoolOverviews));
      setLoading(false);
    }

    const fetchPlatformData = async () => {
      try {
        const snapshot = await getDashboardSummaryCached<SuperAdminDashboardResponse>({
          kind: "superadmin",
          scope: cacheScope,
          loader: async () => {
            const response = await fetch("/api/dashboard/superadmin-summary", {
              cache: "default",
            });
            const payload = await response.json();
            if (!response.ok) throw new Error(payload?.error || "Error cargando dashboard central");
            return payload as SuperAdminDashboardResponse;
          },
        });

        if (!isActive) return;
        setStats(snapshot.stats);
        setSubscriptionSchools(buildPlatformSubscriptionSchools(snapshot.schoolOverviews));
      } catch (error) {
        console.error("Error al obtener el resumen de plataforma:", error);
      } finally {
        if (isActive) setLoading(false);
      }
    };

    void fetchPlatformData();

    return () => {
      isActive = false;
    };
  }, [perfil]);

  const schoolsAtRisk = useMemo(
    () => subscriptionSchools.filter((school) => school.health === "risk"),
    [subscriptionSchools]
  );
  const paidSchoolsCount = useMemo(
    () => subscriptionSchools.filter((school) => school.paidPlan).length,
    [subscriptionSchools]
  );
  const topAlerts = useMemo(() => schoolsAtRisk.slice(0, 5), [schoolsAtRisk]);
  const planPreview = useMemo(() => subscriptionSchools.slice(0, 5), [subscriptionSchools]);

  const globalActionItems = [
    {
      id: "schools",
      label: "Gestión de Escuelas",
      href: "/dashboard/escuelas",
      description: "Administra altas, estado general, cupos y estructura global de la red.",
      icon: <Building2 className="text-blue-400" size={24} />,
      bg: "from-blue-500/10 to-transparent border-blue-500/20",
      accent: "bg-blue-500",
    },
    {
      id: "subscriptions",
      label: "Suscripciones y Planes",
      href: "/dashboard/suscripciones",
      description: "Supervisa planes activos, cobertura, capacidad y riesgo por escuela.",
      icon: <CreditCard className="text-emerald-400" size={24} />,
      bg: "from-emerald-500/10 to-transparent border-emerald-500/20",
      accent: "bg-emerald-500",
    },
    {
      id: "exams",
      label: "Banco CALE",
      href: "/dashboard/examenes?section=banco",
      description: "Mantén el banco maestro de evaluaciones usado por toda la plataforma.",
      icon: <BookOpenCheck className="text-purple-400" size={24} />,
      bg: "from-purple-500/10 to-transparent border-purple-500/20",
      accent: "bg-purple-500",
    },
    {
      id: "permissions",
      label: "Permisos",
      href: "/dashboard/permisos",
      description: "Consulta el mapa oficial de alcances y restricciones por rol.",
      icon: <ShieldAlert className="text-rose-400" size={24} />,
      bg: "from-rose-500/10 to-transparent border-rose-500/20",
      accent: "bg-rose-500",
    },
  ];

  return (
    <div className="min-h-[calc(100vh-4rem)] bg-zinc-50 pb-12 dark:bg-[#09090b]">
      <div className="relative overflow-hidden bg-white px-6 py-12 lg:px-12 dark:bg-[#09090b]">
        <div className="absolute inset-0 z-0">
          <div className="absolute -top-[50%] -left-[10%] h-[150%] w-[120%] rotate-12 bg-[radial-gradient(ellipse_at_center,_var(--tw-gradient-stops))] from-blue-600/10 via-zinc-900/0 to-transparent dark:from-indigo-600/20" />
          <div className="absolute top-[20%] -right-[20%] h-[100%] w-[100%] -rotate-12 bg-[radial-gradient(ellipse_at_center,_var(--tw-gradient-stops))] from-emerald-500/5 via-zinc-900/0 to-transparent dark:from-emerald-600/20" />
        </div>

        <div className="relative z-10 mx-auto max-w-7xl">
          <div className="flex flex-col gap-6 md:flex-row md:items-end md:justify-between">
            <div className="max-w-3xl">
              <span className="mb-4 inline-flex items-center gap-2 rounded-full border border-blue-200/50 bg-blue-50/50 px-3 py-1 text-xs font-medium text-blue-700 backdrop-blur-md dark:border-blue-500/20 dark:bg-blue-500/10 dark:text-blue-300">
                <Sparkles size={14} />
                Gobierno global de la plataforma
              </span>
              <h1 className="text-4xl font-extrabold tracking-tight text-zinc-900 lg:text-5xl dark:text-white">
                Command Center
              </h1>
              <p className="mt-4 text-lg leading-relaxed text-zinc-600 dark:text-zinc-400">
                Supervisa escuelas, planes, cobertura y el banco maestro CALE desde un único panel
                global. Aquí el super admin gobierna la red, no la operación diaria de una sede.
              </p>
            </div>
          </div>
        </div>
      </div>

      <div className="relative z-20 mx-auto mt-[-2rem] max-w-7xl px-4 lg:px-12">
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <div className="group relative overflow-hidden rounded-3xl border border-zinc-200 bg-white/70 p-6 backdrop-blur-xl transition-all duration-300 hover:-translate-y-1 hover:shadow-xl hover:shadow-blue-500/10 dark:border-white/10 dark:bg-zinc-900/50">
            <div className="flex items-center justify-between">
              <p className="text-sm font-medium text-zinc-500 dark:text-zinc-400">
                Escuelas activas
              </p>
              <div className="rounded-xl bg-blue-100 p-2 text-blue-600 dark:bg-blue-500/20 dark:text-blue-400">
                <Building2 size={20} />
              </div>
            </div>
            <p className="mt-4 text-4xl font-black text-zinc-900 dark:text-white">
              {loading ? "-" : stats.escuelasActivas.toLocaleString("es-CO")}
            </p>
            <p className="mt-1 text-xs text-zinc-500 dark:text-zinc-500">
              {loading ? "Cargando red..." : `${stats.escuelas} escuelas registradas`}
            </p>
          </div>

          <div className="group relative overflow-hidden rounded-3xl border border-zinc-200 bg-white/70 p-6 backdrop-blur-xl transition-all duration-300 hover:-translate-y-1 hover:shadow-xl hover:shadow-emerald-500/10 dark:border-white/10 dark:bg-zinc-900/50">
            <div className="flex items-center justify-between">
              <p className="text-sm font-medium text-zinc-500 dark:text-zinc-400">Planes pagos</p>
              <div className="rounded-xl bg-emerald-100 p-2 text-emerald-600 dark:bg-emerald-500/20 dark:text-emerald-400">
                <CreditCard size={20} />
              </div>
            </div>
            <p className="mt-4 text-4xl font-black text-zinc-900 dark:text-white">
              {loading ? "-" : paidSchoolsCount.toLocaleString("es-CO")}
            </p>
            <p className="mt-1 text-xs text-zinc-500 dark:text-zinc-500">
              Escuelas hoy en Básico, Profesional o Enterprise
            </p>
          </div>

          <div className="group relative overflow-hidden rounded-3xl border border-zinc-200 bg-white/70 p-6 backdrop-blur-xl transition-all duration-300 hover:-translate-y-1 hover:shadow-xl hover:shadow-purple-500/10 dark:border-white/10 dark:bg-zinc-900/50">
            <div className="flex items-center justify-between">
              <p className="text-sm font-medium text-zinc-500 dark:text-zinc-400">
                Cobertura de red
              </p>
              <div className="rounded-xl bg-purple-100 p-2 text-purple-600 dark:bg-purple-500/20 dark:text-purple-400">
                <MapPin size={20} />
              </div>
            </div>
            <p className="mt-4 text-4xl font-black text-zinc-900 dark:text-white">
              {loading ? "-" : stats.sedesActivas.toLocaleString("es-CO")}
            </p>
            <p className="mt-1 text-xs text-zinc-500 dark:text-zinc-500">
              Sedes activas operando dentro de la red
            </p>
          </div>

          <div className="group relative overflow-hidden rounded-3xl border border-zinc-200 bg-white/70 p-6 backdrop-blur-xl transition-all duration-300 hover:-translate-y-1 hover:shadow-xl hover:shadow-rose-500/10 dark:border-white/10 dark:bg-zinc-900/50">
            <div className="flex items-center justify-between">
              <p className="text-sm font-medium text-zinc-500 dark:text-zinc-400">
                Escuelas en riesgo
              </p>
              <div className="rounded-xl bg-rose-100 p-2 text-rose-600 dark:bg-rose-500/20 dark:text-rose-400">
                <AlertTriangle size={20} />
              </div>
            </div>
            <p className="mt-4 text-4xl font-black text-zinc-900 dark:text-white">
              {loading ? "-" : schoolsAtRisk.length.toLocaleString("es-CO")}
            </p>
            <p className="mt-1 text-xs text-zinc-500 dark:text-zinc-500">
              Con suspensión, sin admin o presión crítica de capacidad
            </p>
          </div>
        </div>

        <div className="mt-10 mb-6">
          <h2 className="text-xl font-bold tracking-tight text-zinc-900 dark:text-white">
            Operaciones globales
          </h2>
          <p className="mt-1 text-sm text-zinc-500">
            Accede a los módulos que sí gobiernan la plataforma a nivel central.
          </p>
        </div>

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {globalActionItems.map((action) => (
            <Link
              key={action.id}
              href={action.href}
              className={`group flex h-full flex-col overflow-hidden rounded-3xl border bg-gradient-to-br ${action.bg} p-6 shadow-sm backdrop-blur-md transition-all duration-300 hover:-translate-y-1 hover:shadow-xl dark:bg-zinc-900/40`}
            >
              <div className="mb-4 flex items-center justify-between">
                <div className="rounded-2xl bg-white p-3 shadow-sm dark:bg-zinc-900">
                  {action.icon}
                </div>
                <ArrowUpRight
                  className="text-zinc-400 transition-transform duration-300 group-hover:translate-x-1 group-hover:-translate-y-1 group-hover:text-zinc-700 dark:text-zinc-600 dark:group-hover:text-white"
                  size={20}
                />
              </div>
              <h3 className="mt-auto text-lg font-bold text-zinc-900 dark:text-white">
                {action.label}
              </h3>
              <p className="mt-2 text-sm leading-relaxed text-zinc-600 dark:text-zinc-400">
                {action.description}
              </p>
              <div
                className={`mt-6 h-1 w-12 rounded-full ${action.accent} opacity-60 transition-all duration-300 group-hover:w-full`}
              />
            </Link>
          ))}
        </div>

        <div className="mt-10 grid grid-cols-1 gap-6 lg:grid-cols-3">
          <div className="col-span-1 flex flex-col overflow-hidden rounded-3xl border border-zinc-200 bg-white shadow-sm dark:border-white/10 dark:bg-[#121214]">
            <div className="border-b border-zinc-100 p-6 dark:border-white/5">
              <h3 className="flex items-center gap-2 text-lg font-semibold text-zinc-900 dark:text-white">
                <ShieldAlert className="text-rose-500" size={20} />
                Escuelas a priorizar
              </h3>
              <p className="mt-1 text-xs text-zinc-500">
                Riesgos reales que sí requieren acción del super admin.
              </p>
            </div>
            <div className="flex-1 overflow-y-auto p-2">
              {loading ? (
                <div className="space-y-4 p-4 text-sm text-zinc-500">Analizando red...</div>
              ) : topAlerts.length === 0 ? (
                <div className="flex h-40 flex-col items-center justify-center p-6 text-center">
                  <div className="rounded-full bg-emerald-100 p-3 dark:bg-emerald-500/10">
                    <Sparkles className="text-emerald-500" size={24} />
                  </div>
                  <p className="mt-4 text-sm font-medium text-zinc-900 dark:text-white">
                    Red estable
                  </p>
                  <p className="mt-1 text-xs text-zinc-500">
                    No hay escuelas en riesgo alto en este momento.
                  </p>
                </div>
              ) : (
                <div className="space-y-2">
                  {topAlerts.map((school) => (
                    <Link
                      key={school.id}
                      href="/dashboard/suscripciones"
                      className="group flex items-start justify-between rounded-2xl p-4 transition-colors hover:bg-zinc-50 dark:hover:bg-white/5"
                    >
                      <div>
                        <p className="text-sm font-semibold text-rose-600 dark:text-rose-400">
                          {school.nombre}
                        </p>
                        <p className="mt-1 text-xs text-zinc-500 dark:text-zinc-400">
                          {school.flags[0] ?? school.serviceLabel}
                        </p>
                      </div>
                      <ArrowUpRight
                        className="mt-0.5 text-zinc-400 transition-transform group-hover:translate-x-0.5 group-hover:-translate-y-0.5"
                        size={16}
                      />
                    </Link>
                  ))}
                </div>
              )}
            </div>
          </div>

          <div className="col-span-1 overflow-hidden rounded-3xl border border-zinc-200 bg-white shadow-sm lg:col-span-2 dark:border-white/10 dark:bg-[#121214]">
            <div className="flex items-center justify-between border-b border-zinc-100 p-6 dark:border-white/5">
              <div>
                <h3 className="flex items-center gap-2 text-lg font-semibold text-zinc-900 dark:text-white">
                  <CreditCard className="text-emerald-500" size={20} />
                  Planes y estado de servicio
                </h3>
                <p className="mt-1 text-xs text-zinc-500">
                  Lectura global de lo que sí sostiene la red hoy.
                </p>
              </div>
              <Link
                href="/dashboard/suscripciones"
                className="text-sm font-semibold text-blue-600 hover:text-blue-500 dark:text-blue-400"
              >
                Abrir módulo
              </Link>
            </div>

            <div className="p-0">
              {loading ? (
                <div className="p-6 text-sm text-zinc-500">Cargando planes y cobertura...</div>
              ) : planPreview.length === 0 ? (
                <div className="p-8 text-center text-sm text-zinc-500">
                  No hay escuelas registradas todavía.
                </div>
              ) : (
                <div className="divide-y divide-zinc-100 dark:divide-white/5">
                  {planPreview.map((school) => {
                    const descriptor = getSchoolPlanDescriptor(school.plan);
                    return (
                      <div
                        key={school.id}
                        className="group flex flex-col gap-4 p-5 transition-colors hover:bg-zinc-50 sm:flex-row sm:items-center sm:justify-between dark:hover:bg-white/5"
                      >
                        <div className="flex flex-col gap-1">
                          <span className="text-sm font-semibold text-zinc-900 transition-colors group-hover:text-blue-600 dark:text-zinc-200 dark:group-hover:text-blue-400">
                            {school.nombre}
                          </span>
                          <span className="inline-flex items-center gap-2 text-xs text-zinc-500">
                            {descriptor?.label || school.plan} · {school.branchUsageLabel}
                          </span>
                        </div>

                        <div className="flex flex-wrap items-center justify-end gap-2">
                          <span
                            className={`inline-flex rounded-full px-2.5 py-1 text-xs font-semibold ${getServiceClasses(school.estado)}`}
                          >
                            {school.serviceLabel}
                          </span>
                          <span
                            className={`inline-flex rounded-full px-2.5 py-1 text-xs font-semibold ${getHealthClasses(school.health)}`}
                          >
                            {school.healthLabel}
                          </span>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </div>
        </div>

        <div className="mt-6 grid grid-cols-1 gap-4 md:grid-cols-3">
          <div className="rounded-3xl border border-zinc-200 bg-white p-6 shadow-sm dark:border-white/10 dark:bg-[#121214]">
            <p className="text-sm font-medium text-zinc-500 dark:text-zinc-400">
              Alumnos en la red
            </p>
            <p className="mt-3 text-3xl font-black text-zinc-900 dark:text-white">
              {loading ? "-" : stats.alumnos.toLocaleString("es-CO")}
            </p>
            <p className="mt-2 text-xs text-zinc-500">
              Señal global de adopción del producto en todas las escuelas.
            </p>
          </div>

          <div className="rounded-3xl border border-zinc-200 bg-white p-6 shadow-sm dark:border-white/10 dark:bg-[#121214]">
            <p className="text-sm font-medium text-zinc-500 dark:text-zinc-400">Admins locales</p>
            <p className="mt-3 text-3xl font-black text-zinc-900 dark:text-white">
              {loading ? "-" : stats.adminsEscuela.toLocaleString("es-CO")}
            </p>
            <p className="mt-2 text-xs text-zinc-500">
              Administradores activos operando las escuelas de la red.
            </p>
          </div>

          <div className="rounded-3xl border border-zinc-200 bg-white p-6 shadow-sm dark:border-white/10 dark:bg-[#121214]">
            <p className="text-sm font-medium text-zinc-500 dark:text-zinc-400">Altas del mes</p>
            <p className="mt-3 text-3xl font-black text-zinc-900 dark:text-white">
              {loading ? "-" : stats.alumnosMes.toLocaleString("es-CO")}
            </p>
            <p className="mt-2 text-xs text-zinc-500">
              Nuevos alumnos registrados este mes en toda la plataforma.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
