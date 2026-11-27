import {
  requestHubCheckout,
  validateHubCheckoutUrl,
  type PublicBillingTokenPayload,
} from "@/lib/billing/hub";
import { prepareRateLimitStore } from "@/lib/rate-limit";
import { resolveSchoolPlanCheckoutPricing } from "@/lib/school-subscription-service";
import { getServerDbPool } from "@/lib/server-db";

export async function startPublicBillingCheckout(payload: PublicBillingTokenPayload) {
  await prepareRateLimitStore();
  const pool = getServerDbPool();
  const key = `billing_nonce:${payload.empresa_id}:${payload.nonce}`;

  // A lease keeps the payment link exclusive without holding a database
  // connection during the hub request. A crashed worker's lease expires.
  const { rows } = await pool.query<{ lease: string }>(
    `insert into public.api_rate_limits (key, count, reset_at)
     select $1, 0, statement_timestamp() + interval '60 seconds'
     where statement_timestamp() < to_timestamp($2)
     on conflict (key) do update set reset_at = excluded.reset_at
     where api_rate_limits.count = 0 and api_rate_limits.reset_at <= statement_timestamp()
     returning reset_at::text as lease`,
    [key, payload.exp]
  );
  const lease = rows[0]?.lease;
  if (!lease) return null;

  try {
    const pricing = await resolveSchoolPlanCheckoutPricing(
      pool,
      payload.target_plan_code,
      payload.billing_interval
    );
    const checkout = await requestHubCheckout(
      {
        empresa_id: payload.empresa_id,
        target_plan_code: payload.target_plan_code,
        billing_interval: payload.billing_interval,
        operation_type: payload.operation_type,
        amount_in_cents: pricing.amountInCents,
        currency: pricing.currency,
        plan_name: pricing.planName,
        metadata: { source: "public_token", nonce: payload.nonce },
      },
      AbortSignal.timeout(10_000)
    );

    const url = checkout.checkoutUrl ? validateHubCheckoutUrl(checkout.checkoutUrl) : null;
    if (!url && checkout.scheduled !== true) {
      throw new Error("La sesión de pago aún no está disponible.");
    }

    const confirmed = await pool.query(
      `update public.api_rate_limits set count = 1, reset_at = to_timestamp($3)
       where key = $1 and count = 0 and reset_at = $2::timestamptz
         and reset_at > statement_timestamp() returning key`,
      [key, lease, payload.exp]
    );
    if (!confirmed.rows.length) throw new Error("La reserva del enlace de pago expiró.");
    return { url, message: checkout.message };
  } catch (error) {
    await pool
      .query(
        `delete from public.api_rate_limits
         where key = $1 and count = 0 and reset_at = $2::timestamptz`,
        [key, lease]
      )
      .catch(() => undefined);
    throw error;
  }
}
