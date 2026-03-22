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
  wb.where.push(`c.escuela_id = ${wb.addValue(escuelaId)}`);

  if (perfil.rol === "admin_sede" && perfil.sede_id) {
    wb.where.push(`c.sede_id = ${wb.addValue(perfil.sede_id)}`);
  }

  if (search) {
    const ref = wb.addValue(`%${search}%`);
    wb.where.push(`(
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

  const whereSql = wb.toSql();
  const pool = getServerDbPool();
  const pg = buildPaginationRefs(page, pageSize, wb.values.length);

  const payload = await getServerReadCached({
    key: buildDashboardListServerCacheKey("clases", perfil.id, scope, url.searchParams),
    ttlMs: DASHBOARD_LIST_CACHE_TTL_MS,
    tags: buildDashboardListCacheTags("clases", scope),
    bypass: isFreshDashboardDataRequested(url.searchParams),
    loader: async () => {
      const [countRes, rowsRes] = await Promise.all([
        pool.query<CountRow>(
          `
            select count(*)::int as total
            from public.clases c
            left join public.alumnos a on a.id = c.alumno_id
            left join public.instructores i on i.id = c.instructor_id
            where ${whereSql}
          `,
          wb.values
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
            limit ${pg.limitRef} offset ${pg.offsetRef}
          `,
          [...wb.values, ...pg.values]
        ),
      ]);

      return {
        totalCount: Number(countRes.rows[0]?.total || 0),
        rows: rowsRes.rows.map((row) => ({
          ...row,
          alumno_nombre: row.alumno_nombre || "—",
          instructor_nombre: row.instructor_nombre || "—",
        })),
      };
    },
  });

  return NextResponse.json(payload, {
    headers: {
      "Cache-Control": "private, max-age=45, stale-while-revalidate=60",
    },
  });
}
