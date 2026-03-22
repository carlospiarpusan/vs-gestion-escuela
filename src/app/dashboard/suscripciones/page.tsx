"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { AlertTriangle, ArrowUpRight, Building2, ShieldAlert, Wallet } from "lucide-react";
import DataTable from "@/components/dashboard/DataTable";
import PageScaffold from "@/components/dashboard/PageScaffold";
import SummaryRow from "@/components/dashboard/SummaryRow";
import { useAuth } from "@/hooks/useAuth";
import { getDashboardListCached } from "@/lib/dashboard-client-cache";
import {
  createEmptyPlatformSubscriptionsResponse,
  type PlatformSubscriptionSchool,
  type PlatformSubscriptionsResponse,
} from "@/lib/platform-subscriptions";
import { getSchoolPlanDescriptor } from "@/lib/school-plans";

function formatDateLabel(value: string) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "Sin fecha";

  return new Intl.DateTimeFormat("es-CO", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  }).format(date);
}

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

export default function DashboardSubscriptionsPage() {
  const { perfil } = useAuth();
  const [report, setReport] = useState<PlatformSubscriptionsResponse>(
    createEmptyPlatformSubscriptionsResponse()
  );
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    if (!perfil) return;

    let isActive = true;
    const scope = {
      id: perfil.id,
      rol: perfil.rol,
      escuelaId: perfil.escuela_id,
      sedeId: perfil.sede_id,
    };

    const load = async () => {
      try {
        setError("");
        const payload = await getDashboardListCached<PlatformSubscriptionsResponse>({
          name: "subscriptions",
          scope,
          loader: async () => {
            const response = await fetch("/api/suscripciones", { cache: "default" });
            const json = await response.json();
            if (!response.ok) {
              throw new Error(json?.error || "No se pudo cargar la vista de suscripciones.");
            }
            return json as PlatformSubscriptionsResponse;
          },
        });

        if (!isActive) return;
        setReport(payload);
      } catch (loadError) {
        if (!isActive) return;
        setError(
          loadError instanceof Error
            ? loadError.message
            : "No se pudo cargar la vista de suscripciones."
        );
      } finally {
        if (isActive) setLoading(false);
      }
    };

    void load();

    return () => {
      isActive = false;
    };
  }, [perfil]);

  const highlightedSchools = useMemo(
    () => report.schools.filter((school) => school.health !== "healthy").slice(0, 4),
    [report.schools]
  );

  const columns = [
    {
      key: "nombre" as const,
      label: "Escuela",
      render: (row: PlatformSubscriptionSchool) => (
        <div className="space-y-1">
          <p className="text-foreground text-sm font-semibold">{row.nombre}</p>
          <p className="text-xs text-[var(--gray-500)]">
            Alta en plataforma: {formatDateLabel(row.created_at)}
          </p>
        </div>
      ),
    },
    {
      key: "planLabel" as const,
      label: "Plan",
      render: (row: PlatformSubscriptionSchool) => {
        const descriptor = getSchoolPlanDescriptor(row.plan);
        return (
          <div className="space-y-2">
            <span
              className={`inline-flex rounded-full px-2.5 py-1 text-xs font-semibold ${
                descriptor?.badgeClassName ??
                "bg-zinc-100 text-zinc-700 dark:bg-zinc-800 dark:text-zinc-300"
              }`}
            >
              {row.planLabel}
            </span>
            <p className="text-xs text-[var(--gray-500)]">{descriptor?.capacityGuide}</p>
          </div>
        );
      },
    },
    {
      key: "serviceLabel" as const,
      label: "Servicio",
      render: (row: PlatformSubscriptionSchool) => (
        <div className="space-y-2">
          <span
            className={`inline-flex rounded-full px-2.5 py-1 text-xs font-semibold ${getServiceClasses(row.estado)}`}
          >
            {row.serviceLabel}
          </span>
          <span
            className={`inline-flex rounded-full px-2.5 py-1 text-xs font-semibold ${getHealthClasses(row.health)}`}
          >
            {row.healthLabel}
          </span>
        </div>
      ),
    },
    {
      key: "branchUsageLabel" as const,
      label: "Cobertura",
      render: (row: PlatformSubscriptionSchool) => (
        <div className="space-y-1">
          <p className="text-foreground text-sm font-medium">{row.branchUsageLabel}</p>
          <p className="text-xs text-[var(--gray-500)]">
            {row.adminsActivos} admin{row.adminsActivos === 1 ? "" : "s"} activo
            {row.adminsActivos === 1 ? "" : "s"}
          </p>
        </div>
      ),
    },
    {
      key: "capacidadPct" as const,
      label: "Capacidad",
      render: (row: PlatformSubscriptionSchool) => (
        <div className="min-w-[180px] space-y-2">
          <div className="flex items-center justify-between text-xs text-[var(--gray-500)]">
            <span>
              {row.alumnosTotal}/{row.max_alumnos || "sin límite"} alumnos
            </span>
            <span>{row.capacidadPct}%</span>
          </div>
          <div className="h-2 overflow-hidden rounded-full bg-[var(--surface-border)]">
            <div
              className={`h-full rounded-full ${
                row.capacidadPct >= 100
                  ? "bg-rose-500"
                  : row.capacidadPct >= 85
                    ? "bg-amber-500"
                    : "bg-emerald-500"
              }`}
              style={{ width: `${Math.min(row.capacidadPct, 100)}%` }}
            />
          </div>
          <p className="text-xs text-[var(--gray-500)]">
            {row.max_alumnos > 0
              ? `${row.seatAvailability} cupos disponibles`
              : "Capacidad abierta por configuración"}
          </p>
        </div>
      ),
    },
    {
      key: "flags" as const,
      label: "Riesgos",
      render: (row: PlatformSubscriptionSchool) =>
        row.flags.length > 0 ? (
          <div className="flex flex-wrap gap-1.5">
            {row.flags.slice(0, 2).map((flag) => (
              <span
                key={flag}
                className="rounded-full bg-zinc-100 px-2 py-1 text-[11px] font-medium text-zinc-700 dark:bg-zinc-800 dark:text-zinc-300"
              >
                {flag}
              </span>
            ))}
            {row.flags.length > 2 ? (
              <span className="rounded-full bg-zinc-100 px-2 py-1 text-[11px] font-medium text-zinc-700 dark:bg-zinc-800 dark:text-zinc-300">
                +{row.flags.length - 2}
              </span>
            ) : null}
          </div>
        ) : (
          <span className="text-xs text-[var(--gray-500)]">Sin alertas prioritarias</span>
        ),
    },
  ];

  return (
    <div className="space-y-6">
      <PageScaffold
        eyebrow="Gobierno comercial"
        title="Suscripciones y planes"
        description="Control global de planes, estado de servicio y capacidad por escuela. Esta vista concentra lo que hoy sí puede gobernar la plataforma antes de abrir facturación automatizada."
        actions={
          <Link href="/dashboard/escuelas" className="apple-button-secondary">
            <Building2 size={16} />
            Gestionar escuelas
          </Link>
        }
        aside={
          <div className="rounded-[22px] border border-[var(--surface-border)] bg-[var(--surface-soft)] px-4 py-4">
            <p className="apple-kicker">Enfoque del módulo</p>
            <p className="text-foreground mt-3 text-sm leading-6">
              Aquí el super admin decide qué plan lleva cada escuela, qué escuelas están en riesgo y
              dónde la capacidad ya no acompaña el crecimiento de la red.
            </p>
          </div>
        }
      >
        <SummaryRow
          columns={4}
          items={[
            {
              id: "active-schools",
              label: "Escuelas activas",
              value: report.stats.activeSchools.toString(),
              detail: `${report.stats.totalSchools} escuelas registradas en la plataforma.`,
              tone: "primary",
              icon: <Building2 size={18} />,
            },
            {
              id: "paid-schools",
              label: "Planes pagos",
              value: report.stats.paidSchools.toString(),
              detail: "Escuelas en Básico, Profesional o Enterprise.",
              tone: "success",
              icon: <Wallet size={18} />,
            },
            {
              id: "risk-schools",
              label: "Escuelas en riesgo",
              value: report.stats.riskSchools.toString(),
              detail: "Con suspensión, sin admin o presión de capacidad.",
              tone: "danger",
              icon: <ShieldAlert size={18} />,
            },
            {
              id: "avg-capacity",
              label: "Capacidad media",
              value: `${report.stats.averageCapacityPct}%`,
              detail: `${report.stats.enterpriseSchools} escuela(s) hoy en Enterprise.`,
              tone: "warning",
              icon: <AlertTriangle size={18} />,
            },
          ]}
        />
      </PageScaffold>

      {error ? (
        <section className="apple-panel px-6 py-5">
          <p className="text-sm font-medium text-rose-600 dark:text-rose-300">{error}</p>
        </section>
      ) : null}

      <section className="grid gap-4 xl:grid-cols-4">
        {report.planBreakdown.map((plan) => {
          const descriptor = getSchoolPlanDescriptor(plan.plan);
          return (
            <article
              key={plan.plan}
              className={`rounded-[26px] border px-5 py-5 ${
                descriptor?.panelClassName ??
                "border-[var(--surface-border)] bg-[var(--surface-soft)]"
              }`}
            >
              <div className="flex items-center justify-between gap-3">
                <span
                  className={`rounded-full px-2.5 py-1 text-[11px] font-semibold ${
                    descriptor?.badgeClassName ??
                    "bg-zinc-100 text-zinc-700 dark:bg-zinc-800 dark:text-zinc-300"
                  }`}
                >
                  {plan.badge}
                </span>
                <span className="text-foreground text-sm font-semibold">{plan.label}</span>
              </div>
              <p className="text-foreground mt-4 text-3xl font-semibold tracking-tight">
                {plan.schoolCount}
              </p>
              <p className="mt-1 text-sm text-[var(--gray-500)]">
                {plan.activeCount} activas, {plan.suspendedCount} suspendidas
              </p>
              <p className="mt-4 text-sm leading-6 text-[var(--gray-700)] dark:text-[var(--gray-500)]">
                {plan.summary}
              </p>
              <div className="mt-4 flex flex-wrap gap-2 text-xs text-[var(--gray-500)]">
                <span>{plan.averageCapacityPct}% capacidad media</span>
                <span>•</span>
                <span>{plan.withoutAdminCount} sin admin</span>
              </div>
            </article>
          );
        })}
      </section>

      <section className="grid gap-6 xl:grid-cols-[0.95fr_1.05fr]">
        <article className="apple-panel px-6 py-6">
          <div className="flex items-start justify-between gap-4">
            <div>
              <h2 className="text-foreground text-lg font-semibold">Escuelas a priorizar</h2>
              <p className="apple-copy mt-1 text-sm">
                Señales que sí deberían mover decisiones globales del super admin.
              </p>
            </div>
            <Link
              href="/dashboard/escuelas"
              className="text-sm font-semibold text-[var(--brand-600)]"
            >
              Ir a escuelas
            </Link>
          </div>

          <div className="mt-5 space-y-3">
            {loading ? (
              <p className="apple-copy text-sm">Analizando estado de la red...</p>
            ) : highlightedSchools.length === 0 ? (
              <div className="rounded-[22px] border border-[var(--surface-border)] bg-[var(--surface-soft)] px-4 py-5 text-sm text-[var(--gray-500)]">
                No hay alertas prioritarias. La red está operando estable.
              </div>
            ) : (
              highlightedSchools.map((school) => (
                <div
                  key={school.id}
                  className="rounded-[22px] border border-[var(--surface-border)] bg-[var(--surface-soft)] px-4 py-4"
                >
                  <div className="flex flex-wrap items-center justify-between gap-3">
                    <div>
                      <p className="text-foreground text-sm font-semibold">{school.nombre}</p>
                      <p className="mt-1 text-xs text-[var(--gray-500)]">
                        {school.planLabel} · {school.branchUsageLabel}
                      </p>
                    </div>
                    <span
                      className={`rounded-full px-2.5 py-1 text-xs font-semibold ${getHealthClasses(school.health)}`}
                    >
                      {school.healthLabel}
                    </span>
                  </div>
                  <div className="mt-3 flex flex-wrap gap-1.5">
                    {school.flags.map((flag) => (
                      <span
                        key={flag}
                        className="rounded-full bg-white px-2 py-1 text-[11px] font-medium text-zinc-700 dark:bg-zinc-900 dark:text-zinc-300"
                      >
                        {flag}
                      </span>
                    ))}
                  </div>
                </div>
              ))
            )}
          </div>
        </article>

        <article className="apple-panel px-6 py-6">
          <div className="flex items-start justify-between gap-4">
            <div>
              <h2 className="text-foreground text-lg font-semibold">Lectura operativa del plan</h2>
              <p className="apple-copy mt-1 text-sm">
                Qué tipo de escuela está entrando a cada plan y cómo se está comportando.
              </p>
            </div>
          </div>

          <div className="mt-5 grid gap-3 md:grid-cols-2">
            {report.planBreakdown.map((plan) => {
              const descriptor = getSchoolPlanDescriptor(plan.plan);
              return (
                <div
                  key={`${plan.plan}-mini`}
                  className="rounded-[22px] border border-[var(--surface-border)] bg-[var(--surface-soft)] px-4 py-4"
                >
                  <div className="flex items-center justify-between gap-3">
                    <p className="text-foreground text-sm font-semibold">{plan.label}</p>
                    <span
                      className={`rounded-full px-2.5 py-1 text-[11px] font-semibold ${
                        descriptor?.badgeClassName ??
                        "bg-zinc-100 text-zinc-700 dark:bg-zinc-800 dark:text-zinc-300"
                      }`}
                    >
                      {plan.schoolCount}
                    </span>
                  </div>
                  <p className="mt-2 text-xs leading-5 text-[var(--gray-500)]">
                    {descriptor?.recommendedFor}
                  </p>
                  <p className="text-foreground mt-3 text-xs font-medium">{plan.capacityGuide}</p>
                </div>
              );
            })}
          </div>
        </article>
      </section>

      <section className="apple-panel px-6 py-6">
        <div className="mb-5 flex flex-wrap items-start justify-between gap-4">
          <div>
            <h2 className="text-foreground text-lg font-semibold">Escuelas y estado de servicio</h2>
            <p className="apple-copy mt-1 text-sm">
              Vista consolidada para revisar planes, cobertura y presión de capacidad antes de
              escalar la red.
            </p>
          </div>
        </div>

        <DataTable
          columns={columns}
          data={report.schools}
          loading={loading}
          pageSize={8}
          searchPlaceholder="Buscar por escuela, plan o estado..."
          searchKeys={["nombre", "plan", "planLabel", "serviceLabel", "healthLabel"]}
          extraActions={() => (
            <Link href="/dashboard/escuelas" className="apple-button-secondary px-4 text-xs">
              Ver escuela
              <ArrowUpRight size={14} />
            </Link>
          )}
          mobileCardRender={(row) => (
            <div className="apple-panel-muted rounded-[24px] p-4">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <p className="text-foreground text-sm font-semibold">{row.nombre}</p>
                  <p className="mt-1 text-xs text-[var(--gray-500)]">
                    {row.planLabel} · {row.serviceLabel}
                  </p>
                </div>
                <span
                  className={`rounded-full px-2.5 py-1 text-xs font-semibold ${getHealthClasses(row.health)}`}
                >
                  {row.healthLabel}
                </span>
              </div>

              <div className="mt-4 grid gap-3 sm:grid-cols-2">
                <div>
                  <p className="apple-kicker">Cobertura</p>
                  <p className="text-foreground mt-1 text-sm">{row.branchUsageLabel}</p>
                </div>
                <div>
                  <p className="apple-kicker">Capacidad</p>
                  <p className="text-foreground mt-1 text-sm">
                    {row.alumnosTotal}/{row.max_alumnos || "sin límite"} alumnos
                  </p>
                </div>
              </div>

              <div className="mt-4 flex flex-wrap gap-1.5">
                {row.flags.length > 0 ? (
                  row.flags.map((flag) => (
                    <span
                      key={flag}
                      className="rounded-full bg-white px-2 py-1 text-[11px] font-medium text-zinc-700 dark:bg-zinc-900 dark:text-zinc-300"
                    >
                      {flag}
                    </span>
                  ))
                ) : (
                  <span className="text-xs text-[var(--gray-500)]">Sin alertas prioritarias</span>
                )}
              </div>

              <div className="mt-4">
                <Link href="/dashboard/escuelas" className="apple-button-secondary px-4 text-xs">
                  Ver escuela
                  <ArrowUpRight size={14} />
                </Link>
              </div>
            </div>
          )}
        />
      </section>
    </div>
  );
}
