"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import {
  ArrowUpRight,
  BookOpenCheck,
  Building2,
  ChevronRight,
  CircleAlert,
  Layers3,
  MapPin,
  ShieldX,
  Sparkles,
  TrendingUp,
  UserCog,
  Users,
  Wallet,
} from "lucide-react";
import {
  type SuperAdminDashboardResponse,
  type SuperAdminDashboardStats as PlatformStats,
  type SuperAdminSchoolOverview as SchoolOverview,
} from "@/lib/dashboard-admin-summary";
import { getSchoolPlanDescriptor } from "@/lib/school-plans";
import { getDashboardSummaryCached, readDashboardSummaryCache } from "@/lib/dashboard-client-cache";
import { useAuth } from "@/hooks/useAuth";

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
  const [schoolOverviews, setSchoolOverviews] = useState<SchoolOverview[]>([]);
  const [loading, setLoading] = useState(true);

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
      setSchoolOverviews(cachedSnapshot.schoolOverviews);
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
        setSchoolOverviews(snapshot.schoolOverviews);
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

  const platformAlerts = useMemo(() => {
    const alerts = [];
    for (const school of schoolOverviews) {
      if (school.estado === "suspendida") {
        alerts.push({
          title: `${school.nombre} Suspendida`,
          detail: "Operación de escuela bloqueada por facturación o políticas.",
          href: "/dashboard/escuelas",
          tone: "danger",
        });
      }
      if (school.adminsActivos === 0) {
        alerts.push({
          title: `Sin Administrador en ${school.nombre}`,
          detail: "Esta escuela no puede operar hasta que se asigne un administrador.",
          href: "/dashboard/escuelas",
          tone: "warn",
        });
      }
    }
    return alerts.slice(0, 5);
  }, [schoolOverviews]);

  const globalActionItems = [
    {
      id: "schools",
      label: "Gestión de Escuelas",
      href: "/dashboard/escuelas",
      description: "Administra el estado, límites y altas en la plataforma multi-tenant.",
      icon: <Building2 className="text-blue-400" size={24} />,
      bg: "from-blue-500/10 to-transparent border-blue-500/20",
      accent: "bg-blue-500",
    },
    {
      id: "exams",
      label: "Banco CALE (Evaluaciones)",
      href: "/dashboard/examenes?section=banco",
      description: "Crea, edita o elimina preguntas universales usadas por todas las escuelas.",
      icon: <BookOpenCheck className="text-purple-400" size={24} />,
      bg: "from-purple-500/10 to-transparent border-purple-500/20",
      accent: "bg-purple-500",
    },
    {
      id: "billing",
      label: "Pagos y Suscripciones",
      href: "/dashboard/suscripciones",
      description:
        "Gestiona la facturación, los métodos de pago y el estado de cuenta de cada escuela afiliada.",
      icon: <Wallet className="text-emerald-400" size={24} />,
      bg: "from-emerald-500/10 to-transparent border-emerald-500/20",
      accent: "bg-emerald-500",
    },
    {
      id: "permissions",
      label: "Matriz de Permisos",
      href: "/dashboard/permisos",
      description: "Consulta rápida de las capacidades operativas de cada rol en el sistema.",
      icon: <ShieldX className="text-rose-400" size={24} />,
      bg: "from-rose-500/10 to-transparent border-rose-500/20",
      accent: "bg-rose-500",
    },
  ];

  return (
    <div className="min-h-[calc(100vh-4rem)] bg-zinc-50 pb-12 dark:bg-[#09090b]">
      {/* Hero Header */}
      <div className="relative overflow-hidden bg-white px-6 py-12 lg:px-12 dark:bg-[#09090b]">
        <div className="absolute inset-0 z-0">
          <div className="absolute -top-[50%] -left-[10%] h-[150%] w-[120%] rotate-12 bg-[radial-gradient(ellipse_at_center,_var(--tw-gradient-stops))] from-blue-600/10 via-zinc-900/0 to-transparent dark:from-indigo-600/20" />
          <div className="absolute top-[20%] -right-[20%] h-[100%] w-[100%] -rotate-12 bg-[radial-gradient(ellipse_at_center,_var(--tw-gradient-stops))] from-purple-500/5 via-zinc-900/0 to-transparent dark:from-purple-600/20" />
        </div>

        <div className="relative z-10 mx-auto max-w-7xl">
          <div className="flex flex-col gap-6 md:flex-row md:items-end md:justify-between">
            <div className="max-w-3xl">
              <span className="mb-4 inline-flex items-center gap-2 rounded-full border border-blue-200/50 bg-blue-50/50 px-3 py-1 text-xs font-medium text-blue-700 backdrop-blur-md dark:border-blue-500/20 dark:bg-blue-500/10 dark:text-blue-300">
                <Sparkles size={14} />
                Plataforma Multi-tenant (Modo Super Admin)
              </span>
              <h1 className="text-4xl font-extrabold tracking-tight text-zinc-900 lg:text-5xl dark:text-white">
                Command Center
              </h1>
              <p className="mt-4 text-lg leading-relaxed text-zinc-600 dark:text-zinc-400">
                Bienvenido al panel central. Supervisa el crecimiento de la red, controla las altas
                de escuelas y mantén el banco de evaluaciones global, todo desde un único punto.
              </p>
            </div>
          </div>
        </div>
      </div>

      <div className="relative z-20 mx-auto mt-[-2rem] max-w-7xl px-4 lg:px-12">
        {/* KPI Grid */}
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <div className="group relative overflow-hidden rounded-3xl border border-zinc-200 bg-white/70 p-6 backdrop-blur-xl transition-all duration-300 hover:-translate-y-1 hover:shadow-xl hover:shadow-emerald-500/10 dark:border-white/10 dark:bg-zinc-900/50">
            <div className="absolute -top-4 -right-4 rounded-full bg-emerald-500/10 p-6 opacity-0 transition-opacity duration-300 group-hover:opacity-100" />
            <div className="flex items-center justify-between">
              <p className="text-sm font-medium text-zinc-500 dark:text-zinc-400">
                MRR (Facturación)
              </p>
              <div className="rounded-xl bg-emerald-100 p-2 text-emerald-600 dark:bg-emerald-500/20 dark:text-emerald-400">
                <Wallet size={20} />
              </div>
            </div>
            <p className="mt-4 text-4xl font-black text-zinc-900 dark:text-white">
              {loading
                ? "-"
                : new Intl.NumberFormat("es-CO", {
                    style: "currency",
                    currency: "COP",
                    maximumFractionDigits: 0,
                  }).format(stats.ingresosMes || 0)}
            </p>
            <p className="mt-1 text-xs text-zinc-500 dark:text-zinc-500">
              Ingresos recurrentes mensuales esperados
            </p>
          </div>

          <div className="group relative overflow-hidden rounded-3xl border border-zinc-200 bg-white/70 p-6 backdrop-blur-xl transition-all duration-300 hover:-translate-y-1 hover:shadow-xl hover:shadow-emerald-500/10 dark:border-white/10 dark:bg-zinc-900/50">
            <div className="flex items-center justify-between">
              <p className="text-sm font-medium text-zinc-500 dark:text-zinc-400">Volumen de Red</p>
              <div className="rounded-xl bg-emerald-100 p-2 text-emerald-600 dark:bg-emerald-500/20 dark:text-emerald-400">
                <Users size={20} />
              </div>
            </div>
            <p className="mt-4 text-4xl font-black text-zinc-900 dark:text-white">
              {loading ? "-" : stats.alumnos.toLocaleString("es-CO")}
            </p>
            <p className="mt-1 text-xs text-zinc-500 dark:text-zinc-500">
              Alumnos en todas las escuelas
            </p>
          </div>

          <div className="group relative overflow-hidden rounded-3xl border border-zinc-200 bg-white/70 p-6 backdrop-blur-xl transition-all duration-300 hover:-translate-y-1 hover:shadow-xl hover:shadow-purple-500/10 dark:border-white/10 dark:bg-zinc-900/50">
            <div className="flex items-center justify-between">
              <p className="text-sm font-medium text-zinc-500 dark:text-zinc-400">
                Cobertura (Sedes)
              </p>
              <div className="rounded-xl bg-purple-100 p-2 text-purple-600 dark:bg-purple-500/20 dark:text-purple-400">
                <MapPin size={20} />
              </div>
            </div>
            <p className="mt-4 text-4xl font-black text-zinc-900 dark:text-white">
              {loading ? "-" : stats.sedesActivas}
            </p>
            <p className="mt-1 text-xs text-zinc-500 dark:text-zinc-500">
              Sedes físicas operativas
            </p>
          </div>

          <div className="group relative overflow-hidden rounded-3xl border border-zinc-200 bg-white/70 p-6 backdrop-blur-xl transition-all duration-300 hover:-translate-y-1 hover:shadow-xl hover:shadow-amber-500/10 dark:border-white/10 dark:bg-zinc-900/50">
            <div className="flex items-center justify-between">
              <p className="text-sm font-medium text-zinc-500 dark:text-zinc-400">Admins Locales</p>
              <div className="rounded-xl bg-amber-100 p-2 text-amber-600 dark:bg-amber-500/20 dark:text-amber-400">
                <UserCog size={20} />
              </div>
            </div>
            <p className="mt-4 text-4xl font-black text-zinc-900 dark:text-white">
              {loading ? "-" : stats.adminsEscuela}
            </p>
            <p className="mt-1 text-xs text-zinc-500 dark:text-zinc-500">
              Usuarios administrando escuelas
            </p>
          </div>
        </div>

        {/* Quick Actions Globales */}
        <div className="mt-10 mb-6">
          <h2 className="text-xl font-bold tracking-tight text-zinc-900 dark:text-white">
            Panel de Operaciones Globales
          </h2>
          <p className="mt-1 text-sm text-zinc-500">
            Accede rápidamente a las funciones transversales de la plataforma AutoEscuela Pro.
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
          {/* Alertas Platform-Level */}
          <div className="col-span-1 flex flex-col overflow-hidden rounded-3xl border border-zinc-200 bg-white shadow-sm dark:border-white/10 dark:bg-[#121214]">
            <div className="border-b border-zinc-100 p-6 dark:border-white/5">
              <h3 className="flex items-center gap-2 text-lg font-semibold text-zinc-900 dark:text-white">
                <CircleAlert className="text-rose-500" size={20} />
                Alertas Activas
              </h3>
              <p className="mt-1 text-xs text-zinc-500">Irregularidades detectadas en la red.</p>
            </div>
            <div className="flex-1 overflow-y-auto p-2">
              {loading ? (
                <div className="space-y-4 p-4 text-sm text-zinc-500">Analizando...</div>
              ) : platformAlerts.length === 0 ? (
                <div className="flex h-40 flex-col items-center justify-center p-6 text-center">
                  <div className="rounded-full bg-emerald-100 p-3 dark:bg-emerald-500/10">
                    <Sparkles className="text-emerald-500" size={24} />
                  </div>
                  <p className="mt-4 text-sm font-medium text-zinc-900 dark:text-white">
                    Red Saludable
                  </p>
                  <p className="mt-1 text-xs text-zinc-500">
                    Ninguna irregularidad prioritaria en las escuelas.
                  </p>
                </div>
              ) : (
                <div className="space-y-2">
                  {platformAlerts.map((alert, idx) => (
                    <Link
                      key={idx}
                      href={alert.href}
                      className="group flex items-start justify-between rounded-2xl p-4 transition-colors hover:bg-zinc-50 dark:hover:bg-white/5"
                    >
                      <div>
                        <p
                          className={`text-sm font-semibold ${alert.tone === "danger" ? "text-rose-600 dark:text-rose-400" : "text-amber-600 dark:text-amber-400"}`}
                        >
                          {alert.title}
                        </p>
                        <p className="mt-1 text-xs text-zinc-500 dark:text-zinc-400">
                          {alert.detail}
                        </p>
                      </div>
                      <ChevronRight
                        className="mt-0.5 text-zinc-400 transition-transform group-hover:translate-x-1"
                        size={16}
                      />
                    </Link>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* Tenants / Escuelas List */}
          <div className="col-span-1 overflow-hidden rounded-3xl border border-zinc-200 bg-white shadow-sm lg:col-span-2 dark:border-white/10 dark:bg-[#121214]">
            <div className="flex items-center justify-between border-b border-zinc-100 p-6 dark:border-white/5">
              <div>
                <h3 className="flex items-center gap-2 text-lg font-semibold text-zinc-900 dark:text-white">
                  <Wallet className="text-emerald-500" size={20} />
                  Suscripciones de Escuelas
                </h3>
                <p className="mt-1 text-xs text-zinc-500">
                  Estado de cuenta y licenciamiento de clientes.
                </p>
              </div>
              <Link
                href="/dashboard/suscripciones"
                className="text-sm font-semibold text-blue-600 hover:text-blue-500 dark:text-blue-400"
              >
                Gestionar cobros
              </Link>
            </div>

            <div className="p-0">
              {loading ? (
                <div className="p-6 text-sm text-zinc-500">Cargando cuentas de clientes...</div>
              ) : schoolOverviews.length === 0 ? (
                <div className="p-8 text-center text-sm text-zinc-500">
                  No hay escuelas en la plataforma todavía.
                </div>
              ) : (
                <div className="divide-y divide-zinc-100 dark:divide-white/5">
                  {[...schoolOverviews].slice(0, 5).map((school) => {
                    const desc = getSchoolPlanDescriptor(school.plan);
                    // Simulating pending payment if school is suspended or randomly for demo
                    const isPending = school.estado === "suspendida";
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
                            Plataforma {desc?.label || school.plan}
                          </span>
                        </div>

                        <div className="flex w-full min-w-[150px] flex-col gap-2 text-right sm:w-1/3">
                          <div className="flex items-center justify-end text-xs font-medium">
                            <span
                              className={`inline-flex rounded-full px-2.5 py-1 font-semibold ${
                                isPending
                                  ? "bg-rose-100 text-rose-700 dark:bg-rose-500/10 dark:text-rose-400"
                                  : "bg-emerald-100 text-emerald-700 dark:bg-emerald-500/10 dark:text-emerald-400"
                              }`}
                            >
                              {isPending ? "Pago Pendiente" : "Suscripción al día"}
                            </span>
                          </div>
                          <span className="text-[11px] text-zinc-400">
                            Próximo corte: 1 de{" "}
                            {new Date().toLocaleString("es-CO", { month: "long" })}
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
      </div>
    </div>
  );
}
