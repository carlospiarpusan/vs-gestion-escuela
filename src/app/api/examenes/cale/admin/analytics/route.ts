import { NextResponse } from "next/server";
import { authorizeApiRequest } from "@/lib/api-auth";
import { buildCaleCategoryTargets, CALE_CATEGORY_BLUEPRINT } from "@/lib/cale";
import { getServerDbPool } from "@/lib/server-db";
import type {
  CaleAdminAnalyticsResponse,
  CaleAnalyticsAttemptRow,
  CaleAnalyticsCategoryRow,
  CaleAnalyticsDistributionRow,
  CaleAnalyticsQuestionRow,
  CaleAnalyticsStudentRow,
  CaleAnalyticsTrendPoint,
} from "@/lib/cale-admin";
import type { Rol } from "@/types/database";
import { toNumber } from "@/lib/api-helpers";

const ALLOWED_ROLES: Rol[] = ["super_admin", "admin_escuela", "admin_sede", "administrativo"];

type AllowedPerfil = {
  rol: Rol;
  escuela_id: string | null;
  sede_id: string | null;
};

function parseYear(value: string | null) {
  if (!value || value === "current") return String(new Date().getFullYear());
  if (value === "all") return "all";
  return /^\d{4}$/.test(value) ? value : String(new Date().getFullYear());
}

function parseMonth(value: string | null) {
  if (!value || value === "all") return "all";
  const parsed = Number(value);
  if (!Number.isFinite(parsed) || parsed < 1 || parsed > 12) return "all";
  return String(parsed).padStart(2, "0");
}

function buildPeriod(year: string, month: string) {
  if (year === "all") {
    return {
      year,
      month: "all",
      from: null,
      to: null,
      granularity: "month" as const,
    };
  }

  if (month === "all") {
    return {
      year,
      month,
      from: `${year}-01-01`,
      to: `${year}-12-31`,
      granularity: "month" as const,
    };
  }

  const monthNumber = Number(month);
  const nextDate = new Date(Number(year), monthNumber, 0);
  return {
    year,
    month,
    from: `${year}-${month}-01`,
    to: `${year}-${month}-${String(nextDate.getDate()).padStart(2, "0")}`,
    granularity: "day" as const,
  };
}

function buildExamWhere(
  alias: string,
  perfil: AllowedPerfil,
  period: ReturnType<typeof buildPeriod>
) {
  const values: Array<string> = [];
  const where = [
    `coalesce(${alias}.modulo_origen, case when ${alias}.notas like 'CALEJSON:%' then 'cale_practica' end) = 'cale_practica'`,
  ];

  const add = (value: string) => {
    values.push(value);
    return `$${values.length}`;
  };

  if (perfil.rol !== "super_admin" && perfil.escuela_id) {
    where.push(`${alias}.escuela_id = ${add(perfil.escuela_id)}`);
  }

  if (perfil.rol === "admin_sede" && perfil.sede_id) {
    where.push(`${alias}.sede_id = ${add(perfil.sede_id)}`);
  }

  if (period.from && period.to) {
    where.push(`${alias}.fecha between ${add(period.from)} and ${add(period.to)}`);
  }

  return {
    where: where.join(" and "),
    values,
  };
}

export async function GET(request: Request) {
  const authz = await authorizeApiRequest(ALLOWED_ROLES);
  if (!authz.ok) return authz.response;

  try {
    const url = new URL(request.url);
    const year = parseYear(url.searchParams.get("year"));
    const month = parseMonth(url.searchParams.get("month"));
    const period = buildPeriod(year, month);
    const pool = getServerDbPool();
    const scoped = buildExamWhere("e", authz.perfil, period);

    const summaryQuery = `
      select
        count(*)::int as total_attempts,
        count(distinct e.alumno_id)::int as unique_students,
        (count(*) filter (where e.resultado = 'aprobado'))::int as approved_attempts,
        (count(*) filter (where e.resultado = 'suspendido'))::int as failed_attempts,
        coalesce(round(avg(coalesce(e.porcentaje, 0))), 0)::int as average_score,
        coalesce(round(avg(coalesce(e.tiempo_segundos, 0))), 0)::int as average_time_seconds,
        max(e.created_at)::text as last_attempt_at,
        coalesce(sum(coalesce(e.total_preguntas, 0)), 0)::int as tracked_questions
      from public.examenes e
      where ${scoped.where}
    `;

    const trendQuery = `
      select
        to_char(date_trunc('${period.granularity}', e.fecha::timestamp), '${period.granularity === "month" ? "YYYY-MM" : "YYYY-MM-DD"}') as bucket,
        count(*)::int as attempts,
        coalesce(round(avg(coalesce(e.porcentaje, 0))), 0)::int as average_score,
        coalesce(round((count(*) filter (where e.resultado = 'aprobado'))::numeric * 100 / nullif(count(*), 0), 1), 0) as pass_rate
      from public.examenes e
      where ${scoped.where}
      group by 1
      order by 1 asc
    `;

    const distributionQuery = `
      select
        band,
        count(*)::int as count
      from (
        select case
          when coalesce(e.porcentaje, 0) < 60 then '0-59%'
          when coalesce(e.porcentaje, 0) < 80 then '60-79%'
          when coalesce(e.porcentaje, 0) < 90 then '80-89%'
          else '90-100%'
        end as band
        from public.examenes e
        where ${scoped.where}
      ) buckets
      group by band
    `;

    const groupedAttemptsQuery = `
      select
        coalesce(e.total_preguntas, 0)::int as total_preguntas,
        count(*)::int as attempts
      from public.examenes e
      where ${scoped.where}
      group by 1
    `;

    const wrongByCategoryQuery = `
      select
        coalesce(re.categoria_nombre, 'General') as categoria_nombre,
        count(*)::int as wrong_count,
        (count(*) filter (where re.respuesta_omitida = true))::int as omitted_count
      from public.respuestas_examen re
      inner join public.examenes e on e.id = re.examen_id
      where ${scoped.where}
      group by 1
    `;

    const toughestQuestionsQuery = `
      with exposures as (
        select
          d.pregunta_id,
          max(d.codigo_externo) as codigo_externo,
          max(coalesce(d.categoria_nombre, 'General')) as categoria_nombre,
          max(d.pregunta_texto) as pregunta_texto,
          count(*)::int as total_seen,
          max(d.created_at)::text as last_seen_at
        from public.examenes_cale_preguntas d
        inner join public.examenes e on e.id = d.examen_id
        where ${scoped.where}
        group by d.pregunta_id
      ),
      errors as (
        select
          re.pregunta_id,
          count(*)::int as wrong_count,
          (count(*) filter (where re.respuesta_omitida = true))::int as omitted_count
        from public.respuestas_examen re
        inner join public.examenes e on e.id = re.examen_id
        where ${scoped.where}
        group by re.pregunta_id
      )
      select
        exposures.pregunta_id::text as pregunta_id,
        exposures.codigo_externo,
        exposures.categoria_nombre,
        exposures.pregunta_texto,
        exposures.total_seen,
        coalesce(errors.wrong_count, 0)::int as wrong_count,
        coalesce(errors.omitted_count, 0)::int as omitted_count,
        coalesce(round(coalesce(errors.wrong_count, 0)::numeric * 100 / nullif(exposures.total_seen, 0), 1), 0) as error_rate,
        exposures.last_seen_at
      from exposures
      left join errors on errors.pregunta_id = exposures.pregunta_id
      where coalesce(errors.wrong_count, 0) > 0
      order by error_rate desc, wrong_count desc, last_seen_at desc
      limit 8
    `;

    const toughestFallbackQuery = `
      select
        re.pregunta_id::text as pregunta_id,
        max(pe.codigo_externo) as codigo_externo,
        max(coalesce(re.categoria_nombre, ce.nombre, 'General')) as categoria_nombre,
        max(coalesce(re.pregunta_texto, pe.pregunta, 'Pregunta no disponible')) as pregunta_texto,
        count(*)::int as total_seen,
        count(*)::int as wrong_count,
        (count(*) filter (where re.respuesta_omitida = true))::int as omitted_count,
        100::numeric as error_rate,
        max(re.created_at)::text as last_seen_at
      from public.respuestas_examen re
      inner join public.examenes e on e.id = re.examen_id
      left join public.preguntas_examen pe on pe.id = re.pregunta_id
      left join public.categorias_examen ce on ce.id = pe.categoria_id
      where ${scoped.where}
      group by re.pregunta_id
      order by wrong_count desc, last_seen_at desc
      limit 8
    `;

    const studentsQuery = `
      with ranked as (
        select
          e.alumno_id,
          coalesce(trim(concat(a.nombre, ' ', a.apellidos)), 'Alumno') as alumno_nombre,
          coalesce(e.porcentaje, 0)::int as porcentaje,
          e.resultado,
          e.created_at,
          row_number() over (partition by e.alumno_id order by e.created_at desc) as rn
        from public.examenes e
        left join public.alumnos a on a.id = e.alumno_id
        where ${scoped.where}
      )
      select
        alumno_id::text as alumno_id,
        max(alumno_nombre) as alumno_nombre,
        count(*)::int as attempts,
        coalesce(round(avg(porcentaje)), 0)::int as average_score,
        (max(porcentaje) filter (where rn = 1))::int as last_score,
        (count(*) filter (where resultado = 'aprobado'))::int as approved_attempts,
        (count(*) filter (where resultado = 'suspendido'))::int as failed_attempts,
        sum(case when rn <= 3 and resultado = 'suspendido' then 1 else 0 end)::int as recent_failures,
        max(created_at)::text as last_attempt_at
      from ranked
      group by alumno_id
      order by recent_failures desc, average_score asc, last_score asc, last_attempt_at desc
      limit 8
    `;

    const recentAttemptsQuery = `
      select
        e.id::text as id,
        e.alumno_id::text as alumno_id,
        coalesce(trim(concat(a.nombre, ' ', a.apellidos)), 'Alumno') as alumno_nombre,
        e.resultado,
        coalesce(e.porcentaje, 0)::int as porcentaje,
        coalesce(e.total_preguntas, 0)::int as total_preguntas,
        coalesce(e.respuestas_correctas, 0)::int as respuestas_correctas,
        coalesce(e.tiempo_segundos, 0)::int as tiempo_segundos,
        coalesce(e.created_at::text, e.fecha::text) as fecha_presentacion
      from public.examenes e
      left join public.alumnos a on a.id = e.alumno_id
      where ${scoped.where}
      order by e.created_at desc
      limit 12
    `;

    const isSuperAdmin = authz.perfil.rol === "super_admin";

    const [
      summaryRes,
      trendRes,
      distributionRes,
      groupedAttemptsRes,
      wrongByCategoryRes,
      toughestRes,
      studentsRes,
      recentRes,
    ] = await Promise.all([
      pool.query(summaryQuery, scoped.values),
      pool.query(trendQuery, scoped.values),
      pool.query(distributionQuery, scoped.values),
      pool.query(groupedAttemptsQuery, scoped.values),
      pool.query(wrongByCategoryQuery, scoped.values),
      pool.query(toughestQuestionsQuery, scoped.values),
      isSuperAdmin ? { rows: [] } : pool.query(studentsQuery, scoped.values),
      isSuperAdmin ? { rows: [] } : pool.query(recentAttemptsQuery, scoped.values),
    ]);

    const summaryRow = summaryRes.rows[0];
    const totalAttempts = toNumber(summaryRow?.total_attempts);
    const approvedAttempts = toNumber(summaryRow?.approved_attempts);
    const failedAttempts = toNumber(summaryRow?.failed_attempts);

    const groupedAttempts = groupedAttemptsRes.rows as Array<{
      total_preguntas: number | string;
      attempts: number | string;
    }>;
    const categoryTargets = new Map<string, number>();
    for (const blueprint of CALE_CATEGORY_BLUEPRINT) {
      categoryTargets.set(blueprint.nombre, 0);
    }
    for (const row of groupedAttempts) {
      const totalPreguntas = toNumber(row.total_preguntas);
      const attempts = toNumber(row.attempts);
      for (const target of buildCaleCategoryTargets(totalPreguntas)) {
        categoryTargets.set(
          target.nombre,
          (categoryTargets.get(target.nombre) || 0) + target.count * attempts
        );
      }
    }

    const wrongByCategory = new Map(
      (
        wrongByCategoryRes.rows as Array<{
          categoria_nombre: string;
          wrong_count: number | string;
          omitted_count: number | string;
        }>
      ).map((row) => [
        row.categoria_nombre,
        {
          wrongCount: toNumber(row.wrong_count),
          omittedCount: toNumber(row.omitted_count),
        },
      ])
    );

    const categories: CaleAnalyticsCategoryRow[] = CALE_CATEGORY_BLUEPRINT.map((item) => {
      const totalSeen = categoryTargets.get(item.nombre) || 0;
      const wrong = wrongByCategory.get(item.nombre) || { wrongCount: 0, omittedCount: 0 };
      const accuracy =
        totalSeen > 0
          ? Math.max(0, Math.round(((totalSeen - wrong.wrongCount) / totalSeen) * 100))
          : 0;
      return {
        name: item.nombre,
        totalSeen,
        wrongCount: wrong.wrongCount,
        omittedCount: wrong.omittedCount,
        accuracy,
      };
    });

    let toughestQuestions = (
      toughestRes.rows as Array<{
        pregunta_id: string | null;
        codigo_externo: string | null;
        categoria_nombre: string;
        pregunta_texto: string;
        total_seen: number | string;
        wrong_count: number | string;
        omitted_count: number | string;
        error_rate: number | string;
        last_seen_at: string | null;
      }>
    ).map<CaleAnalyticsQuestionRow>((row) => ({
      preguntaId: row.pregunta_id,
      codigoExterno: row.codigo_externo,
      categoriaNombre: row.categoria_nombre,
      pregunta: row.pregunta_texto,
      totalSeen: toNumber(row.total_seen),
      wrongCount: toNumber(row.wrong_count),
      omittedCount: toNumber(row.omitted_count),
      errorRate: toNumber(row.error_rate),
      lastSeenAt: row.last_seen_at,
    }));

    if (toughestQuestions.length === 0 && totalAttempts > 0) {
      const fallbackRes = await pool.query(toughestFallbackQuery, scoped.values);
      toughestQuestions = (
        fallbackRes.rows as Array<{
          pregunta_id: string | null;
          codigo_externo: string | null;
          categoria_nombre: string;
          pregunta_texto: string;
          total_seen: number | string;
          wrong_count: number | string;
          omitted_count: number | string;
          error_rate: number | string;
          last_seen_at: string | null;
        }>
      ).map((row) => ({
        preguntaId: row.pregunta_id,
        codigoExterno: row.codigo_externo,
        categoriaNombre: row.categoria_nombre,
        pregunta: row.pregunta_texto,
        totalSeen: toNumber(row.total_seen),
        wrongCount: toNumber(row.wrong_count),
        omittedCount: toNumber(row.omitted_count),
        errorRate: toNumber(row.error_rate),
        lastSeenAt: row.last_seen_at,
      }));
    }

    const response: CaleAdminAnalyticsResponse = {
      period,
      summary: {
        totalAttempts,
        uniqueStudents: toNumber(summaryRow?.unique_students),
        approvedAttempts,
        failedAttempts,
        passRate: totalAttempts > 0 ? Math.round((approvedAttempts / totalAttempts) * 100) : 0,
        averageScore: toNumber(summaryRow?.average_score),
        averageTimeSeconds: toNumber(summaryRow?.average_time_seconds),
        lastAttemptAt: summaryRow?.last_attempt_at ?? null,
        trackedQuestions: toNumber(summaryRow?.tracked_questions),
      },
      trend: (
        trendRes.rows as Array<{
          bucket: string;
          attempts: number | string;
          average_score: number | string;
          pass_rate: number | string;
        }>
      ).map<CaleAnalyticsTrendPoint>((row) => ({
        bucket: row.bucket,
        label: row.bucket,
        attempts: toNumber(row.attempts),
        averageScore: toNumber(row.average_score),
        passRate: toNumber(row.pass_rate),
      })),
      distribution: ["0-59%", "60-79%", "80-89%", "90-100%"].map<CaleAnalyticsDistributionRow>(
        (label) => {
          const row = (
            distributionRes.rows as Array<{ band: string; count: number | string }>
          ).find((item) => item.band === label);
          return {
            label,
            count: toNumber(row?.count),
          };
        }
      ),
      categories,
      toughestQuestions,
      studentsToCoach: (
        studentsRes.rows as Array<{
          alumno_id: string;
          alumno_nombre: string;
          attempts: number | string;
          average_score: number | string;
          last_score: number | string;
          approved_attempts: number | string;
          failed_attempts: number | string;
          recent_failures: number | string;
          last_attempt_at: string | null;
        }>
      ).map<CaleAnalyticsStudentRow>((row) => ({
        alumnoId: row.alumno_id,
        alumnoNombre: row.alumno_nombre,
        attempts: toNumber(row.attempts),
        averageScore: toNumber(row.average_score),
        lastScore: toNumber(row.last_score),
        approvedAttempts: toNumber(row.approved_attempts),
        failedAttempts: toNumber(row.failed_attempts),
        recentFailures: toNumber(row.recent_failures),
        lastAttemptAt: row.last_attempt_at,
      })),
      recentAttempts: (
        recentRes.rows as Array<{
          id: string;
          alumno_id: string;
          alumno_nombre: string;
          resultado: string;
          porcentaje: number | string;
          total_preguntas: number | string;
          respuestas_correctas: number | string;
          tiempo_segundos: number | string;
          fecha_presentacion: string | null;
        }>
      ).map<CaleAnalyticsAttemptRow>((row) => ({
        id: row.id,
        alumnoId: row.alumno_id,
        alumnoNombre: row.alumno_nombre,
        resultado: row.resultado,
        porcentaje: toNumber(row.porcentaje),
        totalPreguntas: toNumber(row.total_preguntas),
        respuestasCorrectas: toNumber(row.respuestas_correctas),
        tiempoSegundos: toNumber(row.tiempo_segundos),
        fechaPresentacion: row.fecha_presentacion,
      })),
    };

    return NextResponse.json(response);
  } catch (error) {
    console.error("[API CALE admin analytics] Error:", error);
    return NextResponse.json(
      { error: "No se pudieron generar las analíticas de evaluación CALE." },
      { status: 500 }
    );
  }
}
