import { NextResponse } from "next/server";
import { authorizeApiRequest } from "@/lib/api-auth";
import { getServerDbPool } from "@/lib/server-db";
import type { Rol } from "@/types/database";

const ALLOWED_ROLES: Rol[] = ["super_admin", "admin_escuela", "admin_sede"];

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
