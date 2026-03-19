import { NextResponse } from "next/server";
import { authorizeApiRequest, resolveEscuelaIdForRequest } from "@/lib/api-auth";
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

function parseInteger(value: string | null, fallback: number, min: number, max: number) {
  const parsed = Number(value);
  if (!Number.isFinite(parsed)) return fallback;
  return Math.min(max, Math.max(min, Math.floor(parsed)));
}

function toNumber(value: unknown) {
  return Number(value || 0);
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
  where.push(`v.escuela_id = ${addValue(escuelaId)}`);

  if (search) {
    const ref = addValue(`%${search}%`);
    where.push(`(
      v.marca ILIKE ${ref}
      OR v.modelo ILIKE ${ref}
      OR v.matricula ILIKE ${ref}
      OR v.tipo::text ILIKE ${ref}
      OR v.estado::text ILIKE ${ref}
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
        from public.vehiculos v
        where ${whereSql}
      `,
      values
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
        limit ${limitRef} offset ${offsetRef}
      `,
      [...values, pageSize, offset]
    ),
  ]);

  return NextResponse.json({
    totalCount: Number(countRes.rows[0]?.total || 0),
    rows: rowsRes.rows.map((row) => ({
      ...row,
      registros_bitacora: Number(row.registros_bitacora || 0),
      ultimo_registro_monto:
        row.ultimo_registro_monto == null ? null : toNumber(row.ultimo_registro_monto),
      ultimo_registro_km: row.ultimo_registro_km == null ? null : toNumber(row.ultimo_registro_km),
    })),
  });
}
