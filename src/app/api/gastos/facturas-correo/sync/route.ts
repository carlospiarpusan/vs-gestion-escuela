import { NextResponse } from "next/server";
import { z } from "zod";
import { authorizeApiRequest, ensureSchoolScope, parseJsonBody } from "@/lib/api-auth";
import { syncEmailInvoiceIntegrationBySchool } from "@/lib/email-invoice-sync";
import type { Rol } from "@/types/database";

export const runtime = "nodejs";

const ALLOWED_ROLES: Rol[] = ["super_admin", "admin_escuela", "admin_sede", "administrativo"];

const syncSchema = z.object({
  escuela_id: z.string().uuid().optional(),
  mode: z.enum(["incremental", "historical"]).optional().default("incremental"),
  months_back: z.number().int().min(1).max(120).optional(),
  max_messages: z.number().int().min(1).max(2000).optional(),
});

function resolveEscuelaId(perfil: { rol: Rol; escuela_id: string | null }, requestedEscuelaId?: string) {
  if (perfil.rol === "super_admin") {
    return requestedEscuelaId || null;
  }
  return perfil.escuela_id;
}

export async function POST(request: Request) {
  const authorization = await authorizeApiRequest(ALLOWED_ROLES);
  if (!authorization.ok) return authorization.response;

  const parsed = await parseJsonBody(request, syncSchema);
  if (!parsed.ok) return parsed.response;

  const { perfil } = authorization;
  const escuelaId = resolveEscuelaId(perfil, parsed.data.escuela_id);

  if (!escuelaId) {
    return NextResponse.json({ error: "No se encontro una escuela valida para sincronizar." }, { status: 400 });
  }

  const schoolScopeError = ensureSchoolScope(perfil, escuelaId);
  if (schoolScopeError) {
    return NextResponse.json({ error: schoolScopeError }, { status: 403 });
  }

  try {
    const summary = await syncEmailInvoiceIntegrationBySchool(escuelaId, {
      mode: parsed.data.mode,
      monthsBack: parsed.data.months_back,
      maxMessages: parsed.data.max_messages,
    });
    return NextResponse.json({ summary });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "No se pudo sincronizar el correo de facturas." },
      { status: 500 }
    );
  }
}
