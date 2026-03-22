import { NextResponse } from "next/server";
import { authorizeApiRequest } from "@/lib/api-auth";
import {
  DASHBOARD_SUMMARY_CACHE_TTL_MS,
  createEmptySuperAdminDashboardSummary,
  type SuperAdminDashboardResponse,
} from "@/lib/dashboard-admin-summary";
import { loadPlatformSchoolOverviews } from "@/lib/platform-school-overviews";
import { getServerDbPool } from "@/lib/server-db";
import { getServerReadCached } from "@/lib/server-read-cache";
import { buildDashboardCacheTags } from "@/lib/server-cache-tags";

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
        const schoolOverviews = await loadPlatformSchoolOverviews(pool);

        nextResponse.schoolOverviews = schoolOverviews;

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
