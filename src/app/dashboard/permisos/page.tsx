"use client";

import { useCallback, useEffect, useState } from "react";
import PageScaffold from "@/components/dashboard/PageScaffold";
import SummaryRow from "@/components/dashboard/SummaryRow";
import { useAuth } from "@/hooks/useAuth";
import { fetchJsonWithRetry } from "@/lib/retry";
import {
  AUDITED_ROLE_ORDER,
  getAuditedVisibleModules,
  getCapabilityScopeLabel,
  getCapabilityStateLabel,
  getDefaultCapability,
  getCapabilityWithOverrides,
  getRoleSummary,
  isAuditedRole,
  type AuditedRole,
  type CapabilityOverrideMap,
  type RoleCapability,
  type RoleCapabilityAction,
  type RoleCapabilityModuleId,
  type RoleCapabilityScope,
  type RoleCapabilityState,
} from "@/lib/role-capabilities";
import { Pencil, Save, X, RotateCcw, ChevronDown } from "lucide-react";

const STATE_CYCLE: RoleCapabilityState[] = ["full", "scoped", "readonly", "none"];
const SCOPE_OPTIONS: { value: RoleCapabilityScope; label: string }[] = [
  { value: "platform", label: "Plataforma" },
  { value: "school", label: "Escuela" },
  { value: "branch", label: "Sede" },
  { value: "self", label: "Personal" },
  { value: "none", label: "Sin alcance" },
];
const ALL_ACTIONS: { value: RoleCapabilityAction; label: string }[] = [
  { value: "view", label: "Ver" },
  { value: "create", label: "Crear" },
  { value: "edit", label: "Editar" },
  { value: "delete", label: "Eliminar" },
  { value: "export", label: "Exportar" },
  { value: "sync", label: "Sincronizar" },
  { value: "close", label: "Cerrar" },
  { value: "configure", label: "Configurar" },
];

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

type EditingCell = { role: AuditedRole; moduleId: RoleCapabilityModuleId } | null;

export default function DashboardPermissionsPage() {
  const { perfil } = useAuth();
  const [overrides, setOverrides] = useState<CapabilityOverrideMap | null>(null);
  const [editMode, setEditMode] = useState(false);
  const [editingCell, setEditingCell] = useState<EditingCell>(null);
  const [saving, setSaving] = useState(false);
  const [saveMessage, setSaveMessage] = useState<{ type: "ok" | "error"; text: string } | null>(
    null
  );
  const [localMatrix, setLocalMatrix] = useState<Record<
    string,
    Record<string, RoleCapability>
  > | null>(null);

  const isSuperAdmin = perfil?.rol === "super_admin";

  const loadOverrides = useCallback(async () => {
    try {
      const data = await fetchJsonWithRetry("/api/permisos");
      setOverrides((data as { overrides: CapabilityOverrideMap }).overrides ?? null);
    } catch {
      // Silently fall back to defaults
    }
  }, []);

  useEffect(() => {
    if (perfil) loadOverrides();
  }, [perfil, loadOverrides]);

  // Build local editable matrix when entering edit mode
  const enterEditMode = useCallback(() => {
    const matrix: Record<string, Record<string, RoleCapability>> = {};
    const modules = getAuditedVisibleModules();
    for (const role of AUDITED_ROLE_ORDER) {
      matrix[role] = {};
      for (const mod of modules) {
        matrix[role][mod.id] = { ...getCapabilityWithOverrides(role, mod.id, overrides) };
      }
    }
    setLocalMatrix(matrix);
    setEditMode(true);
    setEditingCell(null);
    setSaveMessage(null);
  }, [overrides]);

  const cancelEditMode = useCallback(() => {
    setEditMode(false);
    setLocalMatrix(null);
    setEditingCell(null);
    setSaveMessage(null);
  }, []);

  const resetToDefaults = useCallback(() => {
    const matrix: Record<string, Record<string, RoleCapability>> = {};
    const modules = getAuditedVisibleModules();
    for (const role of AUDITED_ROLE_ORDER) {
      matrix[role] = {};
      for (const mod of modules) {
        matrix[role][mod.id] = { ...getDefaultCapability(role, mod.id) };
      }
    }
    setLocalMatrix(matrix);
    setSaveMessage(null);
  }, []);

  const cycleState = useCallback(
    (role: AuditedRole, moduleId: RoleCapabilityModuleId) => {
      if (!localMatrix) return;
      const current = localMatrix[role]?.[moduleId];
      if (!current) return;
      const idx = STATE_CYCLE.indexOf(current.state);
      const next = STATE_CYCLE[(idx + 1) % STATE_CYCLE.length];
      const updated = { ...current, state: next };
      if (next === "none") {
        updated.scope = "none";
        updated.actions = [];
      } else if (next === "readonly") {
        updated.actions = updated.actions.includes("view") ? ["view"] : ["view"];
      }
      setLocalMatrix({
        ...localMatrix,
        [role]: { ...localMatrix[role], [moduleId]: updated },
      });
    },
    [localMatrix]
  );

  const updateScope = useCallback(
    (role: AuditedRole, moduleId: RoleCapabilityModuleId, scope: RoleCapabilityScope) => {
      if (!localMatrix) return;
      const current = localMatrix[role]?.[moduleId];
      if (!current) return;
      setLocalMatrix({
        ...localMatrix,
        [role]: { ...localMatrix[role], [moduleId]: { ...current, scope } },
      });
    },
    [localMatrix]
  );

  const toggleAction = useCallback(
    (role: AuditedRole, moduleId: RoleCapabilityModuleId, action: RoleCapabilityAction) => {
      if (!localMatrix) return;
      const current = localMatrix[role]?.[moduleId];
      if (!current) return;
      const actions = current.actions.includes(action)
        ? current.actions.filter((a) => a !== action)
        : [...current.actions, action];
      setLocalMatrix({
        ...localMatrix,
        [role]: { ...localMatrix[role], [moduleId]: { ...current, actions } },
      });
    },
    [localMatrix]
  );

  const handleSave = useCallback(async () => {
    if (!localMatrix) return;
    setSaving(true);
    setSaveMessage(null);

    const overrideList: {
      rol: string;
      module_id: string;
      state: string;
      scope: string;
      actions: string[];
    }[] = [];

    const modules = getAuditedVisibleModules();
    for (const role of AUDITED_ROLE_ORDER) {
      for (const mod of modules) {
        const cell = localMatrix[role]?.[mod.id];
        if (!cell) continue;
        const def = getDefaultCapability(role, mod.id);
        const isDifferent =
          cell.state !== def.state ||
          cell.scope !== def.scope ||
          JSON.stringify(cell.actions.slice().sort()) !==
            JSON.stringify(def.actions.slice().sort());
        if (isDifferent) {
          overrideList.push({
            rol: role,
            module_id: mod.id,
            state: cell.state,
            scope: cell.scope,
            actions: cell.actions,
          });
        }
      }
    }

    try {
      await fetchJsonWithRetry("/api/permisos", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ overrides: overrideList }),
      });
      await loadOverrides();
      setEditMode(false);
      setLocalMatrix(null);
      setEditingCell(null);
      setSaveMessage({ type: "ok", text: "Permisos guardados correctamente." });
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Error al guardar los permisos.";
      setSaveMessage({ type: "error", text: msg });
    } finally {
      setSaving(false);
    }
  }, [localMatrix, loadOverrides]);

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

  function getEffectiveCapability(role: AuditedRole, moduleId: RoleCapabilityModuleId) {
    if (editMode && localMatrix) {
      return localMatrix[role]?.[moduleId] ?? getDefaultCapability(role, moduleId);
    }
    return getCapabilityWithOverrides(role, moduleId, overrides);
  }

  const accessibleModules = modules.filter(
    (mod) => getEffectiveCapability(currentRole, mod.id).state !== "none"
  );
  const readonlyModules = modules.filter(
    (mod) => getEffectiveCapability(currentRole, mod.id).state === "readonly"
  );
  const blockedModules = modules.filter(
    (mod) => getEffectiveCapability(currentRole, mod.id).state === "none"
  );

  const hasChanges =
    editMode &&
    localMatrix &&
    (() => {
      for (const role of AUDITED_ROLE_ORDER) {
        for (const mod of modules) {
          const cell = localMatrix[role]?.[mod.id];
          const eff = getCapabilityWithOverrides(role, mod.id, overrides);
          if (!cell) continue;
          if (
            cell.state !== eff.state ||
            cell.scope !== eff.scope ||
            JSON.stringify(cell.actions.slice().sort()) !==
              JSON.stringify(eff.actions.slice().sort())
          )
            return true;
        }
      }
      return false;
    })();

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

      {/* Save/Error messages */}
      {saveMessage && (
        <div
          className={`rounded-xl px-4 py-3 text-sm font-medium ${
            saveMessage.type === "ok"
              ? "bg-emerald-50 text-emerald-700 dark:bg-emerald-900/20 dark:text-emerald-300"
              : "bg-red-50 text-red-600 dark:bg-red-900/20 dark:text-red-400"
          }`}
        >
          {saveMessage.text}
        </div>
      )}

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

      {/* Comparative Matrix */}
      <section className="apple-panel px-6 py-6">
        <div className="mb-5 flex flex-wrap items-center justify-between gap-3">
          <div>
            <h2 className="text-foreground text-lg font-semibold">Matriz comparativa</h2>
            <p className="apple-copy mt-1 text-sm">
              {editMode
                ? "Haz clic en un estado para cambiarlo. Configura alcance y acciones con el desplegable."
                : "Comparación directa entre los cuatro roles auditados por módulo y alcance."}
            </p>
          </div>

          {isSuperAdmin && (
            <div className="flex items-center gap-2">
              {editMode ? (
                <>
                  <button
                    onClick={resetToDefaults}
                    className="flex items-center gap-1.5 rounded-lg border border-gray-200 px-3 py-1.5 text-xs font-medium text-[#86868b] transition-colors hover:bg-gray-50 dark:border-gray-700 dark:hover:bg-gray-800"
                  >
                    <RotateCcw size={13} />
                    Restaurar
                  </button>
                  <button
                    onClick={cancelEditMode}
                    className="flex items-center gap-1.5 rounded-lg border border-gray-200 px-3 py-1.5 text-xs font-medium text-[#1d1d1f] transition-colors hover:bg-gray-50 dark:border-gray-700 dark:text-[#f5f5f7] dark:hover:bg-gray-800"
                  >
                    <X size={13} />
                    Cancelar
                  </button>
                  <button
                    onClick={handleSave}
                    disabled={saving || !hasChanges}
                    className="flex items-center gap-1.5 rounded-lg bg-[#0071e3] px-3 py-1.5 text-xs font-medium text-white transition-colors hover:bg-[#0077ED] disabled:opacity-50"
                  >
                    <Save size={13} />
                    {saving ? "Guardando..." : "Guardar cambios"}
                  </button>
                </>
              ) : (
                <button
                  onClick={enterEditMode}
                  className="flex items-center gap-1.5 rounded-lg bg-[#0071e3] px-3 py-1.5 text-xs font-medium text-white transition-colors hover:bg-[#0077ED]"
                >
                  <Pencil size={13} />
                  Editar matriz
                </button>
              )}
            </div>
          )}
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
                    const capability = getEffectiveCapability(role, module.id);
                    const def = getDefaultCapability(role, module.id);
                    const isModified =
                      editMode &&
                      (capability.state !== def.state ||
                        capability.scope !== def.scope ||
                        JSON.stringify(capability.actions.slice().sort()) !==
                          JSON.stringify(def.actions.slice().sort()));
                    const isExpanded =
                      editingCell?.role === role && editingCell?.moduleId === module.id;

                    return (
                      <td
                        key={`${module.id}-${role}`}
                        className={`border border-[var(--surface-border)] px-4 py-4 align-top ${
                          index === AUDITED_ROLE_ORDER.length - 1
                            ? "rounded-r-[22px]"
                            : "border-l-0"
                        } ${isModified ? "bg-amber-50/50 dark:bg-amber-900/10" : "bg-[var(--surface-soft)]"}`}
                      >
                        {/* State badge — clickable in edit mode */}
                        <button
                          type="button"
                          disabled={!editMode}
                          onClick={() => editMode && cycleState(role, module.id)}
                          className={`inline-flex rounded-full px-2.5 py-1 text-xs font-semibold ${getStateClasses(capability.state)} ${editMode ? "cursor-pointer ring-1 ring-transparent transition-all hover:ring-[#0071e3]/40" : ""}`}
                        >
                          {getCapabilityStateLabel(capability.state)}
                        </button>

                        <p className="text-foreground mt-2 text-xs font-medium">
                          {getCapabilityScopeLabel(capability.scope)}
                        </p>

                        {capability.note ? (
                          <p className="apple-copy mt-2 text-xs leading-5">{capability.note}</p>
                        ) : null}

                        {isModified && (
                          <p className="mt-1 text-[10px] font-medium text-amber-600 dark:text-amber-400">
                            Modificado
                          </p>
                        )}

                        {/* Expand/collapse detail editor */}
                        {editMode && capability.state !== "none" && (
                          <button
                            type="button"
                            onClick={() =>
                              setEditingCell(isExpanded ? null : { role, moduleId: module.id })
                            }
                            className="mt-2 flex items-center gap-1 text-[10px] font-medium text-[#0071e3] hover:underline"
                          >
                            <ChevronDown
                              size={10}
                              className={`transition-transform ${isExpanded ? "rotate-180" : ""}`}
                            />
                            {isExpanded ? "Cerrar" : "Detalles"}
                          </button>
                        )}

                        {/* Detail editor panel */}
                        {isExpanded && (
                          <div className="mt-3 space-y-3 border-t border-gray-200 pt-3 dark:border-gray-700">
                            {/* Scope selector */}
                            <div>
                              <p className="mb-1 text-[10px] font-semibold text-[#86868b] uppercase">
                                Alcance
                              </p>
                              <select
                                value={capability.scope}
                                onChange={(e) =>
                                  updateScope(
                                    role,
                                    module.id,
                                    e.target.value as RoleCapabilityScope
                                  )
                                }
                                className="w-full rounded-lg border border-gray-200 bg-white px-2 py-1 text-xs dark:border-gray-700 dark:bg-[#1d1d1f]"
                              >
                                {SCOPE_OPTIONS.map((opt) => (
                                  <option key={opt.value} value={opt.value}>
                                    {opt.label}
                                  </option>
                                ))}
                              </select>
                            </div>

                            {/* Actions toggles */}
                            <div>
                              <p className="mb-1.5 text-[10px] font-semibold text-[#86868b] uppercase">
                                Acciones
                              </p>
                              <div className="flex flex-wrap gap-1">
                                {ALL_ACTIONS.map((act) => {
                                  const active = capability.actions.includes(act.value);
                                  return (
                                    <button
                                      key={act.value}
                                      type="button"
                                      onClick={() => toggleAction(role, module.id, act.value)}
                                      className={`rounded-md px-2 py-0.5 text-[10px] font-medium transition-colors ${
                                        active
                                          ? "bg-[#0071e3]/10 text-[#0071e3]"
                                          : "bg-gray-100 text-gray-400 dark:bg-gray-800 dark:text-gray-500"
                                      }`}
                                    >
                                      {act.label}
                                    </button>
                                  );
                                })}
                              </div>
                            </div>
                          </div>
                        )}
                      </td>
                    );
                  })}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      {/* Role panels */}
      <section className="grid gap-4 xl:grid-cols-2">
        {AUDITED_ROLE_ORDER.map((role) => {
          const summary = getRoleSummary(role);
          const roleAccessibleModules = modules.filter(
            (mod) => getEffectiveCapability(role, mod.id).state !== "none"
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
                {roleAccessibleModules.map((mod) => {
                  const cap = getEffectiveCapability(role, mod.id);
                  return (
                    <span
                      key={`${role}-${mod.id}`}
                      className={`rounded-full px-3 py-1.5 text-xs font-medium ${
                        cap.state === "full"
                          ? "bg-emerald-50 text-emerald-700 dark:bg-emerald-900/20 dark:text-emerald-300"
                          : cap.state === "scoped"
                            ? "bg-blue-50 text-blue-700 dark:bg-blue-900/20 dark:text-blue-300"
                            : "bg-[var(--surface-muted)] text-[var(--gray-700)] dark:text-[var(--gray-500)]"
                      }`}
                    >
                      {mod.label}
                    </span>
                  );
                })}
              </div>
            </article>
          );
        })}
      </section>
    </div>
  );
}
