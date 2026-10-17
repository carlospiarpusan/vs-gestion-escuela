import { NextResponse } from "next/server";
import { authorizeApiRequest, resolveEscuelaIdForRequest } from "@/lib/api-auth";
import { getServerDbPool } from "@/lib/server-db";
import { getRateLimitKey, rateLimit } from "@/lib/rate-limit";
import {
  canManageVsBilling,
  canIssueVsBilling,
  INVOICE_STAFF_ROLES,
  VS_BILLING_SCHOOL,
} from "./scope";
import { authenticateConnectionToken } from "./service";

export const CONNECTION_HEADERS = {
  "Cache-Control": "private, no-store",
  "Referrer-Policy": "no-referrer",
  "X-Content-Type-Options": "nosniff",
};

export function connectionError(error: string, status: number) {
  return NextResponse.json(
    { error },
    {
      status,
      headers: {
        ...CONNECTION_HEADERS,
        ...(status === 429 ? { "Retry-After": "60" } : {}),
      },
    }
  );
}

export async function authorizeConnectionManager(request: Request) {
  return authorizeStaff(request, false);
}
export async function authorizeInvoiceStaff(request: Request) {
  return authorizeStaff(request, true);
}
async function authorizeStaff(request: Request, invoice: boolean) {
  const auth = await authorizeApiRequest(
    invoice ? INVOICE_STAFF_ROLES : ["super_admin", "admin_escuela"]
  );
  if (!auth.ok) return auth;
  if (
    !(invoice ? canIssueVsBilling : canManageVsBilling)(
      process.env.VS_BILLING_API_ENABLED === "true",
      auth.perfil,
      resolveEscuelaIdForRequest(request, auth.perfil)
    )
  ) {
    return { ok: false as const, response: connectionError("Conexion no disponible.", 404) };
  }
  if (request.method !== "GET") {
    if (request.headers.get("origin") !== new URL(request.url).origin) {
      return { ok: false as const, response: connectionError("Origen no autorizado.", 403) };
    }
  }
  const school = await getServerDbPool().query<{ cif: string }>(
    "select cif from public.escuelas where id = $1",
    [VS_BILLING_SCHOOL.id]
  );
  const nit = school.rows[0]?.cif?.replace(/[.\s]/g, "");
  if (nit !== VS_BILLING_SCHOOL.nit && nit !== `${VS_BILLING_SCHOOL.nit}-${VS_BILLING_SCHOOL.dv}`) {
    return {
      ok: false as const,
      response: connectionError(
        "El NIT de la escuela no coincide con la conexion autorizada.",
        409
      ),
    };
  }
  return auth;
}

export async function authorizeBillingConsumer(request: Request) {
  if (process.env.VS_BILLING_API_ENABLED !== "true") {
    return { ok: false as const, response: connectionError("Conexion no disponible.", 404) };
  }
  const attempts = await rateLimit(getRateLimitKey(request, "vs-facturacion:auth"), 120, 60_000);
  if (!attempts.ok)
    return { ok: false as const, response: connectionError("Demasiadas solicitudes.", 429) };
  const keyId = await authenticateConnectionToken(request.headers.get("authorization"));
  if (!keyId)
    return {
      ok: false as const,
      response: connectionError("Credencial no valida o vencida.", 401),
    };
  const allowed = await rateLimit(`vs-facturacion:key:${keyId}`, 60, 60_000);
  if (!allowed.ok)
    return { ok: false as const, response: connectionError("Limite de consultas alcanzado.", 429) };
  return { ok: true as const, keyId };
}

export function connectionUnavailable() {
  // No incluir SQL, tokens ni datos personales en respuestas o registros.
  return connectionError("No se pudo completar la consulta de facturacion.", 503);
}
