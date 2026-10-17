import { describe, expect, it } from "vitest";
import {
  buildPlatformSubscriptionPlanBreakdown,
  buildPlatformSubscriptionSchools,
  buildPlatformSubscriptionStats,
} from "./platform-subscriptions";
import type { PlatformSchoolOverview } from "./platform-school-overviews";

const overviews: PlatformSchoolOverview[] = [
  {
    id: "1",
    nombre: "Escuela Alfa",
    estado: "activa",
    plan: "basico",
    commercialPlan: "basico",
    subscriptionStatus: "active",
    subscriptionActualStatus: "active",
    billingInterval: "monthly",
    canWrite: true,
    currentPeriodEnd: "2026-02-10T10:00:00.000Z",
    trialEndsAt: null,
    graceEndsAt: null,
    scheduledPlanId: null,
    scheduledBillingInterval: null,
    scheduledEffectiveAt: null,
    pendingPaymentReference: null,
    requiresReview: false,
    currentAmount: 89000,
    nextAmount: 89000,
    latestPaymentStatus: "approved",
    latestPaymentReference: "PAY-ALFA-1",
    max_alumnos: 100,
    max_sedes: 2,
    created_at: "2026-01-10T10:00:00.000Z",
    sedesTotal: 2,
    sedesActivas: 2,
    alumnosTotal: 94,
    adminsActivos: 1,
    hasPrincipalSede: true,
    capacidadPct: 94,
  },
  {
    id: "2",
    nombre: "Escuela Beta",
    estado: "suspendida",
    plan: "gratuito",
    commercialPlan: "profesional",
    subscriptionStatus: "read_only",
    subscriptionActualStatus: "read_only",
    billingInterval: "trial",
    canWrite: false,
    currentPeriodEnd: "2026-05-05T10:00:00.000Z",
    trialEndsAt: "2026-05-05T10:00:00.000Z",
    graceEndsAt: null,
    scheduledPlanId: null,
    scheduledBillingInterval: null,
    scheduledEffectiveAt: null,
    pendingPaymentReference: null,
    requiresReview: false,
    currentAmount: 0,
    nextAmount: 179000,
    latestPaymentStatus: null,
    latestPaymentReference: null,
    max_alumnos: 30,
    max_sedes: 1,
    created_at: "2026-02-05T10:00:00.000Z",
    sedesTotal: 1,
    sedesActivas: 0,
    alumnosTotal: 8,
    adminsActivos: 0,
    hasPrincipalSede: false,
    capacidadPct: 27,
  },
  {
    id: "3",
    nombre: "Escuela Gamma",
    estado: "activa",
    plan: "enterprise",
    commercialPlan: "enterprise",
    subscriptionStatus: "grace",
    subscriptionActualStatus: "grace",
    billingInterval: "annual",
    canWrite: true,
    currentPeriodEnd: "2026-03-01T10:00:00.000Z",
    trialEndsAt: null,
    graceEndsAt: "2026-03-08T10:00:00.000Z",
    scheduledPlanId: null,
    scheduledBillingInterval: null,
    scheduledEffectiveAt: null,
    pendingPaymentReference: "CLO-DEMO",
    requiresReview: true,
    currentAmount: 3490000,
    nextAmount: 3490000,
    latestPaymentStatus: "pending",
    latestPaymentReference: "CLO-DEMO",
    max_alumnos: 200,
    max_sedes: 5,
    created_at: "2026-03-01T10:00:00.000Z",
    sedesTotal: 4,
    sedesActivas: 4,
    alumnosTotal: 120,
    adminsActivos: 2,
    hasPrincipalSede: true,
    capacidadPct: 60,
  },
];

describe("platform subscriptions helpers", () => {
  it("flags platform health from real school state and capacity", () => {
    const schools = buildPlatformSubscriptionSchools(overviews);

    expect(schools[0]).toMatchObject({
      id: "2",
      health: "risk",
      paidPlan: true,
      subscriptionStatus: "read_only",
    });
    expect(schools[1]).toMatchObject({
      id: "3",
      health: "attention",
      paidPlan: true,
      requiresReview: true,
    });
  });

  it("builds summary stats from the school list", () => {
    const schools = buildPlatformSubscriptionSchools(overviews);
    const stats = buildPlatformSubscriptionStats(schools);

    expect(stats).toMatchObject({
      totalSchools: 3,
      activeSchools: 2,
      paidSchools: 3,
      suspendedSchools: 1,
      riskSchools: 1,
      enterpriseSchools: 1,
      trialingSchools: 0,
      graceSchools: 1,
      readOnlySchools: 1,
      pendingPaymentSchools: 0,
      reviewSchools: 1,
    });
  });

  it("keeps plan breakdown in commercial order", () => {
    const schools = buildPlatformSubscriptionSchools(overviews);
    const breakdown = buildPlatformSubscriptionPlanBreakdown(schools);

    expect(breakdown.map((item) => item.plan)).toEqual(["basico", "profesional", "enterprise"]);
    expect(breakdown.find((item) => item.plan === "basico")).toMatchObject({
      schoolCount: 1,
      activeCount: 1,
    });
    expect(breakdown.find((item) => item.plan === "profesional")).toMatchObject({
      schoolCount: 1,
      suspendedCount: 0,
    });
  });
});
