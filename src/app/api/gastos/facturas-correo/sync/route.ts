import { NextResponse } from "next/server";
import { z } from "zod";
import {
  authorizeApiRequest,
  ensureSchoolScope,
  getStaffReadSedeScope,
  parseJsonBody,
  resolveEscuelaIdForRequest,
} from "@/lib/api-auth";
import {
  assertEmailInvoiceSedeScope,
  EmailInvoiceScopeError,
  syncEmailInvoiceIntegrationBySchool,
} from "@/lib/email-invoice-sync";
import { getAuditedRolesForCapabilityAction } from "@/lib/role-capabilities";
import { MailProviderError } from "@/lib/email-oauth-providers";
import type { Rol } from "@/types/database";

export const runtime = "nodejs";
export const maxDuration = 300;

const ALLOWED_ROLES: Rol[] = getAuditedRolesForCapabilityAction("automation", "sync");

const syncSchema = z.object({
  escuela_id: z.string().uuid().optional(),
  mode: z.enum(["incremental", "historical"]).optional().default("incremental"),
  months_back: z.number().int().min(1).max(120).optional(),
  max_messages: z.number().int().min(1).max(2000).optional(),
});

export async function POST(request: Request) {
  const authorization = await authorizeApiRequest(ALLOWED_ROLES);
  if (!authorization.ok) return authorization.response;

  const parsed = await parseJsonBody(request, syncSchema);
  if (!parsed.ok) return parsed.response;

  const { perfil } = authorization;
  const scope = getStaffReadSedeScope(perfil);
  if (scope.error) return NextResponse.json({ error: scope.error }, { status: 403 });
  const escuelaId = resolveEscuelaIdForRequest(request, perfil, parsed.data.escuela_id);

  if (!escuelaId) {
    return NextResponse.json(
      { error: "No se encontro una escuela valida para sincronizar." },
      { status: 400 }
    );
  }

  const schoolScopeError = ensureSchoolScope(perfil, escuelaId);
  if (schoolScopeError) {
    return NextResponse.json({ error: schoolScopeError }, { status: 403 });
  }

  try {
    await assertEmailInvoiceSedeScope(escuelaId, scope.sedeId);
    const summary = await syncEmailInvoiceIntegrationBySchool(escuelaId, {
      mode: parsed.data.mode,
      monthsBack: parsed.data.months_back,
      maxMessages: parsed.data.max_messages,
    });
    return NextResponse.json({ summary });
  } catch (error) {
    if (error instanceof MailProviderError) {
      return NextResponse.json(
        { error: error.message, code: `mail_${error.kind}` },
        {
          status: error.kind === "rate_limit" || error.kind === "quota" ? 429 : 502,
          headers:
            error.retryAfterMs != null
              ? { "Retry-After": String(Math.ceil(error.retryAfterMs / 1000)) }
              : undefined,
        }
      );
    }
    return NextResponse.json(
      {
        error:
          error instanceof Error ? error.message : "No se pudo sincronizar el correo de facturas.",
      },
      { status: error instanceof EmailInvoiceScopeError ? 403 : 500 }
    );
  }
}
