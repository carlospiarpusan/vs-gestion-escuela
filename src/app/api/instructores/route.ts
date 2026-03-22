import { NextResponse } from "next/server";
import { authorizeApiRequest, resolveEscuelaIdForRequest } from "@/lib/api-auth";
import {
  buildDashboardListServerCacheKey,
  isFreshDashboardDataRequested,
} from "@/lib/dashboard-server-cache";
import { getServerReadCached } from "@/lib/server-read-cache";
import { buildDashboardListCacheTags } from "@/lib/server-cache-tags";
import { getServerDbPool } from "@/lib/server-db";
import type { Rol } from "@/types/database";
import { parseInteger } from "@/lib/api-helpers";

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

const DASHBOARD_LIST_CACHE_TTL_MS = 120 * 1000;

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

  const scope = {
    escuelaId,
    sedeId: perfil.sede_id,
  };

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

  const payload = await getServerReadCached({
    key: buildDashboardListServerCacheKey("instructores", perfil.id, scope, url.searchParams),
    ttlMs: DASHBOARD_LIST_CACHE_TTL_MS,
    tags: buildDashboardListCacheTags("instructores", scope),
    bypass: isFreshDashboardDataRequested(url.searchParams),
    loader: async () => {
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

      return {
        totalCount: Number(countRes.rows[0]?.total || 0),
        rows: rowsRes.rows,
      };
    },
  });

  return NextResponse.json(payload, {
    headers: {
      "Cache-Control": "private, max-age=45, stale-while-revalidate=60",
    },
  });
}
