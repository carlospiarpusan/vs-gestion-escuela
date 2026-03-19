import { NextResponse } from "next/server";
import { z } from "zod";
import {
  authorizeApiRequest,
  ensureSchoolScope,
  ensureSedeScope,
  parseJsonBody,
  resolveEscuelaIdForRequest,
} from "@/lib/api-auth";
import {
  deleteEmailInvoiceIntegration,
  getEmailInvoiceIntegrationState,
  saveEmailInvoiceIntegration,
} from "@/lib/email-invoice-sync";
import type { Rol } from "@/types/database";

export const runtime = "nodejs";

const ALLOWED_ROLES: Rol[] = ["super_admin", "admin_escuela", "admin_sede", "administrativo"];

const integrationSchema = z.object({
  escuela_id: z.string().uuid().optional(),
  sede_id: z.string().uuid("Sede inválida."),
  correo: z.string().email("Correo inválido."),
  imap_host: z.string().min(3, "Host IMAP inválido."),
  imap_port: z.number().int().min(1).max(65535),
  imap_secure: z.boolean(),
  imap_user: z.string().min(3, "Usuario IMAP inválido."),
  imap_password: z.string().trim().min(3).optional().nullable(),
  mailbox: z.string().trim().min(1).max(120).optional().default("INBOX"),
  from_filter: z.string().trim().max(160).optional().nullable(),
  subject_filter: z.string().trim().max(160).optional().nullable(),
  import_only_unseen: z.boolean().optional().default(true),
  auto_sync: z.boolean().optional().default(true),
  activa: z.boolean().optional().default(true),
});

export async function GET(request: Request) {
  const authorization = await authorizeApiRequest(ALLOWED_ROLES);
  if (!authorization.ok) return authorization.response;

  const { perfil } = authorization;
  const url = new URL(request.url);
  const escuelaId = resolveEscuelaIdForRequest(request, perfil, url.searchParams.get("escuela_id"));

  if (!escuelaId) {
    return NextResponse.json(
      { error: "No se encontro una escuela valida para la integracion." },
      { status: 400 }
    );
  }

  const schoolScopeError = ensureSchoolScope(perfil, escuelaId);
  if (schoolScopeError) {
    return NextResponse.json({ error: schoolScopeError }, { status: 403 });
  }

  try {
    const payload = await getEmailInvoiceIntegrationState(escuelaId);
    return NextResponse.json(payload);
  } catch (error) {
    return NextResponse.json(
      {
        error:
          error instanceof Error ? error.message : "No se pudo cargar la integracion de correo.",
      },
      { status: 500 }
    );
  }
}

export async function POST(request: Request) {
  const authorization = await authorizeApiRequest(ALLOWED_ROLES);
  if (!authorization.ok) return authorization.response;

  const { perfil } = authorization;
  const parsed = await parseJsonBody(request, integrationSchema);
  if (!parsed.ok) return parsed.response;

  const escuelaId = resolveEscuelaIdForRequest(request, perfil, parsed.data.escuela_id);
  if (!escuelaId) {
    return NextResponse.json(
      { error: "No se encontro una escuela valida para la integracion." },
      { status: 400 }
    );
  }

  const schoolScopeError = ensureSchoolScope(perfil, escuelaId);
  if (schoolScopeError) {
    return NextResponse.json({ error: schoolScopeError }, { status: 403 });
  }

  const sedeScopeError = ensureSedeScope(perfil, parsed.data.sede_id);
  if (sedeScopeError) {
    return NextResponse.json({ error: sedeScopeError }, { status: 403 });
  }

  try {
    const integration = await saveEmailInvoiceIntegration({
      escuelaId,
      actorId: perfil.id,
      sedeId: parsed.data.sede_id,
      correo: parsed.data.correo,
      imapHost: parsed.data.imap_host,
      imapPort: parsed.data.imap_port,
      imapSecure: parsed.data.imap_secure,
      imapUser: parsed.data.imap_user,
      imapPassword: parsed.data.imap_password ?? null,
      mailbox: parsed.data.mailbox,
      fromFilter: parsed.data.from_filter ?? null,
      subjectFilter: parsed.data.subject_filter ?? null,
      importOnlyUnseen: parsed.data.import_only_unseen,
      autoSync: parsed.data.auto_sync,
      activa: parsed.data.activa,
    });

    return NextResponse.json({ integration });
  } catch (error) {
    return NextResponse.json(
      {
        error:
          error instanceof Error ? error.message : "No se pudo guardar la integracion de correo.",
      },
      { status: 500 }
    );
  }
}

export async function DELETE(request: Request) {
  const authorization = await authorizeApiRequest(ALLOWED_ROLES);
  if (!authorization.ok) return authorization.response;

  const { perfil } = authorization;
  const url = new URL(request.url);
  const escuelaId = resolveEscuelaIdForRequest(request, perfil, url.searchParams.get("escuela_id"));

  if (!escuelaId) {
    return NextResponse.json(
      { error: "No se encontro una escuela valida para la integracion." },
      { status: 400 }
    );
  }

  const schoolScopeError = ensureSchoolScope(perfil, escuelaId);
  if (schoolScopeError) {
    return NextResponse.json({ error: schoolScopeError }, { status: 403 });
  }

  try {
    await deleteEmailInvoiceIntegration(escuelaId);
    return NextResponse.json({ ok: true });
  } catch (error) {
    return NextResponse.json(
      {
        error:
          error instanceof Error ? error.message : "No se pudo eliminar la integracion de correo.",
      },
      { status: 500 }
    );
  }
}
