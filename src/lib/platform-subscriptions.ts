import {
  COMMERCIAL_SCHOOL_PLAN_ORDER,
  getSchoolPlanDescriptor,
  isPaidSchoolPlan,
} from "@/lib/school-plans";
import {
  getSchoolSubscriptionIntervalLabel,
  getSchoolSubscriptionPlanLabel,
  getSchoolSubscriptionStatusLabel,
} from "@/lib/school-subscription";
import type { PlatformSchoolOverview } from "@/lib/platform-school-overviews";
import type {
  PlanConfig,
  PlanEscuela,
  PlanEscuelaPago,
  SchoolSubscriptionPaymentAttempt,
  SchoolSubscriptionStatus,
} from "@/types/database";

export type PlatformSubscriptionHealth = "healthy" | "attention" | "risk";

export type PlatformSubscriptionSchool = PlatformSchoolOverview & {
  branchUsagePct: number;
  branchUsageLabel: string;
  seatAvailability: number;
  health: PlatformSubscriptionHealth;
  healthLabel: string;
  serviceLabel: string;
  planLabel: string;
  commercialPlanLabel: string;
  subscriptionStatusLabel: string;
  billingIntervalLabel: string;
  paidPlan: boolean;
  currentAmount: number;
  nextAmount: number;
  daysToDue: number | null;
  nextDateAt: string | null;
  nextDateLabel: string;
  scheduledChangeLabel: string | null;
  latestPaymentStatus: SchoolSubscriptionPaymentAttempt["status"] | null;
  latestPaymentReference: string | null;
  flags: string[];
};

export type PlatformSubscriptionStats = {
  totalSchools: number;
  activeSchools: number;
  paidSchools: number;
  suspendedSchools: number;
  riskSchools: number;
  averageCapacityPct: number;
  enterpriseSchools: number;
  trialingSchools: number;
  graceSchools: number;
  readOnlySchools: number;
  pendingPaymentSchools: number;
  reviewSchools: number;
  monthlyPaidSchools: number;
  annualPaidSchools: number;
  estimatedMrr: number;
  estimatedArr: number;
  dueInNext30Days: number;
  graceEndingInNext7Days: number;
};

export type PlatformSubscriptionPlanBreakdown = {
  plan: PlanEscuela | PlanEscuelaPago;
  label: string;
  badge: string;
  schoolCount: number;
  activeCount: number;
  suspendedCount: number;
  averageCapacityPct: number;
  withoutAdminCount: number;
  summary: string;
  capacityGuide: string;
};

export type PlatformSubscriptionsResponse = {
  stats: PlatformSubscriptionStats;
  planBreakdown: PlatformSubscriptionPlanBreakdown[];
  plans: PlanConfig[];
  schools: PlatformSubscriptionSchool[];
};

function roundPercentage(value: number) {
  return Number.isFinite(value) ? Math.max(0, Math.round(value)) : 0;
}

function formatDateLabel(value: string | null) {
  if (!value) return "Sin fecha";
  return new Intl.DateTimeFormat("es-CO", {
    dateStyle: "medium",
    timeZone: "America/Bogota",
  }).format(new Date(value));
}

function getRelevantDueDate(overview: PlatformSchoolOverview) {
  if (overview.subscriptionStatus === "grace") return overview.graceEndsAt;
  if (overview.subscriptionStatus === "trialing") return overview.trialEndsAt;
  return overview.currentPeriodEnd;
}

function getDaysUntil(value: string | null, now = Date.now()) {
  if (!value) return null;
  const diff = new Date(value).getTime() - now;
  return Math.ceil(diff / (1000 * 60 * 60 * 24));
}

function buildNextDateLabel(overview: PlatformSchoolOverview) {
  if (overview.subscriptionStatus === "grace" && overview.graceEndsAt) {
    return `Fin de gracia · ${formatDateLabel(overview.graceEndsAt)}`;
  }

  if (overview.subscriptionStatus === "trialing" && overview.trialEndsAt) {
    return `Fin de prueba · ${formatDateLabel(overview.trialEndsAt)}`;
  }

  if (overview.currentPeriodEnd) {
    return `Siguiente corte · ${formatDateLabel(overview.currentPeriodEnd)}`;
  }

  return "Sin fecha comercial";
}

function buildScheduledChangeLabel(overview: PlatformSchoolOverview) {
  if (!overview.scheduledPlanId || !overview.scheduledBillingInterval) return null;
  const dateLabel = overview.scheduledEffectiveAt
    ? ` el ${formatDateLabel(overview.scheduledEffectiveAt)}`
    : "";
  return `Cambio programado a ${getSchoolSubscriptionPlanLabel(
    overview.scheduledPlanId
  )} ${getSchoolSubscriptionIntervalLabel(overview.scheduledBillingInterval).toLowerCase()}${dateLabel}`;
}

function isRevenueBearingStatus(status: SchoolSubscriptionStatus) {
  return status === "active" || status === "grace" || status === "pending_payment";
}

function getBranchUsagePct(overview: PlatformSchoolOverview) {
  if (overview.max_sedes <= 0) return 0;
  return roundPercentage((overview.sedesActivas / overview.max_sedes) * 100);
}

function buildSchoolFlags(overview: PlatformSchoolOverview, branchUsagePct: number) {
  const flags: string[] = [];

  if (overview.estado === "suspendida") {
    flags.push("Servicio suspendido");
  } else if (overview.estado === "inactiva") {
    flags.push("Escuela inactiva");
  }

  if (overview.adminsActivos === 0) {
    flags.push("Sin administrador principal");
  }

  if (!overview.hasPrincipalSede) {
    flags.push("Sin sede principal definida");
  }

  if (overview.capacidadPct >= 100) {
    flags.push("Capacidad de alumnos superada");
  } else if (overview.capacidadPct >= 85) {
    flags.push("Capacidad de alumnos al límite");
  }

  if (branchUsagePct >= 100 && overview.max_sedes > 0) {
    flags.push("Capacidad de sedes superada");
  } else if (branchUsagePct >= 85 && overview.max_sedes > 0) {
    flags.push("Sedes cerca del límite");
  }

  if (overview.subscriptionStatus === "trialing" && overview.trialEndsAt) {
    flags.push("Prueba activa");
  }

  if (overview.subscriptionStatus === "grace" && overview.graceEndsAt) {
    flags.push("Pago en gracia");
  }

  if (overview.subscriptionStatus === "read_only") {
    flags.push("Solo lectura comercial");
  }

  if (overview.subscriptionStatus === "suspended") {
    flags.push("Suspendida por cobro");
  }

  if (overview.subscriptionStatus === "pending_payment") {
    flags.push("Pago Wompi pendiente");
  }

  if (overview.requiresReview) {
    flags.push("Requiere revisión");
  }

  return flags;
}

function getHealthFromFlags(
  overview: PlatformSchoolOverview,
  flags: string[]
): PlatformSubscriptionHealth {
  if (
    overview.estado === "suspendida" ||
    overview.adminsActivos === 0 ||
    !overview.hasPrincipalSede ||
    overview.capacidadPct >= 100
  ) {
    return "risk";
  }

  if (overview.estado === "inactiva" || flags.length > 0) {
    return "attention";
  }

  return "healthy";
}

function getHealthLabel(health: PlatformSubscriptionHealth) {
  switch (health) {
    case "risk":
      return "Riesgo alto";
    case "attention":
      return "Atención";
    default:
      return "Estable";
  }
}

function getServiceLabel(state: PlatformSchoolOverview["estado"]) {
  switch (state) {
    case "activa":
      return "Servicio activo";
    case "inactiva":
      return "Servicio inactivo";
    default:
      return "Servicio suspendido";
  }
}

function getHealthPriority(health: PlatformSubscriptionHealth) {
  switch (health) {
    case "risk":
      return 0;
    case "attention":
      return 1;
    default:
      return 2;
  }
}

function getCommercialPriority(status: SchoolSubscriptionStatus) {
  switch (status) {
    case "suspended":
      return 0;
    case "read_only":
      return 1;
    case "grace":
    case "pending_payment":
      return 2;
    case "trialing":
      return 3;
    default:
      return 4;
  }
}

export function buildPlatformSubscriptionSchools(overviews: PlatformSchoolOverview[]) {
  return [...overviews]
    .map<PlatformSubscriptionSchool>((overview) => {
      const now = Date.now();
      const branchUsagePct = getBranchUsagePct(overview);
      const flags = buildSchoolFlags(overview, branchUsagePct);
      const descriptor = getSchoolPlanDescriptor(overview.plan);
      const health = getHealthFromFlags(overview, flags);
      const nextDateAt = getRelevantDueDate(overview);

      return {
        ...overview,
        branchUsagePct,
        branchUsageLabel:
          overview.max_sedes > 0
            ? `${overview.sedesActivas}/${overview.max_sedes} sedes activas`
            : `${overview.sedesActivas} sedes activas`,
        seatAvailability:
          overview.max_alumnos > 0 ? Math.max(overview.max_alumnos - overview.alumnosTotal, 0) : 0,
        health,
        healthLabel: getHealthLabel(health),
        serviceLabel: getServiceLabel(overview.estado),
        planLabel: descriptor?.label ?? overview.plan,
        commercialPlanLabel: getSchoolSubscriptionPlanLabel(overview.commercialPlan),
        subscriptionStatusLabel: getSchoolSubscriptionStatusLabel(overview.subscriptionStatus),
        billingIntervalLabel: getSchoolSubscriptionIntervalLabel(overview.billingInterval),
        paidPlan: isPaidSchoolPlan(overview.commercialPlan),
        currentAmount: overview.currentAmount,
        nextAmount: overview.nextAmount,
        daysToDue: getDaysUntil(nextDateAt, now),
        nextDateAt,
        nextDateLabel: buildNextDateLabel(overview),
        scheduledChangeLabel: buildScheduledChangeLabel(overview),
        latestPaymentStatus: overview.latestPaymentStatus,
        latestPaymentReference: overview.latestPaymentReference,
        flags,
      };
    })
    .sort((left, right) => {
      const byCommercial =
        getCommercialPriority(left.subscriptionStatus) -
        getCommercialPriority(right.subscriptionStatus);
      if (byCommercial !== 0) return byCommercial;

      const byHealth = getHealthPriority(left.health) - getHealthPriority(right.health);
      if (byHealth !== 0) return byHealth;

      const byCapacity = right.capacidadPct - left.capacidadPct;
      if (byCapacity !== 0) return byCapacity;

      return left.nombre.localeCompare(right.nombre, "es-CO");
    });
}

export function buildPlatformSubscriptionStats(schools: PlatformSubscriptionSchool[]) {
  const now = Date.now();
  const totalSchools = schools.length;
  const activeSchools = schools.filter((school) => school.estado === "activa").length;
  const paidSchools = schools.filter((school) => school.paidPlan).length;
  const suspendedSchools = schools.filter((school) => school.estado === "suspendida").length;
  const riskSchools = schools.filter((school) => school.health === "risk").length;
  const enterpriseSchools = schools.filter(
    (school) => school.commercialPlan === "enterprise"
  ).length;
  const trialingSchools = schools.filter(
    (school) => school.subscriptionStatus === "trialing"
  ).length;
  const graceSchools = schools.filter((school) => school.subscriptionStatus === "grace").length;
  const readOnlySchools = schools.filter(
    (school) => school.subscriptionStatus === "read_only"
  ).length;
  const pendingPaymentSchools = schools.filter(
    (school) => school.subscriptionStatus === "pending_payment"
  ).length;
  const reviewSchools = schools.filter((school) => school.requiresReview).length;
  const monthlyPaidSchools = schools.filter(
    (school) => school.billingInterval === "monthly" && school.currentAmount > 0
  ).length;
  const annualPaidSchools = schools.filter(
    (school) => school.billingInterval === "annual" && school.currentAmount > 0
  ).length;
  const revenueBearingSchools = schools.filter((school) =>
    isRevenueBearingStatus(school.subscriptionStatus)
  );
  const estimatedMrr = Math.round(
    revenueBearingSchools.reduce((sum, school) => {
      if (school.billingInterval === "annual") return sum + school.currentAmount / 12;
      if (school.billingInterval === "monthly") return sum + school.currentAmount;
      return sum;
    }, 0)
  );
  const estimatedArr = Math.round(
    revenueBearingSchools.reduce((sum, school) => {
      if (school.billingInterval === "annual") return sum + school.currentAmount;
      if (school.billingInterval === "monthly") return sum + school.currentAmount * 12;
      return sum;
    }, 0)
  );
  const dueInNext30Days = schools.filter((school) => {
    if (school.subscriptionStatus === "grace" || school.subscriptionStatus === "read_only") {
      return false;
    }
    const days = school.daysToDue;
    return days != null && days >= 0 && days <= 30;
  }).length;
  const graceEndingInNext7Days = schools.filter((school) => {
    if (school.subscriptionStatus !== "grace" || !school.graceEndsAt) return false;
    const days = getDaysUntil(school.graceEndsAt, now);
    return days != null && days >= 0 && days <= 7;
  }).length;
  const averageCapacityPct =
    totalSchools > 0
      ? roundPercentage(
          schools.reduce((sum, school) => sum + school.capacidadPct, 0) / totalSchools
        )
      : 0;

  return {
    totalSchools,
    activeSchools,
    paidSchools,
    suspendedSchools,
    riskSchools,
    averageCapacityPct,
    enterpriseSchools,
    trialingSchools,
    graceSchools,
    readOnlySchools,
    pendingPaymentSchools,
    reviewSchools,
    monthlyPaidSchools,
    annualPaidSchools,
    estimatedMrr,
    estimatedArr,
    dueInNext30Days,
    graceEndingInNext7Days,
  };
}

export function buildPlatformSubscriptionPlanBreakdown(schools: PlatformSubscriptionSchool[]) {
  return COMMERCIAL_SCHOOL_PLAN_ORDER.map<PlatformSubscriptionPlanBreakdown>((plan) => {
    const descriptor = getSchoolPlanDescriptor(plan);
    const planSchools = schools.filter((school) => school.commercialPlan === plan);
    const schoolCount = planSchools.length;
    const activeCount = planSchools.filter(
      (school) => school.subscriptionActualStatus === "active"
    ).length;
    const suspendedCount = planSchools.filter(
      (school) => school.subscriptionStatus === "suspended"
    ).length;
    const withoutAdminCount = planSchools.filter((school) => school.adminsActivos === 0).length;
    const averageCapacityPct =
      schoolCount > 0
        ? roundPercentage(
            planSchools.reduce((sum, school) => sum + school.capacidadPct, 0) / schoolCount
          )
        : 0;

    return {
      plan,
      label: descriptor?.label ?? plan,
      badge: descriptor?.badge ?? "",
      schoolCount,
      activeCount,
      suspendedCount,
      withoutAdminCount,
      averageCapacityPct,
      summary: descriptor?.summary ?? "",
      capacityGuide: descriptor?.capacityGuide ?? "",
    };
  });
}

export function createEmptyPlatformSubscriptionsResponse(): PlatformSubscriptionsResponse {
  return {
    stats: {
      totalSchools: 0,
      activeSchools: 0,
      paidSchools: 0,
      suspendedSchools: 0,
      riskSchools: 0,
      averageCapacityPct: 0,
      enterpriseSchools: 0,
      trialingSchools: 0,
      graceSchools: 0,
      readOnlySchools: 0,
      pendingPaymentSchools: 0,
      reviewSchools: 0,
      monthlyPaidSchools: 0,
      annualPaidSchools: 0,
      estimatedMrr: 0,
      estimatedArr: 0,
      dueInNext30Days: 0,
      graceEndingInNext7Days: 0,
    },
    planBreakdown: buildPlatformSubscriptionPlanBreakdown([]),
    plans: [],
    schools: [],
  };
}
