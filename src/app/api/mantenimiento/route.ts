import { NextResponse } from "next/server";
import { authorizeApiRequest, resolveEscuelaIdForRequest } from "@/lib/api-auth";
import { parseInteger, createWhereBuilder, buildPaginationRefs, toNumber } from "@/lib/api-helpers";
import {
  buildDashboardListServerCacheKey,
  isFreshDashboardDataRequested,
} from "@/lib/dashboard-server-cache";
import { getServerReadCached } from "@/lib/server-read-cache";
import { buildDashboardListCacheTags } from "@/lib/server-cache-tags";
import { getServerDbPool } from "@/lib/server-db";
import type { Rol, TipoMantenimiento } from "@/types/database";

const ALLOWED_ROLES: Rol[] = [
  "super_admin",
  "admin_escuela",
  "admin_sede",
  "administrativo",
  "instructor",
];

type MantenimientoRow = {
  id: string;
  escuela_id: string;
  sede_id: string;
  vehiculo_id: string;
  instructor_id: string | null;
  user_id: string;
  tipo: TipoMantenimiento;
  descripcion: string;
  monto: number | string;
  kilometraje_actual: number | string | null;
  litros: number | string | null;
  precio_por_litro: number | string | null;
  proveedor: string | null;
  numero_factura: string | null;
  foto_url: string | null;
  fecha: string;
  notas: string | null;
  created_at: string;
  vehiculo_nombre: string | null;
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
  const search = (url.searchParams.get("q") ?? "").trim();
  const vehiculoId = (url.searchParams.get("vehiculo_id") ?? "").trim();
  const page = parseInteger(url.searchParams.get("page"), 0, 0, 100_000);
  const pageSize = parseInteger(url.searchParams.get("pageSize"), 10, 1, 250);
  const escuelaId = resolveEscuelaIdForRequest(request, perfil, url.searchParams.get("escuela_id"));

  if (!escuelaId) {
    return NextResponse.json({ totalCount: 0, rows: [] });
  }

  let currentInstructorId: string | null = null;
  const pool = getServerDbPool();

  if (perfil.rol === "instructor") {
    const instructorRes = await pool.query<{ id: string }>(
      `
        select id
        from public.instructores
        where user_id = $1
          and escuela_id = $2
        limit 1
      `,
      [perfil.id, escuelaId]
    );
    currentInstructorId = instructorRes.rows[0]?.id ?? null;

    if (!currentInstructorId) {
      return NextResponse.json({ totalCount: 0, rows: [] });
    }
  }

  const scope = { escuelaId, sedeId: perfil.sede_id };
  const wb = createWhereBuilder();
  wb.where.push(`m.escuela_id = ${wb.addValue(escuelaId)}`);

  if (vehiculoId) {
    wb.where.push(`m.vehiculo_id = ${wb.addValue(vehiculoId)}`);
  }

  if (currentInstructorId) {
    wb.where.push(`m.instructor_id = ${wb.addValue(currentInstructorId)}`);
  }

  if (search) {
    const ref = wb.addValue(`%${search}%`);
    wb.where.push(`(
      m.descripcion ILIKE ${ref}
      OR m.fecha::text ILIKE ${ref}
      OR coalesce(m.proveedor, '') ILIKE ${ref}
      OR coalesce(m.numero_factura, '') ILIKE ${ref}
      OR m.tipo::text ILIKE ${ref}
      OR coalesce(v.marca, '') ILIKE ${ref}
      OR coalesce(v.modelo, '') ILIKE ${ref}
      OR coalesce(v.matricula, '') ILIKE ${ref}
      OR coalesce(i.nombre, '') ILIKE ${ref}
      OR coalesce(i.apellidos, '') ILIKE ${ref}
    )`);
  }

  const whereSql = wb.toSql();
  const pg = buildPaginationRefs(page, pageSize, wb.values.length);

  const payload = await getServerReadCached({
    key: buildDashboardListServerCacheKey("mantenimiento", perfil.id, scope, url.searchParams),
    ttlMs: DASHBOARD_LIST_CACHE_TTL_MS,
    tags: buildDashboardListCacheTags("mantenimiento", scope),
    bypass: isFreshDashboardDataRequested(url.searchParams),
    loader: async () => {
      const [countRes, rowsRes] = await Promise.all([
        pool.query<CountRow>(
          `
            select count(*)::int as total
            from public.mantenimiento_vehiculos m
            left join public.vehiculos v on v.id = m.vehiculo_id
            left join public.instructores i on i.id = m.instructor_id
            where ${whereSql}
          `,
          wb.values
        ),
        pool.query<MantenimientoRow>(
          `
            select
              m.*,
              trim(concat_ws(' ', v.marca, v.modelo, '(' || v.matricula || ')')) as vehiculo_nombre,
              nullif(trim(concat_ws(' ', i.nombre, i.apellidos)), '') as instructor_nombre
            from public.mantenimiento_vehiculos m
            left join public.vehiculos v on v.id = m.vehiculo_id
            left join public.instructores i on i.id = m.instructor_id
            where ${whereSql}
            order by m.fecha desc, m.created_at desc
            limit ${pg.limitRef} offset ${pg.offsetRef}
          `,
          [...wb.values, ...pg.values]
        ),
      ]);

      return {
        totalCount: Number(countRes.rows[0]?.total || 0),
        rows: rowsRes.rows.map((row) => ({
          ...row,
          monto: toNumber(row.monto),
          kilometraje_actual:
            row.kilometraje_actual == null ? null : toNumber(row.kilometraje_actual),
          litros: row.litros == null ? null : toNumber(row.litros),
          precio_por_litro: row.precio_por_litro == null ? null : toNumber(row.precio_por_litro),
          vehiculo_nombre: row.vehiculo_nombre || "—",
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
