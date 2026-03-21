import { NextResponse } from "next/server";
import { authorizeApiRequest } from "@/lib/api-auth";
import {
  DASHBOARD_SUMMARY_CACHE_TTL_MS,
  createEmptySuperAdminDashboardSummary,
  getDashboardMonthRange,
  type SuperAdminDashboardResponse,
} from "@/lib/dashboard-admin-summary";
import { getServerDbPool } from "@/lib/server-db";
import { getServerReadCached } from "@/lib/server-read-cache";
import { buildDashboardCacheTags } from "@/lib/server-cache-tags";
import type { PlanEscuela } from "@/types/database";

type OverviewRow = {
  id: string;
  nombre: string;
  estado: "activa" | "inactiva" | "suspendida";
  plan: PlanEscuela;
  max_alumnos: number | string | null;
  max_sedes: number | string | null;
  created_at: string;
  sedes_total: number | string | null;
  sedes_activas: number | string | null;
  alumnos_total: number | string | null;
  admins_activos: number | string | null;
  has_principal_sede: boolean | null;
};

type IncomeRow = {
  ingresos_mes: number | string | null;
};

type MonthlyStudentsRow = {
  alumnos_mes: number | string | null;
};

function toNumber(value: unknown) {
  if (typeof value === "number") return value;
  if (typeof value === "string") return Number(value);
  return 0;
}

export async function GET() {
  const authorization = await authorizeApiRequest(["super_admin"]);
  if (!authorization.ok) return authorization.response;

  const pool = getServerDbPool();
  const currentMonth = getDashboardMonthRange(0);
  const cacheKey = `dashboard:superadmin:${authorization.perfil.id}:${currentMonth.start}`;

  try {
    const response = await getServerReadCached<SuperAdminDashboardResponse>({
      key: cacheKey,
      ttlMs: DASHBOARD_SUMMARY_CACHE_TTL_MS,
      tags: buildDashboardCacheTags("superadmin"),
      loader: async () => {
        const nextResponse = createEmptySuperAdminDashboardSummary();
        const [overviewsRes, ingresosMesRes, alumnosMesRes] = await Promise.all([
          pool.query<OverviewRow>(
            `
              with sedes_agg as (
                select
                  escuela_id,
                  count(*)::int as sedes_total,
                  count(*) filter (where estado = 'activa')::int as sedes_activas,
                  bool_or(es_principal) as has_principal_sede
                from public.sedes
                group by escuela_id
              ),
              admins_agg as (
                select
                  escuela_id,
                  count(*) filter (where activo)::int as admins_activos
                from public.perfiles
                where rol = 'admin_escuela'
                group by escuela_id
              ),
              alumnos_agg as (
                select
                  escuela_id,
                  count(*)::int as alumnos_total
                from public.alumnos
                where tipo_registro = 'regular'
                  and estado in ('activo', 'pre_registrado')
                group by escuela_id
              )
              select
                e.id,
                e.nombre,
                e.estado,
                e.plan,
                e.max_alumnos,
                e.max_sedes,
                e.created_at::text as created_at,
                coalesce(s.sedes_total, 0)::int as sedes_total,
                coalesce(s.sedes_activas, 0)::int as sedes_activas,
                coalesce(a.alumnos_total, 0)::int as alumnos_total,
                coalesce(p.admins_activos, 0)::int as admins_activos,
                coalesce(s.has_principal_sede, false) as has_principal_sede
              from public.escuelas e
              left join sedes_agg s on s.escuela_id = e.id
              left join admins_agg p on p.escuela_id = e.id
              left join alumnos_agg a on a.escuela_id = e.id
              order by e.created_at desc
            `
          ),
          pool.query<IncomeRow>(
            `
              select coalesce(sum(monto), 0)::numeric as ingresos_mes
              from public.ingresos
              where estado = 'cobrado'
                and fecha >= $1::date
                and fecha < $2::date
            `,
            [currentMonth.start, currentMonth.end]
          ),
          pool.query<MonthlyStudentsRow>(
            `
              with enrollment_sources as (
                select a.id as alumno_id
                from public.alumnos a
                where a.tipo_registro = 'regular'
                  and coalesce(a.fecha_inscripcion, a.created_at::date) >= $1::date
                  and coalesce(a.fecha_inscripcion, a.created_at::date) < $2::date

                union

                select m.alumno_id
                from public.matriculas_alumno m
                inner join public.alumnos a
                  on a.id = m.alumno_id
                where m.alumno_id is not null
                  and a.tipo_registro = 'regular'
                  and coalesce(m.fecha_inscripcion, m.created_at::date) >= $1::date
                  and coalesce(m.fecha_inscripcion, m.created_at::date) < $2::date
              )
              select count(distinct alumno_id)::int as alumnos_mes
              from enrollment_sources
            `,
            [currentMonth.start, currentMonth.end]
          ),
        ]);

        nextResponse.schoolOverviews = overviewsRes.rows.map((row) => {
          const alumnosTotal = toNumber(row.alumnos_total);
          const maxAlumnos = toNumber(row.max_alumnos);
          return {
            id: row.id,
            nombre: row.nombre,
            estado: row.estado,
            plan: row.plan,
            max_alumnos: maxAlumnos,
            max_sedes: toNumber(row.max_sedes),
            created_at: row.created_at,
            sedesTotal: toNumber(row.sedes_total),
            sedesActivas: toNumber(row.sedes_activas),
            alumnosTotal,
            adminsActivos: toNumber(row.admins_activos),
            hasPrincipalSede: Boolean(row.has_principal_sede),
            capacidadPct: maxAlumnos > 0 ? Math.round((alumnosTotal / maxAlumnos) * 100) : 0,
          };
        });

        nextResponse.stats = {
          escuelas: nextResponse.schoolOverviews.length,
          escuelasActivas: nextResponse.schoolOverviews.filter((row) => row.estado === "activa")
            .length,
          sedesActivas: nextResponse.schoolOverviews.reduce(
            (sum, row) => sum + row.sedesActivas,
            0
          ),
          adminsEscuela: nextResponse.schoolOverviews.reduce(
            (sum, row) => sum + row.adminsActivos,
            0
          ),
          alumnos: nextResponse.schoolOverviews.reduce((sum, row) => sum + row.alumnosTotal, 0),
          alumnosMes: toNumber(alumnosMesRes.rows[0]?.alumnos_mes),
          ingresosMes: toNumber(ingresosMesRes.rows[0]?.ingresos_mes),
        };

        return nextResponse;
      },
    });

    return NextResponse.json(response, {
      headers: {
        "Cache-Control": `private, max-age=${Math.floor(DASHBOARD_SUMMARY_CACHE_TTL_MS / 1000)}, stale-while-revalidate=60`,
      },
    });
  } catch (error) {
    console.error("Error al construir el resumen superadmin:", error);
    return NextResponse.json({ error: "No se pudo cargar el resumen central." }, { status: 500 });
  }
}
