import { fetchJsonWithRetry } from "@/lib/retry";
import { FINANCE_PORTFOLIO_CACHE_PREFIX } from "@/lib/dashboard-client-cache";
import { getFinanceResourceCached } from "@/lib/finance/cache";
import type { PortfolioDashboardResponse } from "@/lib/finance/types";
import { FINANCE_DASHBOARD_CACHE_TTL_MS } from "@/lib/finance/income-service";

function buildRequestParams(params: URLSearchParams, forceFresh?: boolean) {
  const nextParams = new URLSearchParams(params);
  if (forceFresh) {
    nextParams.set("fresh", "1");
  }
  return nextParams;
}

async function fetchPortfolioDashboardFresh(params: URLSearchParams, forceFresh?: boolean) {
  const requestParams = buildRequestParams(params, forceFresh);
  return fetchJsonWithRetry<PortfolioDashboardResponse>(
    `/api/cartera?${requestParams.toString()}`
  );
}

export async function fetchPortfolioDashboard(
  params: URLSearchParams,
  options?: {
    forceFresh?: boolean;
    useCache?: boolean;
  }
) {
  const useCache = options?.useCache ?? true;
  if (!useCache) {
    return fetchPortfolioDashboardFresh(params, true);
  }

  return getFinanceResourceCached<PortfolioDashboardResponse>({
    prefix: FINANCE_PORTFOLIO_CACHE_PREFIX,
    params,
    ttlMs: FINANCE_DASHBOARD_CACHE_TTL_MS,
    forceFresh: options?.forceFresh,
    loader: () => fetchPortfolioDashboardFresh(params, options?.forceFresh),
  });
}
