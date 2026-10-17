import { NextResponse } from "next/server";
import { z } from "zod";
import { applyBillingHubPaymentConfirmation } from "@/lib/school-subscription-service";
import { getServerDbPool } from "@/lib/server-db";
import {
  buildDashboardCacheTags,
  buildDashboardListCacheTags,
  buildScopeCacheTags,
} from "@/lib/server-cache-tags";
import { revalidateServerReadCache } from "@/lib/server-read-cache";
import { verifyInternalSignature } from "@/lib/billing/hub";

export const runtime = "nodejs";

const schema = z.object({
  reference: z.string().trim().min(1),
  empresa_id: z.string().trim().min(1),
  product_code: z.literal("condusoft"),
  plan_code: z.enum(["basico", "profesional", "enterprise"]),
  plan_name: z.string().trim().min(1),
  operation_type: z.enum(["new_subscription", "renewal", "upgrade", "downgrade_schedule"]),
  billing_interval: z.enum(["monthly", "annual"]),
  period_start: z.string().datetime(),
  period_end: z.string().datetime(),
  amount_paid: z.number().nonnegative(),
  transaction_id: z.string().trim().min(1).nullable(),
  transaction_status: z.string().trim().min(1).nullable(),
});

export async function POST(request: Request) {
  try {
    const rawText = await request.text();
    const timestamp = request.headers.get("x-billing-timestamp") ?? "";
    const signature = request.headers.get("x-billing-signature") ?? "";
    const productCode = request.headers.get("x-product-code") ?? "";

    if (productCode !== "condusoft" || !timestamp || !signature) {
      return NextResponse.json({ error: "No autorizado." }, { status: 401 });
    }

    if (!verifyInternalSignature(rawText, timestamp, signature)) {
      return NextResponse.json({ error: "Firma inválida." }, { status: 401 });
    }

    const parsed = schema.safeParse(JSON.parse(rawText));
    if (!parsed.success) {
      return NextResponse.json({ error: "Payload inválido." }, { status: 400 });
    }

    await applyBillingHubPaymentConfirmation(getServerDbPool(), parsed.data, parsed.data);

    revalidateServerReadCache([
      ...buildDashboardCacheTags("superadmin", { escuelaId: parsed.data.empresa_id }),
      ...buildDashboardListCacheTags("subscriptions", { escuelaId: parsed.data.empresa_id }),
      ...buildScopeCacheTags({ escuelaId: parsed.data.empresa_id }),
    ]);

    return NextResponse.json({ ok: true });
  } catch (error) {
    return NextResponse.json(
      {
        error: error instanceof Error ? error.message : "No se pudo confirmar el pago interno.",
      },
      { status: 500 }
    );
  }
}
