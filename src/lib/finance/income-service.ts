import { fetchJsonWithRetry } from "@/lib/retry";
import { FINANCE_INCOME_CACHE_PREFIX } from "@/lib/dashboard-client-cache";
import { getFinanceResourceCached } from "@/lib/finance/cache";
import type { IncomeDashboardResponse } from "@/lib/finance/types";

export const FINANCE_DASHBOARD_CACHE_TTL_MS = 45 * 1000;

function buildRequestParams(params: URLSearchParams, forceFresh?: boolean) {
  const nextParams = new URLSearchParams(params);
  if (forceFresh) {
    nextParams.set("fresh", "1");
  }
  return nextParams;
}

async function fetchIncomeDashboardFresh(params: URLSearchParams, forceFresh?: boolean) {
  const requestParams = buildRequestParams(params, forceFresh);
  return fetchJsonWithRetry<IncomeDashboardResponse>(`/api/ingresos?${requestParams.toString()}`);
}

export async function fetchIncomeDashboard(
  params: URLSearchParams,
  options?: {
    forceFresh?: boolean;
    useCache?: boolean;
  }
) {
  const useCache = options?.useCache ?? true;
  if (!useCache) {
    return fetchIncomeDashboardFresh(params, true);
  }

  return getFinanceResourceCached<IncomeDashboardResponse>({
    prefix: FINANCE_INCOME_CACHE_PREFIX,
    params,
    ttlMs: FINANCE_DASHBOARD_CACHE_TTL_MS,
    forceFresh: options?.forceFresh,
    loader: () => fetchIncomeDashboardFresh(params, options?.forceFresh),
  });
}
