import { NextResponse } from "next/server";
import {
  authorizeApiRequest,
  buildSupabaseAdminClient,
  ensureNonReservedAuthEmail,
  isAuthUserAlreadyRegisteredError,
  normalizeEmail,
  normalizeText,
  parseJsonBody,
} from "@/lib/api-auth";
import { createEscuelaSchema } from "@/lib/schemas";
import { getServerDbPool } from "@/lib/server-db";
import { getRateLimitKey, rateLimit } from "@/lib/rate-limit";

export async function POST(request: Request) {
  let createdAuthUserId: string | null = null;

  try {
    const authz = await authorizeApiRequest(["super_admin"]);
    if (!authz.ok) return authz.response;

    const limiter = await rateLimit(
      getRateLimitKey(request, "api:create-escuela", authz.perfil.id),
      10,
      15 * 60 * 1000
    );
    if (!limiter.ok) {
      return NextResponse.json(
        { error: "Demasiadas solicitudes. Intenta más tarde." },
        { status: 429 }
      );
    }

    const parsedBody = await parseJsonBody(request, createEscuelaSchema);
    if (!parsedBody.ok) return parsedBody.response;

    const payload = parsedBody.data;
    const supabaseAdmin = buildSupabaseAdminClient();
    const schoolEmail = normalizeEmail(payload.email);
    const schoolPhone = normalizeText(payload.telefono);
    const schoolAddress = normalizeText(payload.direccion);

    if (payload.crear_admin && payload.admin) {
      const adminEmail = normalizeEmail(payload.admin.email);
      const reservedEmailError = ensureNonReservedAuthEmail(adminEmail);
      if (reservedEmailError) {
        return NextResponse.json({ error: reservedEmailError }, { status: 400 });
      }

      const { data: authData, error: authError } = await supabaseAdmin.auth.admin.createUser({
        email: adminEmail!,
        password: payload.admin.password,
        email_confirm: true,
        user_metadata: {
          nombre: payload.admin.nombre.trim(),
          rol: "admin_escuela",
        },
      });

      if (authError) {
        if (isAuthUserAlreadyRegisteredError(authError.message)) {
          return NextResponse.json(
            { error: "El correo ya está registrado. Usa un correo diferente." },
            { status: 400 }
          );
        }

        return NextResponse.json(
          { error: "No se pudo crear el usuario administrador." },
          { status: 400 }
        );
      }

      createdAuthUserId = authData?.user?.id ?? null;
      if (!createdAuthUserId) {
        return NextResponse.json(
          { error: "No se pudo crear el usuario administrador." },
          { status: 400 }
        );
      }
    }

    const pool = getServerDbPool();
    const client = await pool.connect();

    try {
      await client.query("BEGIN");

      const schoolRes = await client.query<{ id: string }>(
        `
          insert into public.escuelas (
            nombre, cif, telefono, email, direccion, plan, estado, max_alumnos, max_sedes, categorias, fecha_alta
          )
          values ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, current_date)
          returning id
        `,
        [
          payload.nombre.trim(),
          payload.cif.trim(),
          schoolPhone,
          schoolEmail,
          schoolAddress,
          payload.plan,
          payload.estado,
          payload.max_alumnos,
          payload.max_sedes,
          payload.categorias,
        ]
      );

      const escuelaId = schoolRes.rows[0]?.id;
      if (!escuelaId) {
        throw new Error("No se pudo crear la escuela.");
      }

      const sedeRes = await client.query<{ id: string }>(
        `
          insert into public.sedes (
            escuela_id, nombre, direccion, telefono, email, es_principal, estado
          )
          values ($1, 'Sede 1', $2, $3, $4, true, 'activa')
          returning id
        `,
        [escuelaId, schoolAddress, schoolPhone, schoolEmail]
      );
      const sedePrincipalId = sedeRes.rows[0]?.id ?? null;

      if (payload.crear_admin && payload.admin && createdAuthUserId) {
        await client.query(
          `
            insert into public.perfiles (
              id, escuela_id, sede_id, nombre, email, rol, activo
            )
            values ($1, $2, $3, $4, $5, 'admin_escuela', true)
          `,
          [
            createdAuthUserId,
            escuelaId,
            sedePrincipalId,
            payload.admin.nombre.trim(),
            normalizeEmail(payload.admin.email),
          ]
        );
      }

      await client.query("COMMIT");
      return NextResponse.json({ success: true, escuela_id: escuelaId });
    } catch (error) {
      await client.query("ROLLBACK");
      throw error;
    } finally {
      client.release();
    }
  } catch (error) {
    if (createdAuthUserId) {
      try {
        const supabaseAdmin = buildSupabaseAdminClient();
        await supabaseAdmin.auth.admin.deleteUser(createdAuthUserId);
      } catch {
        // Si falla la limpieza del usuario, el error principal se mantiene.
      }
    }

    return NextResponse.json(
      {
        error: error instanceof Error ? error.message : "Error interno al crear la escuela.",
      },
      { status: 400 }
    );
  }
}
