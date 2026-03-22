import { NextResponse } from "next/server";
import { authorizeApiRequest, resolveEscuelaIdForRequest } from "@/lib/api-auth";
import {
  DASHBOARD_SUMMARY_CACHE_TTL_MS,
  createEmptyAdminDashboardSummary,
  getDashboardMonthRange,
  getDashboardToday,
  type AdminDashboardSummaryResponse,
} from "@/lib/dashboard-admin-summary";
import { getServerDbPool } from "@/lib/server-db";
import { getServerReadCached } from "@/lib/server-read-cache";
import { buildDashboardCacheTags } from "@/lib/server-cache-tags";
import type { Rol } from "@/types/database";
import { toNumber } from "@/lib/api-helpers";

const ALLOWED_ROLES: Rol[] = [
  "super_admin",
  "admin_escuela",
  "admin_sede",
  "administrativo",
  "recepcion",
  "instructor",
];

type ScopedPerfil = {
  rol: Rol;
  escuela_id: string | null;
  sede_id: string | null;
};

type EnrollmentSummaryRow = {
  period_key: string;
  total: number | string | null;
  moto: number | string | null;
  carro: number | string | null;
  combos: number | string | null;
  unclassified: number | string | null;
};

type ActiveStudentSummaryRow = {
  total: number | string | null;
};

type IncomeSummaryRow = {
  period_key: string;
  ingresos_mes: number | string | null;
  practica_adicional_mes: number | string | null;
  evaluaciones_aptitud_mes: number | string | null;
};

type DailyIncomeRow = {
  date: number | string | null;
  monto: number | string | null;
};

type CountsRow = {
  clases_hoy: number | string | null;
  examenes_pendientes: number | string | null;
};

function buildScopedWhere(
  alias: string,
  perfil: ScopedPerfil,
  escuelaId: string,
  values: Array<string | number>
) {
  const addValue = (value: string | number) => {
    values.push(value);
    return `$${values.length}`;
  };

  const where = [`${alias}.escuela_id = ${addValue(escuelaId)}`];

  if (perfil.sede_id && perfil.rol !== "admin_escuela" && perfil.rol !== "super_admin") {
    where.push(`${alias}.sede_id = ${addValue(perfil.sede_id)}`);
  }

  return where;
}

function createPeriodCte(
  values: Array<string | number>,
  previousRange: ReturnType<typeof getDashboardMonthRange>,
  currentRange: ReturnType<typeof getDashboardMonthRange>
) {
  const addValue = (value: string | number) => {
    values.push(value);
    return `$${values.length}`;
  };

  return `
    with periods as (
      select
        ${addValue("previous")}::text as period_key,
        ${addValue(previousRange.start)}::date as start_date,
        ${addValue(previousRange.end)}::date as end_date
      union all
      select
        ${addValue("current")}::text as period_key,
        ${addValue(currentRange.start)}::date as start_date,
        ${addValue(currentRange.end)}::date as end_date
    )
  `;
}

export async function GET(request: Request) {
  const authorization = await authorizeApiRequest(ALLOWED_ROLES);
  if (!authorization.ok) return authorization.response;

  const escuelaId = resolveEscuelaIdForRequest(
    request,
    authorization.perfil,
    new URL(request.url).searchParams.get("escuela_id")
  );

  if (!escuelaId) {
    return NextResponse.json(createEmptyAdminDashboardSummary(), {
      headers: {
        "Cache-Control": "private, max-age=30, stale-while-revalidate=60",
      },
    });
  }

  const currentMonthRange = getDashboardMonthRange(0);
  const previousMonthRange = getDashboardMonthRange(-1);
  const today = getDashboardToday();
  const pool = getServerDbPool();
  const url = new URL(request.url);
  const cacheBypass = url.searchParams.get("fresh") === "1";

  try {
    const cacheKey = `dashboard:admin:${authorization.perfil.id}:${authorization.perfil.rol}:${escuelaId}:${authorization.perfil.sede_id || "all"}:${currentMonthRange.start}:${today}`;
    const response = await getServerReadCached<AdminDashboardSummaryResponse>({
      key: cacheKey,
      ttlMs: DASHBOARD_SUMMARY_CACHE_TTL_MS,
      tags: buildDashboardCacheTags("admin", {
        escuelaId,
        sedeId: authorization.perfil.sede_id,
      }),
      bypass: cacheBypass,
      loader: async () => {
        const nextResponse = createEmptyAdminDashboardSummary();
        const enrollmentValues: Array<string | number> = [];
        const enrollmentPeriodCte = createPeriodCte(
          enrollmentValues,
          previousMonthRange,
          currentMonthRange
        );
        const alumnoWhere = [
          `a.tipo_registro = 'regular'`,
          ...buildScopedWhere("a", authorization.perfil, escuelaId, enrollmentValues),
        ];
        const matriculaWhere = [
          `m.alumno_id is not null`,
          ...buildScopedWhere("m", authorization.perfil, escuelaId, enrollmentValues),
        ];

        const activeValues: Array<string | number> = [];
        const activeAlumnoWhere = [
          `a.tipo_registro = 'regular'`,
          `a.estado in ('activo', 'pre_registrado')`,
          ...buildScopedWhere("a", authorization.perfil, escuelaId, activeValues),
        ];
        const activeMatriculaWhere = [
          `m.alumno_id is not null`,
          `m.estado = 'activo'`,
          ...buildScopedWhere("m", authorization.perfil, escuelaId, activeValues),
        ];

        const incomeValues: Array<string | number> = [];
        const incomePeriodCte = createPeriodCte(
          incomeValues,
          previousMonthRange,
          currentMonthRange
        );
        const incomeWhere = [
          `i.estado = 'cobrado'`,
          ...buildScopedWhere("i", authorization.perfil, escuelaId, incomeValues),
        ];

        const dailyValues: Array<string | number> = [
          currentMonthRange.start,
          currentMonthRange.end,
        ];
        const dailyWhere = [
          `i.estado = 'cobrado'`,
          `i.fecha >= $1::date`,
          `i.fecha < $2::date`,
          ...buildScopedWhere("i", authorization.perfil, escuelaId, dailyValues),
        ];

        const countsValues: Array<string | number> = [today];
        const classWhere = [
          `c.fecha = $1::date`,
          ...buildScopedWhere("c", authorization.perfil, escuelaId, countsValues),
        ];
        const examWhere = [
          `e.resultado = 'pendiente'`,
          ...buildScopedWhere("e", authorization.perfil, escuelaId, countsValues),
        ];

        const [enrollmentRes, activeStudentsRes, incomeRes, dailyIncomeRes, countsRes] =
          await Promise.all([
            pool.query<EnrollmentSummaryRow>(
              `
              ${enrollmentPeriodCte},
              enrollment_sources as (
                select
                  p.period_key,
                  a.id as alumno_id,
                  coalesce(a.categorias, '{}'::text[]) as categorias
                from public.alumnos a
                inner join periods p
                  on coalesce(a.fecha_inscripcion, a.created_at::date) >= p.start_date
                  and coalesce(a.fecha_inscripcion, a.created_at::date) < p.end_date
                where ${alumnoWhere.join(" and ")}

                union all

                select
                  p.period_key,
                  m.alumno_id,
                  coalesce(m.categorias, '{}'::text[]) as categorias
                from public.matriculas_alumno m
                inner join periods p
                  on coalesce(m.fecha_inscripcion, m.created_at::date) >= p.start_date
                  and coalesce(m.fecha_inscripcion, m.created_at::date) < p.end_date
                where ${matriculaWhere.join(" and ")}
              ),
              expanded as (
                select
                  es.period_key,
                  es.alumno_id,
                  nullif(upper(btrim(categoria)), '') as categoria
                from enrollment_sources es
                left join lateral unnest(es.categorias) categoria on true
              ),
              student_categories as (
                select
                  period_key,
                  alumno_id,
                  coalesce(
                    array_agg(distinct categoria) filter (where categoria is not null),
                    '{}'::text[]
                  ) as categorias
                from expanded
                group by period_key, alumno_id
              ),
              student_buckets as (
                select
                  period_key,
                  case
                    when cardinality(categorias) = 0 then 'unclassified'
                    when (
                      exists (
                        select 1
                        from unnest(categorias) categoria
                        where categoria like '% Y %'
                      )
                      or cardinality(categorias) > 1
                      or (
                        exists (
                          select 1
                          from unnest(categorias) categoria
                          where categoria ~ '^(AM|A1|A2|A)\\y'
                        )
                        and exists (
                          select 1
                          from unnest(categorias) categoria
                          where categoria ~ '^(B|C|RC)[0-9]*'
                        )
                      )
                    ) then 'combo'
                    when exists (
                      select 1
                      from unnest(categorias) categoria
                      where categoria ~ '^(AM|A1|A2|A)\\y'
                    ) then 'moto'
                    when exists (
                      select 1
                      from unnest(categorias) categoria
                      where categoria ~ '^(B|C|RC)[0-9]*'
                    ) then 'carro'
                    else 'unclassified'
                  end as bucket
                from student_categories
              )
              select
                period_key,
                count(*)::int as total,
                count(*) filter (where bucket = 'moto')::int as moto,
                count(*) filter (where bucket = 'carro')::int as carro,
                count(*) filter (where bucket = 'combo')::int as combos,
                count(*) filter (where bucket = 'unclassified')::int as unclassified
              from student_buckets
              group by period_key
            `,
              enrollmentValues
            ),
            pool.query<ActiveStudentSummaryRow>(
              `
              with active_sources as (
                select
                  a.id as alumno_id
                from public.alumnos a
                where ${activeAlumnoWhere.join(" and ")}

                union all

                select
                  m.alumno_id
                from public.matriculas_alumno m
                inner join public.alumnos a
                  on a.id = m.alumno_id
                where ${activeMatriculaWhere.join(" and ")}
                  and a.tipo_registro = 'regular'
                  and a.estado in ('activo', 'pre_registrado')
              )
              select
                count(distinct alumno_id)::int as total
              from active_sources
            `,
              activeValues
            ),
            pool.query<IncomeSummaryRow>(
              `
              ${incomePeriodCte},
              filtered_ingresos as (
                select
                  p.period_key,
                  i.id,
                  i.alumno_id,
                  i.categoria,
                  coalesce(i.monto, 0)::numeric as monto
                from public.ingresos i
                inner join periods p
                  on i.fecha >= p.start_date
                  and i.fecha < p.end_date
                where ${incomeWhere.join(" and ")}
              )
              select
                period_key,
                coalesce(sum(monto), 0)::numeric as ingresos_mes,
                count(
                  distinct case
                    when categoria = 'clase_suelta' then coalesce(alumno_id::text, id::text)
                    else null
                  end
                )::int as practica_adicional_mes,
                count(
                  distinct case
                    when categoria = 'examen_aptitud' then coalesce(alumno_id::text, id::text)
                    else null
                  end
                )::int as evaluaciones_aptitud_mes
              from filtered_ingresos
              group by period_key
            `,
              incomeValues
            ),
            pool.query<DailyIncomeRow>(
              `
              select
                extract(day from i.fecha)::int as date,
                coalesce(sum(coalesce(i.monto, 0)::numeric), 0)::numeric as monto
              from public.ingresos i
              where ${dailyWhere.join(" and ")}
              group by 1
              order by 1 asc
            `,
              dailyValues
            ),
            pool.query<CountsRow>(
              `
              select
                (
                  select count(*)::int
                  from public.clases c
                  where ${classWhere.join(" and ")}
                ) as clases_hoy,
                (
                  select count(*)::int
                  from public.examenes e
                  where ${examWhere.join(" and ")}
                ) as examenes_pendientes
            `,
              countsValues
            ),
          ]);

        const enrollmentByPeriod = new Map(
          enrollmentRes.rows.map((row) => [row.period_key, row] as const)
        );
        const incomeByPeriod = new Map(incomeRes.rows.map((row) => [row.period_key, row] as const));
        const currentEnrollment = enrollmentByPeriod.get("current");
        const previousEnrollment = enrollmentByPeriod.get("previous");
        const activeStudents = activeStudentsRes.rows[0];
        const currentIncome = incomeByPeriod.get("current");
        const previousIncome = incomeByPeriod.get("previous");
        const counts = countsRes.rows[0];

        nextResponse.stats = {
          alumnos: toNumber(activeStudents?.total),
          cursosNuevosMes: toNumber(currentEnrollment?.total),
          clasesHoy: toNumber(counts?.clases_hoy),
          examenesPendientes: toNumber(counts?.examenes_pendientes),
          ingresosMes: toNumber(currentIncome?.ingresos_mes),
          lineasMesMoto: toNumber(currentEnrollment?.moto),
          lineasMesCarro: toNumber(currentEnrollment?.carro),
          lineasMesCombos: toNumber(currentEnrollment?.combos),
          lineasMesSinCategoria: toNumber(currentEnrollment?.unclassified),
          practicaAdicionalMes: toNumber(currentIncome?.practica_adicional_mes),
          evaluacionesAptitudMes: toNumber(currentIncome?.evaluaciones_aptitud_mes),
        };

        nextResponse.comparisonStats = {
          cursosNuevosMes: toNumber(previousEnrollment?.total),
          ingresosMes: toNumber(previousIncome?.ingresos_mes),
          practicaAdicionalMes: toNumber(previousIncome?.practica_adicional_mes),
          evaluacionesAptitudMes: toNumber(previousIncome?.evaluaciones_aptitud_mes),
        };

        nextResponse.dailyIngresos = dailyIncomeRes.rows
          .map((row) => ({
            date: toNumber(row.date),
            monto: toNumber(row.monto),
          }))
          .filter((row) => row.date > 0);

        return nextResponse;
      },
    });

    return NextResponse.json(response, {
      headers: {
        "Cache-Control": `private, max-age=${Math.floor(DASHBOARD_SUMMARY_CACHE_TTL_MS / 1000)}, stale-while-revalidate=60`,
      },
    });
  } catch (error) {
    console.error("Error al construir el resumen del dashboard:", error);
    return NextResponse.json(
      { error: "No se pudo cargar el resumen del dashboard." },
      { status: 500 }
    );
  }
}
