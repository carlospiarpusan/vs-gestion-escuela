"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import {
  ArrowRight,
  CircleAlert,
  Building2,
  Layers3,
  MapPin,
  ShieldX,
  TriangleAlert,
  UserCog,
} from "lucide-react";
import {
  type SuperAdminDashboardResponse,
  type SuperAdminDashboardStats as PlatformStats,
  type SuperAdminSchoolOverview as SchoolOverview,
} from "@/lib/dashboard-admin-summary";
import { getSchoolPlanDescriptor } from "@/lib/school-plans";
import { getDashboardSummaryCached, readDashboardSummaryCache } from "@/lib/dashboard-client-cache";
import HomePriorityActions from "@/components/dashboard/HomePriorityActions";
import ListState from "@/components/dashboard/ListState";
import PageScaffold from "@/components/dashboard/PageScaffold";
import SummaryRow from "@/components/dashboard/SummaryRow";
import { useIsMobileVariant } from "@/hooks/useDeviceVariant";
import { useAuth } from "@/hooks/useAuth";
import { DashboardLoadingState } from "@/components/dashboard/home/dashboard-home-shared";

export default function SuperAdminDashboardHome() {
  const { perfil } = useAuth();
  const isMobile = useIsMobileVariant();
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

            if (!response.ok) {
              throw new Error(payload?.error || "No se pudo cargar el resumen central.");
            }

            return payload as SuperAdminDashboardResponse;
          },
        });

        if (!isActive) return;

        setStats(snapshot.stats);
        setSchoolOverviews(snapshot.schoolOverviews);
      } catch (error) {
        console.error("Error al obtener el resumen de plataforma:", error);
      } finally {
        if (isActive) {
          setLoading(false);
        }
      }
    };

    void fetchPlatformData();

    return () => {
      isActive = false;
    };
  }, [perfil]);

  const recentSchools = useMemo(
    () =>
      [...schoolOverviews]
        .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())
        .slice(0, 6),
    [schoolOverviews]
  );

  const planDistribution = useMemo(() => {
    const counts = new Map<string, number>();
    for (const school of schoolOverviews) {
      counts.set(school.plan, (counts.get(school.plan) ?? 0) + 1);
    }
    return Array.from(counts.entries())
      .map(([plan, count]) => ({
        plan,
        count,
        descriptor: getSchoolPlanDescriptor(plan),
      }))
      .sort((a, b) => b.count - a.count);
  }, [schoolOverviews]);

  const globalActionItems = useMemo(
    () => [
      {
        id: "schools",
        label: "Escuelas",
        href: "/dashboard/escuelas",
        description: "Administra planes, capacidad, estado y crecimiento de cada escuela.",
        areaLabel: "Plataforma",
        icon: "schools" as const,
      },
      {
        id: "reports",
        label: "Informes globales",
        href: "/dashboard/informes",
        description: "Consulta la lectura ejecutiva consolidada de la plataforma.",
        areaLabel: "Finanzas",
        icon: "reports" as const,
      },
      {
        id: "exams",
        label: "Evaluaciones y CALE",
        href: "/dashboard/examenes?section=banco",
        description: "Gestiona el banco maestro y edita, crea o elimina preguntas de evaluación.",
        areaLabel: "Exámenes",
        icon: "exams" as const,
      },
      {
        id: "permissions",
        label: "Permisos",
        href: "/dashboard/permisos",
        description: "Revisa el alcance real de cada rol antes de abrir nuevos accesos.",
        areaLabel: "Configuración",
        icon: "permissions" as const,
      },
    ],
    []
  );

  const platformAlerts = useMemo(() => {
    const alerts: Array<{
      title: string;
      detail: string;
      href: string;
      tone: "warn" | "danger" | "info";
    }> = [];

    for (const school of schoolOverviews) {
      if (school.estado === "suspendida") {
        alerts.push({
          title: `${school.nombre} está suspendida`,
          detail: "Revisa el estado comercial y operativo de la escuela.",
          href: "/dashboard/escuelas",
          tone: "danger",
        });
      }
      if (school.adminsActivos === 0) {
        alerts.push({
          title: `${school.nombre} no tiene administrador activo`,
          detail: "La escuela necesita al menos un admin de escuela para operar con control.",
          href: "/dashboard/escuelas",
          tone: "warn",
        });
      }
      if (school.sedesTotal === 0) {
        alerts.push({
          title: `${school.nombre} no tiene sedes registradas`,
          detail: "Crea la sede principal para dejar operativa la estructura base.",
          href: "/dashboard/sedes",
          tone: "danger",
        });
      } else if (!school.hasPrincipalSede) {
        alerts.push({
          title: `${school.nombre} no tiene sede principal`,
          detail: "Define una sede principal para evitar inconsistencias en nuevos registros.",
          href: "/dashboard/sedes",
          tone: "warn",
        });
      }
      if (school.max_alumnos > 0 && school.capacidadPct >= 90) {
        alerts.push({
          title: `${school.nombre} está al ${school.capacidadPct}% de capacidad`,
          detail: "Revisa el plan o el límite de alumnos antes de que el equipo se quede corto.",
          href: "/dashboard/escuelas",
          tone: "info",
        });
      }
    }

    return alerts.slice(0, 6);
  }, [schoolOverviews]);

  const platformState = useMemo(() => {
    const suspendedSchools = schoolOverviews.filter(
      (school) => school.estado === "suspendida"
    ).length;
    const schoolsWithoutAdmins = schoolOverviews.filter(
      (school) => school.adminsActivos === 0
    ).length;
    const schoolsWithoutPrincipal = schoolOverviews.filter(
      (school) => !school.hasPrincipalSede
    ).length;
    const schoolsWithoutCoverage = schoolOverviews.filter(
      (school) => school.sedesActivas === 0
    ).length;
    const schoolsNearCapacity = schoolOverviews.filter(
      (school) => school.max_alumnos > 0 && school.capacidadPct >= 90
    ).length;

    return {
      suspendedSchools,
      schoolsWithoutAdmins,
      schoolsWithoutPrincipal,
      schoolsWithoutCoverage,
      schoolsNearCapacity,
      activePlans: new Set(schoolOverviews.map((school) => school.plan)).size,
    };
  }, [schoolOverviews]);

  const statCards = [
    {
      label: "Escuelas activas",
      value: `${stats.escuelasActivas}/${stats.escuelas}`,
      helper: `${platformState.suspendedSchools} suspendidas requieren revisión`,
      icon: <Building2 size={18} />,
    },
    {
      label: "Sedes activas",
      value: stats.sedesActivas.toString(),
      helper: `${platformState.schoolsWithoutCoverage} escuelas sin cobertura activa`,
      icon: <MapPin size={18} />,
    },
    {
      label: "Admins vigentes",
      value: stats.adminsEscuela.toString(),
      helper: `${platformState.schoolsWithoutAdmins} escuelas sin admin activo`,
      icon: <UserCog size={18} />,
    },
    {
      label: "Planes activos",
      value: platformState.activePlans.toString(),
      helper: "Lectura comercial y de capacidad de la red",
      icon: <Layers3 size={18} />,
    },
    {
      label: "Sin sede principal",
      value: platformState.schoolsWithoutPrincipal.toString(),
      helper: "Escuelas que aún no tienen estructura base completa",
      icon: <ShieldX size={18} />,
    },
    {
      label: "Riesgo de capacidad",
      value: platformState.schoolsNearCapacity.toString(),
      helper: "Escuelas al 90% o más de su límite",
      icon: <TriangleAlert size={18} />,
    },
  ];

  if (loading && schoolOverviews.length === 0) {
    return <DashboardLoadingState />;
  }

  return (
    <div>
      <PageScaffold
        eyebrow="Vista global"
        title="Control central de la plataforma"
        description="Gobierna la red completa de escuelas: estructura, planes, capacidad, evaluaciones maestras y focos de riesgo de la plataforma."
        aside={
          <div className="rounded-[22px] border border-[rgba(15,23,42,0.08)] bg-white/72 px-4 py-4 dark:border-white/[0.08] dark:bg-white/[0.03]">
            <p className="text-[11px] font-semibold tracking-[0.16em] text-[#66707a] uppercase">
              Vigilancia activa
            </p>
            <p className="mt-3 text-3xl font-semibold text-[#111214] dark:text-[#f5f5f7]">
              {loading ? "..." : platformAlerts.length.toString()}
            </p>
            <p className="mt-2 text-sm leading-6 text-[#66707a] dark:text-[#aeb6bf]">
              Focos globales abiertos entre estructura, capacidad y escuelas suspendidas.
            </p>
          </div>
        }
      >
        <SummaryRow
          columns={3}
          items={statCards.map((stat) => ({
            id: stat.label,
            label: stat.label,
            value: stat.value,
            detail: stat.helper,
            icon: stat.icon,
            tone:
              stat.label === "Riesgo de capacidad"
                ? "danger"
                : stat.label === "Planes activos"
                  ? "success"
                  : stat.label === "Admins vigentes"
                    ? "warning"
                    : "primary",
          }))}
        />
      </PageScaffold>

      <div className="mt-6">
        <HomePriorityActions
          items={globalActionItems}
          title="Funciones globales del super admin"
          description="Este rol no opera el día a día de una escuela. Se concentra en estructura, evaluaciones maestras, control de accesos e informes globales."
        />
      </div>

      <div className="grid grid-cols-1 gap-6 xl:grid-cols-[1.15fr_0.85fr]">
        <div className="space-y-6">
          <div className="rounded-3xl border border-gray-100 bg-white p-6 shadow-sm dark:border-gray-800 dark:bg-[#1d1d1f]">
            <div className="mb-5 flex items-center justify-between gap-4">
              <div>
                <h3 className="text-lg font-semibold text-[#1d1d1f] dark:text-[#f5f5f7]">
                  Altas recientes
                </h3>
                <p className="mt-1 text-sm text-[#86868b]">
                  Nuevas escuelas y cómo quedaron configuradas dentro de la plataforma.
                </p>
              </div>
              <Link
                href="/dashboard/escuelas"
                className="text-sm font-semibold text-[#0071e3] hover:underline"
              >
                Ver todas
              </Link>
            </div>

            <ListState
              loading={loading}
              empty={recentSchools.length === 0}
              emptyTitle="Sin escuelas registradas"
              emptyDescription="No hay escuelas nuevas para mostrar en este momento."
            >
              <div className="space-y-3">
                {recentSchools.map((school) => {
                  const planDescriptor = getSchoolPlanDescriptor(school.plan);

                  return (
                    <div
                      key={school.id}
                      className="rounded-2xl border border-gray-100 px-4 py-4 dark:border-gray-800"
                    >
                      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                        <div>
                          <p className="font-semibold text-[#1d1d1f] dark:text-[#f5f5f7]">
                            {school.nombre}
                          </p>
                          <p className="mt-1 text-xs text-[#86868b]">
                            {planDescriptor?.label ?? school.plan} · {school.alumnosTotal} alumnos ·{" "}
                            {school.sedesActivas}/{Math.max(school.sedesTotal, 0)} sedes activas
                          </p>
                          {planDescriptor ? (
                            <p className="mt-2 text-xs text-[#6e6e73] dark:text-[#c7c7cc]">
                              {planDescriptor.dashboardDescription}
                            </p>
                          ) : null}
                        </div>
                        <span
                          className={`inline-flex rounded-full px-2.5 py-1 text-[11px] font-semibold ${
                            school.estado === "activa"
                              ? "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400"
                              : school.estado === "suspendida"
                                ? "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400"
                                : "bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-300"
                          }`}
                        >
                          {school.estado}
                        </span>
                      </div>
                      <div className="mt-3 grid grid-cols-2 gap-3 text-xs text-[#86868b] sm:grid-cols-4">
                        <span>Admins activos: {school.adminsActivos}</span>
                        <span>Sede principal: {school.hasPrincipalSede ? "Sí" : "No"}</span>
                        <span>
                          Capacidad:{" "}
                          {school.max_alumnos > 0 ? `${school.capacidadPct}%` : "Sin límite"}
                        </span>
                        <span>Alta: {new Date(school.created_at).toLocaleDateString("es-CO")}</span>
                      </div>
                    </div>
                  );
                })}
              </div>
            </ListState>
          </div>

          <div className="rounded-3xl border border-gray-100 bg-white p-6 shadow-sm dark:border-gray-800 dark:bg-[#1d1d1f]">
            <h3 className="text-lg font-semibold text-[#1d1d1f] dark:text-[#f5f5f7]">
              Escuelas cerca del límite
            </h3>
            <p className="mt-1 text-sm text-[#86868b]">
              Escuelas que pueden requerir revisión de cupo o plan antes de seguir creciendo.
            </p>
            <div className="mt-5 grid grid-cols-1 gap-3 sm:grid-cols-2">
              {schoolOverviews
                .filter((school) => school.max_alumnos > 0)
                .sort((a, b) => b.capacidadPct - a.capacidadPct)
                .slice(0, 4)
                .map((school) => (
                  <Link
                    key={`capacity-${school.id}`}
                    href="/dashboard/escuelas"
                    className="rounded-2xl border border-gray-100 px-4 py-4 transition-colors hover:border-[#0071e3]/30 hover:bg-[#0071e3]/5 dark:border-gray-800 dark:hover:border-[#0071e3]/30 dark:hover:bg-[#0071e3]/10"
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <p className="text-sm font-semibold text-[#1d1d1f] dark:text-[#f5f5f7]">
                          {school.nombre}
                        </p>
                        <p className="mt-1 text-xs text-[#86868b]">
                          {school.capacidadPct}% de capacidad · {school.alumnosTotal} alumnos
                        </p>
                      </div>
                      <MapPin size={16} className="text-[#0071e3]" />
                    </div>
                    <div className="mt-3 h-2 rounded-full bg-gray-100 dark:bg-[#111214]">
                      <div
                        className="h-2 rounded-full bg-[#0071e3]"
                        style={{ width: `${Math.min(school.capacidadPct, 100)}%` }}
                      />
                    </div>
                  </Link>
                ))}
            </div>
          </div>
        </div>

        <div className="space-y-6">
          <div className="rounded-3xl border border-gray-100 bg-white p-6 shadow-sm dark:border-gray-800 dark:bg-[#1d1d1f]">
            <h3 className="text-lg font-semibold text-[#1d1d1f] dark:text-[#f5f5f7]">
              Alertas estructurales
            </h3>
            <p className="mt-1 text-sm text-[#86868b]">
              Estructuras globales que requieren revisión rápida desde plataforma.
            </p>

            <div className="mt-5 space-y-3">
              <ListState
                loading={loading}
                empty={platformAlerts.length === 0}
                emptyTitle="Sin alertas críticas"
                emptyDescription="No hay alertas prioritarias para revisar ahora."
              >
                <>
                  {platformAlerts.map((alert, index) => (
                    <Link
                      key={`${alert.title}-${index}`}
                      href={alert.href}
                      className={`block rounded-2xl border px-4 py-4 transition-colors ${
                        alert.tone === "danger"
                          ? "border-red-200 bg-red-50 hover:bg-red-100/70 dark:border-red-900/40 dark:bg-red-900/20"
                          : alert.tone === "warn"
                            ? "border-amber-200 bg-amber-50 hover:bg-amber-100/70 dark:border-amber-900/40 dark:bg-amber-900/20"
                            : "border-blue-200 bg-blue-50 hover:bg-blue-100/70 dark:border-blue-900/40 dark:bg-blue-900/20"
                      }`}
                    >
                      <div
                        className={`flex gap-3 ${
                          isMobile ? "flex-col" : "items-start justify-between"
                        }`}
                      >
                        <div>
                          <p className="text-sm font-semibold text-[#1d1d1f] dark:text-[#f5f5f7]">
                            {alert.title}
                          </p>
                          <p className="mt-1 text-sm text-[#6e6e73] dark:text-[#c7c7cc]">
                            {alert.detail}
                          </p>
                        </div>
                        {alert.tone === "danger" ? (
                          <CircleAlert size={16} className="mt-1 shrink-0 text-red-500" />
                        ) : (
                          <ArrowRight size={16} className="mt-1 shrink-0 text-[#0071e3]" />
                        )}
                      </div>
                    </Link>
                  ))}
                </>
              </ListState>
            </div>
          </div>

          <div className="rounded-3xl border border-gray-100 bg-white p-6 shadow-sm dark:border-gray-800 dark:bg-[#1d1d1f]">
            <h3 className="text-lg font-semibold text-[#1d1d1f] dark:text-[#f5f5f7]">
              Distribución por plan
            </h3>
            <p className="mt-1 text-sm text-[#86868b]">
              Cómo está repartida hoy la base de escuelas.
            </p>

            <div className="mt-5 space-y-4">
              {loading ? (
                [1, 2, 3].map((item) => (
                  <div
                    key={item}
                    className="h-12 animate-pulse rounded-2xl bg-gray-100 dark:bg-gray-800"
                  />
                ))
              ) : planDistribution.length === 0 ? (
                <div className="rounded-2xl bg-gray-50 px-4 py-5 text-sm text-[#86868b] dark:bg-[#0a0a0a]">
                  Aún no hay escuelas registradas.
                </div>
              ) : (
                planDistribution.map((item) => {
                  const pct =
                    stats.escuelas > 0 ? Math.round((item.count / stats.escuelas) * 100) : 0;
                  return (
                    <div key={item.plan}>
                      <div className="mb-2 flex items-center justify-between text-sm">
                        <span className="font-medium text-[#1d1d1f] dark:text-[#f5f5f7]">
                          {item.descriptor?.label ?? item.plan}
                        </span>
                        <span className="text-[#86868b]">
                          {item.count} escuela{item.count === 1 ? "" : "s"} · {pct}%
                        </span>
                      </div>
                      {item.descriptor ? (
                        <p className="mb-2 text-xs text-[#86868b]">{item.descriptor.audience}</p>
                      ) : null}
                      <div className="h-2.5 rounded-full bg-gray-100 dark:bg-gray-800">
                        <div
                          className={`h-2.5 rounded-full ${item.descriptor?.progressClassName ?? "bg-[#0071e3]"}`}
                          style={{ width: `${pct}%` }}
                        />
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
