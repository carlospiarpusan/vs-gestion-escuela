"use client";

import { useEffect, useMemo, useState } from "react";
import { useSearchParams } from "next/navigation";
import {
  AlertTriangle,
  ArrowRight,
  CalendarClock,
  CheckCircle2,
  CreditCard,
  ShieldAlert,
} from "lucide-react";
import { toast } from "sonner";
import PageScaffold from "@/components/dashboard/PageScaffold";
import { fetchJsonWithRetry } from "@/lib/retry";
import {
  getSchoolSubscriptionIntervalLabel,
  getSchoolSubscriptionPlanLabel,
  getSchoolSubscriptionStatusLabel,
  getSchoolSubscriptionStatusTone,
} from "@/lib/school-subscription";
import type {
  PlanEscuelaPago,
  SchoolPaidBillingInterval,
  SchoolSubscriptionAccess,
  SchoolSubscriptionPaymentAttempt,
} from "@/types/database";

type SchoolBillingPlanOption = {
  id: PlanEscuelaPago;
  nombre: string;
  descripcion: string | null;
  precio_mensual: number;
  precio_anual: number;
  max_alumnos_default: number;
  max_sedes_default: number;
  caracteristicas: string[];
};

type SchoolBillingCenterResponse = {
  school: {
    id: string;
    nombre: string;
    email: string | null;
    telefono: string | null;
  };
  access: SchoolSubscriptionAccess;
  plans: SchoolBillingPlanOption[];
  latestAttempts: SchoolSubscriptionPaymentAttempt[];
  notes: string[];
};

type CheckoutResponse = {
  checkoutUrl: string;
  fields?: Record<string, string>;
  reference: string;
  attemptId: string;
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

function buildStatusClasses(tone: ReturnType<typeof getSchoolSubscriptionStatusTone>) {
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

function submitCheckoutSession(session: CheckoutResponse) {
  if (!session.fields || Object.keys(session.fields).length === 0) {
    window.location.assign(session.checkoutUrl);
    return;
  }

  const form = document.createElement("form");
  form.method = "GET";
  form.action = session.checkoutUrl;
  form.style.display = "none";

  Object.entries(session.fields).forEach(([key, value]) => {
    const input = document.createElement("input");
    input.type = "hidden";
    input.name = key;
    input.value = value;
    form.appendChild(input);
  });

  document.body.appendChild(form);
  form.submit();
}

function getPaymentResultQuery(searchParams: URLSearchParams) {
  const paymentReference =
    searchParams.get("payment_reference") || searchParams.get("reference") || null;
  const transactionId = searchParams.get("transaction_id") || searchParams.get("id") || null;

  if (paymentReference) {
    return {
      source: "result" as const,
      query: `/api/suscripciones/resultado?payment_reference=${encodeURIComponent(paymentReference)}`,
    };
  }

  if (transactionId) {
    return {
      source: "result" as const,
      query: `/api/suscripciones/resultado?transaction_id=${encodeURIComponent(transactionId)}`,
    };
  }

  return {
    source: "default" as const,
    query: "/api/suscripciones/me",
  };
}

export default function SchoolBillingCenter() {
  const searchParams = useSearchParams();
  const [data, setData] = useState<SchoolBillingCenterResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");
  const [selectedPlan, setSelectedPlan] = useState<PlanEscuelaPago>("profesional");
  const [selectedInterval, setSelectedInterval] = useState<SchoolPaidBillingInterval>("monthly");

  const refresh = async (source: "default" | "result" = "default") => {
    setLoading(true);
    try {
      const { query } = getPaymentResultQuery(searchParams);
      const payload = await fetchJsonWithRetry<SchoolBillingCenterResponse>(query);
      setData(payload);
      setError("");

      if (source === "result") {
        toast.success("Revisamos el estado más reciente del pago.");
      }
    } catch (nextError) {
      console.error("Error al cargar facturación:", nextError);
      setError(
        nextError instanceof Error
          ? nextError.message
          : "No se pudo cargar el centro de facturación."
      );
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    const { source } = getPaymentResultQuery(searchParams);
    void refresh(source);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [searchParams.toString()]);

  useEffect(() => {
    if (!data) return;
    setSelectedPlan(data.access.scheduled_plan_id || data.access.plan_id);
    setSelectedInterval(
      data.access.scheduled_billing_interval ||
        (data.access.billing_interval === "annual" ? "annual" : "monthly")
    );
  }, [data]);

  const currentPlan = useMemo(
    () => data?.plans.find((plan) => plan.id === selectedPlan) ?? null,
    [data?.plans, selectedPlan]
  );

  const canActivate =
    data?.access.actual_status === "trialing" ||
    data?.access.actual_status === "read_only" ||
    data?.access.actual_status === "suspended";

  const sameCommercialSelection =
    data?.access.plan_id === selectedPlan &&
    (data?.access.billing_interval === "annual" ? "annual" : "monthly") === selectedInterval;

  const handleRenewOrActivate = async () => {
    setSubmitting(true);
    try {
      const checkout = await fetchJsonWithRetry<CheckoutResponse>("/api/suscripciones/checkout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          plan_id: selectedPlan,
          billing_interval: selectedInterval,
        }),
      });

      submitCheckoutSession(checkout);
    } catch (nextError) {
      const message =
        nextError instanceof Error ? nextError.message : "No se pudo iniciar el checkout.";
      toast.error(message);
      setSubmitting(false);
    }
  };

  const handleImmediateChange = async () => {
    setSubmitting(true);
    try {
      const response = await fetchJsonWithRetry<{
        success: boolean;
        mode: "checkout_required";
        checkout: CheckoutResponse;
      }>("/api/suscripciones/cambiar-plan", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          plan_id: selectedPlan,
          billing_interval: selectedInterval,
          timing: "immediate",
        }),
      });

      submitCheckoutSession(response.checkout);
    } catch (nextError) {
      const message =
        nextError instanceof Error ? nextError.message : "No se pudo iniciar el cambio inmediato.";
      toast.error(message);
      setSubmitting(false);
    }
  };

  const handleScheduleChange = async () => {
    setSubmitting(true);
    try {
      await fetchJsonWithRetry<{ success: boolean }>("/api/suscripciones/cambiar-plan", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          plan_id: selectedPlan,
          billing_interval: selectedInterval,
          timing: "next_cycle",
        }),
      });
      toast.success("El próximo ciclo quedó programado con la nueva selección.");
      await refresh();
    } catch (nextError) {
      const message =
        nextError instanceof Error ? nextError.message : "No se pudo programar el cambio.";
      toast.error(message);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <PageScaffold
      eyebrow="Facturación"
      title="Suscripción y pagos"
      description="Gestiona el estado comercial de tu escuela y abre el checkout de Wompi cuando toque renovar, activar o cambiar el plan."
    >
      <div className="space-y-6">
        {error ? (
          <div className="rounded-3xl border border-rose-200 bg-rose-50 px-5 py-4 text-sm text-rose-700 dark:border-rose-900/40 dark:bg-rose-950/20 dark:text-rose-300">
            {error}
          </div>
        ) : null}

        {loading || !data ? (
          <div className="grid gap-4 md:grid-cols-3">
            {[1, 2, 3].map((item) => (
              <div
                key={item}
                className="h-40 animate-pulse rounded-3xl bg-zinc-200/60 dark:bg-zinc-800/60"
              />
            ))}
          </div>
        ) : (
          <>
            <div className="grid gap-4 md:grid-cols-3">
              <article className="rounded-3xl border border-zinc-200 bg-white/85 p-6 dark:border-white/10 dark:bg-zinc-900/60">
                <div className="flex items-center justify-between">
                  <p className="text-xs font-semibold tracking-[0.16em] text-zinc-500 uppercase">
                    Estado actual
                  </p>
                  <ShieldAlert className="h-5 w-5 text-blue-500" />
                </div>
                <div className="mt-4 flex items-center gap-3">
                  <span
                    className={`inline-flex rounded-full px-3 py-1 text-xs font-semibold ${buildStatusClasses(
                      getSchoolSubscriptionStatusTone(data.access.status)
                    )}`}
                  >
                    {getSchoolSubscriptionStatusLabel(data.access.status)}
                  </span>
                  <span className="text-sm text-zinc-500">
                    {getSchoolSubscriptionIntervalLabel(data.access.billing_interval)}
                  </span>
                </div>
                <p className="mt-4 text-2xl font-black text-zinc-900 dark:text-white">
                  {getSchoolSubscriptionPlanLabel(data.access.plan_id)}
                </p>
                <p className="mt-2 text-sm text-zinc-500">
                  Escuela:{" "}
                  <span className="font-medium text-zinc-700 dark:text-zinc-200">
                    {data.school.nombre}
                  </span>
                </p>
              </article>

              <article className="rounded-3xl border border-zinc-200 bg-white/85 p-6 dark:border-white/10 dark:bg-zinc-900/60">
                <div className="flex items-center justify-between">
                  <p className="text-xs font-semibold tracking-[0.16em] text-zinc-500 uppercase">
                    Próxima fecha clave
                  </p>
                  <CalendarClock className="h-5 w-5 text-emerald-500" />
                </div>
                <p className="mt-4 text-2xl font-black text-zinc-900 dark:text-white">
                  {formatDate(
                    data.access.trial_ends_at ||
                      data.access.grace_ends_at ||
                      data.access.current_period_end
                  )}
                </p>
                <p className="mt-2 text-sm text-zinc-500">
                  {data.access.trial_ends_at
                    ? "Fin de prueba"
                    : data.access.grace_ends_at
                      ? "Fin de gracia"
                      : "Fin del ciclo actual"}
                </p>
              </article>

              <article className="rounded-3xl border border-zinc-200 bg-white/85 p-6 dark:border-white/10 dark:bg-zinc-900/60">
                <div className="flex items-center justify-between">
                  <p className="text-xs font-semibold tracking-[0.16em] text-zinc-500 uppercase">
                    Escritura operativa
                  </p>
                  {data.access.can_write ? (
                    <CheckCircle2 className="h-5 w-5 text-emerald-500" />
                  ) : (
                    <AlertTriangle className="h-5 w-5 text-amber-500" />
                  )}
                </div>
                <p className="mt-4 text-2xl font-black text-zinc-900 dark:text-white">
                  {data.access.can_write ? "Habilitada" : "Bloqueada"}
                </p>
                <p className="mt-2 text-sm text-zinc-500">
                  {data.access.can_write
                    ? "La escuela puede seguir creando y editando registros."
                    : "La escuela puede entrar y consultar, pero no mutar información."}
                </p>
              </article>
            </div>

            <div className="grid gap-6 xl:grid-cols-[1.2fr_0.8fr]">
              <section className="rounded-3xl border border-zinc-200 bg-white/85 p-6 dark:border-white/10 dark:bg-zinc-900/60">
                <div className="flex items-start justify-between gap-4">
                  <div>
                    <p className="text-xs font-semibold tracking-[0.16em] text-zinc-500 uppercase">
                      Cambiar o renovar
                    </p>
                    <h2 className="mt-2 text-2xl font-bold text-zinc-900 dark:text-white">
                      Elige el siguiente ciclo
                    </h2>
                    <p className="mt-2 text-sm text-zinc-500">
                      El cobro se procesa con Wompi y la activación real ocurre cuando el pago queda
                      aprobado.
                    </p>
                  </div>
                  <CreditCard className="h-6 w-6 text-blue-500" />
                </div>

                <div className="mt-6 grid gap-4 md:grid-cols-3">
                  {data.plans.map((plan) => {
                    const selected = plan.id === selectedPlan;
                    return (
                      <button
                        key={plan.id}
                        type="button"
                        onClick={() => setSelectedPlan(plan.id)}
                        className={`rounded-3xl border px-5 py-5 text-left transition-all ${
                          selected
                            ? "border-blue-500 bg-blue-50 shadow-sm dark:border-blue-400 dark:bg-blue-500/10"
                            : "border-zinc-200 bg-white hover:border-zinc-300 dark:border-white/10 dark:bg-zinc-950/20"
                        }`}
                      >
                        <p className="text-sm font-bold text-zinc-900 dark:text-white">
                          {plan.nombre}
                        </p>
                        <p className="mt-2 text-sm text-zinc-500">{plan.descripcion}</p>
                        <div className="mt-4 space-y-1">
                          <p className="text-lg font-black text-zinc-900 dark:text-white">
                            {formatCurrency(plan.precio_mensual)}
                            <span className="ml-1 text-xs font-medium text-zinc-500">/ mes</span>
                          </p>
                          <p className="text-sm font-semibold text-zinc-700 dark:text-zinc-200">
                            {formatCurrency(plan.precio_anual)} / año
                          </p>
                        </div>
                      </button>
                    );
                  })}
                </div>

                <div className="mt-5 flex flex-wrap gap-3">
                  {(["monthly", "annual"] as const).map((interval) => {
                    const active = interval === selectedInterval;
                    return (
                      <button
                        key={interval}
                        type="button"
                        onClick={() => setSelectedInterval(interval)}
                        className={`rounded-full px-4 py-2 text-sm font-semibold transition-colors ${
                          active
                            ? "bg-blue-600 text-white"
                            : "bg-zinc-100 text-zinc-700 hover:bg-zinc-200 dark:bg-zinc-800 dark:text-zinc-200"
                        }`}
                      >
                        {getSchoolSubscriptionIntervalLabel(interval)}
                      </button>
                    );
                  })}
                </div>

                {currentPlan ? (
                  <div className="mt-5 rounded-3xl border border-zinc-200 bg-zinc-50/80 p-5 dark:border-white/10 dark:bg-zinc-950/30">
                    <p className="text-sm font-semibold text-zinc-900 dark:text-white">
                      Selección actual: {currentPlan.nombre}{" "}
                      {getSchoolSubscriptionIntervalLabel(selectedInterval).toLowerCase()}
                    </p>
                    <p className="mt-1 text-sm text-zinc-500">
                      {selectedInterval === "annual"
                        ? formatCurrency(currentPlan.precio_anual)
                        : formatCurrency(currentPlan.precio_mensual)}
                    </p>
                    <div className="mt-4 flex flex-wrap gap-2">
                      {currentPlan.caracteristicas.slice(0, 4).map((feature) => (
                        <span
                          key={feature}
                          className="inline-flex rounded-full bg-white px-3 py-1 text-xs font-medium text-zinc-600 dark:bg-white/5 dark:text-zinc-300"
                        >
                          {feature}
                        </span>
                      ))}
                    </div>
                  </div>
                ) : null}

                <div className="mt-6 flex flex-wrap gap-3">
                  <button
                    type="button"
                    onClick={() => void handleRenewOrActivate()}
                    disabled={submitting}
                    className="inline-flex min-h-[48px] items-center gap-2 rounded-2xl bg-[#2563eb] px-5 py-3 text-sm font-semibold text-white transition-colors hover:bg-[#1d4ed8] disabled:cursor-not-allowed disabled:opacity-60"
                  >
                    {canActivate ? "Activar con Wompi" : "Renovar con Wompi"}
                    <ArrowRight className="h-4 w-4" />
                  </button>

                  {!canActivate && !sameCommercialSelection ? (
                    <>
                      <button
                        type="button"
                        onClick={() => void handleImmediateChange()}
                        disabled={submitting}
                        className="inline-flex min-h-[48px] items-center gap-2 rounded-2xl border border-zinc-300 px-5 py-3 text-sm font-semibold text-zinc-800 transition-colors hover:bg-zinc-50 disabled:cursor-not-allowed disabled:opacity-60 dark:border-white/10 dark:text-zinc-100 dark:hover:bg-white/5"
                      >
                        Cambiar hoy y pagar
                      </button>
                      <button
                        type="button"
                        onClick={() => void handleScheduleChange()}
                        disabled={submitting}
                        className="inline-flex min-h-[48px] items-center gap-2 rounded-2xl border border-zinc-300 px-5 py-3 text-sm font-semibold text-zinc-800 transition-colors hover:bg-zinc-50 disabled:cursor-not-allowed disabled:opacity-60 dark:border-white/10 dark:text-zinc-100 dark:hover:bg-white/5"
                      >
                        Programar para el siguiente ciclo
                      </button>
                    </>
                  ) : null}
                </div>
              </section>

              <section className="space-y-5">
                <div className="rounded-3xl border border-zinc-200 bg-white/85 p-6 dark:border-white/10 dark:bg-zinc-900/60">
                  <p className="text-xs font-semibold tracking-[0.16em] text-zinc-500 uppercase">
                    Notas internas
                  </p>
                  <div className="mt-4 space-y-3">
                    {data.notes.length > 0 ? (
                      data.notes.map((note) => (
                        <div
                          key={note}
                          className="rounded-2xl bg-zinc-50 px-4 py-3 text-sm text-zinc-600 dark:bg-white/5 dark:text-zinc-300"
                        >
                          {note}
                        </div>
                      ))
                    ) : (
                      <div className="rounded-2xl bg-zinc-50 px-4 py-3 text-sm text-zinc-600 dark:bg-white/5 dark:text-zinc-300">
                        Tu escuela no tiene alertas comerciales abiertas en este momento.
                      </div>
                    )}
                  </div>
                </div>

                <div className="rounded-3xl border border-zinc-200 bg-white/85 p-6 dark:border-white/10 dark:bg-zinc-900/60">
                  <p className="text-xs font-semibold tracking-[0.16em] text-zinc-500 uppercase">
                    Últimos intentos
                  </p>
                  <div className="mt-4 space-y-3">
                    {data.latestAttempts.length > 0 ? (
                      data.latestAttempts.map((attempt) => (
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
                              className={`inline-flex rounded-full px-2.5 py-1 text-[11px] font-semibold ${buildStatusClasses(
                                getSchoolSubscriptionStatusTone(
                                  attempt.status === "approved"
                                    ? "active"
                                    : attempt.status === "pending"
                                      ? "pending_payment"
                                      : "suspended"
                                )
                              )}`}
                            >
                              {attempt.status.toUpperCase()}
                            </span>
                          </div>
                          <p className="mt-1 text-xs text-zinc-500">{attempt.reference}</p>
                          <p className="mt-2 text-sm text-zinc-600 dark:text-zinc-300">
                            {formatCurrency(attempt.amount_in_cents / 100)} ·{" "}
                            {formatDate(attempt.created_at)}
                          </p>
                        </div>
                      ))
                    ) : (
                      <p className="text-sm text-zinc-500">
                        Aún no hay intentos de cobro registrados para esta escuela.
                      </p>
                    )}
                  </div>
                </div>
              </section>
            </div>
          </>
        )}
      </div>
    </PageScaffold>
  );
}
