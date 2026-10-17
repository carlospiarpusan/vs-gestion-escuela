import { serializeSearchParams, STAFF_SCOPE_CACHE_VERSION } from "@/lib/dashboard-client-cache";

type DashboardCacheScope = {
  escuelaId?: string | null;
  sedeId?: string | null;
};

export function buildDashboardListServerCacheKey(
  kind: string,
  audienceKey: string,
  scope: DashboardCacheScope,
  params: URLSearchParams
) {
  return [
    "dashboard-route",
    STAFF_SCOPE_CACHE_VERSION,
    kind,
    audienceKey || "shared",
    scope.escuelaId || "global",
    scope.sedeId || "all",
    serializeSearchParams(params),
  ].join(":");
}

export function isFreshDashboardDataRequested(params: URLSearchParams) {
  return params.get("fresh") === "1";
}
