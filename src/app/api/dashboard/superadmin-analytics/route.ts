import { NextResponse } from "next/server";
import { authorizeApiRequest } from "@/lib/api-auth";
import { getServerDbPool } from "@/lib/server-db";
import { getServerReadCached } from "@/lib/server-read-cache";
import { buildDashboardCacheTags } from "@/lib/server-cache-tags";

// ── Types ──────────────────────────────────────────────────────────────
type UsersByRole = {
  rol: string;
  total: number;
  activos: number;
  ultimo_7d: number;
  ultimo_30d: number;
};

type TableVolume = {
  tabla: string;
  registros: number;
};

type MonthlyGrowth = {
  mes: string;
  alumnos: number;
  clases: number;
  ingresos: number;
  gastos: number;
  examenes: number;
};

type TopSchool = {
  id: string;
  nombre: string;
  plan: string;
  estado: string;
  alumnos_activos: number;
  clases_mes: number;
  ingresos_mes: number;
  instructores_activos: number;
  ultimo_acceso_admin: string | null;
};

type SystemHealth = {
  escuelas_activas: number;
  escuelas_inactivas: number;
  usuarios_totales: number;
  usuarios_activos_30d: number;
  tasa_actividad: number;
  ingresos_plataforma_mes: number;
  gastos_plataforma_mes: number;
};

export type SuperAdminAnalyticsResponse = {
  usersByRole: UsersByRole[];
  dataVolume: TableVolume[];
  monthlyGrowth: MonthlyGrowth[];
  topSchools: TopSchool[];
  systemHealth: SystemHealth;
  generatedAt: string;
};

const CACHE_TTL_MS = 3 * 60 * 1000; // 3 min

// ── GET /api/dashboard/superadmin-analytics ─────────────────────────────
export async function GET() {
  const authz = await authorizeApiRequest(["super_admin"]);
  if (!authz.ok) return authz.response;

  const pool = getServerDbPool();
  const cacheKey = `dashboard:superadmin-analytics:${authz.perfil.id}`;

  try {
    const analytics = await getServerReadCached<SuperAdminAnalyticsResponse>({
      key: cacheKey,
      ttlMs: CACHE_TTL_MS,
      tags: [...buildDashboardCacheTags("superadmin"), "analytics"],
      loader: async () => {
        const [usersByRoleRes, dataVolumeRes, monthlyGrowthRes, topSchoolsRes, systemHealthRes] =
          await Promise.all([
            // ── 1. Usuarios activos por rol ──────────────────────────
            pool.query<UsersByRole>(`
            select
              p.rol,
              count(*)::int as total,
              count(*) filter (where p.activo = true)::int as activos,
              count(*) filter (where p.ultimo_acceso >= now() - interval '7 days')::int as ultimo_7d,
              count(*) filter (where p.ultimo_acceso >= now() - interval '30 days')::int as ultimo_30d
            from public.perfiles p
            where p.rol != 'super_admin'
            group by p.rol
            order by total desc
          `),

            // ── 2. Volumen de datos por tabla ────────────────────────
            pool.query<TableVolume>(`
            select tabla, registros from (
              select 'alumnos' as tabla, count(*)::int as registros from public.alumnos
              union all
              select 'clases', count(*)::int from public.clases
              union all
              select 'instructores', count(*)::int from public.instructores
              union all
              select 'vehiculos', count(*)::int from public.vehiculos
              union all
              select 'ingresos', count(*)::int from public.ingresos
              union all
              select 'gastos', count(*)::int from public.gastos
              union all
              select 'perfiles', count(*)::int from public.perfiles
              union all
              select 'escuelas', count(*)::int from public.escuelas
              union all
              select 'sedes', count(*)::int from public.sedes
              union all
              select 'horas_instructor', count(*)::int from public.horas_trabajo
              union all
              select 'evaluaciones', count(*)::int from public.examenes
              union all
              select 'nominas', count(*)::int from public.nominas
            ) t
            order by registros desc
          `),

            // ── 3. Crecimiento mensual (últimos 6 meses) ────────────
            pool.query<MonthlyGrowth>(`
            with meses as (
              select generate_series(
                date_trunc('month', current_date) - interval '5 months',
                date_trunc('month', current_date),
                interval '1 month'
              )::date as mes
            ),
            alumnos_m as (
              select date_trunc('month', created_at)::date as mes, count(*)::int as cnt
              from public.alumnos
              where created_at >= date_trunc('month', current_date) - interval '5 months'
              group by 1
            ),
            clases_m as (
              select date_trunc('month', fecha)::date as mes, count(*)::int as cnt
              from public.clases
              where fecha >= date_trunc('month', current_date) - interval '5 months'
              group by 1
            ),
            ingresos_m as (
              select date_trunc('month', fecha)::date as mes, coalesce(sum(monto),0)::numeric as cnt
              from public.ingresos
              where estado = 'cobrado'
                and fecha >= date_trunc('month', current_date) - interval '5 months'
              group by 1
            ),
            gastos_m as (
              select date_trunc('month', fecha)::date as mes, coalesce(sum(monto),0)::numeric as cnt
              from public.gastos
              where fecha >= date_trunc('month', current_date) - interval '5 months'
              group by 1
            ),
            examenes_m as (
              select date_trunc('month', created_at)::date as mes, count(*)::int as cnt
              from public.examenes
              where created_at >= date_trunc('month', current_date) - interval '5 months'
              group by 1
            )
            select
              to_char(m.mes, 'YYYY-MM') as mes,
              coalesce(a.cnt, 0)::int as alumnos,
              coalesce(c.cnt, 0)::int as clases,
              coalesce(i.cnt, 0)::numeric as ingresos,
              coalesce(g.cnt, 0)::numeric as gastos,
              coalesce(e.cnt, 0)::int as examenes
            from meses m
            left join alumnos_m a on a.mes = m.mes
            left join clases_m c on c.mes = m.mes
            left join ingresos_m i on i.mes = m.mes
            left join gastos_m g on g.mes = m.mes
            left join examenes_m e on e.mes = m.mes
            order by m.mes
          `),

            // ── 4. Top 10 escuelas más activas ──────────────────────
            pool.query<TopSchool>(`
            with clases_agg as (
              select escuela_id, count(*)::int as clases_mes
              from public.clases
              where fecha >= date_trunc('month', current_date)
                and fecha < date_trunc('month', current_date) + interval '1 month'
              group by escuela_id
            ),
            ingresos_agg as (
              select escuela_id, coalesce(sum(monto),0)::numeric as ingresos_mes
              from public.ingresos
              where estado = 'cobrado'
                and fecha >= date_trunc('month', current_date)
                and fecha < date_trunc('month', current_date) + interval '1 month'
              group by escuela_id
            ),
            alumnos_agg as (
              select escuela_id, count(*)::int as alumnos_activos
              from public.alumnos
              where tipo_registro = 'regular' and estado in ('activo','pre_registrado')
              group by escuela_id
            ),
            instructores_agg as (
              select escuela_id, count(*)::int as instructores_activos
              from public.instructores
              where estado = 'activo'
              group by escuela_id
            ),
            admin_agg as (
              select distinct on (escuela_id)
                escuela_id,
                ultimo_acceso as ultimo_acceso_admin
              from public.perfiles
              where rol = 'admin_escuela' and activo = true
              order by escuela_id, ultimo_acceso desc nulls last
            )
            select
              e.id,
              e.nombre,
              e.plan,
              e.estado,
              coalesce(al.alumnos_activos, 0)::int as alumnos_activos,
              coalesce(cl.clases_mes, 0)::int as clases_mes,
              coalesce(ing.ingresos_mes, 0)::numeric as ingresos_mes,
              coalesce(ins.instructores_activos, 0)::int as instructores_activos,
              ad.ultimo_acceso_admin::text
            from public.escuelas e
            left join clases_agg cl on cl.escuela_id = e.id
            left join ingresos_agg ing on ing.escuela_id = e.id
            left join alumnos_agg al on al.escuela_id = e.id
            left join instructores_agg ins on ins.escuela_id = e.id
            left join admin_agg ad on ad.escuela_id = e.id
            where e.estado = 'activa'
            order by coalesce(cl.clases_mes, 0) + coalesce(al.alumnos_activos, 0) desc
            limit 10
          `),

            // ── 5. Salud del sistema ─────────────────────────────────
            pool.query<SystemHealth>(`
            select
              (select count(*)::int from public.escuelas where estado = 'activa') as escuelas_activas,
              (select count(*)::int from public.escuelas where estado != 'activa') as escuelas_inactivas,
              (select count(*)::int from public.perfiles) as usuarios_totales,
              (select count(*)::int from public.perfiles where ultimo_acceso >= now() - interval '30 days') as usuarios_activos_30d,
              round(
                case
                  when (select count(*) from public.perfiles) = 0 then 0
                  else (select count(*)::numeric from public.perfiles where ultimo_acceso >= now() - interval '30 days')
                       / (select count(*)::numeric from public.perfiles) * 100
                end, 1
              ) as tasa_actividad,
              (select coalesce(sum(monto),0)::numeric from public.ingresos
               where estado = 'cobrado'
                 and fecha >= date_trunc('month', current_date)
                 and fecha < date_trunc('month', current_date) + interval '1 month'
              ) as ingresos_plataforma_mes,
              (select coalesce(sum(monto),0)::numeric from public.gastos
               where fecha >= date_trunc('month', current_date)
                 and fecha < date_trunc('month', current_date) + interval '1 month'
              ) as gastos_plataforma_mes
          `),
          ]);

        const health = systemHealthRes.rows[0];

        return {
          usersByRole: usersByRoleRes.rows.map((r) => ({
            ...r,
            total: Number(r.total),
            activos: Number(r.activos),
            ultimo_7d: Number(r.ultimo_7d),
            ultimo_30d: Number(r.ultimo_30d),
          })),
          dataVolume: dataVolumeRes.rows.map((r) => ({
            tabla: r.tabla,
            registros: Number(r.registros),
          })),
          monthlyGrowth: monthlyGrowthRes.rows.map((r) => ({
            mes: r.mes,
            alumnos: Number(r.alumnos),
            clases: Number(r.clases),
            ingresos: Number(r.ingresos),
            gastos: Number(r.gastos),
            examenes: Number(r.examenes),
          })),
          topSchools: topSchoolsRes.rows.map((r) => ({
            ...r,
            alumnos_activos: Number(r.alumnos_activos),
            clases_mes: Number(r.clases_mes),
            ingresos_mes: Number(r.ingresos_mes),
            instructores_activos: Number(r.instructores_activos),
          })),
          systemHealth: {
            escuelas_activas: Number(health.escuelas_activas),
            escuelas_inactivas: Number(health.escuelas_inactivas),
            usuarios_totales: Number(health.usuarios_totales),
            usuarios_activos_30d: Number(health.usuarios_activos_30d),
            tasa_actividad: Number(health.tasa_actividad),
            ingresos_plataforma_mes: Number(health.ingresos_plataforma_mes),
            gastos_plataforma_mes: Number(health.gastos_plataforma_mes),
          },
          generatedAt: new Date().toISOString(),
        };
      },
    });

    return NextResponse.json(analytics, {
      headers: {
        "Cache-Control": `private, max-age=${Math.floor(CACHE_TTL_MS / 1000)}, stale-while-revalidate=60`,
      },
    });
  } catch (error) {
    console.error("Error al cargar analytics superadmin:", error);
    return NextResponse.json({ error: "No se pudieron cargar las analíticas." }, { status: 500 });
  }
}
