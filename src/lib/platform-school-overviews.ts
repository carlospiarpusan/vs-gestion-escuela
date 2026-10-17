import type { Pool } from "pg";
import type {
  PlanEscuela,
  PlanEscuelaPago,
  SchoolPaidBillingInterval,
  SchoolSubscriptionPaymentAttempt,
  SchoolSubscriptionStatus,
} from "@/types/database";

export type PlatformSchoolOverview = {
  id: string;
  nombre: string;
  estado: "activa" | "inactiva" | "suspendida";
  plan: PlanEscuela;
  commercialPlan: PlanEscuelaPago;
  subscriptionStatus: SchoolSubscriptionStatus;
  subscriptionActualStatus: Exclude<SchoolSubscriptionStatus, "pending_payment">;
  billingInterval: "trial" | "monthly" | "annual";
  canWrite: boolean;
  currentPeriodEnd: string | null;
  trialEndsAt: string | null;
  graceEndsAt: string | null;
  scheduledPlanId: PlanEscuelaPago | null;
  scheduledBillingInterval: SchoolPaidBillingInterval | null;
  scheduledEffectiveAt: string | null;
  pendingPaymentReference: string | null;
  requiresReview: boolean;
  currentAmount: number;
  nextAmount: number;
  latestPaymentStatus: SchoolSubscriptionPaymentAttempt["status"] | null;
  latestPaymentReference: string | null;
  max_alumnos: number;
  max_sedes: number;
  created_at: string;
  sedesTotal: number;
  sedesActivas: number;
  alumnosTotal: number;
  adminsActivos: number;
  hasPrincipalSede: boolean;
  capacidadPct: number;
};

type OverviewRow = {
  id: string;
  nombre: string;
  estado: "activa" | "inactiva" | "suspendida";
  plan: PlanEscuela;
  commercial_plan: PlanEscuelaPago;
  subscription_status: SchoolSubscriptionStatus;
  subscription_actual_status: Exclude<SchoolSubscriptionStatus, "pending_payment">;
  billing_interval: "trial" | "monthly" | "annual";
  can_write: boolean;
  current_period_end: string | null;
  trial_ends_at: string | null;
  grace_ends_at: string | null;
  scheduled_plan_id: PlanEscuelaPago | null;
  scheduled_billing_interval: SchoolPaidBillingInterval | null;
  scheduled_effective_at: string | null;
  pending_payment_reference: string | null;
  requires_review: boolean | null;
  current_amount: number | string | null;
  next_amount: number | string | null;
  latest_payment_status: SchoolSubscriptionPaymentAttempt["status"] | null;
  latest_payment_reference: string | null;
  max_alumnos: number | string | null;
  max_sedes: number | string | null;
  created_at: string;
  sedes_total: number | string | null;
  sedes_activas: number | string | null;
  alumnos_total: number | string | null;
  admins_activos: number | string | null;
  has_principal_sede: boolean | null;
};

function toNumber(value: unknown) {
  if (typeof value === "number") return value;
  if (typeof value === "string") return Number(value);
  return 0;
}

export async function loadPlatformSchoolOverviews(db: Pick<Pool, "query">) {
  const result = await db.query<OverviewRow>(
    `
      with sedes_agg as (
        select
          escuela_id,
          count(*)::int as sedes_total,
          count(*) filter (where estado = 'activa')::int as sedes_activas,
          bool_or(es_principal) as has_principal_sede
        from public.sedes
        group by escuela_id
      ),
      admins_agg as (
        select
          escuela_id,
          count(*) filter (where activo)::int as admins_activos
        from public.perfiles
        where rol = 'admin_escuela'
        group by escuela_id
      ),
      alumnos_agg as (
        select
          escuela_id,
          count(*)::int as alumnos_total
        from public.alumnos
        where tipo_registro = 'regular'
          and estado in ('activo', 'pre_registrado')
        group by escuela_id
      ),
      latest_attempt as (
        select distinct on (spa.school_id)
          spa.school_id,
          spa.status as latest_payment_status,
          spa.reference as latest_payment_reference
        from public.school_payment_attempts spa
        order by spa.school_id, spa.created_at desc
      )
      select
        e.id,
        e.nombre,
        e.estado,
        e.plan,
        access.plan_id as commercial_plan,
        access.status as subscription_status,
        access.actual_status as subscription_actual_status,
        access.billing_interval,
        access.can_write,
        access.current_period_end::text as current_period_end,
        access.trial_ends_at::text as trial_ends_at,
        access.grace_ends_at::text as grace_ends_at,
        access.scheduled_plan_id,
        access.scheduled_billing_interval,
        access.scheduled_effective_at::text as scheduled_effective_at,
        access.pending_payment_reference,
        access.requires_review,
        case
          when access.billing_interval = 'annual' then coalesce(current_plan.precio_anual, 0)
          when access.billing_interval = 'monthly' then coalesce(current_plan.precio_mensual, 0)
          else 0
        end as current_amount,
        case
          when access.scheduled_plan_id is not null and access.scheduled_billing_interval = 'annual'
            then coalesce(scheduled_plan.precio_anual, 0)
          when access.scheduled_plan_id is not null and access.scheduled_billing_interval = 'monthly'
            then coalesce(scheduled_plan.precio_mensual, 0)
          when access.billing_interval = 'annual' then coalesce(current_plan.precio_anual, 0)
          else coalesce(current_plan.precio_mensual, 0)
        end as next_amount,
        latest_attempt.latest_payment_status,
        latest_attempt.latest_payment_reference,
        e.max_alumnos,
        e.max_sedes,
        e.created_at::text as created_at,
        coalesce(s.sedes_total, 0)::int as sedes_total,
        coalesce(s.sedes_activas, 0)::int as sedes_activas,
        coalesce(a.alumnos_total, 0)::int as alumnos_total,
        coalesce(p.admins_activos, 0)::int as admins_activos,
        coalesce(s.has_principal_sede, false) as has_principal_sede
      from public.escuelas e
      left join lateral public.school_subscription_access(e.id) access on true
      left join public.planes_config current_plan on current_plan.id = access.plan_id
      left join public.planes_config scheduled_plan on scheduled_plan.id = access.scheduled_plan_id
      left join sedes_agg s on s.escuela_id = e.id
      left join admins_agg p on p.escuela_id = e.id
      left join alumnos_agg a on a.escuela_id = e.id
      left join latest_attempt on latest_attempt.school_id = e.id
      order by e.created_at desc
    `
  );

  return result.rows.map<PlatformSchoolOverview>((row) => {
    const alumnosTotal = toNumber(row.alumnos_total);
    const maxAlumnos = toNumber(row.max_alumnos);

    return {
      id: row.id,
      nombre: row.nombre,
      estado: row.estado,
      plan: row.plan,
      commercialPlan: row.commercial_plan,
      subscriptionStatus: row.subscription_status,
      subscriptionActualStatus: row.subscription_actual_status,
      billingInterval: row.billing_interval,
      canWrite: Boolean(row.can_write),
      currentPeriodEnd: row.current_period_end,
      trialEndsAt: row.trial_ends_at,
      graceEndsAt: row.grace_ends_at,
      scheduledPlanId: row.scheduled_plan_id,
      scheduledBillingInterval: row.scheduled_billing_interval,
      scheduledEffectiveAt: row.scheduled_effective_at,
      pendingPaymentReference: row.pending_payment_reference,
      requiresReview: Boolean(row.requires_review),
      currentAmount: toNumber(row.current_amount),
      nextAmount: toNumber(row.next_amount),
      latestPaymentStatus: row.latest_payment_status,
      latestPaymentReference: row.latest_payment_reference,
      max_alumnos: maxAlumnos,
      max_sedes: toNumber(row.max_sedes),
      created_at: row.created_at,
      sedesTotal: toNumber(row.sedes_total),
      sedesActivas: toNumber(row.sedes_activas),
      alumnosTotal,
      adminsActivos: toNumber(row.admins_activos),
      hasPrincipalSede: Boolean(row.has_principal_sede),
      capacidadPct: maxAlumnos > 0 ? Math.round((alumnosTotal / maxAlumnos) * 100) : 0,
    };
  });
}
