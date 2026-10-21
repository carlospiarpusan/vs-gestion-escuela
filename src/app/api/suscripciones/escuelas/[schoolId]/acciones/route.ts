import { NextResponse } from "next/server";
import { z } from "zod";
import { authorizeApiRequest, parseJsonBody } from "@/lib/api-auth";
import {
  performSchoolSubscriptionAdminAction,
  type SchoolSubscriptionAdminActionInput,
} from "@/lib/school-subscription-service";
import { getServerDbPool } from "@/lib/server-db";
import {
  buildDashboardInvalidationTags,
  buildDashboardListInvalidationTags,
  buildScopeCacheTags,
} from "@/lib/server-cache-tags";
import { revalidateServerReadCache } from "@/lib/server-read-cache";

export const runtime = "nodejs";

const paidIntervalSchema = z.enum(["monthly", "annual"]);

const actionSchema = z.discriminatedUnion("action", [
  z.object({
    action: z.literal("start_checkout"),
    plan_id: z.enum(["basico", "profesional", "enterprise"]),
    billing_interval: paidIntervalSchema,
    mode: z.enum(["renewal", "activation", "change_immediate"]).optional(),
  }),
  z.object({
    action: z.literal("grant_manual_cycle"),
    plan_id: z.enum(["basico", "profesional", "enterprise"]),
    billing_interval: paidIntervalSchema,
    starts_at: z.string().datetime().optional(),
    reason: z.string().trim().min(3).optional(),
  }),
  z.object({
    action: z.literal("extend_trial"),
    days: z.number().int().min(1).max(365),
    reason: z.string().trim().min(5),
  }),
  z.object({
    action: z.literal("extend_grace"),
    days: z.number().int().min(1).max(90),
    reason: z.string().trim().min(5),
  }),
  z.object({
    action: z.literal("schedule_change"),
    plan_id: z.enum(["basico", "profesional", "enterprise"]),
    billing_interval: paidIntervalSchema,
    reason: z.string().trim().min(5),
  }),
  z.object({
    action: z.literal("cancel_scheduled_change"),
    reason: z.string().trim().min(3).optional(),
  }),
  z.object({
    action: z.literal("set_read_only"),
    reason: z.string().trim().min(5),
  }),
  z.object({
    action: z.literal("suspend_now"),
    reason: z.string().trim().min(5),
  }),
  z.object({
    action: z.literal("toggle_requires_review"),
    value: z.boolean(),
    reason: z.string().trim().min(3).optional(),
  }),
]);

function mapInput(
  schoolId: string,
  initiatedBy: string,
  data: z.infer<typeof actionSchema>
): SchoolSubscriptionAdminActionInput {
  switch (data.action) {
    case "start_checkout":
      return {
        action: data.action,
        schoolId,
        initiatedBy,
        planId: data.plan_id,
        billingInterval: data.billing_interval,
        mode: data.mode,
      };
    case "grant_manual_cycle":
      return {
        action: data.action,
        schoolId,
        initiatedBy,
        planId: data.plan_id,
        billingInterval: data.billing_interval,
        startsAt: data.starts_at ?? null,
        reason: data.reason?.trim() || "Activación manual desde super admin.",
      };
    case "extend_trial":
    case "extend_grace":
      return {
        action: data.action,
        schoolId,
        initiatedBy,
        days: data.days,
        reason: data.reason,
      };
    case "schedule_change":
      return {
        action: data.action,
        schoolId,
        initiatedBy,
        planId: data.plan_id,
        billingInterval: data.billing_interval,
        reason: data.reason,
      };
    case "cancel_scheduled_change":
      return {
        action: data.action,
        schoolId,
        initiatedBy,
        reason: data.reason,
      };
    case "set_read_only":
    case "suspend_now":
      return {
        action: data.action,
        schoolId,
        initiatedBy,
        reason: data.reason,
      };
    case "toggle_requires_review":
      return {
        action: data.action,
        schoolId,
        initiatedBy,
        value: data.value,
        reason: data.reason,
      };
  }
}

export async function POST(
  request: Request,
  { params }: { params: Promise<{ schoolId: string }> }
) {
  const authz = await authorizeApiRequest(["super_admin"]);
  if (!authz.ok) return authz.response;

  const { schoolId } = await params;
  if (!schoolId) {
    return NextResponse.json({ error: "Falta el identificador de la escuela." }, { status: 400 });
  }

  const parsed = await parseJsonBody(request, actionSchema);
  if (!parsed.ok) return parsed.response;

  try {
    const result = await performSchoolSubscriptionAdminAction(
      getServerDbPool(),
      mapInput(schoolId, authz.perfil.id, parsed.data)
    );

    revalidateServerReadCache([
      ...buildDashboardInvalidationTags("superadmin", { escuelaId: schoolId }),
      ...buildDashboardListInvalidationTags("subscriptions", { escuelaId: schoolId }),
      ...buildScopeCacheTags({ escuelaId: schoolId }),
    ]);

    return NextResponse.json(result);
  } catch (error) {
    console.error("Error al ejecutar acción comercial de super admin:", error);
    return NextResponse.json(
      {
        error:
          error instanceof Error
            ? error.message
            : "No se pudo ejecutar la acción comercial sobre la escuela.",
      },
      { status: 500 }
    );
  }
}
