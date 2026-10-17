import { NextResponse } from "next/server";
import { z } from "zod";
import { parseJsonBody } from "@/lib/api-auth";
import { rateLimit } from "@/lib/rate-limit";
import {
  authorizeConnectionManager,
  CONNECTION_HEADERS,
  connectionError,
  connectionUnavailable,
} from "@/lib/vs-billing/access";
import {
  listConnectionKeys,
  revokeConnectionKey,
  rotateConnectionKey,
  updateConnectionExpiry,
  deleteConnectionKey,
} from "@/lib/vs-billing/service";
import { VS_BILLING_SCHOOL } from "@/lib/vs-billing/scope";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
const expirySchema = z.iso
  .datetime({ offset: true })
  .refine((value) => Date.parse(value) > Date.now(), "La vigencia debe ser una fecha futura.")
  .nullable();
const createSchema = z.strictObject({
  nombre: z.string().trim().min(1).max(80),
  confirmar_rotacion: z.literal(true),
  expires_at: expirySchema.optional(),
});
const updateSchema = z.strictObject({ id: z.uuid(), expires_at: expirySchema });
const revokeSchema = z.strictObject({
  id: z.uuid(),
  accion: z.enum(["revocar", "eliminar"]).default("revocar"),
});

export async function GET(request: Request) {
  try {
    const auth = await authorizeConnectionManager(request);
    if (!auth.ok) return auth.response;
    return NextResponse.json(
      { empresa: VS_BILLING_SCHOOL, claves: await listConnectionKeys() },
      { headers: CONNECTION_HEADERS }
    );
  } catch {
    return connectionUnavailable();
  }
}

export async function POST(request: Request) {
  try {
    const auth = await authorizeConnectionManager(request);
    if (!auth.ok) return auth.response;
    const body = await parseJsonBody(request, createSchema);
    if (!body.ok) return body.response;
    const allowed = await rateLimit(`vs-facturacion:rotate:${auth.perfil.id}`, 3, 60_000);
    if (!allowed.ok) return connectionError("Espera antes de generar otra clave.", 429);
    return NextResponse.json(
      await rotateConnectionKey(body.data.nombre, auth.perfil.id, body.data.expires_at),
      {
        status: 201,
        headers: CONNECTION_HEADERS,
      }
    );
  } catch {
    return connectionUnavailable();
  }
}

export async function PATCH(request: Request) {
  try {
    const auth = await authorizeConnectionManager(request);
    if (!auth.ok) return auth.response;
    const body = await parseJsonBody(request, updateSchema);
    if (!body.ok) return body.response;
    const allowed = await rateLimit(`vs-facturacion:edit:${auth.perfil.id}`, 20, 60_000);
    if (!allowed.ok) return connectionError("Espera antes de editar otra vigencia.", 429);
    const clave = await updateConnectionExpiry(body.data.id, body.data.expires_at, auth.perfil.id);
    if (!clave) return connectionError("La clave no existe o ya no permite cambios.", 404);
    return NextResponse.json({ clave }, { headers: CONNECTION_HEADERS });
  } catch {
    return connectionUnavailable();
  }
}

export async function DELETE(request: Request) {
  try {
    const auth = await authorizeConnectionManager(request);
    if (!auth.ok) return auth.response;
    const body = await parseJsonBody(request, revokeSchema);
    if (!body.ok) return body.response;
    if (body.data.accion === "eliminar") await deleteConnectionKey(body.data.id, auth.perfil.id);
    else await revokeConnectionKey(body.data.id, auth.perfil.id);
    return NextResponse.json({ ok: true }, { headers: CONNECTION_HEADERS });
  } catch {
    return connectionUnavailable();
  }
}
