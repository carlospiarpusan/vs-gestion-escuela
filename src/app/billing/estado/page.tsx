import Link from "next/link";
import { requestHubStatus } from "@/lib/billing/hub";

type BillingEstadoPageProps = {
  searchParams?: Promise<{ payment_reference?: string; reference?: string }>;
};

function getStatusLabel(status: string) {
  switch (status) {
    case "approved":
      return "Pago aprobado";
    case "pending":
    case "created":
      return "Pago pendiente";
    case "declined":
      return "Pago rechazado";
    case "expired":
      return "Pago vencido";
    case "cancelled":
      return "Pago cancelado";
    default:
      return "Pago con error";
  }
}

function getStatusClasses(status: string) {
  switch (status) {
    case "approved":
      return "border-emerald-200 bg-emerald-50 text-emerald-700";
    case "pending":
    case "created":
      return "border-amber-200 bg-amber-50 text-amber-700";
    default:
      return "border-rose-200 bg-rose-50 text-rose-700";
  }
}

function formatCOP(valueInCents: number) {
  return new Intl.NumberFormat("es-CO", {
    style: "currency",
    currency: "COP",
    maximumFractionDigits: 0,
  }).format(Math.trunc(valueInCents / 100));
}

export default async function BillingEstadoPage({ searchParams }: BillingEstadoPageProps) {
  const params = await searchParams;
  const reference = params?.payment_reference?.trim() || params?.reference?.trim();

  if (!reference) {
    return (
      <main className="mx-auto max-w-xl px-6 py-16">
        <div className="rounded-3xl border border-amber-200 bg-amber-50 p-6 text-sm text-amber-900">
          Falta la referencia del pago.
        </div>
      </main>
    );
  }

  let statusData: Awaited<ReturnType<typeof requestHubStatus>> | null = null;
  let errorMessage: string | null = null;

  try {
    statusData = await requestHubStatus(reference);
  } catch (error) {
    errorMessage =
      error instanceof Error ? error.message : "No se pudo consultar el estado del pago.";
  }

  if (errorMessage || !statusData) {
    return (
      <main className="mx-auto max-w-xl px-6 py-16">
        <div className="rounded-3xl border border-rose-200 bg-rose-50 p-6 text-sm text-rose-700">
          {errorMessage ?? "No se pudo consultar el estado del pago."}
        </div>
      </main>
    );
  }

  const normalizedStatus = String(statusData.estado ?? "").toLowerCase();

  return (
    <main className="mx-auto max-w-2xl px-6 py-16">
      <div className={`rounded-3xl border p-6 ${getStatusClasses(normalizedStatus)}`}>
        <h1 className="text-2xl font-semibold">{getStatusLabel(normalizedStatus)}</h1>
        <p className="mt-3 text-sm">
          Referencia: <span className="font-semibold">{statusData.reference}</span>
        </p>
      </div>

      <div className="mt-6 rounded-3xl border border-zinc-200 bg-white p-6 shadow-sm">
        <div className="grid gap-4 sm:grid-cols-2">
          <div>
            <p className="text-xs font-semibold tracking-[0.16em] text-zinc-500 uppercase">Plan</p>
            <p className="mt-2 text-lg font-semibold text-zinc-900">{statusData.plan_name}</p>
          </div>
          <div>
            <p className="text-xs font-semibold tracking-[0.16em] text-zinc-500 uppercase">
              Intervalo
            </p>
            <p className="mt-2 text-lg font-semibold text-zinc-900">
              {statusData.billing_interval === "annual" ? "Anual" : "Mensual"}
            </p>
          </div>
          <div>
            <p className="text-xs font-semibold tracking-[0.16em] text-zinc-500 uppercase">Valor</p>
            <p className="mt-2 text-lg font-semibold text-zinc-900">
              {formatCOP(statusData.amount_in_cents)}
            </p>
          </div>
          <div>
            <p className="text-xs font-semibold tracking-[0.16em] text-zinc-500 uppercase">
              Estado Wompi
            </p>
            <p className="mt-2 text-lg font-semibold text-zinc-900">
              {statusData.wompi_transaction_status ?? "Sin dato"}
            </p>
          </div>
        </div>

        <div className="mt-6 flex flex-wrap gap-3">
          <Link
            href="/login"
            className="inline-flex min-h-[44px] items-center rounded-2xl bg-[#2563eb] px-4 py-2 text-sm font-semibold text-white"
          >
            Ir a ConduSoft
          </Link>
          <Link
            href="/"
            className="inline-flex min-h-[44px] items-center rounded-2xl border border-zinc-300 px-4 py-2 text-sm font-semibold text-zinc-700"
          >
            Volver al inicio
          </Link>
        </div>
      </div>
    </main>
  );
}
