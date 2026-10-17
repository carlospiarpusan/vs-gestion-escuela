import { redirect } from "next/navigation";
import { requestHubCheckout, verifyPublicBillingToken } from "@/lib/billing/hub";
import { resolveSchoolPlanCheckoutPricing } from "@/lib/school-subscription-service";
import { getServerDbPool } from "@/lib/server-db";

type BillingPagarPageProps = {
  searchParams?: Promise<{ token?: string }>;
};

export default async function BillingPagarPage({ searchParams }: BillingPagarPageProps) {
  const params = await searchParams;
  const token = params?.token?.trim();

  if (!token) {
    return (
      <main className="mx-auto max-w-xl px-6 py-16">
        <div className="rounded-3xl border border-amber-200 bg-amber-50 p-6 text-sm text-amber-900">
          Falta el token de pago.
        </div>
      </main>
    );
  }

  let checkoutMessage: string | null = null;
  let errorMessage: string | null = null;

  try {
    const payload = verifyPublicBillingToken(token);
    const pricing = await resolveSchoolPlanCheckoutPricing(
      getServerDbPool(),
      payload.target_plan_code,
      payload.billing_interval
    );
    const checkout = await requestHubCheckout({
      empresa_id: payload.empresa_id,
      target_plan_code: payload.target_plan_code,
      billing_interval: payload.billing_interval,
      operation_type: payload.operation_type,
      amount_in_cents: pricing.amountInCents,
      currency: pricing.currency,
      plan_name: pricing.planName,
      metadata: {
        source: "public_token",
        nonce: payload.nonce,
      },
    });

    if (checkout.checkoutUrl) {
      redirect(checkout.checkoutUrl);
    }
    checkoutMessage = checkout.message;
  } catch (error) {
    errorMessage = error instanceof Error ? error.message : "No fue posible iniciar el pago.";
  }

  if (errorMessage) {
    return (
      <main className="mx-auto max-w-xl px-6 py-16">
        <div className="rounded-3xl border border-rose-200 bg-rose-50 p-6 text-sm text-rose-700">
          {errorMessage}
        </div>
      </main>
    );
  }

  return (
    <main className="mx-auto max-w-xl px-6 py-16">
      <div className="rounded-3xl border border-zinc-200 bg-white p-6 shadow-sm">
        <h1 className="text-2xl font-semibold text-zinc-900">Cambio programado</h1>
        <p className="mt-3 text-sm text-zinc-600">
          {checkoutMessage ?? "Estamos preparando el checkout."}
        </p>
      </div>
    </main>
  );
}
