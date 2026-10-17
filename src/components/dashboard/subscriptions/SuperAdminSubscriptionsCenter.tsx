"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import {
  AlertTriangle,
  ArrowRight,
  Building2,
  CalendarClock,
  ExternalLink,
  LifeBuoy,
  Pencil,
  RefreshCw,
  Search,
  ShieldAlert,
  TimerReset,
  X,
} from "lucide-react";
import { toast } from "sonner";
import PageScaffold from "@/components/dashboard/PageScaffold";
import { fetchJsonWithRetry } from "@/lib/retry";
import { getSchoolPlanDescriptor } from "@/lib/school-plans";
import type { PlatformSubscriptionsResponse } from "@/lib/platform-subscriptions";
import {
  getSchoolSubscriptionIntervalLabel,
  getSchoolSubscriptionPlanLabel,
  getSchoolSubscriptionStatusLabel,
  getSchoolSubscriptionStatusTone,
} from "@/lib/school-subscription";
import type {
  SchoolCheckoutSession,
  SchoolSubscriptionAdminDetailResponse,
} from "@/lib/school-subscription-service";
import type { PlanConfig, PlanEscuelaPago, SchoolPaidBillingInterval } from "@/types/database";

type AdminActionResponse = {
  success: true;
  action: string;
  message: string;
  checkout?: SchoolCheckoutSession;
};

function formatCurrency(value: number) {
  return new Intl.NumberFormat("es-CO", {
    style: "currency",
    currency: "COP",
    maximumFractionDigits: 0,
  }).format(value);
}

function formatDate(value: string | null) {
  if (!value) return "Sin fecha";
  return new Intl.DateTimeFormat("es-CO", {
    dateStyle: "medium",
    timeZone: "America/Bogota",
  }).format(new Date(value));
}

function formatDateTimeLocal(value: string | null) {
  if (!value) return "";
  const date = new Date(value);
  const local = new Date(date.getTime() - date.getTimezoneOffset() * 60_000);
  return local.toISOString().slice(0, 16);
}

function getPlanFormState(plan: PlanConfig) {
  return {
    nombre: plan.nombre,
    descripcion: plan.descripcion ?? "",
    precio_mensual: plan.precio_mensual,
    precio_anual: plan.precio_anual,
    max_alumnos_default: plan.max_alumnos_default,
    max_sedes_default: plan.max_sedes_default,
    caracteristicas: plan.caracteristicas,
    activo: plan.activo,
  };
}

function getPlanEditorKey(plan: PlanConfig) {
  return [
    plan.id,
    plan.nombre,
    plan.descripcion ?? "",
    plan.precio_mensual,
    plan.precio_anual,
    plan.max_alumnos_default,
    plan.max_sedes_default,
    plan.activo,
    plan.caracteristicas.join("|"),
  ].join(":");
}

function getStatusClasses(status: string) {
  const tone = getSchoolSubscriptionStatusTone(status as never);
  switch (tone) {
    case "success":
      return "bg-emerald-100 text-emerald-700 dark:bg-emerald-500/10 dark:text-emerald-300";
    case "warning":
      return "bg-amber-100 text-amber-700 dark:bg-amber-500/10 dark:text-amber-300";
    case "danger":
      return "bg-rose-100 text-rose-700 dark:bg-rose-500/10 dark:text-rose-300";
    default:
      return "bg-zinc-100 text-zinc-700 dark:bg-zinc-500/10 dark:text-zinc-300";
  }
}

function getAttemptStatusLabel(status: string | null) {
  if (!status) return "Sin intentos";
  switch (status) {
    case "approved":
      return "Aprobado";
    case "pending":
      return "Pendiente";
    case "declined":
      return "Rechazado";
    case "voided":
      return "Anulado";
    case "expired":
      return "Vencido";
    case "cancelled":
      return "Cancelado";
    default:
      return "Error";
  }
}

function getAttemptStatusClasses(status: string | null) {
  if (status === "approved") return getStatusClasses("active");
  if (status === "pending") return getStatusClasses("pending_payment");
  if (!status) return "bg-zinc-100 text-zinc-700 dark:bg-zinc-500/10 dark:text-zinc-300";
  return getStatusClasses("suspended");
}

function openCheckoutSession(session: SchoolCheckoutSession) {
  if (session.fields && Object.keys(session.fields).length > 0) {
    const form = document.createElement("form");
    form.method = "GET";
    form.action = session.checkoutUrl;
    form.style.display = "none";

    Object.entries(session.fields).forEach(([key, value]) => {
      const input = document.createElement("input");
      input.type = "hidden";
      input.name = key;
      input.value = String(value);
      form.appendChild(input);
    });

    document.body.appendChild(form);
    form.submit();
    return;
  }

  window.location.assign(session.checkoutUrl);
}

function KpiCard({ label, value, helper }: { label: string; value: string; helper: string }) {
  return (
    <article className="rounded-3xl border border-zinc-200 bg-white/85 p-5 dark:border-white/10 dark:bg-zinc-900/60">
      <p className="text-xs font-semibold tracking-[0.16em] text-zinc-500 uppercase">{label}</p>
      <p className="mt-3 text-3xl font-black text-zinc-900 dark:text-white">{value}</p>
      <p className="mt-2 text-sm text-zinc-500">{helper}</p>
    </article>
  );
}

function PlanEditorCard({
  plan,
  onSave,
  saving,
}: {
  plan: PlanConfig;
  onSave: (updated: Partial<PlanConfig> & { id: string }) => Promise<void>;
  saving: boolean;
}) {
  const descriptor = getSchoolPlanDescriptor(plan.id);
  const [editing, setEditing] = useState(false);
  const [newFeature, setNewFeature] = useState("");
  const [form, setForm] = useState(() => getPlanFormState(plan));

  if (!descriptor) return null;

  return (
    <article className={`rounded-3xl border p-5 ${descriptor.panelClassName}`}>
      <div className="flex items-start justify-between gap-3">
        <div>
          <span
            className={`inline-flex rounded-full px-3 py-1 text-[11px] font-semibold ${descriptor.badgeClassName}`}
          >
            {descriptor.badge}
          </span>
          <h3 className={`mt-3 text-xl font-bold ${descriptor.accentClassName}`}>{plan.nombre}</h3>
        </div>
        <button
          type="button"
          onClick={() => setEditing((prev) => !prev)}
          className="inline-flex h-9 w-9 items-center justify-center rounded-xl border border-zinc-200 bg-white/80 text-zinc-700 transition-colors hover:bg-white dark:border-white/10 dark:bg-white/5 dark:text-zinc-100"
        >
          <Pencil size={15} />
        </button>
      </div>

      {!editing ? (
        <>
          <p className="mt-4 text-2xl font-black text-zinc-900 dark:text-white">
            {formatCurrency(plan.precio_mensual)}
            <span className="ml-1 text-xs font-medium text-zinc-500">/ mes</span>
          </p>
          <p className="mt-1 text-sm font-semibold text-zinc-700 dark:text-zinc-200">
            {formatCurrency(plan.precio_anual)}
            <span className="ml-1 text-[11px] font-normal text-zinc-500">/ año</span>
          </p>
          <p className="mt-3 text-sm text-zinc-600 dark:text-zinc-300">{plan.descripcion}</p>
          <div className="mt-4 space-y-2 text-xs text-zinc-600 dark:text-zinc-300">
            <div className="flex justify-between">
              <span>Alumnos base</span>
              <span className="font-semibold">
                {plan.max_alumnos_default.toLocaleString("es-CO")}
              </span>
            </div>
            <div className="flex justify-between">
              <span>Sedes base</span>
              <span className="font-semibold">{plan.max_sedes_default}</span>
            </div>
          </div>
          <div className="mt-4 flex flex-wrap gap-2">
            {plan.caracteristicas.map((feature) => (
              <span
                key={feature}
                className="rounded-full bg-white/80 px-3 py-1 text-xs text-zinc-600 dark:bg-white/5 dark:text-zinc-300"
              >
                {feature}
              </span>
            ))}
          </div>
        </>
      ) : (
        <div className="mt-4 space-y-3">
          <input
            value={form.nombre}
            onChange={(event) => setForm((prev) => ({ ...prev, nombre: event.target.value }))}
            className="w-full rounded-2xl border border-zinc-200 bg-white px-4 py-3 text-sm text-zinc-900 dark:border-white/10 dark:bg-zinc-950/40 dark:text-white"
            placeholder="Nombre del plan"
          />
          <textarea
            value={form.descripcion}
            onChange={(event) => setForm((prev) => ({ ...prev, descripcion: event.target.value }))}
            rows={2}
            className="w-full rounded-2xl border border-zinc-200 bg-white px-4 py-3 text-sm text-zinc-900 dark:border-white/10 dark:bg-zinc-950/40 dark:text-white"
            placeholder="Resumen del plan"
          />
          <div className="grid gap-3 sm:grid-cols-2">
            <input
              type="number"
              min={0}
              value={form.precio_mensual}
              onChange={(event) =>
                setForm((prev) => ({
                  ...prev,
                  precio_mensual: Number(event.target.value) || 0,
                }))
              }
              className="rounded-2xl border border-zinc-200 bg-white px-4 py-3 text-sm text-zinc-900 dark:border-white/10 dark:bg-zinc-950/40 dark:text-white"
              placeholder="Precio mensual"
            />
            <input
              type="number"
              min={0}
              value={form.precio_anual}
              onChange={(event) =>
                setForm((prev) => ({
                  ...prev,
                  precio_anual: Number(event.target.value) || 0,
                }))
              }
              className="rounded-2xl border border-zinc-200 bg-white px-4 py-3 text-sm text-zinc-900 dark:border-white/10 dark:bg-zinc-950/40 dark:text-white"
              placeholder="Precio anual"
            />
          </div>
          <div className="grid gap-3 sm:grid-cols-2">
            <input
              type="number"
              min={1}
              value={form.max_alumnos_default}
              onChange={(event) =>
                setForm((prev) => ({
                  ...prev,
                  max_alumnos_default: Number(event.target.value) || 1,
                }))
              }
              className="rounded-2xl border border-zinc-200 bg-white px-4 py-3 text-sm text-zinc-900 dark:border-white/10 dark:bg-zinc-950/40 dark:text-white"
              placeholder="Alumnos base"
            />
            <input
              type="number"
              min={1}
              value={form.max_sedes_default}
              onChange={(event) =>
                setForm((prev) => ({
                  ...prev,
                  max_sedes_default: Number(event.target.value) || 1,
                }))
              }
              className="rounded-2xl border border-zinc-200 bg-white px-4 py-3 text-sm text-zinc-900 dark:border-white/10 dark:bg-zinc-950/40 dark:text-white"
              placeholder="Sedes base"
            />
          </div>
          <label className="flex items-center gap-2 text-sm text-zinc-700 dark:text-zinc-200">
            <input
              type="checkbox"
              checked={form.activo}
              onChange={(event) => setForm((prev) => ({ ...prev, activo: event.target.checked }))}
              className="accent-blue-600"
            />
            Plan activo
          </label>

          <div className="space-y-2">
            <div className="flex gap-2">
              <input
                value={newFeature}
                onChange={(event) => setNewFeature(event.target.value)}
                className="flex-1 rounded-2xl border border-zinc-200 bg-white px-4 py-3 text-sm text-zinc-900 dark:border-white/10 dark:bg-zinc-950/40 dark:text-white"
                placeholder="Agregar caracteristica"
              />
              <button
                type="button"
                onClick={() => {
                  const nextFeature = newFeature.trim();
                  if (!nextFeature || form.caracteristicas.includes(nextFeature)) return;
                  setForm((prev) => ({
                    ...prev,
                    caracteristicas: [...prev.caracteristicas, nextFeature],
                  }));
                  setNewFeature("");
                }}
                className="rounded-2xl border border-zinc-200 px-4 py-3 text-sm font-semibold text-zinc-800 dark:border-white/10 dark:text-zinc-100"
              >
                Agregar
              </button>
            </div>
            <div className="flex flex-wrap gap-2">
              {form.caracteristicas.map((feature) => (
                <button
                  key={feature}
                  type="button"
                  onClick={() =>
                    setForm((prev) => ({
                      ...prev,
                      caracteristicas: prev.caracteristicas.filter((item) => item !== feature),
                    }))
                  }
                  className="rounded-full bg-white/90 px-3 py-1 text-xs text-zinc-700 dark:bg-white/5 dark:text-zinc-300"
                >
                  {feature} <span className="ml-1 text-zinc-400">x</span>
                </button>
              ))}
            </div>
          </div>

          <div className="flex gap-3">
            <button
              type="button"
              disabled={saving}
              onClick={async () => {
                await onSave({ id: plan.id, ...form });
                setEditing(false);
              }}
              className="inline-flex min-h-[44px] items-center rounded-2xl bg-[#2563eb] px-4 py-2 text-sm font-semibold text-white disabled:opacity-60"
            >
              Guardar
            </button>
            <button
              type="button"
              onClick={() => setEditing(false)}
              className="inline-flex min-h-[44px] items-center rounded-2xl border border-zinc-300 px-4 py-2 text-sm font-semibold text-zinc-700 dark:border-white/10 dark:text-zinc-200"
            >
              Cancelar
            </button>
          </div>
        </div>
      )}
    </article>
  );
}

function DetailDrawer({
  open,
  detail,
  loading,
  onClose,
  onRefresh,
  onRunAction,
}: {
  open: boolean;
  detail: SchoolSubscriptionAdminDetailResponse | null;
  loading: boolean;
  onClose: () => void;
  onRefresh: () => Promise<void>;
  onRunAction: (
    payload:
      | Record<string, boolean | number | string | undefined>
      | Record<string, boolean | number | string | undefined | null>
  ) => Promise<AdminActionResponse>;
}) {
  const [selectedPlan, setSelectedPlan] = useState<PlanEscuelaPago>("profesional");
  const [selectedInterval, setSelectedInterval] = useState<SchoolPaidBillingInterval>("monthly");
  const [reason, setReason] = useState("");
  const [trialDays, setTrialDays] = useState(7);
  const [graceDays, setGraceDays] = useState(3);
  const [manualStartsAt, setManualStartsAt] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const isManualActivationState =
    detail?.access.actual_status === "trialing" ||
    detail?.access.actual_status === "read_only" ||
    detail?.access.actual_status === "suspended";

  useEffect(() => {
    if (!detail) return;
    setSelectedPlan(detail.access.scheduled_plan_id || detail.access.plan_id);
    setSelectedInterval(
      detail.access.scheduled_billing_interval ||
        (detail.access.billing_interval === "annual" ? "annual" : "monthly")
    );
    setManualStartsAt(formatDateTimeLocal(new Date().toISOString()));
    setReason("");
  }, [detail]);

  if (!open) return null;

  const submit = async (
    payload: Record<string, boolean | number | string | undefined | null>,
    successMessage?: string
  ) => {
    setSubmitting(true);
    try {
      const result = await onRunAction(payload);
      if (result.checkout) {
        openCheckoutSession(result.checkout);
        return;
      }
      toast.success(successMessage ?? result.message);
      await onRefresh();
      setReason("");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "No se pudo completar la acción.");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex justify-end bg-black/40 backdrop-blur-sm">
      <button type="button" className="flex-1 cursor-default" onClick={onClose} />
      <aside className="h-full w-full max-w-2xl overflow-y-auto border-l border-zinc-200 bg-white shadow-2xl dark:border-white/10 dark:bg-[#0f1115]">
        <div className="sticky top-0 z-10 border-b border-zinc-200 bg-white/95 px-6 py-5 backdrop-blur dark:border-white/10 dark:bg-[#0f1115]/95">
          <div className="flex items-start justify-between gap-4">
            <div>
              <p className="text-xs font-semibold tracking-[0.16em] text-zinc-500 uppercase">
                Escuela
              </p>
              <h2 className="mt-2 text-2xl font-black text-zinc-900 dark:text-white">
                {detail?.school.nombre ?? "Cargando..."}
              </h2>
              {detail ? (
                <div className="mt-3 flex flex-wrap gap-2">
                  <span
                    className={`inline-flex rounded-full px-3 py-1 text-xs font-semibold ${getStatusClasses(
                      detail.access.status
                    )}`}
                  >
                    {getSchoolSubscriptionStatusLabel(detail.access.status)}
                  </span>
                  <span className="inline-flex rounded-full bg-zinc-100 px-3 py-1 text-xs font-semibold text-zinc-700 dark:bg-white/10 dark:text-zinc-200">
                    {getSchoolSubscriptionPlanLabel(detail.access.plan_id)}{" "}
                    {getSchoolSubscriptionIntervalLabel(
                      detail.access.billing_interval
                    ).toLowerCase()}
                  </span>
                </div>
              ) : null}
            </div>
            <button
              type="button"
              onClick={onClose}
              className="inline-flex h-10 w-10 items-center justify-center rounded-2xl border border-zinc-200 bg-white text-zinc-700 dark:border-white/10 dark:bg-white/5 dark:text-zinc-200"
            >
              <X size={16} />
            </button>
          </div>
        </div>

        <div className="space-y-6 px-6 py-6">
          {loading || !detail ? (
            <div className="space-y-4">
              <div className="h-24 animate-pulse rounded-3xl bg-zinc-200/60 dark:bg-zinc-800/60" />
              <div className="h-48 animate-pulse rounded-3xl bg-zinc-200/60 dark:bg-zinc-800/60" />
            </div>
          ) : (
            <>
              <section className="grid gap-4 md:grid-cols-3">
                <article className="rounded-3xl border border-zinc-200 bg-zinc-50/80 p-4 dark:border-white/10 dark:bg-white/5">
                  <p className="text-xs tracking-[0.16em] text-zinc-500 uppercase">Monto vigente</p>
                  <p className="mt-3 text-2xl font-black text-zinc-900 dark:text-white">
                    {formatCurrency(detail.currentAmount)}
                  </p>
                </article>
                <article className="rounded-3xl border border-zinc-200 bg-zinc-50/80 p-4 dark:border-white/10 dark:bg-white/5">
                  <p className="text-xs tracking-[0.16em] text-zinc-500 uppercase">Próxima fecha</p>
                  <p className="mt-3 text-lg font-bold text-zinc-900 dark:text-white">
                    {formatDate(detail.nextDateAt)}
                  </p>
                </article>
                <article className="rounded-3xl border border-zinc-200 bg-zinc-50/80 p-4 dark:border-white/10 dark:bg-white/5">
                  <p className="text-xs tracking-[0.16em] text-zinc-500 uppercase">Escritura</p>
                  <p className="mt-3 text-lg font-bold text-zinc-900 dark:text-white">
                    {detail.access.can_write ? "Habilitada" : "Bloqueada"}
                  </p>
                </article>
              </section>

              <section className="rounded-3xl border border-zinc-200 bg-white/85 p-5 dark:border-white/10 dark:bg-zinc-900/50">
                <div className="flex items-center justify-between gap-3">
                  <div>
                    <p className="text-xs font-semibold tracking-[0.16em] text-zinc-500 uppercase">
                      Operación comercial
                    </p>
                    <p className="mt-2 text-sm text-zinc-500">
                      Selecciona plan e intervalo para abrir checkout, programar cambio o dar un
                      ciclo manual.
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={() => void onRefresh()}
                    className="inline-flex h-10 w-10 items-center justify-center rounded-2xl border border-zinc-200 bg-white text-zinc-700 dark:border-white/10 dark:bg-white/5 dark:text-zinc-100"
                  >
                    <RefreshCw size={15} />
                  </button>
                </div>

                <div className="mt-5 grid gap-3 md:grid-cols-3">
                  {detail.plans.map((plan) => {
                    const selected = selectedPlan === plan.id;
                    return (
                      <button
                        key={plan.id}
                        type="button"
                        onClick={() => setSelectedPlan(plan.id)}
                        className={`rounded-3xl border px-4 py-4 text-left transition-all ${
                          selected
                            ? "border-blue-500 bg-blue-50 dark:border-blue-400 dark:bg-blue-500/10"
                            : "border-zinc-200 bg-white dark:border-white/10 dark:bg-zinc-950/20"
                        }`}
                      >
                        <p className="text-sm font-bold text-zinc-900 dark:text-white">
                          {plan.nombre}
                        </p>
                        <p className="mt-2 text-xs text-zinc-500">{plan.descripcion}</p>
                        <p className="mt-3 text-sm font-semibold text-zinc-900 dark:text-white">
                          {formatCurrency(plan.precio_mensual)}
                          <span className="ml-1 text-[11px] text-zinc-500">/ mes</span>
                        </p>
                        <p className="text-xs font-semibold text-zinc-700 dark:text-zinc-300">
                          {formatCurrency(plan.precio_anual)} / año
                        </p>
                      </button>
                    );
                  })}
                </div>

                <div className="mt-4 flex flex-wrap gap-2">
                  {(["monthly", "annual"] as const).map((interval) => (
                    <button
                      key={interval}
                      type="button"
                      onClick={() => setSelectedInterval(interval)}
                      className={`rounded-full px-4 py-2 text-sm font-semibold ${
                        selectedInterval === interval
                          ? "bg-[#2563eb] text-white"
                          : "bg-zinc-100 text-zinc-700 dark:bg-white/10 dark:text-zinc-200"
                      }`}
                    >
                      {getSchoolSubscriptionIntervalLabel(interval)}
                    </button>
                  ))}
                </div>

                <textarea
                  value={reason}
                  onChange={(event) => setReason(event.target.value)}
                  rows={2}
                  className="mt-4 w-full rounded-2xl border border-zinc-200 bg-white px-4 py-3 text-sm text-zinc-900 dark:border-white/10 dark:bg-zinc-950/40 dark:text-white"
                  placeholder="Motivo interno para soporte, override o cambio programado. En activación manual es opcional."
                />

                <div className="mt-4 flex flex-wrap gap-3">
                  <button
                    type="button"
                    disabled={submitting}
                    onClick={() =>
                      void submit(
                        {
                          action: "start_checkout",
                          plan_id: selectedPlan,
                          billing_interval: selectedInterval,
                        },
                        "Checkout abierto correctamente."
                      )
                    }
                    className="inline-flex min-h-[44px] items-center gap-2 rounded-2xl bg-[#2563eb] px-4 py-2 text-sm font-semibold text-white disabled:opacity-60"
                  >
                    Abrir checkout
                    <ExternalLink size={15} />
                  </button>
                  <button
                    type="button"
                    disabled={submitting || reason.trim().length < 5}
                    onClick={() =>
                      void submit(
                        {
                          action: "schedule_change",
                          plan_id: selectedPlan,
                          billing_interval: selectedInterval,
                          reason,
                        },
                        "Cambio programado correctamente."
                      )
                    }
                    className="inline-flex min-h-[44px] items-center gap-2 rounded-2xl border border-zinc-300 px-4 py-2 text-sm font-semibold text-zinc-800 disabled:opacity-60 dark:border-white/10 dark:text-zinc-100"
                  >
                    Programar cambio
                    <CalendarClock size={15} />
                  </button>
                  <button
                    type="button"
                    disabled={submitting}
                    onClick={() =>
                      void submit(
                        {
                          action: "grant_manual_cycle",
                          plan_id: selectedPlan,
                          billing_interval: selectedInterval,
                          starts_at: manualStartsAt
                            ? new Date(manualStartsAt).toISOString()
                            : undefined,
                          reason: reason.trim() || undefined,
                        },
                        isManualActivationState
                          ? "Activación manual aplicada."
                          : "Ciclo manual otorgado."
                      )
                    }
                    className="inline-flex min-h-[44px] items-center gap-2 rounded-2xl border border-zinc-300 px-4 py-2 text-sm font-semibold text-zinc-800 disabled:opacity-60 dark:border-white/10 dark:text-zinc-100"
                  >
                    {isManualActivationState ? "Activar manualmente" : "Otorgar ciclo manual"}
                    <LifeBuoy size={15} />
                  </button>
                </div>

                <input
                  type="datetime-local"
                  value={manualStartsAt}
                  onChange={(event) => setManualStartsAt(event.target.value)}
                  className="mt-3 w-full rounded-2xl border border-zinc-200 bg-white px-4 py-3 text-sm text-zinc-900 dark:border-white/10 dark:bg-zinc-950/40 dark:text-white"
                />

                {detail.actions.canCancelScheduledChange ? (
                  <button
                    type="button"
                    disabled={submitting}
                    onClick={() =>
                      void submit(
                        {
                          action: "cancel_scheduled_change",
                          reason: reason.trim() || undefined,
                        },
                        "Cambio programado cancelado."
                      )
                    }
                    className="mt-3 inline-flex min-h-[44px] items-center gap-2 rounded-2xl border border-zinc-300 px-4 py-2 text-sm font-semibold text-zinc-800 disabled:opacity-60 dark:border-white/10 dark:text-zinc-100"
                  >
                    Cancelar cambio programado
                  </button>
                ) : null}
              </section>

              <section className="grid gap-4 md:grid-cols-2">
                <article className="rounded-3xl border border-zinc-200 bg-white/85 p-5 dark:border-white/10 dark:bg-zinc-900/50">
                  <p className="text-xs font-semibold tracking-[0.16em] text-zinc-500 uppercase">
                    Ajustes de estado
                  </p>
                  <div className="mt-4 flex flex-wrap gap-3">
                    {detail.actions.canSetReadOnly ? (
                      <button
                        type="button"
                        disabled={submitting || reason.trim().length < 5}
                        onClick={() =>
                          void submit(
                            { action: "set_read_only", reason },
                            "La escuela quedó en solo lectura."
                          )
                        }
                        className="inline-flex min-h-[44px] items-center gap-2 rounded-2xl border border-zinc-300 px-4 py-2 text-sm font-semibold text-zinc-800 disabled:opacity-60 dark:border-white/10 dark:text-zinc-100"
                      >
                        Solo lectura
                        <ShieldAlert size={15} />
                      </button>
                    ) : null}
                    {detail.actions.canSuspendNow ? (
                      <button
                        type="button"
                        disabled={submitting || reason.trim().length < 5}
                        onClick={() =>
                          void submit(
                            { action: "suspend_now", reason },
                            "La escuela fue suspendida."
                          )
                        }
                        className="inline-flex min-h-[44px] items-center gap-2 rounded-2xl border border-rose-300 px-4 py-2 text-sm font-semibold text-rose-700 disabled:opacity-60 dark:border-rose-500/20 dark:text-rose-300"
                      >
                        Suspender ahora
                        <AlertTriangle size={15} />
                      </button>
                    ) : null}
                    <button
                      type="button"
                      disabled={submitting}
                      onClick={() =>
                        void submit(
                          {
                            action: "toggle_requires_review",
                            value: !detail.access.requires_review,
                            reason: reason.trim() || undefined,
                          },
                          detail.access.requires_review
                            ? "La escuela salió de revisión."
                            : "La escuela quedó marcada para revisión."
                        )
                      }
                      className="inline-flex min-h-[44px] items-center gap-2 rounded-2xl border border-zinc-300 px-4 py-2 text-sm font-semibold text-zinc-800 disabled:opacity-60 dark:border-white/10 dark:text-zinc-100"
                    >
                      {detail.access.requires_review ? "Quitar revisión" : "Marcar revisión"}
                      <TimerReset size={15} />
                    </button>
                  </div>
                </article>

                <article className="rounded-3xl border border-zinc-200 bg-white/85 p-5 dark:border-white/10 dark:bg-zinc-900/50">
                  <p className="text-xs font-semibold tracking-[0.16em] text-zinc-500 uppercase">
                    Extensiones
                  </p>
                  <div className="mt-4 space-y-3">
                    {detail.actions.canExtendTrial ? (
                      <div className="rounded-2xl border border-zinc-200 p-4 dark:border-white/10">
                        <label className="text-sm font-medium text-zinc-700 dark:text-zinc-200">
                          Extender prueba
                        </label>
                        <div className="mt-3 flex gap-3">
                          <input
                            type="number"
                            min={1}
                            value={trialDays}
                            onChange={(event) => setTrialDays(Number(event.target.value) || 1)}
                            className="w-28 rounded-2xl border border-zinc-200 bg-white px-4 py-3 text-sm text-zinc-900 dark:border-white/10 dark:bg-zinc-950/40 dark:text-white"
                          />
                          <button
                            type="button"
                            disabled={submitting || reason.trim().length < 5}
                            onClick={() =>
                              void submit(
                                { action: "extend_trial", days: trialDays, reason },
                                "Prueba extendida correctamente."
                              )
                            }
                            className="rounded-2xl bg-[#2563eb] px-4 py-3 text-sm font-semibold text-white disabled:opacity-60"
                          >
                            Extender
                          </button>
                        </div>
                      </div>
                    ) : null}

                    {detail.actions.canExtendGrace ? (
                      <div className="rounded-2xl border border-zinc-200 p-4 dark:border-white/10">
                        <label className="text-sm font-medium text-zinc-700 dark:text-zinc-200">
                          Extender gracia
                        </label>
                        <div className="mt-3 flex gap-3">
                          <input
                            type="number"
                            min={1}
                            value={graceDays}
                            onChange={(event) => setGraceDays(Number(event.target.value) || 1)}
                            className="w-28 rounded-2xl border border-zinc-200 bg-white px-4 py-3 text-sm text-zinc-900 dark:border-white/10 dark:bg-zinc-950/40 dark:text-white"
                          />
                          <button
                            type="button"
                            disabled={submitting || reason.trim().length < 5}
                            onClick={() =>
                              void submit(
                                { action: "extend_grace", days: graceDays, reason },
                                "Gracia extendida correctamente."
                              )
                            }
                            className="rounded-2xl bg-[#2563eb] px-4 py-3 text-sm font-semibold text-white disabled:opacity-60"
                          >
                            Extender
                          </button>
                        </div>
                      </div>
                    ) : (
                      <p className="rounded-2xl bg-zinc-50 px-4 py-3 text-sm text-zinc-500 dark:bg-white/5">
                        Esta escuela no tiene una gracia activa para extender.
                      </p>
                    )}
                  </div>
                </article>
              </section>

              <section className="grid gap-4 md:grid-cols-2">
                <article className="rounded-3xl border border-zinc-200 bg-white/85 p-5 dark:border-white/10 dark:bg-zinc-900/50">
                  <p className="text-xs font-semibold tracking-[0.16em] text-zinc-500 uppercase">
                    Intentos recientes
                  </p>
                  <div className="mt-4 space-y-3">
                    {detail.latestAttempts.length > 0 ? (
                      detail.latestAttempts.map((attempt) => (
                        <div
                          key={attempt.id}
                          className="rounded-2xl border border-zinc-200 px-4 py-3 dark:border-white/10"
                        >
                          <div className="flex items-center justify-between gap-3">
                            <p className="text-sm font-semibold text-zinc-900 dark:text-white">
                              {getSchoolSubscriptionPlanLabel(attempt.target_plan_id)}{" "}
                              {getSchoolSubscriptionIntervalLabel(
                                attempt.target_billing_interval
                              ).toLowerCase()}
                            </p>
                            <span
                              className={`inline-flex rounded-full px-2.5 py-1 text-[11px] font-semibold ${getAttemptStatusClasses(
                                attempt.status
                              )}`}
                            >
                              {getAttemptStatusLabel(attempt.status)}
                            </span>
                          </div>
                          <p className="mt-2 text-xs text-zinc-500">{attempt.reference}</p>
                          <p className="mt-1 text-sm text-zinc-600 dark:text-zinc-300">
                            {formatCurrency(attempt.amount_in_cents / 100)} ·{" "}
                            {formatDate(attempt.created_at)}
                          </p>
                        </div>
                      ))
                    ) : (
                      <p className="rounded-2xl bg-zinc-50 px-4 py-3 text-sm text-zinc-500 dark:bg-white/5">
                        No hay intentos recientes para esta escuela.
                      </p>
                    )}
                  </div>
                </article>

                <article className="rounded-3xl border border-zinc-200 bg-white/85 p-5 dark:border-white/10 dark:bg-zinc-900/50">
                  <p className="text-xs font-semibold tracking-[0.16em] text-zinc-500 uppercase">
                    Auditoría comercial
                  </p>
                  <div className="mt-4 space-y-3">
                    {detail.events.length > 0 ? (
                      detail.events.map((event) => (
                        <div
                          key={event.id}
                          className="rounded-2xl border border-zinc-200 px-4 py-3 dark:border-white/10"
                        >
                          <p className="text-sm font-semibold text-zinc-900 dark:text-white">
                            {event.summary}
                          </p>
                          <p className="mt-1 text-xs text-zinc-500">
                            {formatDate(event.created_at)}
                            {event.created_by_name ? ` · ${event.created_by_name}` : ""}
                          </p>
                        </div>
                      ))
                    ) : (
                      <p className="rounded-2xl bg-zinc-50 px-4 py-3 text-sm text-zinc-500 dark:bg-white/5">
                        No hay eventos comerciales registrados.
                      </p>
                    )}
                  </div>
                </article>
              </section>
            </>
          )}
        </div>
      </aside>
    </div>
  );
}

export default function SuperAdminSubscriptionsCenter() {
  const [data, setData] = useState<PlatformSubscriptionsResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [search, setSearch] = useState("");
  const [planFilter, setPlanFilter] = useState("");
  const [statusFilter, setStatusFilter] = useState("");
  const [intervalFilter, setIntervalFilter] = useState("");
  const [reviewFilter, setReviewFilter] = useState("");
  const [detailOpen, setDetailOpen] = useState(false);
  const [selectedSchoolId, setSelectedSchoolId] = useState<string | null>(null);
  const [detail, setDetail] = useState<SchoolSubscriptionAdminDetailResponse | null>(null);
  const [detailLoading, setDetailLoading] = useState(false);
  const [planSaving, setPlanSaving] = useState(false);

  const loadBoard = useCallback(async () => {
    setLoading(true);
    try {
      const nextData = await fetchJsonWithRetry<PlatformSubscriptionsResponse>(
        "/api/suscripciones",
        {
          cache: "no-store",
        }
      );
      setData(nextData);
      setError("");
    } catch (nextError) {
      setError(
        nextError instanceof Error
          ? nextError.message
          : "No se pudo cargar el centro de suscripciones."
      );
    } finally {
      setLoading(false);
    }
  }, []);

  const loadDetail = useCallback(async (schoolId: string) => {
    setDetailLoading(true);
    try {
      const payload = await fetchJsonWithRetry<SchoolSubscriptionAdminDetailResponse>(
        `/api/suscripciones/escuelas/${schoolId}`,
        { cache: "no-store" }
      );
      setDetail(payload);
    } finally {
      setDetailLoading(false);
    }
  }, []);

  useEffect(() => {
    void loadBoard();
  }, [loadBoard]);

  const openDetail = async (schoolId: string) => {
    setSelectedSchoolId(schoolId);
    setDetailOpen(true);
    await loadDetail(schoolId);
  };

  const filteredSchools = useMemo(() => {
    const schools = data?.schools ?? [];
    return schools.filter((school) => {
      if (search.trim()) {
        const query = search.trim().toLowerCase();
        const matches =
          school.nombre.toLowerCase().includes(query) ||
          (school.latestPaymentReference ?? "").toLowerCase().includes(query);
        if (!matches) return false;
      }

      if (planFilter && school.commercialPlan !== planFilter) return false;
      if (statusFilter && school.subscriptionStatus !== statusFilter) return false;
      if (intervalFilter && school.billingInterval !== intervalFilter) return false;
      if (reviewFilter === "review" && !school.requiresReview) return false;
      if (reviewFilter === "clean" && school.requiresReview) return false;

      return true;
    });
  }, [data?.schools, intervalFilter, planFilter, reviewFilter, search, statusFilter]);

  const savePlan = async (updated: Partial<PlanConfig> & { id: string }) => {
    setPlanSaving(true);
    try {
      await fetchJsonWithRetry("/api/planes", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(updated),
      });
      toast.success("Catálogo comercial actualizado.");
      await loadBoard();
      if (selectedSchoolId) {
        await loadDetail(selectedSchoolId);
      }
    } catch (nextError) {
      toast.error(
        nextError instanceof Error ? nextError.message : "No se pudo actualizar el plan."
      );
    } finally {
      setPlanSaving(false);
    }
  };

  const runSchoolAction = async (
    payload: Record<string, boolean | number | string | undefined | null>
  ) => {
    if (!selectedSchoolId) {
      throw new Error("No hay una escuela seleccionada.");
    }

    const response = await fetchJsonWithRetry<AdminActionResponse>(
      `/api/suscripciones/escuelas/${selectedSchoolId}/acciones`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      }
    );

    await loadBoard();
    if (!response.checkout) {
      await loadDetail(selectedSchoolId);
    }

    return response;
  };

  const stats = data?.stats;

  return (
    <PageScaffold
      eyebrow="Facturación"
      title="Centro de control de suscripciones"
      description="Opera catálogo, ciclos, vencimientos y overrides comerciales de todas las escuelas desde un solo tablero."
    >
      <div className="space-y-8">
        {error ? (
          <div className="rounded-3xl border border-rose-200 bg-rose-50 px-5 py-4 text-sm text-rose-700 dark:border-rose-900/40 dark:bg-rose-950/20 dark:text-rose-300">
            {error}
          </div>
        ) : null}

        <section className="grid gap-4 md:grid-cols-3 xl:grid-cols-6">
          <KpiCard
            label="Escuelas"
            value={loading ? "-" : String(stats?.totalSchools ?? 0)}
            helper="Base total"
          />
          <KpiCard
            label="Mensuales"
            value={loading ? "-" : String(stats?.monthlyPaidSchools ?? 0)}
            helper="Ciclos mensuales"
          />
          <KpiCard
            label="Anuales"
            value={loading ? "-" : String(stats?.annualPaidSchools ?? 0)}
            helper="Ciclos anuales"
          />
          <KpiCard
            label="MRR estimado"
            value={loading ? "-" : formatCurrency(stats?.estimatedMrr ?? 0)}
            helper="Run-rate mensual"
          />
          <KpiCard
            label="ARR estimado"
            value={loading ? "-" : formatCurrency(stats?.estimatedArr ?? 0)}
            helper="Run-rate anual"
          />
          <KpiCard
            label="Vencen pronto"
            value={loading ? "-" : String(stats?.dueInNext30Days ?? 0)}
            helper="Proximos 30 dias"
          />
        </section>

        <section className="rounded-3xl border border-zinc-200 bg-white/85 p-6 dark:border-white/10 dark:bg-zinc-900/60">
          <div className="flex items-start justify-between gap-4">
            <div>
              <p className="text-xs font-semibold tracking-[0.16em] text-zinc-500 uppercase">
                Catálogo comercial
              </p>
              <h2 className="mt-2 text-2xl font-bold text-zinc-900 dark:text-white">
                Planes mensuales y anuales
              </h2>
              <p className="mt-2 max-w-3xl text-sm text-zinc-500">
                Edita precios, capacidades base y beneficios de los planes comerciales. Este es el
                punto maestro del catálogo.
              </p>
            </div>
            <button
              type="button"
              onClick={() => void loadBoard()}
              className="inline-flex min-h-[44px] items-center gap-2 rounded-2xl border border-zinc-300 px-4 py-2 text-sm font-semibold text-zinc-700 dark:border-white/10 dark:text-zinc-100"
            >
              <RefreshCw size={15} />
              Recargar
            </button>
          </div>

          <div className="mt-6 grid gap-4 lg:grid-cols-3">
            {(data?.plans ?? []).map((plan) => (
              <PlanEditorCard
                key={getPlanEditorKey(plan)}
                plan={plan}
                onSave={savePlan}
                saving={planSaving}
              />
            ))}
          </div>
        </section>

        <section className="rounded-3xl border border-zinc-200 bg-white/85 p-6 dark:border-white/10 dark:bg-zinc-900/60">
          <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
            <div>
              <p className="text-xs font-semibold tracking-[0.16em] text-zinc-500 uppercase">
                Escuelas
              </p>
              <h2 className="mt-2 text-2xl font-bold text-zinc-900 dark:text-white">
                Operación comercial por escuela
              </h2>
              <p className="mt-2 text-sm text-zinc-500">
                Abre el panel de una escuela para renovar, activar, suspender, programar cambios o
                conceder soporte manual.
              </p>
            </div>

            <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-5">
              <div className="relative xl:col-span-2">
                <Search
                  size={16}
                  className="pointer-events-none absolute top-1/2 left-3 -translate-y-1/2 text-zinc-400"
                />
                <input
                  value={search}
                  onChange={(event) => setSearch(event.target.value)}
                  className="w-full rounded-2xl border border-zinc-200 bg-white py-3 pr-4 pl-10 text-sm text-zinc-900 dark:border-white/10 dark:bg-zinc-950/40 dark:text-white"
                  placeholder="Buscar escuela o referencia"
                />
              </div>
              <select
                value={planFilter}
                onChange={(event) => setPlanFilter(event.target.value)}
                className="rounded-2xl border border-zinc-200 bg-white px-4 py-3 text-sm text-zinc-900 dark:border-white/10 dark:bg-zinc-950/40 dark:text-white"
              >
                <option value="">Todos los planes</option>
                {(data?.plans ?? []).map((plan) => (
                  <option key={plan.id} value={plan.id}>
                    {plan.nombre}
                  </option>
                ))}
              </select>
              <select
                value={statusFilter}
                onChange={(event) => setStatusFilter(event.target.value)}
                className="rounded-2xl border border-zinc-200 bg-white px-4 py-3 text-sm text-zinc-900 dark:border-white/10 dark:bg-zinc-950/40 dark:text-white"
              >
                <option value="">Todo estado comercial</option>
                {["trialing", "active", "grace", "pending_payment", "read_only", "suspended"].map(
                  (status) => (
                    <option key={status} value={status}>
                      {getSchoolSubscriptionStatusLabel(status as never)}
                    </option>
                  )
                )}
              </select>
              <select
                value={intervalFilter}
                onChange={(event) => setIntervalFilter(event.target.value)}
                className="rounded-2xl border border-zinc-200 bg-white px-4 py-3 text-sm text-zinc-900 dark:border-white/10 dark:bg-zinc-950/40 dark:text-white"
              >
                <option value="">Todo intervalo</option>
                <option value="trial">Prueba</option>
                <option value="monthly">Mensual</option>
                <option value="annual">Anual</option>
              </select>
              <select
                value={reviewFilter}
                onChange={(event) => setReviewFilter(event.target.value)}
                className="rounded-2xl border border-zinc-200 bg-white px-4 py-3 text-sm text-zinc-900 dark:border-white/10 dark:bg-zinc-950/40 dark:text-white"
              >
                <option value="">Toda revisión</option>
                <option value="review">Solo en revisión</option>
                <option value="clean">Sin revisión</option>
              </select>
            </div>
          </div>

          <div className="mt-6 overflow-hidden rounded-3xl border border-zinc-200 dark:border-white/10">
            <div className="hidden overflow-x-auto lg:block">
              <table className="w-full text-left">
                <thead className="bg-zinc-50 dark:bg-white/5">
                  <tr>
                    <th className="px-5 py-3 text-xs font-semibold tracking-[0.16em] text-zinc-500 uppercase">
                      Escuela
                    </th>
                    <th className="px-4 py-3 text-xs font-semibold tracking-[0.16em] text-zinc-500 uppercase">
                      Comercial
                    </th>
                    <th className="px-4 py-3 text-xs font-semibold tracking-[0.16em] text-zinc-500 uppercase">
                      Monto actual
                    </th>
                    <th className="px-4 py-3 text-xs font-semibold tracking-[0.16em] text-zinc-500 uppercase">
                      Próxima fecha
                    </th>
                    <th className="px-4 py-3 text-xs font-semibold tracking-[0.16em] text-zinc-500 uppercase">
                      Último cobro
                    </th>
                    <th className="px-4 py-3 text-xs font-semibold tracking-[0.16em] text-zinc-500 uppercase">
                      Alertas
                    </th>
                    <th className="px-4 py-3 text-xs font-semibold tracking-[0.16em] text-zinc-500 uppercase">
                      Acción
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-zinc-100 dark:divide-white/5">
                  {filteredSchools.map((school) => (
                    <tr key={school.id} className="bg-white dark:bg-transparent">
                      <td className="px-5 py-4 align-top">
                        <div className="flex items-start gap-3">
                          <div className="mt-0.5 flex h-10 w-10 items-center justify-center rounded-xl bg-blue-100 text-blue-600 dark:bg-blue-500/15 dark:text-blue-300">
                            <Building2 size={17} />
                          </div>
                          <div>
                            <p className="text-sm font-semibold text-zinc-900 dark:text-white">
                              {school.nombre}
                            </p>
                            <div className="mt-2 flex flex-wrap gap-2">
                              <span
                                className={`inline-flex rounded-full px-2.5 py-1 text-[11px] font-semibold ${getStatusClasses(
                                  school.subscriptionStatus
                                )}`}
                              >
                                {school.subscriptionStatusLabel}
                              </span>
                              <span className="inline-flex rounded-full bg-zinc-100 px-2.5 py-1 text-[11px] font-semibold text-zinc-700 dark:bg-white/10 dark:text-zinc-200">
                                {school.commercialPlanLabel}{" "}
                                {school.billingIntervalLabel.toLowerCase()}
                              </span>
                            </div>
                          </div>
                        </div>
                      </td>
                      <td className="px-4 py-4 align-top">
                        <p className="text-sm font-semibold text-zinc-900 dark:text-white">
                          {school.commercialPlanLabel}
                        </p>
                        {school.scheduledChangeLabel ? (
                          <p className="mt-2 text-xs text-amber-600 dark:text-amber-300">
                            {school.scheduledChangeLabel}
                          </p>
                        ) : (
                          <p className="mt-2 text-xs text-zinc-500">Sin cambio programado</p>
                        )}
                      </td>
                      <td className="px-4 py-4 align-top">
                        <p className="text-sm font-semibold text-zinc-900 dark:text-white">
                          {formatCurrency(school.currentAmount)}
                        </p>
                        <p className="mt-1 text-xs text-zinc-500">
                          Próximo: {formatCurrency(school.nextAmount)}
                        </p>
                      </td>
                      <td className="px-4 py-4 align-top">
                        <p className="text-sm font-semibold text-zinc-900 dark:text-white">
                          {school.nextDateLabel}
                        </p>
                        {school.daysToDue != null ? (
                          <p className="mt-1 text-xs text-zinc-500">
                            {school.daysToDue >= 0
                              ? `${school.daysToDue} día(s)`
                              : `${Math.abs(school.daysToDue)} día(s) vencido`}
                          </p>
                        ) : null}
                      </td>
                      <td className="px-4 py-4 align-top">
                        <span
                          className={`inline-flex rounded-full px-2.5 py-1 text-[11px] font-semibold ${getAttemptStatusClasses(
                            school.latestPaymentStatus
                          )}`}
                        >
                          {getAttemptStatusLabel(school.latestPaymentStatus)}
                        </span>
                        <p className="mt-2 text-xs text-zinc-500">
                          {school.latestPaymentReference ?? "Sin referencia"}
                        </p>
                      </td>
                      <td className="px-4 py-4 align-top">
                        {school.flags.length > 0 ? (
                          <div className="flex flex-wrap gap-2">
                            {school.flags.slice(0, 3).map((flag) => (
                              <span
                                key={flag}
                                className="inline-flex rounded-full bg-amber-50 px-2.5 py-1 text-[11px] font-medium text-amber-700 dark:bg-amber-500/10 dark:text-amber-300"
                              >
                                {flag}
                              </span>
                            ))}
                          </div>
                        ) : (
                          <span className="text-xs text-zinc-400">Sin alertas</span>
                        )}
                      </td>
                      <td className="px-4 py-4 align-top">
                        <button
                          type="button"
                          onClick={() => void openDetail(school.id)}
                          className="inline-flex min-h-[40px] items-center gap-2 rounded-2xl bg-[#2563eb] px-4 py-2 text-sm font-semibold text-white"
                        >
                          Gestionar
                          <ArrowRight size={15} />
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <div className="divide-y divide-zinc-100 lg:hidden dark:divide-white/5">
              {filteredSchools.map((school) => (
                <div key={school.id} className="space-y-3 bg-white p-4 dark:bg-transparent">
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <p className="text-sm font-semibold text-zinc-900 dark:text-white">
                        {school.nombre}
                      </p>
                      <div className="mt-2 flex flex-wrap gap-2">
                        <span
                          className={`inline-flex rounded-full px-2.5 py-1 text-[11px] font-semibold ${getStatusClasses(
                            school.subscriptionStatus
                          )}`}
                        >
                          {school.subscriptionStatusLabel}
                        </span>
                        <span className="inline-flex rounded-full bg-zinc-100 px-2.5 py-1 text-[11px] font-semibold text-zinc-700 dark:bg-white/10 dark:text-zinc-200">
                          {school.commercialPlanLabel}
                        </span>
                      </div>
                    </div>
                    <button
                      type="button"
                      onClick={() => void openDetail(school.id)}
                      className="inline-flex min-h-[40px] items-center gap-2 rounded-2xl bg-[#2563eb] px-3 py-2 text-sm font-semibold text-white"
                    >
                      Abrir
                    </button>
                  </div>
                  <div className="grid grid-cols-2 gap-3 text-sm text-zinc-600 dark:text-zinc-300">
                    <div>
                      <p className="text-[11px] tracking-[0.14em] text-zinc-500 uppercase">
                        Monto actual
                      </p>
                      <p className="mt-1 font-semibold text-zinc-900 dark:text-white">
                        {formatCurrency(school.currentAmount)}
                      </p>
                    </div>
                    <div>
                      <p className="text-[11px] tracking-[0.14em] text-zinc-500 uppercase">
                        Próxima fecha
                      </p>
                      <p className="mt-1 font-semibold text-zinc-900 dark:text-white">
                        {school.nextDateLabel}
                      </p>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </section>
      </div>

      <DetailDrawer
        open={detailOpen}
        detail={detail}
        loading={detailLoading}
        onClose={() => {
          setDetailOpen(false);
          setSelectedSchoolId(null);
          setDetail(null);
        }}
        onRefresh={async () => {
          if (selectedSchoolId) {
            await loadDetail(selectedSchoolId);
          }
        }}
        onRunAction={runSchoolAction}
      />
    </PageScaffold>
  );
}
