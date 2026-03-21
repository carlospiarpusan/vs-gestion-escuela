"use client";

import PageScaffold from "@/components/dashboard/PageScaffold";
import SummaryRow from "@/components/dashboard/SummaryRow";
import { useAuth } from "@/hooks/useAuth";
import {
  AUDITED_ROLE_ORDER,
  canAuditedRoleAccessModule,
  getAuditedRoleCapability,
  getAuditedVisibleModules,
  getCapabilityScopeLabel,
  getCapabilityStateLabel,
  getRoleSummary,
  isAuditedRole,
  type AuditedRole,
  type RoleCapabilityState,
} from "@/lib/role-capabilities";

function getStateClasses(state: RoleCapabilityState) {
  switch (state) {
    case "full":
      return "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-300";
    case "scoped":
      return "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300";
    case "readonly":
      return "bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-300";
    default:
      return "bg-gray-100 text-gray-500 dark:bg-gray-800 dark:text-gray-400";
  }
}

function renderBulletList(items: string[]) {
  return (
    <ul className="space-y-2 text-sm text-[var(--gray-700)] dark:text-[var(--gray-500)]">
      {items.map((item) => (
        <li key={item} className="flex gap-2">
          <span className="mt-1.5 h-1.5 w-1.5 rounded-full bg-[var(--brand-600)]" />
          <span>{item}</span>
        </li>
      ))}
    </ul>
  );
}

export default function DashboardPermissionsPage() {
  const { perfil } = useAuth();

  if (!isAuditedRole(perfil?.rol)) {
    return (
      <div className="apple-panel px-6 py-10">
        <h1 className="text-foreground text-xl font-semibold">Permisos</h1>
        <p className="apple-copy mt-2 text-sm">
          Esta vista está disponible para los roles auditados de administración.
        </p>
      </div>
    );
  }

  const currentRole = perfil.rol as AuditedRole;
  const currentSummary = getRoleSummary(currentRole);
  const modules = getAuditedVisibleModules();
  const accessibleModules = modules.filter((module) =>
    canAuditedRoleAccessModule(currentRole, module.id)
  );
  const readonlyModules = modules.filter(
    (module) => getAuditedRoleCapability(currentRole, module.id).state === "readonly"
  );
  const blockedModules = modules.filter(
    (module) => getAuditedRoleCapability(currentRole, module.id).state === "none"
  );

  return (
    <div className="space-y-6">
      <PageScaffold
        eyebrow="Gobernanza operativa"
        title="Permisos y alcances"
        description="Esta matriz define qué puede hacer cada rol auditado y es la referencia para navegación, restricciones visibles y validaciones críticas del backend."
        aside={
          <div className="rounded-[22px] border border-[rgba(15,23,42,0.08)] bg-white/72 px-4 py-4 dark:border-white/[0.08] dark:bg-white/[0.03]">
            <p className="text-[11px] font-semibold tracking-[0.16em] text-[#66707a] uppercase">
              Rol actual
            </p>
            <p className="text-foreground mt-3 text-xl font-semibold">{currentSummary.label}</p>
            <p className="mt-2 text-sm leading-6 text-[var(--gray-700)] dark:text-[var(--gray-500)]">
              {currentSummary.description}
            </p>
          </div>
        }
      >
        <SummaryRow
          columns={4}
          items={[
            {
              id: "current-role",
              label: "Tu rol",
              value: currentSummary.shortLabel,
              detail: currentSummary.scopeLabel,
              tone: "primary",
            },
            {
              id: "accessible",
              label: "Módulos con acceso",
              value: accessibleModules.length.toString(),
              detail: "Con al menos consulta disponible.",
              tone: "success",
            },
            {
              id: "readonly",
              label: "Solo lectura",
              value: readonlyModules.length.toString(),
              detail: "No permiten mutaciones estructurales.",
              tone: "warning",
            },
            {
              id: "blocked",
              label: "Sin acceso",
              value: blockedModules.length.toString(),
              detail: "Bloques reservados a otros roles.",
              tone: "danger",
            },
          ]}
        />
      </PageScaffold>

      <section className="grid gap-6 xl:grid-cols-[1.05fr_0.95fr]">
        <article className="apple-panel px-6 py-6">
          <div className="mb-5">
            <h2 className="text-foreground text-lg font-semibold">Tu alcance real</h2>
            <p className="apple-copy mt-1 text-sm">
              Lo que este rol puede ejecutar hoy dentro del producto, sin interpretación ambigua.
            </p>
          </div>

          <div className="grid gap-5 md:grid-cols-2">
            <div className="rounded-[24px] border border-[var(--surface-border)] bg-[var(--surface-soft)] px-5 py-5">
              <p className="text-foreground text-sm font-semibold">Puede hacer</p>
              <div className="mt-4">{renderBulletList(currentSummary.can)}</div>
            </div>

            <div className="rounded-[24px] border border-[var(--surface-border)] bg-[var(--surface-soft)] px-5 py-5">
              <p className="text-foreground text-sm font-semibold">No puede hacer</p>
              <div className="mt-4">{renderBulletList(currentSummary.cannot)}</div>
            </div>
          </div>
        </article>

        <article className="apple-panel px-6 py-6">
          <div className="mb-5">
            <h2 className="text-foreground text-lg font-semibold">Lectura rápida de estados</h2>
            <p className="apple-copy mt-1 text-sm">
              La matriz usa un mismo criterio para navegación, botones y validaciones críticas.
            </p>
          </div>

          <div className="space-y-3">
            {[
              {
                state: "full" as const,
                title: "Completo",
                detail: "Puede operar el módulo dentro de todo su alcance.",
              },
              {
                state: "scoped" as const,
                title: "Limitado",
                detail: "Puede operar el módulo, pero solo dentro del alcance asignado.",
              },
              {
                state: "readonly" as const,
                title: "Consulta",
                detail: "Puede entrar y revisar datos, pero no mutar la estructura o el módulo.",
              },
              {
                state: "none" as const,
                title: "Sin acceso",
                detail: "No debería verlo ni ejecutarlo.",
              },
            ].map((item) => (
              <div
                key={item.state}
                className="flex items-start gap-3 rounded-[22px] border border-[var(--surface-border)] bg-[var(--surface-soft)] px-4 py-4"
              >
                <span
                  className={`rounded-full px-2.5 py-1 text-xs font-semibold ${getStateClasses(item.state)}`}
                >
                  {item.title}
                </span>
                <p className="apple-copy text-sm leading-6">{item.detail}</p>
              </div>
            ))}
          </div>
        </article>
      </section>

      <section className="apple-panel px-6 py-6">
        <div className="mb-5">
          <h2 className="text-foreground text-lg font-semibold">Matriz comparativa</h2>
          <p className="apple-copy mt-1 text-sm">
            Comparación directa entre los cuatro roles auditados por módulo y alcance.
          </p>
        </div>

        <div className="dashboard-scroll-shell overflow-x-auto">
          <table className="w-full min-w-[980px] border-separate border-spacing-y-3">
            <thead>
              <tr>
                <th className="px-3 py-2 text-left text-xs font-semibold tracking-[0.16em] text-[var(--gray-500)] uppercase">
                  Módulo
                </th>
                {AUDITED_ROLE_ORDER.map((role) => {
                  const summary = getRoleSummary(role);
                  return (
                    <th
                      key={role}
                      className="px-3 py-2 text-left text-xs font-semibold tracking-[0.16em] text-[var(--gray-500)] uppercase"
                    >
                      {summary.shortLabel}
                    </th>
                  );
                })}
              </tr>
            </thead>
            <tbody>
              {modules.map((module) => (
                <tr key={module.id}>
                  <td className="rounded-l-[22px] border border-r-0 border-[var(--surface-border)] bg-[var(--surface-soft)] px-4 py-4 align-top">
                    <p className="text-foreground text-sm font-semibold">{module.label}</p>
                    <p className="apple-copy mt-1 text-xs leading-5">{module.description}</p>
                  </td>
                  {AUDITED_ROLE_ORDER.map((role, index) => {
                    const capability = getAuditedRoleCapability(role, module.id);
                    return (
                      <td
                        key={`${module.id}-${role}`}
                        className={`border border-[var(--surface-border)] bg-[var(--surface-soft)] px-4 py-4 align-top ${
                          index === AUDITED_ROLE_ORDER.length - 1
                            ? "rounded-r-[22px]"
                            : "border-l-0"
                        }`}
                      >
                        <span
                          className={`inline-flex rounded-full px-2.5 py-1 text-xs font-semibold ${getStateClasses(capability.state)}`}
                        >
                          {getCapabilityStateLabel(capability.state)}
                        </span>
                        <p className="text-foreground mt-2 text-xs font-medium">
                          {getCapabilityScopeLabel(capability.scope)}
                        </p>
                        {capability.note ? (
                          <p className="apple-copy mt-2 text-xs leading-5">{capability.note}</p>
                        ) : null}
                      </td>
                    );
                  })}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      <section className="grid gap-4 xl:grid-cols-2">
        {AUDITED_ROLE_ORDER.map((role) => {
          const summary = getRoleSummary(role);
          const roleAccessibleModules = modules.filter((module) =>
            canAuditedRoleAccessModule(role, module.id)
          );

          return (
            <article key={role} className="apple-panel px-6 py-6">
              <div className="flex items-start justify-between gap-4">
                <div>
                  <p className="text-foreground text-sm font-semibold">{summary.label}</p>
                  <p className="apple-copy mt-1 text-sm">{summary.description}</p>
                </div>
                <span className="rounded-full bg-[var(--surface-muted)] px-3 py-1 text-xs font-semibold text-[var(--gray-600)]">
                  {summary.scopeLabel}
                </span>
              </div>

              <div className="mt-4 grid gap-3 sm:grid-cols-2">
                <div className="rounded-[20px] border border-[var(--surface-border)] bg-[var(--surface-soft)] px-4 py-4">
                  <p className="text-xs font-semibold tracking-[0.16em] text-[var(--gray-500)] uppercase">
                    Puede
                  </p>
                  <div className="mt-3">{renderBulletList(summary.can)}</div>
                </div>
                <div className="rounded-[20px] border border-[var(--surface-border)] bg-[var(--surface-soft)] px-4 py-4">
                  <p className="text-xs font-semibold tracking-[0.16em] text-[var(--gray-500)] uppercase">
                    No puede
                  </p>
                  <div className="mt-3">{renderBulletList(summary.cannot)}</div>
                </div>
              </div>

              <div className="mt-4 flex flex-wrap gap-2">
                {roleAccessibleModules.map((module) => (
                  <span
                    key={`${role}-${module.id}`}
                    className="rounded-full bg-[var(--surface-muted)] px-3 py-1.5 text-xs font-medium text-[var(--gray-700)] dark:text-[var(--gray-500)]"
                  >
                    {module.label}
                  </span>
                ))}
              </div>
            </article>
          );
        })}
      </section>
    </div>
  );
}
