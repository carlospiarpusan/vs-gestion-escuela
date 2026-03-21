import { serializeSearchParams } from "@/lib/dashboard-client-cache";

type DashboardCacheScope = {
  escuelaId?: string | null;
  sedeId?: string | null;
};

export function buildDashboardListServerCacheKey(
  kind: string,
  perfilId: string,
  scope: DashboardCacheScope,
  params: URLSearchParams
) {
  return [
    "dashboard-route",
    kind,
    perfilId,
    scope.escuelaId || "global",
    scope.sedeId || "all",
    serializeSearchParams(params),
  ].join(":");
}

export function isFreshDashboardDataRequested(params: URLSearchParams) {
  return params.get("fresh") === "1";
}
