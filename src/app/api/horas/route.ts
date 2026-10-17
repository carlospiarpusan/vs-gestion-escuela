import { NextResponse } from "next/server";
import {
  authorizeApiRequest,
  getStaffReadSedeScope,
  resolveEscuelaIdForRequest,
} from "@/lib/api-auth";
import { parseInteger, toNumber } from "@/lib/api-helpers";
import {
  buildDashboardListServerCacheKey,
  isFreshDashboardDataRequested,
} from "@/lib/dashboard-server-cache";
import { getServerReadCached } from "@/lib/server-read-cache";
import { buildDashboardListCacheTags } from "@/lib/server-cache-tags";
import { getServerDbPool } from "@/lib/server-db";
import { getCurrentMonthIndex, getCurrentYear } from "@/lib/date-utils";
import type { Rol } from "@/types/database";

const ALLOWED_ROLES: Rol[] = [
  "super_admin",
  "admin_escuela",
  "admin_sede",
  "administrativo",
  "instructor",
];
const CACHE_TTL_MS = 30 * 1000;

type InstructorRow = {
  id: string;
  nombre: string;
  apellidos: string;
  color: string;
  sede_id: string;
  valor_hora: number | string | null;
};

type HoraRow = {
  instructor_id: string;
  fecha: string;
  horas: number | string | null;
};

type ClosureRow = {
  id: string;
  instructor_id: string;
  gasto_id: string | null;
  periodo_anio: number | string | null;
  periodo_mes: number | string | null;
  fecha_cierre: string;
  total_horas: number | string | null;
  valor_hora: number | string | null;
  monto_total: number | string | null;
  updated_at: string;
};

function getMonthRange(year: number, monthIndex: number) {
  const normalizedMonth = Math.min(11, Math.max(0, monthIndex));
  const from = `${year}-${String(normalizedMonth + 1).padStart(2, "0")}-01`;
  const lastDay = new Date(year, normalizedMonth + 1, 0).getDate();
  const to = `${year}-${String(normalizedMonth + 1).padStart(2, "0")}-${String(lastDay).padStart(2, "0")}`;
  return { from, to };
}

export async function GET(request: Request) {
  const auth = await authorizeApiRequest(ALLOWED_ROLES);
  if (!auth.ok) return auth.response;

  const { perfil } = auth;
  const url = new URL(request.url);
  const anio = parseInteger(url.searchParams.get("anio"), getCurrentYear(), 2023, 2100);
  const mes = parseInteger(url.searchParams.get("mes"), getCurrentMonthIndex(), 0, 11);
  const includeClosures = url.searchParams.get("include_closures") === "1";
  const escuelaId = resolveEscuelaIdForRequest(request, perfil, url.searchParams.get("escuela_id"));
  const { sedeId, error: scopeError } = getStaffReadSedeScope(perfil);
  if (scopeError) return NextResponse.json({ error: scopeError }, { status: 403 });

  if (!escuelaId) {
    return NextResponse.json({
      instructores: [],
      horas: [],
      monthClosures: [],
    });
  }

  const scope = {
    escuelaId,
    sedeId,
  };
  const isInstructor = perfil.rol === "instructor";
  const cacheAudienceKey = isInstructor ? `${perfil.rol}:${perfil.id}` : perfil.rol;
  const { from, to } = getMonthRange(anio, mes);
  const pool = getServerDbPool();

  const payload = await getServerReadCached({
    key: buildDashboardListServerCacheKey(
      "horas-dashboard",
      cacheAudienceKey,
      scope,
      url.searchParams
    ),
    ttlMs: CACHE_TTL_MS,
    tags: buildDashboardListCacheTags("horas-dashboard", scope),
    bypass: isFreshDashboardDataRequested(url.searchParams),
    loader: async () => {
      const [instructoresRes, horasRes, closuresRes] = await Promise.all([
        pool.query<InstructorRow>(
          `
            select id, nombre, apellidos, color, sede_id, valor_hora
            from public.instructores
            where escuela_id = $1
              and estado = 'activo'
              ${sedeId ? "and sede_id = $2" : ""}
              ${isInstructor ? "and user_id = $2" : ""}
            order by nombre asc, apellidos asc
          `,
          isInstructor ? [escuelaId, perfil.id] : sedeId ? [escuelaId, sedeId] : [escuelaId]
        ),
        pool.query<HoraRow>(
          `
            select ht.instructor_id, ht.fecha, ht.horas
            from public.horas_trabajo ht
            where ht.escuela_id = $1
              and ht.fecha >= $2
              and ht.fecha <= $3
              ${sedeId ? "and ht.sede_id = $4" : ""}
              ${
                isInstructor
                  ? `and exists (
                      select 1
                      from public.instructores i
                      where i.id = ht.instructor_id
                        and i.user_id = $4
                    )`
                  : ""
              }
            order by fecha asc
          `,
          isInstructor
            ? [escuelaId, from, to, perfil.id]
            : sedeId
              ? [escuelaId, from, to, sedeId]
              : [escuelaId, from, to]
        ),
        includeClosures
          ? pool.query<ClosureRow>(
              `
                select
                  id,
                  instructor_id,
                  gasto_id,
                  periodo_anio,
                  periodo_mes,
                  fecha_cierre,
                  total_horas,
                  valor_hora,
                  monto_total,
                  updated_at
                from public.cierres_horas_instructores c
                where c.escuela_id = $1
                  and c.periodo_anio = $2
                  and c.periodo_mes = $3
                  ${sedeId ? "and c.sede_id = $4" : ""}
                  ${
                    isInstructor
                      ? `and exists (
                          select 1
                          from public.instructores i
                          where i.id = c.instructor_id
                            and i.user_id = $4
                        )`
                      : ""
                  }
                order by monto_total desc, updated_at desc
              `,
              isInstructor
                ? [escuelaId, anio, mes + 1, perfil.id]
                : sedeId
                  ? [escuelaId, anio, mes + 1, sedeId]
                  : [escuelaId, anio, mes + 1]
            )
          : Promise.resolve({ rows: [] as ClosureRow[] }),
      ]);

      return {
        instructores: instructoresRes.rows.map((row) => ({
          ...row,
          valor_hora: row.valor_hora == null ? null : toNumber(row.valor_hora),
        })),
        horas: horasRes.rows.map((row) => ({
          ...row,
          horas: toNumber(row.horas),
        })),
        monthClosures: closuresRes.rows.map((row) => ({
          ...row,
          periodo_anio: Number(row.periodo_anio || 0),
          periodo_mes: Number(row.periodo_mes || 0),
          total_horas: toNumber(row.total_horas),
          valor_hora: toNumber(row.valor_hora),
          monto_total: toNumber(row.monto_total),
        })),
      };
    },
  });

  return NextResponse.json(payload, {
    headers: {
      "Cache-Control": `private, max-age=${Math.floor(CACHE_TTL_MS / 1000)}, stale-while-revalidate=60`,
    },
  });
}
