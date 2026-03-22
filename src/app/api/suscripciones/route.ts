import { NextResponse } from "next/server";
import { authorizeApiRequest } from "@/lib/api-auth";
import { DASHBOARD_SUMMARY_CACHE_TTL_MS } from "@/lib/dashboard-admin-summary";
import { loadPlatformSchoolOverviews } from "@/lib/platform-school-overviews";
import {
  buildPlatformSubscriptionPlanBreakdown,
  buildPlatformSubscriptionSchools,
  buildPlatformSubscriptionStats,
  createEmptyPlatformSubscriptionsResponse,
  type PlatformSubscriptionsResponse,
} from "@/lib/platform-subscriptions";
import { getServerDbPool } from "@/lib/server-db";
import { getServerReadCached } from "@/lib/server-read-cache";
import { buildDashboardCacheTags, buildDashboardListCacheTags } from "@/lib/server-cache-tags";

function unique(values: string[]) {
  return Array.from(new Set(values));
}

export async function GET() {
  const authorization = await authorizeApiRequest(["super_admin"]);
  if (!authorization.ok) return authorization.response;

  const pool = getServerDbPool();
  const cacheKey = `dashboard:subscriptions:${authorization.perfil.id}`;

  try {
    const response = await getServerReadCached<PlatformSubscriptionsResponse>({
      key: cacheKey,
      ttlMs: DASHBOARD_SUMMARY_CACHE_TTL_MS,
      tags: unique([
        ...buildDashboardCacheTags("superadmin"),
        ...buildDashboardListCacheTags("subscriptions"),
      ]),
      loader: async () => {
        const payload = createEmptyPlatformSubscriptionsResponse();
        const overviews = await loadPlatformSchoolOverviews(pool);
        payload.schools = buildPlatformSubscriptionSchools(overviews);
        payload.stats = buildPlatformSubscriptionStats(payload.schools);
        payload.planBreakdown = buildPlatformSubscriptionPlanBreakdown(payload.schools);
        return payload;
      },
    });

    return NextResponse.json(response, {
      headers: {
        "Cache-Control": `private, max-age=${Math.floor(DASHBOARD_SUMMARY_CACHE_TTL_MS / 1000)}, stale-while-revalidate=60`,
      },
    });
  } catch (error) {
    console.error("Error al cargar suscripciones globales:", error);
    return NextResponse.json(
      { error: "No se pudieron cargar las suscripciones globales." },
      { status: 500 }
    );
  }
}
