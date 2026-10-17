import type { Pool, PoolClient } from "pg";
import {
  requestHubCheckout,
  requestHubStatus,
  type BillingHubOperation,
  type HubStatusResponse,
  type PaymentConfirmationPayload,
} from "@/lib/billing/hub";
import { COMMERCIAL_SCHOOL_PLAN_ORDER, isCommercialSchoolPlan } from "@/lib/school-plans";
import { getSiteUrl } from "@/lib/site-metadata";
import { getNextCycleDuration } from "@/lib/school-subscription";
import {
  fetchWompiTransaction,
  type WompiEventBody,
  type WompiTransaction,
  validateWompiEventChecksum,
  getWompiConfig,
} from "@/lib/wompi";
import type {
  PlanConfig,
  PlanEscuelaPago,
  SchoolPaidBillingInterval,
  SchoolSubscriptionAccess,
  SchoolSubscriptionPaymentAttempt,
  SchoolSubscriptionStatus,
} from "@/types/database";

type Queryable = Pick<Pool, "query"> | Pick<PoolClient, "query">;

type SchoolAccessRow = {
  school_id: string;
  cycle_id: string | null;
  plan_id: PlanEscuelaPago;
  billing_interval: "trial" | "monthly" | "annual";
  status: SchoolSubscriptionStatus;
  actual_status: Exclude<SchoolSubscriptionStatus, "pending_payment">;
  can_write: boolean;
  current_period_start: string | null;
  current_period_end: string | null;
  trial_ends_at: string | null;
  grace_ends_at: string | null;
  scheduled_plan_id: PlanEscuelaPago | null;
  scheduled_billing_interval: SchoolPaidBillingInterval | null;
  scheduled_effective_at: string | null;
  requires_review: boolean;
  pending_payment_reference: string | null;
  pending_payment_created_at: string | null;
};

type PaymentAttemptRow = {
  id: string;
  school_id: string;
  subscription_cycle_id: string | null;
  operation_type: "activation" | "renewal" | "change_immediate";
  target_plan_id: PlanEscuelaPago;
  target_billing_interval: SchoolPaidBillingInterval;
  amount_in_cents: number | string;
  currency: "COP";
  reference: string;
  status: SchoolSubscriptionPaymentAttempt["status"];
  redirect_url: string | null;
  expires_at: string | null;
  initiated_by: string | null;
  customer_email: string | null;
  customer_name: string | null;
  customer_phone: string | null;
  customer_legal_id: string | null;
  wompi_transaction_id: string | null;
  wompi_status: string | null;
  wompi_payload: Record<string, unknown> | string | null;
  failure_reason: string | null;
  processed_at: string | null;
  created_at: string;
  updated_at: string;
};

type SchoolProfileRow = {
  school_id: string;
  school_name: string;
  school_email: string | null;
  school_phone: string | null;
  profile_name: string | null;
  profile_email: string | null;
  profile_phone: string | null;
  profile_cedula: string | null;
};

type SchoolSummaryRow = {
  id: string;
  nombre: string;
  email: string | null;
  telefono: string | null;
  plan: string;
  estado: string;
  max_alumnos: number | string;
  max_sedes: number | string;
  current_period_end: string | null;
  trial_ends_at: string | null;
  grace_ends_at: string | null;
  billing_interval: "trial" | "monthly" | "annual";
  status: SchoolSubscriptionStatus;
  actual_status: Exclude<SchoolSubscriptionStatus, "pending_payment">;
  can_write: boolean;
  requires_review: boolean;
  scheduled_plan_id: PlanEscuelaPago | null;
  scheduled_billing_interval: SchoolPaidBillingInterval | null;
  pending_payment_reference: string | null;
};

export type SchoolBillingPlanOption = {
  id: PlanEscuelaPago;
  nombre: string;
  descripcion: string | null;
  precio_mensual: number;
  precio_anual: number;
  max_alumnos_default: number;
  max_sedes_default: number;
  caracteristicas: string[];
};

export type SchoolBillingCenterResponse = {
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

export type SchoolCheckoutSession = {
  checkoutUrl: string;
  fields?: Record<string, string>;
  reference: string;
  attemptId: string;
  status?: string;
  message?: string;
  scheduled?: boolean;
};

type SchoolCycleDetailRow = {
  id: string;
  plan_id: PlanEscuelaPago;
  billing_interval: "trial" | "monthly" | "annual";
  status: Exclude<SchoolSubscriptionStatus, "pending_payment">;
  started_at: string;
  current_period_start: string;
  current_period_end: string;
  trial_ends_at: string | null;
  grace_ends_at: string | null;
  scheduled_plan_id: PlanEscuelaPago | null;
  scheduled_billing_interval: SchoolPaidBillingInterval | null;
  scheduled_effective_at: string | null;
  requires_review: boolean;
  metadata: Record<string, unknown> | string | null;
  created_at: string;
  updated_at: string;
};

type SchoolEventRow = {
  id: string;
  school_id: string;
  subscription_cycle_id: string | null;
  payment_attempt_id: string | null;
  event_type: string;
  summary: string;
  payload: Record<string, unknown> | string | null;
  created_by: string | null;
  created_by_name: string | null;
  created_at: string;
};

export type SchoolSubscriptionCycleDetail = {
  id: string;
  plan_id: PlanEscuelaPago;
  billing_interval: "trial" | "monthly" | "annual";
  status: Exclude<SchoolSubscriptionStatus, "pending_payment">;
  started_at: string;
  current_period_start: string;
  current_period_end: string;
  trial_ends_at: string | null;
  grace_ends_at: string | null;
  scheduled_plan_id: PlanEscuelaPago | null;
  scheduled_billing_interval: SchoolPaidBillingInterval | null;
  scheduled_effective_at: string | null;
  requires_review: boolean;
  metadata: Record<string, unknown>;
  created_at: string;
  updated_at: string;
};

export type SchoolSubscriptionEventItem = {
  id: string;
  school_id: string;
  subscription_cycle_id: string | null;
  payment_attempt_id: string | null;
  event_type: string;
  summary: string;
  payload: Record<string, unknown>;
  created_by: string | null;
  created_by_name: string | null;
  created_at: string;
};

export type SchoolSubscriptionAdminDetailResponse = {
  school: {
    id: string;
    nombre: string;
    email: string | null;
    telefono: string | null;
    estado: string;
    plan: string;
    max_alumnos: number;
    max_sedes: number;
  };
  access: SchoolSubscriptionAccess;
  cycle: SchoolSubscriptionCycleDetail | null;
  plans: SchoolBillingPlanOption[];
  latestAttempts: SchoolSubscriptionPaymentAttempt[];
  events: SchoolSubscriptionEventItem[];
  currentAmount: number;
  nextAmount: number;
  nextDateAt: string | null;
  actions: {
    canExtendTrial: boolean;
    canExtendGrace: boolean;
    canCancelScheduledChange: boolean;
    canStartCheckout: boolean;
    canGrantManualCycle: boolean;
    canSetReadOnly: boolean;
    canSuspendNow: boolean;
  };
};

export type SchoolSubscriptionAdminActionInput =
  | {
      action: "start_checkout";
      schoolId: string;
      initiatedBy: string;
      planId: PlanEscuelaPago;
      billingInterval: SchoolPaidBillingInterval;
      mode?: "renewal" | "activation" | "change_immediate";
    }
  | {
      action: "grant_manual_cycle";
      schoolId: string;
      initiatedBy: string;
      planId: PlanEscuelaPago;
      billingInterval: SchoolPaidBillingInterval;
      startsAt?: string | null;
      reason: string;
    }
  | {
      action: "extend_trial";
      schoolId: string;
      initiatedBy: string;
      days: number;
      reason: string;
    }
  | {
      action: "extend_grace";
      schoolId: string;
      initiatedBy: string;
      days: number;
      reason: string;
    }
  | {
      action: "schedule_change";
      schoolId: string;
      initiatedBy: string;
      planId: PlanEscuelaPago;
      billingInterval: SchoolPaidBillingInterval;
      reason: string;
    }
  | {
      action: "cancel_scheduled_change";
      schoolId: string;
      initiatedBy: string;
      reason?: string;
    }
  | {
      action: "set_read_only";
      schoolId: string;
      initiatedBy: string;
      reason: string;
    }
  | {
      action: "suspend_now";
      schoolId: string;
      initiatedBy: string;
      reason: string;
    }
  | {
      action: "toggle_requires_review";
      schoolId: string;
      initiatedBy: string;
      value: boolean;
      reason?: string;
    };

export type SchoolSubscriptionAdminActionResult = {
  success: true;
  action: SchoolSubscriptionAdminActionInput["action"];
  message: string;
  checkout?: SchoolCheckoutSession;
};

function toNumber(value: number | string | null | undefined) {
  return typeof value === "number" ? value : Number(value ?? 0);
}

function parseJsonArray(value: unknown) {
  if (Array.isArray(value)) {
    return value.map(String);
  }
  if (typeof value === "string") {
    try {
      const parsed = JSON.parse(value);
      return Array.isArray(parsed) ? parsed.map(String) : [];
    } catch {
      return [];
    }
  }
  return [];
}

function parseJsonObject(value: unknown) {
  if (value && typeof value === "object" && !Array.isArray(value)) {
    return value as Record<string, unknown>;
  }
  if (typeof value === "string") {
    try {
      const parsed = JSON.parse(value);
      return parsed && typeof parsed === "object" && !Array.isArray(parsed)
        ? (parsed as Record<string, unknown>)
        : {};
    } catch {
      return {};
    }
  }
  return {};
}

function normalizeAccessRow(row: SchoolAccessRow): SchoolSubscriptionAccess {
  return {
    school_id: row.school_id,
    cycle_id: row.cycle_id,
    plan_id: row.plan_id,
    billing_interval: row.billing_interval,
    status: row.status,
    actual_status: row.actual_status,
    can_write: Boolean(row.can_write),
    current_period_start: row.current_period_start,
    current_period_end: row.current_period_end,
    trial_ends_at: row.trial_ends_at,
    grace_ends_at: row.grace_ends_at,
    scheduled_plan_id: row.scheduled_plan_id,
    scheduled_billing_interval: row.scheduled_billing_interval,
    scheduled_effective_at: row.scheduled_effective_at,
    requires_review: Boolean(row.requires_review),
    pending_payment_reference: row.pending_payment_reference,
    pending_payment_created_at: row.pending_payment_created_at,
  };
}

function normalizeAttemptRow(row: PaymentAttemptRow): SchoolSubscriptionPaymentAttempt {
  return {
    ...row,
    amount_in_cents: toNumber(row.amount_in_cents),
    wompi_payload:
      typeof row.wompi_payload === "string"
        ? ((JSON.parse(row.wompi_payload) as Record<string, unknown>) ?? {})
        : (row.wompi_payload ?? {}),
  };
}

function normalizeCycleRow(row: SchoolCycleDetailRow): SchoolSubscriptionCycleDetail {
  return {
    ...row,
    requires_review: Boolean(row.requires_review),
    metadata: parseJsonObject(row.metadata),
  };
}

function normalizeEventRow(row: SchoolEventRow): SchoolSubscriptionEventItem {
  return {
    ...row,
    payload: parseJsonObject(row.payload),
  };
}

async function fetchPlanConfigMap(db: Queryable) {
  const result = await db.query<PlanConfig>(
    `
      select
        id,
        nombre,
        descripcion,
        precio_mensual,
        precio_anual,
        max_alumnos_default,
        max_sedes_default,
        caracteristicas,
        activo,
        updated_by,
        updated_at::text,
        created_at::text
      from public.planes_config
      where id in ('basico', 'profesional', 'enterprise')
      order by
        case id
          when 'basico' then 1
          when 'profesional' then 2
          when 'enterprise' then 3
          else 99
        end
    `
  );

  return result.rows.reduce<Record<PlanEscuelaPago, SchoolBillingPlanOption>>(
    (acc, row) => {
      if (!isCommercialSchoolPlan(row.id)) return acc;
      acc[row.id] = {
        id: row.id,
        nombre: row.nombre,
        descripcion: row.descripcion,
        precio_mensual: toNumber(row.precio_mensual),
        precio_anual: toNumber(row.precio_anual),
        max_alumnos_default: toNumber(row.max_alumnos_default),
        max_sedes_default: toNumber(row.max_sedes_default),
        caracteristicas: parseJsonArray(row.caracteristicas),
      };
      return acc;
    },
    {} as Record<PlanEscuelaPago, SchoolBillingPlanOption>
  );
}

export async function resolveSchoolPlanCheckoutPricing(
  db: Queryable,
  planId: PlanEscuelaPago,
  billingInterval: SchoolPaidBillingInterval
) {
  const planMap = await fetchPlanConfigMap(db);
  const plan = planMap[planId];

  if (!plan) {
    throw new Error("No se encontró la configuración del plan.");
  }

  return {
    amountInCents: getAmountInCents(planMap, planId, billingInterval),
    currency: "COP" as const,
    planName: plan.nombre,
  };
}

export async function loadCommercialSchoolPlans(db: Queryable) {
  const planMap = await fetchPlanConfigMap(db);
  return COMMERCIAL_SCHOOL_PLAN_ORDER.map((planId) => planMap[planId]).filter(Boolean);
}

export async function loadCommercialPlanConfigs(db: Queryable) {
  const result = await db.query<PlanConfig>(
    `
      select
        id,
        nombre,
        descripcion,
        precio_mensual,
        precio_anual,
        max_alumnos_default,
        max_sedes_default,
        caracteristicas,
        activo,
        updated_by,
        updated_at::text,
        created_at::text
      from public.planes_config
      where id in ('basico', 'profesional', 'enterprise')
      order by
        case id
          when 'basico' then 1
          when 'profesional' then 2
          when 'enterprise' then 3
          else 99
        end
    `
  );

  return result.rows.map((row) => ({
    ...row,
    precio_mensual: toNumber(row.precio_mensual),
    precio_anual: toNumber(row.precio_anual),
    max_alumnos_default: toNumber(row.max_alumnos_default),
    max_sedes_default: toNumber(row.max_sedes_default),
    caracteristicas: parseJsonArray(row.caracteristicas),
  }));
}

export async function loadSchoolSubscriptionAccess(db: Queryable, schoolId: string) {
  const result = await db.query<SchoolAccessRow>(
    "select * from public.school_subscription_access($1)",
    [schoolId]
  );

  const row = result.rows[0];
  return row ? normalizeAccessRow(row) : null;
}

export async function loadSchoolBillingCenter(db: Queryable, schoolId: string) {
  const [access, planMap, schoolRes, attemptsRes] = await Promise.all([
    loadSchoolSubscriptionAccess(db, schoolId),
    fetchPlanConfigMap(db),
    db.query<SchoolSummaryRow>(
      `
        select
          e.id,
          e.nombre,
          e.email,
          e.telefono,
          e.plan,
          e.estado,
          e.max_alumnos,
          e.max_sedes,
          access.current_period_end::text,
          access.trial_ends_at::text,
          access.grace_ends_at::text,
          access.billing_interval,
          access.status,
          access.actual_status,
          access.can_write,
          access.requires_review,
          access.scheduled_plan_id,
          access.scheduled_billing_interval,
          access.pending_payment_reference
        from public.escuelas e
        left join lateral public.school_subscription_access(e.id) access on true
        where e.id = $1
        limit 1
      `,
      [schoolId]
    ),
    db.query<PaymentAttemptRow>(
      `
        select *
        from public.school_payment_attempts
        where school_id = $1
        order by created_at desc
        limit 6
      `,
      [schoolId]
    ),
  ]);

  if (!access || !schoolRes.rows[0]) {
    throw new Error("No se encontró el estado comercial de la escuela.");
  }

  const school = schoolRes.rows[0];
  const notes: string[] = [];

  if (access.status === "trialing" && access.trial_ends_at) {
    notes.push("La prueba usa las capacidades del plan Profesional durante 3 meses.");
  }
  if (access.status === "grace" && access.grace_ends_at) {
    notes.push("La escuela sigue operando mientras dura el periodo de gracia de 7 días.");
  }
  if (access.status === "read_only") {
    notes.push("La escuela puede consultar información, pero no crear ni editar registros.");
  }
  if (access.status === "suspended") {
    notes.push("La operación queda bloqueada hasta que se valide un nuevo pago.");
  }
  if (access.requires_review) {
    notes.push("Este registro viene de la migración y conviene revisarlo manualmente.");
  }

  return {
    school: {
      id: school.id,
      nombre: school.nombre,
      email: school.email,
      telefono: school.telefono,
    },
    access,
    plans: COMMERCIAL_SCHOOL_PLAN_ORDER.map((planId) => planMap[planId]).filter(Boolean),
    latestAttempts: attemptsRes.rows.map(normalizeAttemptRow),
    notes,
  } satisfies SchoolBillingCenterResponse;
}

function getAmountInCents(
  planMap: Record<PlanEscuelaPago, SchoolBillingPlanOption>,
  planId: PlanEscuelaPago,
  billingInterval: SchoolPaidBillingInterval
) {
  const plan = planMap[planId];
  if (!plan) {
    throw new Error("No se encontró la configuración del plan.");
  }

  const amount = billingInterval === "annual" ? plan.precio_anual : plan.precio_mensual;
  const amountInCents = Math.round(Number(amount) * 100);
  const intervalLabel = billingInterval === "annual" ? "anual" : "mensual";

  if (!Number.isFinite(amountInCents) || amountInCents < 0) {
    throw new Error("El precio del plan es inválido.");
  }

  if (amountInCents <= 0) {
    throw new Error(`El plan ${plan.nombre} no tiene un precio ${intervalLabel} configurado.`);
  }

  return amountInCents;
}

async function lockCurrentCycle(client: PoolClient, schoolId: string) {
  const result = await client.query<SchoolCycleDetailRow>(
    `
      select
        id,
        plan_id,
        billing_interval,
        status,
        started_at::text,
        current_period_start::text,
        current_period_end::text,
        trial_ends_at::text,
        grace_ends_at::text,
        scheduled_plan_id,
        scheduled_billing_interval,
        scheduled_effective_at::text,
        requires_review,
        metadata,
        created_at::text,
        updated_at::text
      from public.school_subscription_cycles
      where school_id = $1
        and is_current = true
      for update
    `,
    [schoolId]
  );

  return result.rows[0] ? normalizeCycleRow(result.rows[0]) : null;
}

async function applyPlanDefaultsToSchool(
  client: PoolClient,
  schoolId: string,
  planId: PlanEscuelaPago,
  planMap: Record<PlanEscuelaPago, SchoolBillingPlanOption>
) {
  const plan = planMap[planId];
  if (!plan) {
    throw new Error("No se encontró el plan a aplicar.");
  }

  await client.query(
    `
      update public.escuelas
      set
        plan = $2,
        max_alumnos = $3,
        max_sedes = $4,
        estado = case when estado = 'suspendida' then 'activa' else estado end
      where id = $1
    `,
    [schoolId, planId, plan.max_alumnos_default, plan.max_sedes_default]
  );
}

function buildRedirectUrl() {
  const baseUrl = getSiteUrl();
  const redirect = new URL("/billing/estado", baseUrl);
  redirect.searchParams.set("checkout", "clovent");
  return redirect.toString();
}

function mapLocalAttemptOperationToHub(
  operationType: SchoolSubscriptionPaymentAttempt["operation_type"]
): BillingHubOperation {
  switch (operationType) {
    case "activation":
      return "new_subscription";
    case "renewal":
      return "renewal";
    default:
      return "upgrade";
  }
}

export async function createSchoolCheckoutSession(
  db: Pick<Pool, "connect" | "query">,
  input: {
    schoolId: string;
    initiatedBy: string;
    targetPlanId: PlanEscuelaPago;
    targetBillingInterval: SchoolPaidBillingInterval;
    mode: "renewal" | "activation" | "change_immediate";
  }
) {
  const [planMap, access, profileRes] = await Promise.all([
    fetchPlanConfigMap(db),
    loadSchoolSubscriptionAccess(db, input.schoolId),
    db.query<SchoolProfileRow>(
      `
        select
          e.id as school_id,
          e.nombre as school_name,
          e.email as school_email,
          e.telefono as school_phone,
          p.nombre as profile_name,
          p.email as profile_email,
          p.telefono as profile_phone,
          p.cedula as profile_cedula
        from public.escuelas e
        left join public.perfiles p on p.id = $2
        where e.id = $1
        limit 1
      `,
      [input.schoolId, input.initiatedBy]
    ),
  ]);

  if (!access || !profileRes.rows[0]) {
    throw new Error("No se pudo preparar la sesión de cobro.");
  }

  const payer = profileRes.rows[0];
  const selectedPlan = planMap[input.targetPlanId];
  if (!selectedPlan) {
    throw new Error("No se encontró la configuración del plan.");
  }
  const amountInCents = getAmountInCents(planMap, input.targetPlanId, input.targetBillingInterval);
  const hubOperation = mapLocalAttemptOperationToHub(input.mode);
  const checkout = await requestHubCheckout({
    empresa_id: input.schoolId,
    target_plan_code: input.targetPlanId,
    billing_interval: input.targetBillingInterval,
    operation_type: hubOperation,
    amount_in_cents: amountInCents,
    currency: "COP",
    plan_name: selectedPlan.nombre,
    redirect_url: buildRedirectUrl(),
    metadata: {
      school_id: input.schoolId,
      initiated_by: input.initiatedBy,
      target_plan_id: input.targetPlanId,
      billing_interval: input.targetBillingInterval,
    },
  });

  if (!checkout.checkoutUrl) {
    throw new Error(checkout.message || "ClovEnt no devolvió una URL de checkout.");
  }

  const attemptRes = await db.query<{ id: string }>(
    `
      insert into public.school_payment_attempts (
        school_id,
        subscription_cycle_id,
        operation_type,
        target_plan_id,
        target_billing_interval,
        amount_in_cents,
        currency,
        reference,
        status,
        redirect_url,
        expires_at,
        initiated_by,
        customer_email,
        customer_name,
        customer_phone,
        customer_legal_id
      )
      values (
        $1,
        $2,
        $3,
        $4,
        $5,
        $6,
        'COP',
        $7,
        'pending',
        $8,
        null,
        $9,
        $10,
        $11,
        $12,
        $13
      )
      returning id
    `,
    [
      input.schoolId,
      access.cycle_id,
      input.mode,
      input.targetPlanId,
      input.targetBillingInterval,
      amountInCents,
      checkout.reference,
      buildRedirectUrl(),
      input.initiatedBy,
      payer.profile_email || payer.school_email,
      payer.profile_name || payer.school_name,
      payer.profile_phone || payer.school_phone,
      payer.profile_cedula,
    ]
  );

  return {
    checkoutUrl: checkout.checkoutUrl,
    reference: checkout.reference,
    attemptId: attemptRes.rows[0]?.id ?? checkout.reference,
    status: checkout.status,
    message: checkout.message,
    scheduled: checkout.scheduled,
  } satisfies SchoolCheckoutSession;
}

export async function scheduleSchoolPlanChange(
  db: Queryable,
  input: {
    schoolId: string;
    planId: PlanEscuelaPago;
    billingInterval: SchoolPaidBillingInterval;
  }
) {
  const access = await loadSchoolSubscriptionAccess(db, input.schoolId);

  if (!access?.cycle_id) {
    throw new Error("No existe un ciclo actual para programar el cambio.");
  }

  await db.query(
    `
      update public.school_subscription_cycles
      set
        scheduled_plan_id = $2,
        scheduled_billing_interval = $3,
        scheduled_effective_at = current_period_end
      where id = $1
    `,
    [access.cycle_id, input.planId, input.billingInterval]
  );

  await db.query(
    `
      insert into public.school_subscription_events (
        school_id,
        subscription_cycle_id,
        event_type,
        summary,
        payload
      )
      values (
        $1,
        $2,
        'plan_change_scheduled',
        'La escuela programó un cambio de plan para el siguiente ciclo.',
        jsonb_build_object('plan_id', $3::text, 'billing_interval', $4::text)
      )
    `,
    [input.schoolId, access.cycle_id, input.planId, input.billingInterval]
  );
}

async function finalizeAttempt(
  client: PoolClient,
  input: {
    attempt: SchoolSubscriptionPaymentAttempt;
    transaction: WompiTransaction;
  }
) {
  const planMap = await fetchPlanConfigMap(client);
  const currentCycle = await lockCurrentCycle(client, input.attempt.school_id);
  const paidAt =
    input.transaction.finalized_at || input.transaction.created_at || new Date().toISOString();

  await client.query(
    `
      update public.school_payment_attempts
      set
        status = 'approved',
        wompi_transaction_id = $2,
        wompi_status = $3,
        wompi_payload = $4::jsonb,
        processed_at = now(),
        failure_reason = null
      where id = $1
    `,
    [
      input.attempt.id,
      input.transaction.id,
      String(input.transaction.status ?? "APPROVED"),
      JSON.stringify(input.transaction),
    ]
  );

  if (currentCycle) {
    await client.query(
      `
        update public.school_subscription_cycles
        set is_current = false
        where id = $1
      `,
      [currentCycle.id]
    );
  }

  let nextPeriodStart = paidAt;

  if (
    input.attempt.operation_type === "renewal" &&
    currentCycle &&
    (currentCycle.status === "active" || currentCycle.status === "grace") &&
    currentCycle.current_period_end
  ) {
    nextPeriodStart = currentCycle.current_period_end;
  }

  const nextPeriodInterval = getNextCycleDuration(input.attempt.target_billing_interval);
  const cycleRes = await client.query<{ id: string }>(
    `
      insert into public.school_subscription_cycles (
        school_id,
        plan_id,
        billing_interval,
        status,
        started_at,
        current_period_start,
        current_period_end,
        is_current,
        requires_review,
        metadata,
        created_by
      )
      values (
        $1,
        $2,
        $3,
        'active',
        $4::timestamptz,
        $5::timestamptz,
        $5::timestamptz + interval '${nextPeriodInterval}',
        true,
        false,
        jsonb_build_object('source', 'wompi', 'transaction_id', $6::text, 'attempt_id', $7::text),
        $8
      )
      returning id
    `,
    [
      input.attempt.school_id,
      input.attempt.target_plan_id,
      input.attempt.target_billing_interval,
      paidAt,
      nextPeriodStart,
      input.transaction.id,
      input.attempt.id,
      input.attempt.initiated_by,
    ]
  );

  await client.query(
    `
      update public.school_payment_attempts
      set subscription_cycle_id = $2
      where id = $1
    `,
    [input.attempt.id, cycleRes.rows[0]?.id ?? null]
  );

  await applyPlanDefaultsToSchool(
    client,
    input.attempt.school_id,
    input.attempt.target_plan_id,
    planMap
  );

  await client.query(
    `
      insert into public.school_subscription_events (
        school_id,
        subscription_cycle_id,
        payment_attempt_id,
        event_type,
        summary,
        payload,
        created_by
      )
      values (
        $1,
        $2,
        $3,
        $4,
        $5,
        jsonb_build_object(
          'plan_id', $6::text,
          'billing_interval', $7::text,
          'transaction_id', $8::text,
          'reference', $9::text
        ),
        $10
      )
    `,
    [
      input.attempt.school_id,
      cycleRes.rows[0]?.id ?? null,
      input.attempt.id,
      input.attempt.operation_type === "change_immediate" ? "plan_changed" : "payment_approved",
      input.attempt.operation_type === "change_immediate"
        ? "Se aprobó el cambio inmediato de plan."
        : "Se aprobó el pago de la suscripción.",
      input.attempt.target_plan_id,
      input.attempt.target_billing_interval,
      input.transaction.id,
      input.attempt.reference,
      input.attempt.initiated_by,
    ]
  );
}

async function finalizeAttemptFromHubConfirmation(
  client: PoolClient,
  input: {
    attempt: SchoolSubscriptionPaymentAttempt;
    confirmation: PaymentConfirmationPayload;
    rawPayload?: Record<string, unknown>;
  }
) {
  const planMap = await fetchPlanConfigMap(client);
  const currentCycle = await lockCurrentCycle(client, input.attempt.school_id);
  const paidAt = new Date().toISOString();
  const periodStart = input.confirmation.period_start || paidAt;
  const periodEnd =
    input.confirmation.period_end ||
    new Date(
      input.confirmation.billing_interval === "annual"
        ? new Date(periodStart).setUTCFullYear(new Date(periodStart).getUTCFullYear() + 1)
        : new Date(periodStart).setUTCMonth(new Date(periodStart).getUTCMonth() + 1)
    ).toISOString();

  await client.query(
    `
      update public.school_payment_attempts
      set
        status = 'approved',
        wompi_transaction_id = $2,
        wompi_status = $3,
        wompi_payload = $4::jsonb,
        processed_at = now(),
        failure_reason = null
      where id = $1
    `,
    [
      input.attempt.id,
      input.confirmation.transaction_id,
      String(input.confirmation.transaction_status ?? "APPROVED").toUpperCase(),
      JSON.stringify(input.rawPayload ?? input.confirmation),
    ]
  );

  if (currentCycle) {
    await client.query(
      `
        update public.school_subscription_cycles
        set is_current = false
        where id = $1
      `,
      [currentCycle.id]
    );
  }

  const cycleRes = await client.query<{ id: string }>(
    `
      insert into public.school_subscription_cycles (
        school_id,
        plan_id,
        billing_interval,
        status,
        started_at,
        current_period_start,
        current_period_end,
        is_current,
        requires_review,
        metadata,
        created_by
      )
      values (
        $1,
        $2,
        $3,
        'active',
        $4::timestamptz,
        $5::timestamptz,
        $6::timestamptz,
        true,
        false,
        jsonb_build_object('source', 'clovent_hub', 'transaction_id', $7::text, 'attempt_id', $8::text),
        $9
      )
      returning id
    `,
    [
      input.attempt.school_id,
      input.attempt.target_plan_id,
      input.attempt.target_billing_interval,
      paidAt,
      periodStart,
      periodEnd,
      input.confirmation.transaction_id,
      input.attempt.id,
      input.attempt.initiated_by,
    ]
  );

  await client.query(
    `
      update public.school_payment_attempts
      set subscription_cycle_id = $2
      where id = $1
    `,
    [input.attempt.id, cycleRes.rows[0]?.id ?? null]
  );

  await applyPlanDefaultsToSchool(
    client,
    input.attempt.school_id,
    input.attempt.target_plan_id,
    planMap
  );

  await client.query(
    `
      insert into public.school_subscription_events (
        school_id,
        subscription_cycle_id,
        payment_attempt_id,
        event_type,
        summary,
        payload,
        created_by
      )
      values (
        $1,
        $2,
        $3,
        $4,
        $5,
        jsonb_build_object(
          'plan_id', $6::text,
          'billing_interval', $7::text,
          'transaction_id', $8::text,
          'reference', $9::text,
          'source', 'clovent_hub'
        ),
        $10
      )
    `,
    [
      input.attempt.school_id,
      cycleRes.rows[0]?.id ?? null,
      input.attempt.id,
      input.attempt.operation_type === "change_immediate" ? "plan_changed" : "payment_approved",
      input.attempt.operation_type === "change_immediate"
        ? "Se aprobó el cambio inmediato de plan."
        : "Se aprobó el pago de la suscripción.",
      input.attempt.target_plan_id,
      input.attempt.target_billing_interval,
      input.confirmation.transaction_id,
      input.attempt.reference,
      input.attempt.initiated_by,
    ]
  );
}

function normalizeRemoteStatus(status: string | null | undefined) {
  return String(status ?? "")
    .trim()
    .toUpperCase();
}

async function markAttemptAsFailed(
  db: Queryable,
  attemptId: string,
  transaction: WompiTransaction,
  status: SchoolSubscriptionPaymentAttempt["status"]
) {
  await db.query(
    `
      update public.school_payment_attempts
      set
        status = $2,
        wompi_transaction_id = coalesce($3, wompi_transaction_id),
        wompi_status = $4,
        wompi_payload = $5::jsonb,
        failure_reason = coalesce($6, failure_reason)
      where id = $1
    `,
    [
      attemptId,
      status,
      transaction.id ?? null,
      String(transaction.status ?? status).toUpperCase(),
      JSON.stringify(transaction),
      String(transaction.status ?? status).toUpperCase(),
    ]
  );
}

export async function applyWompiTransactionToSubscription(
  db: Pick<Pool, "connect">,
  transaction: WompiTransaction
) {
  const reference = String(transaction.reference ?? "").trim();
  if (!reference) {
    throw new Error("La transacción de Wompi no trae referencia.");
  }

  const client = await db.connect();
  try {
    await client.query("begin");

    const attemptRes = await client.query<PaymentAttemptRow>(
      `
        select *
        from public.school_payment_attempts
        where reference = $1
        limit 1
        for update
      `,
      [reference]
    );
    const attempt = attemptRes.rows[0] ? normalizeAttemptRow(attemptRes.rows[0]) : null;

    if (!attempt) {
      throw new Error("No se encontró un intento de pago para la referencia recibida.");
    }

    const wompiStatus = String(transaction.status ?? "").toUpperCase();

    if (attempt.processed_at && wompiStatus === "APPROVED") {
      await client.query("commit");
      return attempt;
    }

    if (wompiStatus === "APPROVED") {
      await finalizeAttempt(client, { attempt, transaction });
    } else if (wompiStatus === "DECLINED") {
      await markAttemptAsFailed(client, attempt.id, transaction, "declined");
    } else if (wompiStatus === "VOIDED") {
      await markAttemptAsFailed(client, attempt.id, transaction, "voided");
    } else {
      await markAttemptAsFailed(client, attempt.id, transaction, "error");
    }

    await client.query("commit");
    return attempt;
  } catch (error) {
    await client.query("rollback");
    throw error;
  } finally {
    client.release();
  }
}

export async function reconcileSchoolPaymentAttemptByTransactionId(
  db: Pick<Pool, "connect">,
  transactionId: string
) {
  const transaction = await fetchWompiTransaction(transactionId);
  await applyWompiTransactionToSubscription(db, transaction);
  return transaction;
}

export async function applyBillingHubPaymentConfirmation(
  db: Pick<Pool, "connect">,
  confirmation: PaymentConfirmationPayload,
  rawPayload?: Record<string, unknown>
) {
  const client = await db.connect();

  try {
    await client.query("begin");

    const attemptRes = await client.query<PaymentAttemptRow>(
      `
        select *
        from public.school_payment_attempts
        where reference = $1
        limit 1
        for update
      `,
      [confirmation.reference]
    );

    const attempt = attemptRes.rows[0] ? normalizeAttemptRow(attemptRes.rows[0]) : null;
    if (!attempt) {
      throw new Error("No se encontró un intento de pago para la referencia recibida.");
    }

    if (attempt.school_id !== confirmation.empresa_id) {
      throw new Error("La empresa del callback no coincide con la escuela del intento.");
    }

    if (!isCommercialSchoolPlan(confirmation.plan_code)) {
      throw new Error("El plan confirmado no es válido para ConduSoft.");
    }

    if (attempt.target_plan_id !== confirmation.plan_code) {
      throw new Error("El plan confirmado no coincide con el intento local.");
    }

    if (attempt.target_billing_interval !== confirmation.billing_interval) {
      throw new Error("El intervalo confirmado no coincide con el intento local.");
    }

    const expectedOperation = mapLocalAttemptOperationToHub(attempt.operation_type);
    if (confirmation.operation_type !== expectedOperation) {
      throw new Error("La operación confirmada no coincide con el intento local.");
    }

    const expectedAmount = Math.round(Number(confirmation.amount_paid) * 100);
    if (expectedAmount !== attempt.amount_in_cents) {
      throw new Error("El valor pagado no coincide con el intento local.");
    }

    const remoteStatus = normalizeRemoteStatus(confirmation.transaction_status);

    if (attempt.processed_at && remoteStatus === "APPROVED") {
      await client.query("commit");
      return attempt;
    }

    if (remoteStatus === "APPROVED") {
      await finalizeAttemptFromHubConfirmation(client, {
        attempt,
        confirmation,
        rawPayload,
      });
    } else if (remoteStatus === "DECLINED") {
      await markAttemptAsFailed(
        client,
        attempt.id,
        {
          id: confirmation.transaction_id ?? confirmation.reference,
          status: "DECLINED",
          reference: confirmation.reference,
          amount_in_cents: attempt.amount_in_cents,
          currency: attempt.currency,
          finalized_at: new Date().toISOString(),
        },
        "declined"
      );
    } else if (remoteStatus === "VOIDED" || remoteStatus === "CANCELLED") {
      await markAttemptAsFailed(
        client,
        attempt.id,
        {
          id: confirmation.transaction_id ?? confirmation.reference,
          status: remoteStatus || "VOIDED",
          reference: confirmation.reference,
          amount_in_cents: attempt.amount_in_cents,
          currency: attempt.currency,
          finalized_at: new Date().toISOString(),
        },
        remoteStatus === "CANCELLED" ? "cancelled" : "voided"
      );
    } else if (remoteStatus === "EXPIRED") {
      await markAttemptAsFailed(
        client,
        attempt.id,
        {
          id: confirmation.transaction_id ?? confirmation.reference,
          status: "EXPIRED",
          reference: confirmation.reference,
          amount_in_cents: attempt.amount_in_cents,
          currency: attempt.currency,
          finalized_at: new Date().toISOString(),
        },
        "expired"
      );
    } else {
      await markAttemptAsFailed(
        client,
        attempt.id,
        {
          id: confirmation.transaction_id ?? confirmation.reference,
          status: remoteStatus || "ERROR",
          reference: confirmation.reference,
          amount_in_cents: attempt.amount_in_cents,
          currency: attempt.currency,
          finalized_at: new Date().toISOString(),
        },
        "error"
      );
    }

    await client.query("commit");
    return attempt;
  } catch (error) {
    await client.query("rollback");
    throw error;
  } finally {
    client.release();
  }
}

function buildConfirmationFromHubStatus(status: HubStatusResponse): PaymentConfirmationPayload {
  const expiresAt = status.subscription?.billing_expires_at ?? new Date().toISOString();
  const periodEnd = new Date(expiresAt);
  const periodStartBase = new Date(expiresAt);
  const periodStart = new Date(
    status.billing_interval === "annual"
      ? periodStartBase.setUTCFullYear(periodStartBase.getUTCFullYear() - 1)
      : periodStartBase.setUTCMonth(periodStartBase.getUTCMonth() - 1)
  ).toISOString();

  return {
    reference: status.reference,
    empresa_id: status.empresa_id,
    product_code: "condusoft",
    plan_code: status.plan_code,
    plan_name: status.plan_name,
    operation_type: status.operacion,
    billing_interval: status.billing_interval,
    period_start: periodStart,
    period_end: periodEnd.toISOString(),
    amount_paid: Math.trunc(Number(status.amount_in_cents) / 100),
    transaction_id: status.wompi_transaction_id ?? null,
    transaction_status: status.wompi_transaction_status ?? status.estado?.toUpperCase() ?? null,
  };
}

export async function reconcileSchoolPaymentAttemptByReference(
  db: Pick<Pool, "connect">,
  reference: string
) {
  const status = await requestHubStatus(reference);
  const normalized = String(status.estado ?? "").toLowerCase();

  if (normalized === "approved") {
    await applyBillingHubPaymentConfirmation(db, buildConfirmationFromHubStatus(status), status);
    return status;
  }

  if (["declined", "error", "expired", "cancelled"].includes(normalized)) {
    await applyBillingHubPaymentConfirmation(db, buildConfirmationFromHubStatus(status), status);
  }

  return status;
}

export async function handleWompiEvent(db: Pick<Pool, "connect">, event: WompiEventBody) {
  const wompi = getWompiConfig();

  if (!validateWompiEventChecksum(event, wompi.eventSecret)) {
    throw new Error("Checksum de Wompi inválido.");
  }

  if (event.event !== "transaction.updated") {
    return { ignored: true };
  }

  const transaction = ((event.data ?? {}) as { transaction?: WompiTransaction }).transaction;
  if (!transaction?.id) {
    throw new Error("El evento de Wompi no incluye una transacción válida.");
  }

  await applyWompiTransactionToSubscription(db, transaction);
  return { ignored: false, transactionId: transaction.id };
}

export async function processDueSchoolSubscriptions(db: Queryable) {
  const trialResult = await db.query<{ id: string }>(
    `
      with updated as (
        update public.school_subscription_cycles
        set status = 'read_only'
        where is_current = true
          and requires_review = false
          and status = 'trialing'
          and trial_ends_at is not null
          and trial_ends_at <= now()
        returning id, school_id, trial_ends_at
      )
      insert into public.school_subscription_events (
        school_id,
        subscription_cycle_id,
        event_type,
        summary,
        payload
      )
      select
        school_id,
        id,
        'trial_expired',
        'La prueba venció y la escuela pasó a solo lectura.',
        jsonb_build_object('trial_ends_at', trial_ends_at)
      from updated
      returning subscription_cycle_id as id
    `
  );

  const graceResult = await db.query<{ id: string }>(
    `
      with updated as (
        update public.school_subscription_cycles
        set
          status = 'grace',
          grace_ends_at = coalesce(grace_ends_at, current_period_end + interval '7 days')
        where is_current = true
          and requires_review = false
          and status = 'active'
          and current_period_end <= now()
        returning id, school_id, current_period_end, grace_ends_at
      )
      insert into public.school_subscription_events (
        school_id,
        subscription_cycle_id,
        event_type,
        summary,
        payload
      )
      select
        school_id,
        id,
        'grace_started',
        'La escuela entró en periodo de gracia por falta de pago.',
        jsonb_build_object('current_period_end', current_period_end, 'grace_ends_at', grace_ends_at)
      from updated
      returning subscription_cycle_id as id
    `
  );

  const suspendedResult = await db.query<{ id: string }>(
    `
      with updated as (
        update public.school_subscription_cycles
        set status = 'suspended'
        where is_current = true
          and requires_review = false
          and status = 'grace'
          and grace_ends_at is not null
          and grace_ends_at <= now()
        returning id, school_id, grace_ends_at
      )
      insert into public.school_subscription_events (
        school_id,
        subscription_cycle_id,
        event_type,
        summary,
        payload
      )
      select
        school_id,
        id,
        'suspended',
        'La escuela fue suspendida por no pagar al terminar la gracia.',
        jsonb_build_object('grace_ends_at', grace_ends_at)
      from updated
      returning subscription_cycle_id as id
    `
  );

  return {
    readOnlyCount: trialResult.rowCount,
    graceCount: graceResult.rowCount,
    suspendedCount: suspendedResult.rowCount,
  };
}

export async function loadPlatformSubscriptionBoard(db: Queryable) {
  const result = await db.query<SchoolSummaryRow>(
    `
      select
        e.id,
        e.nombre,
        e.email,
        e.telefono,
        e.plan,
        e.estado,
        e.max_alumnos,
        e.max_sedes,
        access.current_period_end::text,
        access.trial_ends_at::text,
        access.grace_ends_at::text,
        access.billing_interval,
        access.status,
        access.actual_status,
        access.can_write,
        access.requires_review,
        access.scheduled_plan_id,
        access.scheduled_billing_interval,
        access.pending_payment_reference
      from public.escuelas e
      left join lateral public.school_subscription_access(e.id) access on true
      order by e.created_at desc
    `
  );

  return result.rows.map((row) => ({
    ...row,
    max_alumnos: toNumber(row.max_alumnos),
    max_sedes: toNumber(row.max_sedes),
  }));
}

function getCurrentAmountForAccess(
  planMap: Record<PlanEscuelaPago, SchoolBillingPlanOption>,
  access: SchoolSubscriptionAccess
) {
  if (access.billing_interval === "annual") {
    return planMap[access.plan_id]?.precio_anual ?? 0;
  }
  if (access.billing_interval === "monthly") {
    return planMap[access.plan_id]?.precio_mensual ?? 0;
  }
  return 0;
}

function getNextAmountForAccess(
  planMap: Record<PlanEscuelaPago, SchoolBillingPlanOption>,
  access: SchoolSubscriptionAccess
) {
  if (access.scheduled_plan_id && access.scheduled_billing_interval) {
    return access.scheduled_billing_interval === "annual"
      ? (planMap[access.scheduled_plan_id]?.precio_anual ?? 0)
      : (planMap[access.scheduled_plan_id]?.precio_mensual ?? 0);
  }

  if (access.billing_interval === "annual") {
    return planMap[access.plan_id]?.precio_anual ?? 0;
  }

  return planMap[access.plan_id]?.precio_mensual ?? 0;
}

function getNextDateForAccess(access: SchoolSubscriptionAccess) {
  if (access.status === "grace") return access.grace_ends_at;
  if (access.status === "trialing") return access.trial_ends_at;
  return access.current_period_end;
}

async function insertSubscriptionEvent(
  db: Queryable,
  input: {
    schoolId: string;
    cycleId?: string | null;
    paymentAttemptId?: string | null;
    eventType: string;
    summary: string;
    payload?: Record<string, unknown>;
    createdBy?: string | null;
  }
) {
  await db.query(
    `
      insert into public.school_subscription_events (
        school_id,
        subscription_cycle_id,
        payment_attempt_id,
        event_type,
        summary,
        payload,
        created_by
      )
      values ($1, $2, $3, $4, $5, $6::jsonb, $7)
    `,
    [
      input.schoolId,
      input.cycleId ?? null,
      input.paymentAttemptId ?? null,
      input.eventType,
      input.summary,
      JSON.stringify(input.payload ?? {}),
      input.createdBy ?? null,
    ]
  );
}

async function ensureCurrentCycleForAdminAction(
  client: PoolClient,
  schoolId: string,
  initiatedBy: string
) {
  const existing = await lockCurrentCycle(client, schoolId);
  if (existing) return existing;

  const access = await loadSchoolSubscriptionAccess(client, schoolId);
  if (!access) {
    throw new Error("No se encontró el estado comercial actual de la escuela.");
  }

  const startAt = access.current_period_start ?? new Date().toISOString();
  const endAt =
    access.current_period_end ??
    (access.billing_interval === "annual"
      ? new Date(
          new Date(startAt).setUTCFullYear(new Date(startAt).getUTCFullYear() + 1)
        ).toISOString()
      : new Date(new Date(startAt).setUTCMonth(new Date(startAt).getUTCMonth() + 1)).toISOString());

  const result = await client.query<SchoolCycleDetailRow>(
    `
      insert into public.school_subscription_cycles (
        school_id,
        plan_id,
        billing_interval,
        status,
        started_at,
        current_period_start,
        current_period_end,
        trial_ends_at,
        grace_ends_at,
        scheduled_plan_id,
        scheduled_billing_interval,
        scheduled_effective_at,
        is_current,
        requires_review,
        metadata,
        created_by
      )
      values (
        $1,
        $2,
        $3,
        $4,
        $5::timestamptz,
        $5::timestamptz,
        $6::timestamptz,
        $7::timestamptz,
        $8::timestamptz,
        $9,
        $10,
        $11::timestamptz,
        true,
        $12,
        jsonb_build_object('source', 'admin_bootstrap'),
        $13
      )
      returning
        id,
        plan_id,
        billing_interval,
        status,
        started_at::text,
        current_period_start::text,
        current_period_end::text,
        trial_ends_at::text,
        grace_ends_at::text,
        scheduled_plan_id,
        scheduled_billing_interval,
        scheduled_effective_at::text,
        requires_review,
        metadata,
        created_at::text,
        updated_at::text
    `,
    [
      schoolId,
      access.plan_id,
      access.billing_interval,
      access.actual_status,
      startAt,
      endAt,
      access.trial_ends_at,
      access.grace_ends_at,
      access.scheduled_plan_id,
      access.scheduled_billing_interval,
      access.scheduled_effective_at,
      access.requires_review,
      initiatedBy,
    ]
  );

  return result.rows[0] ? normalizeCycleRow(result.rows[0]) : null;
}

export async function loadSchoolSubscriptionAdminDetail(db: Queryable, schoolId: string) {
  const [access, planMap, schoolRes, attemptsRes, cycleRes, eventsRes] = await Promise.all([
    loadSchoolSubscriptionAccess(db, schoolId),
    fetchPlanConfigMap(db),
    db.query<{
      id: string;
      nombre: string;
      email: string | null;
      telefono: string | null;
      estado: string;
      plan: string;
      max_alumnos: number | string;
      max_sedes: number | string;
    }>(
      `
        select id, nombre, email, telefono, estado, plan, max_alumnos, max_sedes
        from public.escuelas
        where id = $1
        limit 1
      `,
      [schoolId]
    ),
    db.query<PaymentAttemptRow>(
      `
        select *
        from public.school_payment_attempts
        where school_id = $1
        order by created_at desc
        limit 8
      `,
      [schoolId]
    ),
    db.query<SchoolCycleDetailRow>(
      `
        select
          id,
          plan_id,
          billing_interval,
          status,
          started_at::text,
          current_period_start::text,
          current_period_end::text,
          trial_ends_at::text,
          grace_ends_at::text,
          scheduled_plan_id,
          scheduled_billing_interval,
          scheduled_effective_at::text,
          requires_review,
          metadata,
          created_at::text,
          updated_at::text
        from public.school_subscription_cycles
        where school_id = $1
          and is_current = true
        limit 1
      `,
      [schoolId]
    ),
    db.query<SchoolEventRow>(
      `
        select
          e.id,
          e.school_id,
          e.subscription_cycle_id,
          e.payment_attempt_id,
          e.event_type,
          e.summary,
          e.payload,
          e.created_by,
          p.nombre as created_by_name,
          e.created_at::text
        from public.school_subscription_events e
        left join public.perfiles p on p.id = e.created_by
        where e.school_id = $1
        order by e.created_at desc
        limit 12
      `,
      [schoolId]
    ),
  ]);

  if (!access || !schoolRes.rows[0]) {
    throw new Error("No se encontró la escuela o su estado comercial.");
  }

  return {
    school: {
      ...schoolRes.rows[0],
      max_alumnos: toNumber(schoolRes.rows[0].max_alumnos),
      max_sedes: toNumber(schoolRes.rows[0].max_sedes),
    },
    access,
    cycle: cycleRes.rows[0] ? normalizeCycleRow(cycleRes.rows[0]) : null,
    plans: COMMERCIAL_SCHOOL_PLAN_ORDER.map((planId) => planMap[planId]).filter(Boolean),
    latestAttempts: attemptsRes.rows.map(normalizeAttemptRow),
    events: eventsRes.rows.map(normalizeEventRow),
    currentAmount: getCurrentAmountForAccess(planMap, access),
    nextAmount: getNextAmountForAccess(planMap, access),
    nextDateAt: getNextDateForAccess(access),
    actions: {
      canExtendTrial: access.actual_status === "trialing",
      canExtendGrace: access.actual_status === "grace",
      canCancelScheduledChange: Boolean(
        access.scheduled_plan_id && access.scheduled_billing_interval
      ),
      canStartCheckout: true,
      canGrantManualCycle: true,
      canSetReadOnly: access.actual_status !== "read_only",
      canSuspendNow: access.actual_status !== "suspended",
    },
  } satisfies SchoolSubscriptionAdminDetailResponse;
}

export async function performSchoolSubscriptionAdminAction(
  db: Pick<Pool, "connect" | "query">,
  input: SchoolSubscriptionAdminActionInput
): Promise<SchoolSubscriptionAdminActionResult> {
  if (input.action === "start_checkout") {
    const access = await loadSchoolSubscriptionAccess(db, input.schoolId);
    const mode =
      input.mode ??
      (access?.actual_status === "trialing" ||
      access?.actual_status === "read_only" ||
      access?.actual_status === "suspended"
        ? "activation"
        : access?.plan_id !== input.planId ||
            (access?.billing_interval === "annual" ? "annual" : "monthly") !== input.billingInterval
          ? "change_immediate"
          : "renewal");

    const checkout = await createSchoolCheckoutSession(db, {
      schoolId: input.schoolId,
      initiatedBy: input.initiatedBy,
      targetPlanId: input.planId,
      targetBillingInterval: input.billingInterval,
      mode,
    });

    return {
      success: true,
      action: input.action,
      message: "Checkout preparado correctamente.",
      checkout,
    };
  }

  const client = await db.connect();
  try {
    await client.query("begin");

    const access = await loadSchoolSubscriptionAccess(client, input.schoolId);
    if (!access) {
      throw new Error("No se pudo resolver el estado comercial de la escuela.");
    }

    const currentCycle = await ensureCurrentCycleForAdminAction(
      client,
      input.schoolId,
      input.initiatedBy
    );
    if (!currentCycle) {
      throw new Error("No se pudo asegurar un ciclo actual para la escuela.");
    }

    switch (input.action) {
      case "grant_manual_cycle": {
        const planMap = await fetchPlanConfigMap(client);
        const nextPeriodInterval = getNextCycleDuration(input.billingInterval);
        const startAt = input.startsAt ? new Date(input.startsAt) : new Date();
        const resolvedReason = input.reason.trim() || "Activación manual desde super admin.";
        const manualActivation =
          currentCycle.status === "trialing" ||
          currentCycle.status === "read_only" ||
          currentCycle.status === "suspended";
        const cancelledAttemptsRes = await client.query<{ reference: string }>(
          `
            update public.school_payment_attempts
            set
              status = 'cancelled',
              processed_at = coalesce(processed_at, now()),
              wompi_status = coalesce(wompi_status, 'CANCELLED'),
              failure_reason = coalesce(failure_reason, 'manual_activation_override')
            where school_id = $1
              and status = 'pending'
            returning reference
          `,
          [input.schoolId]
        );

        if (Number.isNaN(startAt.getTime())) {
          throw new Error("La fecha de inicio del ciclo manual es inválida.");
        }

        await client.query(
          `
            update public.school_subscription_cycles
            set is_current = false
            where school_id = $1
              and is_current = true
          `,
          [input.schoolId]
        );

        const cycleRes = await client.query<{ id: string }>(
          `
            insert into public.school_subscription_cycles (
              school_id,
              plan_id,
              billing_interval,
              status,
              started_at,
              current_period_start,
              current_period_end,
              is_current,
              requires_review,
              metadata,
              created_by
            )
            values (
              $1,
              $2,
              $3,
              'active',
              $4::timestamptz,
              $4::timestamptz,
              $4::timestamptz + interval '${nextPeriodInterval}',
              true,
              false,
              jsonb_build_object('source', 'manual_support', 'reason', $5::text),
              $6
            )
            returning id
          `,
          [
            input.schoolId,
            input.planId,
            input.billingInterval,
            startAt.toISOString(),
            resolvedReason,
            input.initiatedBy,
          ]
        );

        await applyPlanDefaultsToSchool(client, input.schoolId, input.planId, planMap);
        await insertSubscriptionEvent(client, {
          schoolId: input.schoolId,
          cycleId: cycleRes.rows[0]?.id ?? null,
          eventType: "manual_cycle_granted",
          summary: manualActivation
            ? "Se activó manualmente la escuela con un ciclo nuevo."
            : "Se otorgó un ciclo manual a la escuela.",
          payload: {
            reason: resolvedReason,
            plan_id: input.planId,
            billing_interval: input.billingInterval,
            previous_status: currentCycle.status,
            previous_plan: currentCycle.plan_id,
            previous_interval: currentCycle.billing_interval,
            starts_at: startAt.toISOString(),
            cancelled_pending_attempts: cancelledAttemptsRes.rowCount ?? 0,
            cancelled_pending_references: cancelledAttemptsRes.rows.map((row) => row.reference),
          },
          createdBy: input.initiatedBy,
        });

        break;
      }

      case "extend_trial": {
        if (currentCycle.status !== "trialing") {
          throw new Error("Solo se puede extender una prueba activa.");
        }

        const baseDate = new Date(currentCycle.trial_ends_at ?? currentCycle.current_period_end);
        baseDate.setUTCDate(baseDate.getUTCDate() + input.days);
        const nextTrialEnd = baseDate.toISOString();

        await client.query(
          `
            update public.school_subscription_cycles
            set
              trial_ends_at = $2::timestamptz,
              current_period_end = $2::timestamptz
            where id = $1
          `,
          [currentCycle.id, nextTrialEnd]
        );

        await insertSubscriptionEvent(client, {
          schoolId: input.schoolId,
          cycleId: currentCycle.id,
          eventType: "trial_extended",
          summary: "Se extendió manualmente la prueba de la escuela.",
          payload: {
            reason: input.reason,
            days: input.days,
            previous_trial_ends_at: currentCycle.trial_ends_at,
            next_trial_ends_at: nextTrialEnd,
          },
          createdBy: input.initiatedBy,
        });

        break;
      }

      case "extend_grace": {
        if (currentCycle.status !== "grace") {
          throw new Error("Solo se puede extender un periodo de gracia activo.");
        }

        const baseDate = new Date(currentCycle.grace_ends_at ?? currentCycle.current_period_end);
        baseDate.setUTCDate(baseDate.getUTCDate() + input.days);
        const nextGraceEnd = baseDate.toISOString();

        await client.query(
          `
            update public.school_subscription_cycles
            set grace_ends_at = $2::timestamptz
            where id = $1
          `,
          [currentCycle.id, nextGraceEnd]
        );

        await insertSubscriptionEvent(client, {
          schoolId: input.schoolId,
          cycleId: currentCycle.id,
          eventType: "grace_extended",
          summary: "Se extendió manualmente el periodo de gracia.",
          payload: {
            reason: input.reason,
            days: input.days,
            previous_grace_ends_at: currentCycle.grace_ends_at,
            next_grace_ends_at: nextGraceEnd,
          },
          createdBy: input.initiatedBy,
        });

        break;
      }

      case "schedule_change": {
        await client.query(
          `
            update public.school_subscription_cycles
            set
              scheduled_plan_id = $2,
              scheduled_billing_interval = $3,
              scheduled_effective_at = current_period_end
            where id = $1
          `,
          [currentCycle.id, input.planId, input.billingInterval]
        );

        await insertSubscriptionEvent(client, {
          schoolId: input.schoolId,
          cycleId: currentCycle.id,
          eventType: "plan_change_scheduled",
          summary: "Se programó un cambio comercial para el siguiente ciclo.",
          payload: {
            reason: input.reason,
            previous_plan: currentCycle.plan_id,
            previous_interval: currentCycle.billing_interval,
            next_plan: input.planId,
            next_interval: input.billingInterval,
          },
          createdBy: input.initiatedBy,
        });

        break;
      }

      case "cancel_scheduled_change": {
        await client.query(
          `
            update public.school_subscription_cycles
            set
              scheduled_plan_id = null,
              scheduled_billing_interval = null,
              scheduled_effective_at = null
            where id = $1
          `,
          [currentCycle.id]
        );

        await insertSubscriptionEvent(client, {
          schoolId: input.schoolId,
          cycleId: currentCycle.id,
          eventType: "plan_change_schedule_cancelled",
          summary: "Se canceló el cambio programado del siguiente ciclo.",
          payload: {
            reason: input.reason ?? null,
            previous_scheduled_plan: currentCycle.scheduled_plan_id,
            previous_scheduled_interval: currentCycle.scheduled_billing_interval,
          },
          createdBy: input.initiatedBy,
        });

        break;
      }

      case "set_read_only": {
        await client.query(
          `
            update public.school_subscription_cycles
            set status = 'read_only'
            where id = $1
          `,
          [currentCycle.id]
        );

        await insertSubscriptionEvent(client, {
          schoolId: input.schoolId,
          cycleId: currentCycle.id,
          eventType: "forced_read_only",
          summary: "La escuela pasó a solo lectura por decisión administrativa.",
          payload: {
            reason: input.reason,
            previous_status: currentCycle.status,
          },
          createdBy: input.initiatedBy,
        });

        break;
      }

      case "suspend_now": {
        await client.query(
          `
            update public.school_subscription_cycles
            set status = 'suspended'
            where id = $1
          `,
          [currentCycle.id]
        );

        await insertSubscriptionEvent(client, {
          schoolId: input.schoolId,
          cycleId: currentCycle.id,
          eventType: "suspended",
          summary: "La escuela fue suspendida manualmente.",
          payload: {
            reason: input.reason,
            previous_status: currentCycle.status,
          },
          createdBy: input.initiatedBy,
        });

        break;
      }

      case "toggle_requires_review": {
        await client.query(
          `
            update public.school_subscription_cycles
            set requires_review = $2
            where id = $1
          `,
          [currentCycle.id, input.value]
        );

        await insertSubscriptionEvent(client, {
          schoolId: input.schoolId,
          cycleId: currentCycle.id,
          eventType: input.value ? "marked_for_review" : "review_cleared",
          summary: input.value
            ? "La escuela quedó marcada para revisión comercial."
            : "Se limpió la marca de revisión comercial.",
          payload: {
            reason: input.reason ?? null,
            previous_requires_review: currentCycle.requires_review,
            next_requires_review: input.value,
          },
          createdBy: input.initiatedBy,
        });

        break;
      }
    }

    await client.query("commit");

    const messages: Record<
      Exclude<SchoolSubscriptionAdminActionInput["action"], "start_checkout">,
      string
    > = {
      grant_manual_cycle: "Ciclo manual otorgado correctamente.",
      extend_trial: "La prueba se extendió correctamente.",
      extend_grace: "La gracia se extendió correctamente.",
      schedule_change: "El cambio quedó programado para el siguiente ciclo.",
      cancel_scheduled_change: "Se canceló el cambio programado.",
      set_read_only: "La escuela quedó en solo lectura.",
      suspend_now: "La escuela fue suspendida.",
      toggle_requires_review: "Se actualizó la marca de revisión.",
    };

    return {
      success: true,
      action: input.action,
      message: messages[input.action],
    };
  } catch (error) {
    await client.query("rollback");
    throw error;
  } finally {
    client.release();
  }
}
