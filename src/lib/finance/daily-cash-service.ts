import { fetchJsonWithRetry } from "@/lib/retry";
import { FINANCE_CASH_CACHE_PREFIX } from "@/lib/dashboard-client-cache";
import { getFinanceResourceCached } from "@/lib/finance/cache";
import type { DailyCashResponse } from "@/lib/finance/types";
import { FINANCE_DASHBOARD_CACHE_TTL_MS } from "@/lib/finance/income-service";

function buildRequestParams(params: URLSearchParams, forceFresh?: boolean) {
  const nextParams = new URLSearchParams(params);
  if (forceFresh) {
    nextParams.set("fresh", "1");
  }
  return nextParams;
}

async function fetchDailyCashFresh(params: URLSearchParams, forceFresh?: boolean) {
  const requestParams = buildRequestParams(params, forceFresh);
  return fetchJsonWithRetry<DailyCashResponse>(`/api/caja-diaria?${requestParams.toString()}`);
}

export async function fetchDailyCashDashboard(
  params: URLSearchParams,
  options?: {
    forceFresh?: boolean;
    useCache?: boolean;
  }
) {
  const useCache = options?.useCache ?? true;
  if (!useCache) {
    return fetchDailyCashFresh(params, true);
  }

  return getFinanceResourceCached<DailyCashResponse>({
    prefix: FINANCE_CASH_CACHE_PREFIX,
    params,
    ttlMs: FINANCE_DASHBOARD_CACHE_TTL_MS,
    forceFresh: options?.forceFresh,
    loader: () => fetchDailyCashFresh(params, options?.forceFresh),
  });
}
