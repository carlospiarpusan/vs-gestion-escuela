import { getSchoolPlanDescriptor, isPaidSchoolPlan, SCHOOL_PLAN_ORDER } from "@/lib/school-plans";
import type { PlatformSchoolOverview } from "@/lib/platform-school-overviews";
import type { PlanEscuela } from "@/types/database";

export type PlatformSubscriptionHealth = "healthy" | "attention" | "risk";

export type PlatformSubscriptionSchool = PlatformSchoolOverview & {
  branchUsagePct: number;
  branchUsageLabel: string;
  seatAvailability: number;
  health: PlatformSubscriptionHealth;
  healthLabel: string;
  serviceLabel: string;
  planLabel: string;
  paidPlan: boolean;
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
};

export type PlatformSubscriptionPlanBreakdown = {
  plan: PlanEscuela;
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
  schools: PlatformSubscriptionSchool[];
};

function roundPercentage(value: number) {
  return Number.isFinite(value) ? Math.max(0, Math.round(value)) : 0;
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

export function buildPlatformSubscriptionSchools(overviews: PlatformSchoolOverview[]) {
  return [...overviews]
    .map<PlatformSubscriptionSchool>((overview) => {
      const branchUsagePct = getBranchUsagePct(overview);
      const flags = buildSchoolFlags(overview, branchUsagePct);
      const descriptor = getSchoolPlanDescriptor(overview.plan);
      const health = getHealthFromFlags(overview, flags);

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
        paidPlan: isPaidSchoolPlan(overview.plan),
        flags,
      };
    })
    .sort((left, right) => {
      const byHealth = getHealthPriority(left.health) - getHealthPriority(right.health);
      if (byHealth !== 0) return byHealth;

      const byCapacity = right.capacidadPct - left.capacidadPct;
      if (byCapacity !== 0) return byCapacity;

      return left.nombre.localeCompare(right.nombre, "es-CO");
    });
}

export function buildPlatformSubscriptionStats(schools: PlatformSubscriptionSchool[]) {
  const totalSchools = schools.length;
  const activeSchools = schools.filter((school) => school.estado === "activa").length;
  const paidSchools = schools.filter((school) => school.paidPlan).length;
  const suspendedSchools = schools.filter((school) => school.estado === "suspendida").length;
  const riskSchools = schools.filter((school) => school.health === "risk").length;
  const enterpriseSchools = schools.filter((school) => school.plan === "enterprise").length;
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
  };
}

export function buildPlatformSubscriptionPlanBreakdown(schools: PlatformSubscriptionSchool[]) {
  return SCHOOL_PLAN_ORDER.map<PlatformSubscriptionPlanBreakdown>((plan) => {
    const descriptor = getSchoolPlanDescriptor(plan);
    const planSchools = schools.filter((school) => school.plan === plan);
    const schoolCount = planSchools.length;
    const activeCount = planSchools.filter((school) => school.estado === "activa").length;
    const suspendedCount = planSchools.filter((school) => school.estado === "suspendida").length;
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
    },
    planBreakdown: buildPlatformSubscriptionPlanBreakdown([]),
    schools: [],
  };
}
