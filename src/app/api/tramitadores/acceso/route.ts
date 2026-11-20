import { NextResponse } from "next/server";
import { z } from "zod";
import {
  authorizeApiRequest,
  buildSupabaseAdminClient,
  createAuthUserWithRetryOnCollision,
  isAuthUserAlreadyRegisteredError,
  normalizeCedula,
  parseJsonBody,
  resolveEscuelaIdForRequest,
} from "@/lib/api-auth";
import { getRateLimitKey, rateLimit } from "@/lib/rate-limit";
import { getServerDbPool } from "@/lib/server-db";
import { TRAMITADOR_MANAGE_ROLES } from "@/lib/tramitadores";
import { TramitadorError, getTramitador } from "@/lib/tramitadores-server";

const createSchema = z.object({
  tramitador_id: z.string().uuid(),
  documento: z.string().trim().min(5).max(30),
});
const toggleSchema = z.object({ tramitador_id: z.string().uuid(), activo: z.boolean() });

async function loadScoped(
  request: Request,
  perfil: Parameters<typeof resolveEscuelaIdForRequest>[1],
  id: string
) {
  const tramitador = await getTramitador(getServerDbPool(), id);
  const escuelaId = resolveEscuelaIdForRequest(request, perfil, tramitador?.escuela_id);
  if (!tramitador || tramitador.escuela_id !== escuelaId) {
    throw new TramitadorError("El tramitador no existe.", 404);
  }
  return tramitador;
}

function fail(error: unknown, fallback: string) {
  if (error instanceof TramitadorError) {
    return NextResponse.json({ error: error.message }, { status: error.status });
  }
  console.error("[API TRAMITADORES/ACCESO]", error);
  return NextResponse.json({ error: fallback }, { status: 500 });
}

/**
 * Crea el usuario del tramitador: entra con su cédula y la cédula como contraseña
 * inicial (se le pide cambiarla). El perfil no lleva escuela ni sede: su único
 * vínculo es la ficha del tramitador, así que solo ve sus alumnos.
 */
export async function POST(request: Request) {
  const authz = await authorizeApiRequest(TRAMITADOR_MANAGE_ROLES, request);
  if (!authz.ok) return authz.response;

  const limiter = await rateLimit(
    getRateLimitKey(request, "api:tramitador-acceso", authz.perfil.id),
    20,
    15 * 60 * 1000
  );
  if (!limiter.ok) {
    return NextResponse.json(
      { error: "Demasiadas solicitudes. Intenta más tarde." },
      { status: 429 }
    );
  }

  const parsed = await parseJsonBody(request, createSchema);
  if (!parsed.ok) return parsed.response;
  const documento = normalizeCedula(parsed.data.documento);
  if (!documento || /[@\s]/.test(documento)) {
    return NextResponse.json({ error: "Cédula inválida." }, { status: 400 });
  }

  try {
    const tramitador = await loadScoped(request, authz.perfil, parsed.data.tramitador_id);
    if (tramitador.perfil_id) throw new TramitadorError("Este tramitador ya tiene acceso.");
    if (!tramitador.activo)
      throw new TramitadorError("Activa el tramitador antes de darle acceso.");

    const pool = getServerDbPool();
    const existing = await pool.query(
      "select 1 from public.perfiles where lower(cedula) = lower($1) limit 1",
      [documento]
    );
    if (existing.rows[0]) {
      throw new TramitadorError("La cédula ya tiene una cuenta registrada.");
    }

    const supabaseAdmin = buildSupabaseAdminClient();
    const authEmail = `${documento.toLowerCase()}@tramitador.local`;
    const { data: authData, error: authError } = await createAuthUserWithRetryOnCollision(
      supabaseAdmin,
      {
        email: authEmail,
        password: documento,
        email_confirm: true,
        user_metadata: {
          nombre: tramitador.nombre,
          rol: "tramitador",
          debe_cambiar_password: true,
        },
      },
      { allowOrphanCleanup: true }
    );
    if (authError || !authData?.user) {
      throw new TramitadorError(
        isAuthUserAlreadyRegisteredError(authError?.message)
          ? "La cédula ya tiene una cuenta registrada."
          : "No se pudo crear el usuario del tramitador."
      );
    }

    const userId = authData.user.id;
    const client = await pool.connect();
    try {
      await client.query("BEGIN");
      await client.query(
        `insert into public.perfiles (id, escuela_id, sede_id, nombre, email, rol, cedula, activo)
         values ($1, null, null, $2, $3, 'tramitador', $4, true)
         on conflict (id) do update set escuela_id = null, sede_id = null, nombre = excluded.nombre,
           email = excluded.email, rol = 'tramitador', cedula = excluded.cedula, activo = true`,
        [userId, tramitador.nombre, authEmail, documento]
      );
      const linked = await client.query(
        `update public.tramitadores set perfil_id = $2, documento = coalesce(documento, $3)
         where id = $1 and perfil_id is null`,
        [tramitador.id, userId, documento]
      );
      if (linked.rowCount !== 1) throw new TramitadorError("Este tramitador ya tiene acceso.");
      await client.query("COMMIT");
    } catch (error) {
      await client.query("ROLLBACK").catch(() => undefined);
      await supabaseAdmin.auth.admin.deleteUser(userId).catch(() => undefined);
      throw error;
    } finally {
      client.release();
    }

    return NextResponse.json({ ok: true });
  } catch (error) {
    return fail(error, "No se pudo crear el acceso.");
  }
}

/** Activa o bloquea el acceso del tramitador sin borrar su usuario. */
export async function PATCH(request: Request) {
  const authz = await authorizeApiRequest(TRAMITADOR_MANAGE_ROLES, request);
  if (!authz.ok) return authz.response;
  const parsed = await parseJsonBody(request, toggleSchema);
  if (!parsed.ok) return parsed.response;

  try {
    const tramitador = await loadScoped(request, authz.perfil, parsed.data.tramitador_id);
    if (!tramitador.perfil_id) throw new TramitadorError("Este tramitador no tiene acceso.");
    if (parsed.data.activo && !tramitador.activo) {
      throw new TramitadorError("Activa el tramitador antes de habilitar su acceso.");
    }
    await getServerDbPool().query(
      "update public.perfiles set activo = $2 where id = $1 and rol = 'tramitador'",
      [tramitador.perfil_id, parsed.data.activo]
    );
    if (!parsed.data.activo) {
      // Cierra las sesiones abiertas del tramitador.
      await buildSupabaseAdminClient()
        .auth.admin.signOut(tramitador.perfil_id, "global")
        .catch(() => undefined);
    }
    return NextResponse.json({ ok: true });
  } catch (error) {
    return fail(error, "No se pudo actualizar el acceso.");
  }
}
