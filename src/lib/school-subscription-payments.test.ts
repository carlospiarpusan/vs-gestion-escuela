import { describe, expect, it } from "vitest";
import {
  applyBillingHubPaymentConfirmation,
  applyWompiTransactionToSubscription,
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
