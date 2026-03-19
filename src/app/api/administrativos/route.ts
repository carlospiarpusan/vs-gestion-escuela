import { NextResponse } from "next/server";
import { z } from "zod";
import {
  authorizeApiRequest,
  buildSupabaseAdminClient,
  ensureSchoolScope,
  ensureSedeScope,
  parseJsonBody,
  resolveEscuelaIdForRequest,
} from "@/lib/api-auth";
import { getServerDbPool } from "@/lib/server-db";
import type { Rol } from "@/types/database";

const ALLOWED_ROLES: Rol[] = ["super_admin", "admin_escuela", "admin_sede"];
const mutationRoles: Rol[] = ["super_admin", "admin_escuela", "admin_sede"];

const updateAdministrativoSchema = z.object({
  id: z.string().uuid(),
  nombre: z.string().trim().min(2).max(200).optional(),
  sede_id: z.string().uuid().optional(),
  activo: z.boolean().optional(),
});

const deleteAdministrativoSchema = z.object({
  id: z.string().uuid(),
});

type AdministrativoRow = {
  id: string;
  escuela_id: string | null;
  sede_id: string | null;
  nombre: string;
  email: string;
  rol: Rol;
  telefono: string | null;
  avatar_url: string | null;
  activo: boolean;
  ultimo_acceso: string | null;
  created_at: string;
  sede_nombre: string | null;
};

type CountRow = {
  total: number | string | null;
};

function parseInteger(value: string | null, fallback: number, min: number, max: number) {
  const parsed = Number(value);
  if (!Number.isFinite(parsed)) return fallback;
  return Math.min(max, Math.max(min, Math.floor(parsed)));
}

async function getAdministrativoTarget(
  supabaseAdmin: ReturnType<typeof buildSupabaseAdminClient>,
  id: string
) {
  const { data, error } = await supabaseAdmin
    .from("perfiles")
    .select("id, rol, escuela_id, sede_id")
    .eq("id", id)
    .maybeSingle();

  if (error) {
    throw new Error(error.message || "No se pudo cargar el administrativo.");
  }

  if (!data || data.rol !== "administrativo") {
    return null;
  }

  return data;
}

async function assertAdministrativoScope(
  actor: {
    id: string;
    rol: Rol;
    escuela_id: string | null;
    sede_id: string | null;
    activo: boolean;
  },
  target: { escuela_id: string | null; sede_id: string | null }
) {
  if (!target.escuela_id) {
    return "El administrativo no tiene una escuela válida.";
  }

  const schoolScopeError = ensureSchoolScope(actor, target.escuela_id);
  if (schoolScopeError) return schoolScopeError;

  if (actor.rol === "admin_sede") {
    if (!target.sede_id) return "El administrativo no tiene una sede válida.";
    return ensureSedeScope(actor, target.sede_id);
  }

  return null;
}

export async function GET(request: Request) {
  const auth = await authorizeApiRequest(ALLOWED_ROLES);
  if (!auth.ok) return auth.response;

  const { perfil } = auth;
  const url = new URL(request.url);
  const search = (url.searchParams.get("q") ?? "").trim();
  const page = parseInteger(url.searchParams.get("page"), 0, 0, 100_000);
  const pageSize = parseInteger(url.searchParams.get("pageSize"), 10, 1, 50);
  const escuelaId = resolveEscuelaIdForRequest(request, perfil, url.searchParams.get("escuela_id"));

  if (!escuelaId) {
    return NextResponse.json({ totalCount: 0, rows: [] });
  }

  const values: Array<string | number> = [];
  const addValue = (value: string | number) => {
    values.push(value);
    return `$${values.length}`;
  };

  const where: string[] = [];
  where.push(`p.rol = 'administrativo'`);
  where.push(`p.escuela_id = ${addValue(escuelaId)}`);

  if (perfil.rol === "admin_sede" && perfil.sede_id) {
    where.push(`p.sede_id = ${addValue(perfil.sede_id)}`);
  }

  if (search) {
    const ref = addValue(`%${search}%`);
    where.push(`(
      p.nombre ILIKE ${ref}
      OR p.email ILIKE ${ref}
      OR coalesce(p.telefono, '') ILIKE ${ref}
    )`);
  }

  const whereSql = where.join(" AND ");
  const pool = getServerDbPool();
  const offset = page * pageSize;
  const limitRef = `$${values.length + 1}`;
  const offsetRef = `$${values.length + 2}`;

  const [countRes, rowsRes] = await Promise.all([
    pool.query<CountRow>(
      `
        select count(*)::int as total
        from public.perfiles p
        where ${whereSql}
      `,
      values
    ),
    pool.query<AdministrativoRow>(
      `
        select
          p.id,
          p.escuela_id,
          p.sede_id,
          p.nombre,
          p.email,
          p.rol,
          p.telefono,
          p.avatar_url,
          p.activo,
          p.ultimo_acceso,
          p.created_at,
          s.nombre as sede_nombre
        from public.perfiles p
        left join public.sedes s on s.id = p.sede_id
        where ${whereSql}
        order by p.created_at desc
        limit ${limitRef} offset ${offsetRef}
      `,
      [...values, pageSize, offset]
    ),
  ]);

  return NextResponse.json({
    totalCount: Number(countRes.rows[0]?.total || 0),
    rows: rowsRes.rows,
  });
}

export async function PATCH(request: Request) {
  const authz = await authorizeApiRequest(mutationRoles);
  if (!authz.ok) return authz.response;

  const parsed = await parseJsonBody(request, updateAdministrativoSchema);
  if (!parsed.ok) return parsed.response;

  const { id, nombre, sede_id: sedeId, activo } = parsed.data;
  if (nombre == null && sedeId == null && activo == null) {
    return NextResponse.json({ error: "No hay cambios para aplicar." }, { status: 400 });
  }

  try {
    const supabaseAdmin = buildSupabaseAdminClient();
    const target = await getAdministrativoTarget(supabaseAdmin, id);

    if (!target) {
      return NextResponse.json({ error: "El administrativo ya no existe." }, { status: 404 });
    }

    const scopeError = await assertAdministrativoScope(authz.perfil, target);
    if (scopeError) {
      return NextResponse.json({ error: scopeError }, { status: 403 });
    }

    if (sedeId) {
      const { data: sede, error: sedeError } = await supabaseAdmin
        .from("sedes")
        .select("id, escuela_id")
        .eq("id", sedeId)
        .maybeSingle();

      if (sedeError) {
        return NextResponse.json(
          { error: "No se pudo validar la sede seleccionada." },
          { status: 400 }
        );
      }

      if (!sede || !target.escuela_id || sede.escuela_id !== target.escuela_id) {
        return NextResponse.json(
          { error: "La sede no pertenece a la escuela del administrativo." },
          { status: 400 }
        );
      }

      const targetSedeScopeError = ensureSedeScope(authz.perfil, sedeId);
      if (targetSedeScopeError) {
        return NextResponse.json({ error: targetSedeScopeError }, { status: 403 });
      }
    }

    const updatePayload: Record<string, string | boolean> = {};
    if (nombre != null) updatePayload.nombre = nombre.trim();
    if (sedeId != null) updatePayload.sede_id = sedeId;
    if (activo != null) updatePayload.activo = activo;

    const { error } = await supabaseAdmin.from("perfiles").update(updatePayload).eq("id", id);

    if (error) {
      return NextResponse.json(
        { error: "No se pudo actualizar el administrativo." },
        { status: 400 }
      );
    }

    return NextResponse.json({ ok: true });
  } catch {
    return NextResponse.json(
      { error: "Error interno al actualizar el administrativo." },
      { status: 500 }
    );
  }
}

export async function DELETE(request: Request) {
  const authz = await authorizeApiRequest(mutationRoles);
  if (!authz.ok) return authz.response;

  const parsed = await parseJsonBody(request, deleteAdministrativoSchema);
  if (!parsed.ok) return parsed.response;

  try {
    const supabaseAdmin = buildSupabaseAdminClient();
    const target = await getAdministrativoTarget(supabaseAdmin, parsed.data.id);

    if (!target) {
      return NextResponse.json({ error: "El administrativo ya no existe." }, { status: 404 });
    }

    const scopeError = await assertAdministrativoScope(authz.perfil, target);
    if (scopeError) {
      return NextResponse.json({ error: scopeError }, { status: 403 });
    }

    const { error } = await supabaseAdmin.auth.admin.deleteUser(parsed.data.id);
    if (error) {
      return NextResponse.json(
        { error: "No se pudo eliminar el administrativo." },
        { status: 400 }
      );
    }

    return NextResponse.json({ ok: true });
  } catch {
    return NextResponse.json(
      { error: "Error interno al eliminar el administrativo." },
      { status: 500 }
    );
  }
}
