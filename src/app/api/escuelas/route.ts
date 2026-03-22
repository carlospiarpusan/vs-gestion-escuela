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
import { getServerReadCached, revalidateServerReadCache } from "@/lib/server-read-cache";
import { buildDashboardListCacheTags } from "@/lib/server-cache-tags";

type EscuelaEnriquecida = {
  id: string;
  nombre: string;
  cif: string | null;
  telefono: string | null;
  email: string | null;
  direccion: string | null;
  categorias: string[] | null;
  plan: string;
  estado: string;
  max_alumnos: number;
  max_sedes: number;
  fecha_alta: string | null;
  created_at: string;
  alumnos_activos: number;
  sedes_activas: number;
  sedes_total: number;
  instructores_activos: number;
  admin_nombre: string | null;
  admin_email: string | null;
  admin_ultimo_acceso: string | null;
  ingresos_mes: number;
  clases_mes: number;
};

/* ------------------------------------------------------------------ */
/*  GET  /api/escuelas — listado enriquecido para superadmin           */
/* ------------------------------------------------------------------ */
export async function GET() {
  const authz = await authorizeApiRequest(["super_admin"]);
  if (!authz.ok) return authz.response;

  try {
    const pool = getServerDbPool();
    const cacheKey = `platform:escuelas-enriched:${authz.perfil.id}`;

    const escuelas = await getServerReadCached<EscuelaEnriquecida[]>({
      key: cacheKey,
      ttlMs: 60_000,
      tags: [...buildDashboardListCacheTags("escuelas"), "superadmin"],
      loader: async () => {
        const result = await pool.query<EscuelaEnriquecida>(
          `
          with sedes_agg as (
            select
              escuela_id,
              count(*)::int as sedes_total,
              count(*) filter (where estado = 'activa')::int as sedes_activas
            from public.sedes
            group by escuela_id
          ),
          alumnos_agg as (
            select
              escuela_id,
              count(*)::int as alumnos_activos
            from public.alumnos
            where tipo_registro = 'regular'
              and estado in ('activo', 'pre_registrado')
            group by escuela_id
          ),
          instructores_agg as (
            select
              escuela_id,
              count(*)::int as instructores_activos
            from public.instructores
            where estado = 'activo'
            group by escuela_id
          ),
          admin_agg as (
            select distinct on (escuela_id)
              escuela_id,
              nombre as admin_nombre,
              email as admin_email,
              ultimo_acceso as admin_ultimo_acceso
            from public.perfiles
            where rol = 'admin_escuela' and activo = true
            order by escuela_id, created_at asc
          ),
          ingresos_agg as (
            select
              escuela_id,
              coalesce(sum(monto), 0)::numeric as ingresos_mes
            from public.ingresos
            where estado = 'cobrado'
              and fecha >= date_trunc('month', current_date)
              and fecha < date_trunc('month', current_date) + interval '1 month'
            group by escuela_id
          ),
          clases_agg as (
            select
              escuela_id,
              count(*)::int as clases_mes
            from public.clases
            where fecha >= date_trunc('month', current_date)
              and fecha < date_trunc('month', current_date) + interval '1 month'
            group by escuela_id
          )
          select
            e.id,
            e.nombre,
            e.cif,
            e.telefono,
            e.email,
            e.direccion,
            e.categorias,
            e.plan,
            e.estado,
            e.max_alumnos,
            e.max_sedes,
            e.fecha_alta::text,
            e.created_at::text,
            coalesce(al.alumnos_activos, 0)::int as alumnos_activos,
            coalesce(s.sedes_activas, 0)::int as sedes_activas,
            coalesce(s.sedes_total, 0)::int as sedes_total,
            coalesce(i.instructores_activos, 0)::int as instructores_activos,
            ad.admin_nombre,
            ad.admin_email,
            ad.admin_ultimo_acceso::text,
            coalesce(ing.ingresos_mes, 0)::numeric as ingresos_mes,
            coalesce(cl.clases_mes, 0)::int as clases_mes
          from public.escuelas e
          left join sedes_agg s on s.escuela_id = e.id
          left join alumnos_agg al on al.escuela_id = e.id
          left join instructores_agg i on i.escuela_id = e.id
          left join admin_agg ad on ad.escuela_id = e.id
          left join ingresos_agg ing on ing.escuela_id = e.id
          left join clases_agg cl on cl.escuela_id = e.id
          order by e.created_at desc
          `
        );
        return result.rows.map((r) => ({
          ...r,
          max_alumnos: Number(r.max_alumnos),
          max_sedes: Number(r.max_sedes),
          alumnos_activos: Number(r.alumnos_activos),
          sedes_activas: Number(r.sedes_activas),
          sedes_total: Number(r.sedes_total),
          instructores_activos: Number(r.instructores_activos),
          ingresos_mes: Number(r.ingresos_mes),
          clases_mes: Number(r.clases_mes),
        }));
      },
    });

    return NextResponse.json({ escuelas });
  } catch (error) {
    console.error("Error al cargar escuelas enriquecidas:", error);
    return NextResponse.json({ error: "No se pudieron cargar las escuelas." }, { status: 500 });
  }
}

/* ------------------------------------------------------------------ */
/*  PATCH  /api/escuelas — edición rápida de escuela                   */
/* ------------------------------------------------------------------ */
export async function PATCH(request: Request) {
  const authz = await authorizeApiRequest(["super_admin"]);
  if (!authz.ok) return authz.response;

  try {
    const body = await request.json();
    const escuelaId = body.id;

    if (!escuelaId || typeof escuelaId !== "string") {
      return NextResponse.json({ error: "ID de escuela requerido." }, { status: 400 });
    }

    const updates: string[] = [];
    const values: (string | number | string[] | null)[] = [];
    let idx = 1;

    const allowedFields: Record<string, (v: unknown) => string | number | string[] | null> = {
      nombre: (v) => String(v).trim(),
      cif: (v) => String(v).trim(),
      telefono: (v) => (v ? String(v).trim() : null),
      email: (v) => (v ? String(v).trim().toLowerCase() : null),
      direccion: (v) => (v ? String(v).trim() : null),
      plan: (v) => String(v),
      estado: (v) => String(v),
      max_alumnos: (v) => Math.max(1, Math.round(Number(v))),
      max_sedes: (v) => Math.max(1, Math.round(Number(v))),
      categorias: (v) => (Array.isArray(v) ? v : []),
    };

    for (const [field, transform] of Object.entries(allowedFields)) {
      if (body[field] !== undefined) {
        updates.push(`${field} = $${idx++}`);
        values.push(transform(body[field]));
      }
    }

    if (updates.length === 0) {
      return NextResponse.json({ error: "Sin campos para actualizar." }, { status: 400 });
    }

    values.push(escuelaId);
    const pool = getServerDbPool();
    const result = await pool.query(
      `update public.escuelas set ${updates.join(", ")} where id = $${idx} returning id`,
      values
    );

    if (result.rowCount === 0) {
      return NextResponse.json({ error: "Escuela no encontrada." }, { status: 404 });
    }

    revalidateServerReadCache([...buildDashboardListCacheTags("escuelas"), "superadmin"]);

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Error al actualizar escuela:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Error al actualizar." },
      { status: 500 }
    );
  }
}

/* ------------------------------------------------------------------ */
/*  POST  /api/escuelas — crear escuela + admin (existente)            */
/* ------------------------------------------------------------------ */
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
