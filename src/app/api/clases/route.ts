import { NextResponse } from "next/server";
import { authorizeApiRequest, resolveEscuelaIdForRequest } from "@/lib/api-auth";
import { getServerDbPool } from "@/lib/server-db";
import type { EstadoClase, Rol, TipoClase } from "@/types/database";

const ALLOWED_ROLES: Rol[] = ["super_admin", "admin_escuela", "admin_sede", "administrativo"];

type ClaseRow = {
  id: string;
  alumno_id: string;
  instructor_id: string | null;
  vehiculo_id: string | null;
  tipo: TipoClase;
  fecha: string;
  hora_inicio: string;
  hora_fin: string;
  estado: EstadoClase;
  notas: string | null;
  created_at: string;
  alumno_nombre: string | null;
  instructor_nombre: string | null;
};

type CountRow = {
  total: number | string | null;
};

function parseInteger(value: string | null, fallback: number, min: number, max: number) {
  const parsed = Number(value);
  if (!Number.isFinite(parsed)) return fallback;
  return Math.min(max, Math.max(min, Math.floor(parsed)));
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
  where.push(`c.escuela_id = ${addValue(escuelaId)}`);

  if (perfil.rol === "admin_sede" && perfil.sede_id) {
    where.push(`c.sede_id = ${addValue(perfil.sede_id)}`);
  }

  if (search) {
    const ref = addValue(`%${search}%`);
    where.push(`(
      c.fecha::text ILIKE ${ref}
      OR c.tipo::text ILIKE ${ref}
      OR c.estado::text ILIKE ${ref}
      OR coalesce(c.notas, '') ILIKE ${ref}
      OR coalesce(a.nombre, '') ILIKE ${ref}
      OR coalesce(a.apellidos, '') ILIKE ${ref}
      OR coalesce(i.nombre, '') ILIKE ${ref}
      OR coalesce(i.apellidos, '') ILIKE ${ref}
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
        from public.clases c
        left join public.alumnos a on a.id = c.alumno_id
        left join public.instructores i on i.id = c.instructor_id
        where ${whereSql}
      `,
      values
    ),
    pool.query<ClaseRow>(
      `
        select
          c.id,
          c.alumno_id,
          c.instructor_id,
          c.vehiculo_id,
          c.tipo,
          c.fecha,
          c.hora_inicio,
          c.hora_fin,
          c.estado,
          c.notas,
          c.created_at,
          trim(concat_ws(' ', a.nombre, a.apellidos)) as alumno_nombre,
          trim(concat_ws(' ', i.nombre, i.apellidos)) as instructor_nombre
        from public.clases c
        left join public.alumnos a on a.id = c.alumno_id
        left join public.instructores i on i.id = c.instructor_id
        where ${whereSql}
        order by c.fecha desc, c.created_at desc
        limit ${limitRef} offset ${offsetRef}
      `,
      [...values, pageSize, offset]
    ),
  ]);

  return NextResponse.json({
    totalCount: Number(countRes.rows[0]?.total || 0),
    rows: rowsRes.rows.map((row) => ({
      ...row,
      alumno_nombre: row.alumno_nombre || "—",
      instructor_nombre: row.instructor_nombre || "—",
    })),
  });
}
