import { NextResponse } from "next/server";
import { authorizeApiRequest } from "@/lib/api-auth";
import { getServerDbPool } from "@/lib/server-db";
import type { Rol } from "@/types/database";

const ALLOWED_ROLES: Rol[] = ["super_admin", "admin_escuela", "admin_sede", "administrativo"];

type InstructorRow = {
  id: string;
  nombre: string;
  apellidos: string;
  dni: string;
  email: string | null;
  telefono: string;
  licencia: string;
  especialidad: string;
  especialidades: string[] | null;
  estado: "activo" | "inactivo";
  color: string;
  created_at: string;
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
  const escuelaId = perfil.rol === "super_admin"
    ? (url.searchParams.get("escuela_id") ?? perfil.escuela_id)
    : perfil.escuela_id;

  if (!escuelaId) {
    return NextResponse.json({ totalCount: 0, rows: [] });
  }

  const values: Array<string | number> = [];
  const addValue = (value: string | number) => {
    values.push(value);
    return `$${values.length}`;
  };

  const where: string[] = [];
  where.push(`i.escuela_id = ${addValue(escuelaId)}`);

  if (search) {
    const ref = addValue(`%${search}%`);
    where.push(`(
      i.nombre ILIKE ${ref}
      OR i.apellidos ILIKE ${ref}
      OR concat_ws(' ', i.nombre, i.apellidos) ILIKE ${ref}
      OR i.dni ILIKE ${ref}
      OR coalesce(i.licencia, '') ILIKE ${ref}
      OR coalesce(i.email, '') ILIKE ${ref}
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
        from public.instructores i
        where ${whereSql}
      `,
      values
    ),
    pool.query<InstructorRow>(
      `
        select
          i.id,
          i.nombre,
          i.apellidos,
          i.dni,
          i.email,
          i.telefono,
          i.licencia,
          i.especialidad,
          i.especialidades,
          i.estado,
          i.color,
          i.created_at
        from public.instructores i
        where ${whereSql}
        order by i.created_at desc
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
