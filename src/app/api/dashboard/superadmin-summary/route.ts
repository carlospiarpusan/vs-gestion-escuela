import { NextResponse } from "next/server";
import { authorizeApiRequest } from "@/lib/api-auth";
import {
  DASHBOARD_SUMMARY_CACHE_TTL_MS,
  createEmptySuperAdminDashboardSummary,
  getDashboardMonthRange,
  type SuperAdminDashboardResponse,
} from "@/lib/dashboard-admin-summary";
import { loadPlatformSchoolOverviews } from "@/lib/platform-school-overviews";
import { getServerDbPool } from "@/lib/server-db";
import { getServerReadCached } from "@/lib/server-read-cache";
import { buildDashboardCacheTags } from "@/lib/server-cache-tags";

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
        const [schoolOverviews, ingresosMesRes, alumnosMesRes] = await Promise.all([
          loadPlatformSchoolOverviews(pool),
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

        nextResponse.schoolOverviews = schoolOverviews;

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
