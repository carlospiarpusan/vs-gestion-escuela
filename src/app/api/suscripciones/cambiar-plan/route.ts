import { NextResponse } from "next/server";
import { z } from "zod";
import { authorizeApiRequest, parseJsonBody } from "@/lib/api-auth";
import {
  createSchoolCheckoutSession,
  scheduleSchoolPlanChange,
} from "@/lib/school-subscription-service";
import { getServerDbPool } from "@/lib/server-db";

export const runtime = "nodejs";

const changePlanSchema = z.object({
  plan_id: z.enum(["basico", "profesional", "enterprise"]),
  billing_interval: z.enum(["monthly", "annual"]),
  timing: z.enum(["immediate", "next_cycle"]),
});

export async function POST(request: Request) {
  const authz = await authorizeApiRequest(["admin_escuela"]);
  if (!authz.ok) return authz.response;

  if (!authz.perfil.escuela_id) {
    return NextResponse.json({ error: "No se encontró la escuela del usuario." }, { status: 400 });
  }

  const parsed = await parseJsonBody(request, changePlanSchema);
  if (!parsed.ok) return parsed.response;

  try {
    const pool = getServerDbPool();

    if (parsed.data.timing === "next_cycle") {
      await scheduleSchoolPlanChange(pool, {
        schoolId: authz.perfil.escuela_id,
        planId: parsed.data.plan_id,
        billingInterval: parsed.data.billing_interval,
      });

      return NextResponse.json({
        success: true,
        mode: "scheduled",
      });
    }

    const checkout = await createSchoolCheckoutSession(pool, {
      schoolId: authz.perfil.escuela_id,
      initiatedBy: authz.perfil.id,
      targetPlanId: parsed.data.plan_id,
      targetBillingInterval: parsed.data.billing_interval,
      mode: "change_immediate",
    });

    return NextResponse.json({
      success: true,
      mode: "checkout_required",
      checkout,
    });
  } catch (error) {
    console.error("Error al cambiar el plan:", error);
    return NextResponse.json(
      {
        error: error instanceof Error ? error.message : "No se pudo procesar el cambio de plan.",
      },
      { status: 500 }
    );
  }
}
