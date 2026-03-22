import { NextResponse } from "next/server";
import { authorizeApiRequest, resolveEscuelaIdForRequest } from "@/lib/api-auth";
import { parseListParams, createWhereBuilder, buildPaginationRefs } from "@/lib/api-helpers";
import {
  buildDashboardListServerCacheKey,
  isFreshDashboardDataRequested,
} from "@/lib/dashboard-server-cache";
import { getServerReadCached } from "@/lib/server-read-cache";
import { buildDashboardListCacheTags } from "@/lib/server-cache-tags";
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

const DASHBOARD_LIST_CACHE_TTL_MS = 120 * 1000;

export async function GET(request: Request) {
  const auth = await authorizeApiRequest(ALLOWED_ROLES);
  if (!auth.ok) return auth.response;

  const { perfil } = auth;
  const url = new URL(request.url);
  const { search, page, pageSize } = parseListParams(url);
  const escuelaId = resolveEscuelaIdForRequest(request, perfil, url.searchParams.get("escuela_id"));

  if (!escuelaId) {
    return NextResponse.json({ totalCount: 0, rows: [] });
  }

  const scope = { escuelaId, sedeId: perfil.sede_id };
  const wb = createWhereBuilder();
  wb.where.push(`i.escuela_id = ${wb.addValue(escuelaId)}`);

  if (search) {
    const ref = wb.addValue(`%${search}%`);
    wb.where.push(`(
      i.nombre ILIKE ${ref}
      OR i.apellidos ILIKE ${ref}
      OR concat_ws(' ', i.nombre, i.apellidos) ILIKE ${ref}
      OR i.dni ILIKE ${ref}
      OR coalesce(i.licencia, '') ILIKE ${ref}
      OR coalesce(i.email, '') ILIKE ${ref}
    )`);
  }

  const whereSql = wb.toSql();
  const pool = getServerDbPool();
  const pg = buildPaginationRefs(page, pageSize, wb.values.length);

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
          wb.values
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
            limit ${pg.limitRef} offset ${pg.offsetRef}
          `,
          [...wb.values, ...pg.values]
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
