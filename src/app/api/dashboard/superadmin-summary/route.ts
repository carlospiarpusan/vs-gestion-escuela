import { NextResponse } from "next/server";
import { authorizeApiRequest } from "@/lib/api-auth";
import {
  DASHBOARD_SUMMARY_CACHE_TTL_MS,
  createEmptySuperAdminDashboardSummary,
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

function toNumber(value: unknown) {
  if (typeof value === "number") return value;
  if (typeof value === "string") return Number(value);
  return 0;
}

export async function GET() {
  const authorization = await authorizeApiRequest(["super_admin"]);
  if (!authorization.ok) return authorization.response;

  const pool = getServerDbPool();
  const cacheKey = `dashboard:superadmin:${authorization.perfil.id}`;

  try {
    const response = await getServerReadCached<SuperAdminDashboardResponse>({
      key: cacheKey,
      ttlMs: DASHBOARD_SUMMARY_CACHE_TTL_MS,
      tags: buildDashboardCacheTags("superadmin"),
      loader: async () => {
        const nextResponse = createEmptySuperAdminDashboardSummary();
        const overviewsRes = await pool.query<OverviewRow>(
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
        );

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
            adminsActivos: toNumber(row.admins_activos),
            hasPrincipalSede: Boolean(row.has_principal_sede),
            capacidadPct: maxAlumnos > 0 ? Math.round((alumnosTotal / maxAlumnos) * 100) : 0,
          };
        });

        const activeSchools = nextResponse.schoolOverviews.filter((s) => s.estado === "activa");

        nextResponse.stats = {
          escuelas: nextResponse.schoolOverviews.length,
          escuelasActivas: activeSchools.length,
          sedesActivas: nextResponse.schoolOverviews.reduce(
            (sum, row) => sum + row.sedesActivas,
            0
          ),
          adminsEscuela: nextResponse.schoolOverviews.reduce(
            (sum, row) => sum + row.adminsActivos,
            0
          ),
          capacidadPromedio:
            activeSchools.length > 0
              ? Math.round(
                  activeSchools.reduce((sum, s) => sum + s.capacidadPct, 0) / activeSchools.length
                )
              : 0,
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
