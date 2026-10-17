import { NextResponse } from "next/server";
import { z } from "zod";
import { authorizeApiRequest, parseJsonBody } from "@/lib/api-auth";
import {
  createSchoolCheckoutSession,
  loadSchoolSubscriptionAccess,
} from "@/lib/school-subscription-service";
import { getServerDbPool } from "@/lib/server-db";

export const runtime = "nodejs";

const checkoutSchema = z.object({
  plan_id: z.enum(["basico", "profesional", "enterprise"]).optional(),
  billing_interval: z.enum(["monthly", "annual"]).optional(),
  mode: z.enum(["renewal", "activation", "change_immediate"]).optional(),
});

export async function POST(request: Request) {
  const authz = await authorizeApiRequest(["admin_escuela"]);
  if (!authz.ok) return authz.response;

  if (!authz.perfil.escuela_id) {
    return NextResponse.json({ error: "No se encontró la escuela del usuario." }, { status: 400 });
  }

  const parsed = await parseJsonBody(request, checkoutSchema);
  if (!parsed.ok) return parsed.response;

  try {
    const pool = getServerDbPool();
    const access = await loadSchoolSubscriptionAccess(pool, authz.perfil.escuela_id);
    if (!access) {
      return NextResponse.json(
        { error: "No se pudo resolver el estado comercial de la escuela." },
        { status: 400 }
      );
    }

    const targetPlanId = parsed.data.plan_id || access.scheduled_plan_id || access.plan_id;
    const targetBillingInterval =
      parsed.data.billing_interval ||
      access.scheduled_billing_interval ||
      (access.billing_interval === "annual" ? "annual" : "monthly");

    const mode =
      parsed.data.mode ||
      (access.actual_status === "trialing" ||
      access.actual_status === "read_only" ||
      access.actual_status === "suspended"
        ? "activation"
        : "renewal");

    const payload = await createSchoolCheckoutSession(pool, {
      schoolId: authz.perfil.escuela_id,
      initiatedBy: authz.perfil.id,
      targetPlanId,
      targetBillingInterval,
      mode,
    });

    return NextResponse.json(payload);
  } catch (error) {
    console.error("Error al preparar checkout de Wompi:", error);
    return NextResponse.json(
      {
        error: error instanceof Error ? error.message : "No se pudo preparar el checkout de Wompi.",
      },
      { status: 500 }
    );
  }
}
