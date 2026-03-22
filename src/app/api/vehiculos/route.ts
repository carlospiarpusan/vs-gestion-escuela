import { NextResponse } from "next/server";
import { authorizeApiRequest, resolveEscuelaIdForRequest } from "@/lib/api-auth";
import {
  parseListParams,
  createWhereBuilder,
  buildPaginationRefs,
  toNumber,
} from "@/lib/api-helpers";
import {
  buildDashboardListServerCacheKey,
  isFreshDashboardDataRequested,
} from "@/lib/dashboard-server-cache";
import { getServerReadCached } from "@/lib/server-read-cache";
import { buildDashboardListCacheTags } from "@/lib/server-cache-tags";
import { getServerDbPool } from "@/lib/server-db";
import type { EstadoVehiculo, Rol, TipoMantenimiento, TipoVehiculo } from "@/types/database";

const ALLOWED_ROLES: Rol[] = [
  "super_admin",
  "admin_escuela",
  "admin_sede",
  "administrativo",
  "instructor",
];

type VehiculoWithBitacoraRow = {
  id: string;
  escuela_id: string;
  sede_id: string;
  user_id: string;
  marca: string;
  modelo: string;
  matricula: string;
  tipo: TipoVehiculo;
  anio: number | null;
  fecha_itv: string | null;
  seguro_vencimiento: string | null;
  estado: EstadoVehiculo;
  kilometraje: number;
  notas: string | null;
  created_at: string;
  registros_bitacora: number | string | null;
  ultimo_registro_fecha: string | null;
  ultimo_registro_tipo: TipoMantenimiento | null;
  ultimo_registro_descripcion: string | null;
  ultimo_registro_monto: number | string | null;
  ultimo_registro_km: number | string | null;
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
  wb.where.push(`v.escuela_id = ${wb.addValue(escuelaId)}`);

  if (search) {
    const ref = wb.addValue(`%${search}%`);
    wb.where.push(`(
      v.marca ILIKE ${ref}
      OR v.modelo ILIKE ${ref}
      OR v.matricula ILIKE ${ref}
      OR v.tipo::text ILIKE ${ref}
      OR v.estado::text ILIKE ${ref}
    )`);
  }

  const whereSql = wb.toSql();
  const pool = getServerDbPool();
  const pg = buildPaginationRefs(page, pageSize, wb.values.length);

  const payload = await getServerReadCached({
    key: buildDashboardListServerCacheKey("vehiculos", perfil.id, scope, url.searchParams),
    ttlMs: DASHBOARD_LIST_CACHE_TTL_MS,
    tags: buildDashboardListCacheTags("vehiculos", scope),
    bypass: isFreshDashboardDataRequested(url.searchParams),
    loader: async () => {
      const [countRes, rowsRes] = await Promise.all([
        pool.query<CountRow>(
          `
            select count(*)::int as total
            from public.vehiculos v
            where ${whereSql}
          `,
          wb.values
        ),
        pool.query<VehiculoWithBitacoraRow>(
          `
            select
              v.*,
              coalesce(b.registros_bitacora, 0)::int as registros_bitacora,
              b.ultimo_registro_fecha,
              b.ultimo_registro_tipo,
              b.ultimo_registro_descripcion,
              b.ultimo_registro_monto,
              b.ultimo_registro_km
            from public.vehiculos v
            left join lateral (
              select
                count(*)::int as registros_bitacora,
                (array_agg(m.fecha order by m.fecha desc, m.created_at desc))[1] as ultimo_registro_fecha,
                (array_agg(m.tipo order by m.fecha desc, m.created_at desc))[1] as ultimo_registro_tipo,
                (array_agg(m.descripcion order by m.fecha desc, m.created_at desc))[1] as ultimo_registro_descripcion,
                (array_agg(m.monto order by m.fecha desc, m.created_at desc))[1] as ultimo_registro_monto,
                (array_agg(m.kilometraje_actual order by m.fecha desc, m.created_at desc))[1] as ultimo_registro_km
              from public.mantenimiento_vehiculos m
              where m.vehiculo_id = v.id
            ) b on true
            where ${whereSql}
            order by v.created_at desc
            limit ${pg.limitRef} offset ${pg.offsetRef}
          `,
          [...wb.values, ...pg.values]
        ),
      ]);

      return {
        totalCount: Number(countRes.rows[0]?.total || 0),
        rows: rowsRes.rows.map((row) => ({
          ...row,
          registros_bitacora: Number(row.registros_bitacora || 0),
          ultimo_registro_monto:
            row.ultimo_registro_monto == null ? null : toNumber(row.ultimo_registro_monto),
          ultimo_registro_km:
            row.ultimo_registro_km == null ? null : toNumber(row.ultimo_registro_km),
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
