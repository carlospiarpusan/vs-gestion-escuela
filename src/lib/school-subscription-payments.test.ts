import { describe, expect, it, vi } from "vitest";
import * as hub from "@/lib/billing/hub";
import {
  SchoolPlanUnavailableError,
  applyBillingHubPaymentConfirmation,
  applyWompiTransactionToSubscription,
  createSchoolCheckoutSession,
  loadSchoolBillingCenter,
  resolveSchoolPlanCheckoutPricing,
  scheduleSchoolPlanChange,
  subtractUtcMonthsClamped,
} from "@/lib/school-subscription-service";

function buildAttempt(overrides: Record<string, unknown> = {}) {
  return {
    id: "attempt-1",
    school_id: "school-1",
    operation_type: "renewal",
    target_plan_id: "profesional",
    target_billing_interval: "monthly",
    amount_in_cents: 10000000,
    currency: "COP",
    reference: "REF-1",
    status: "pending",
    processed_at: null,
    wompi_payload: {},
    ...overrides,
  };
}

function buildDb(attempt: Record<string, unknown>) {
  const queries: string[] = [];
  const client = {
    query: async (sql: string) => {
      queries.push(sql.replace(/\s+/g, " ").trim());
      if (/from public\.school_payment_attempts/.test(sql) && /for update/.test(sql)) {
        return { rows: [attempt] };
      }
      return { rows: [] };
    },
    release: () => undefined,
  };
  return {
    db: { connect: async () => client } as never,
    queries,
    wrote: (pattern: RegExp) => queries.some((q) => pattern.test(q)),
  };
}

const failurePattern = /update public\.school_payment_attempts set status = \$2/;

const hubConfirmation = (transaction_status: string | null) => ({
  reference: "REF-1",
  empresa_id: "school-1",
  product_code: "condusoft" as const,
  plan_code: "profesional" as const,
  plan_name: "Profesional",
  operation_type: "renewal" as const,
  billing_interval: "monthly" as const,
  period_start: "2026-10-01T00:00:00.000Z",
  period_end: "2026-11-01T00:00:00.000Z",
  amount_paid: 100000,
  transaction_id: "tx-1",
  transaction_status,
});

describe("pagos de suscripciones", () => {
  it("no marca como fallido un intento cuyo pago Wompi sigue PENDING", async () => {
    const { db, wrote } = buildDb(buildAttempt());
    await applyWompiTransactionToSubscription(db, {
      id: "tx-1",
      reference: "REF-1",
      status: "PENDING",
    } as never);

    expect(wrote(failurePattern)).toBe(false);
    expect(wrote(/set updated_at = now\(\)/)).toBe(true);
  });

  it("no degrada un intento ya aprobado ante un evento DECLINED tardío", async () => {
    const { db, wrote } = buildDb(
      buildAttempt({ status: "approved", processed_at: "2026-11-01T00:00:00Z" })
    );
    await applyWompiTransactionToSubscription(db, {
      id: "tx-1",
      reference: "REF-1",
      status: "DECLINED",
    } as never);

    expect(wrote(failurePattern)).toBe(false);
  });

  it("sigue marcando como rechazado un intento pendiente con DECLINED", async () => {
    const { db, wrote } = buildDb(buildAttempt());
    await applyWompiTransactionToSubscription(db, {
      id: "tx-1",
      reference: "REF-1",
      status: "DECLINED",
    } as never);

    expect(wrote(failurePattern)).toBe(true);
  });

  it("ignora confirmaciones del hub sin estado final", async () => {
    const { db, wrote } = buildDb(buildAttempt());
    await applyBillingHubPaymentConfirmation(db, hubConfirmation("PENDING"));
    expect(wrote(failurePattern)).toBe(false);
  });

  it("no degrada desde el hub un intento ya aprobado", async () => {
    const { db, wrote } = buildDb(
      buildAttempt({ status: "approved", processed_at: "2026-11-01T00:00:00Z" })
    );
    await applyBillingHubPaymentConfirmation(db, hubConfirmation("VOIDED"));
    expect(wrote(failurePattern)).toBe(false);
  });
});

describe("disponibilidad comercial de suscripciones", () => {
  const input = {
    schoolId: "school-1",
    planId: "profesional",
    billingInterval: "monthly",
  } as const;
  const plan = {
    id: input.planId,
    nombre: "Profesional",
    precio_mensual: "299000.00",
    precio_anual: "2990000.00",
  };

  function billingDb(activo: boolean) {
    const query = vi.fn(async (sql: string) => {
      if (sql.includes("from public.planes_config")) {
        return { rows: [{ ...plan, activo }] };
      }
      if (sql.includes("from public.school_subscription_access")) {
        return { rows: [{ plan_id: input.planId, cycle_id: "cycle-1", actual_status: "active" }] };
      }
      if (sql.includes("from public.escuelas")) {
        return { rows: [{ id: input.schoolId, school_name: "Escuela de prueba" }] };
      }
      return { rows: [] };
    });
    return { db: { query } as never, query };
  }

  it("bloquea checkout y programación para un plan inactivo sin crear intentos ni eventos", async () => {
    const { db, query } = billingDb(false);
    const checkout = vi
      .spyOn(hub, "requestHubCheckout")
      .mockRejectedValue(new Error("El proveedor no se debe invocar"));

    try {
      const center = await loadSchoolBillingCenter(db, input.schoolId);
      expect(center.access.plan_id).toBe(input.planId);
      expect(center.plans).toEqual([]);
      await expect(
        createSchoolCheckoutSession(db, {
          schoolId: input.schoolId,
          mode: "renewal",
          initiatedBy: "owner-1",
          targetPlanId: input.planId,
          targetBillingInterval: input.billingInterval,
        })
      ).rejects.toBeInstanceOf(SchoolPlanUnavailableError);
      await expect(scheduleSchoolPlanChange(db, input)).rejects.toBeInstanceOf(
        SchoolPlanUnavailableError
      );
      expect(checkout).not.toHaveBeenCalled();
      expect(query.mock.calls.every(([sql]) => sql.trimStart().startsWith("select"))).toBe(true);
    } finally {
      checkout.mockRestore();
    }
  });

  it("obtiene el importe vigente de un plan activo en centavos de COP", async () => {
    const { db } = billingDb(true);
    await expect(resolveSchoolPlanCheckoutPricing(db, input.planId, "annual")).resolves.toEqual({
      amountInCents: 299_000_000,
      currency: "COP",
      planName: plan.nombre,
    });
  });
});

describe("subtractUtcMonthsClamped", () => {
  it("ajusta al último día del mes destino", () => {
    expect(subtractUtcMonthsClamped(new Date("2026-03-31T05:00:00.000Z"), 1).toISOString()).toBe(
      "2026-02-28T05:00:00.000Z"
    );
    expect(subtractUtcMonthsClamped(new Date("2028-02-29T00:00:00.000Z"), 12).toISOString()).toBe(
      "2027-02-28T00:00:00.000Z"
    );
  });

  it("conserva el día cuando existe en el mes destino", () => {
    expect(subtractUtcMonthsClamped(new Date("2026-01-15T00:00:00.000Z"), 1).toISOString()).toBe(
      "2025-12-15T00:00:00.000Z"
    );
  });
});
