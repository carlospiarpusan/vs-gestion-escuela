import { redirect } from "next/navigation";
import { PublicBillingTokenError, verifyPublicBillingToken } from "@/lib/billing/hub";
import { startPublicBillingCheckout } from "@/lib/billing/public-checkout";
import { SchoolPlanUnavailableError } from "@/lib/school-subscription-service";

type BillingPagarPageProps = {
  searchParams?: Promise<{ token?: string | string[] }>;
};

export default async function BillingPagarPage({ searchParams }: BillingPagarPageProps) {
  const rawToken = (await searchParams)?.token;
  const token = typeof rawToken === "string" ? rawToken.trim() : "";

  if (!token) {
    return (
      <main className="mx-auto max-w-xl px-6 py-16">
        <div className="rounded-3xl border border-amber-200 bg-amber-50 p-6 text-sm text-amber-900">
          {Array.isArray(rawToken) ? "Token de pago inválido." : "Falta el token de pago."}
        </div>
      </main>
    );
  }

  let redirectTarget: string | null = null;
  let checkoutMessage: string | null = null;
  let errorMessage: string | null = null;

  try {
    const payment = await startPublicBillingCheckout(verifyPublicBillingToken(token));
    if (payment) {
      redirectTarget = payment.url;
      checkoutMessage = payment.message;
    } else {
      errorMessage = "Este enlace de pago ya fue utilizado, está en uso o expiró.";
    }
  } catch (error) {
    if (error instanceof PublicBillingTokenError || error instanceof SchoolPlanUnavailableError) {
      errorMessage = error.message;
    } else {
      console.error("billing.pagar.failed");
      errorMessage = "No fue posible iniciar el pago. Vuelve a abrir el enlace para intentarlo.";
    }
  }

  if (redirectTarget) {
    redirect(redirectTarget);
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
