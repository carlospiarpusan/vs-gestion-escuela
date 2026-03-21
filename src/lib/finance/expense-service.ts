import { fetchJsonWithRetry } from "@/lib/retry";
import { FINANCE_EXPENSE_CACHE_PREFIX } from "@/lib/dashboard-client-cache";
import { getFinanceResourceCached } from "@/lib/finance/cache";
import type { ExpenseDashboardResponse } from "@/lib/finance/types";
import { FINANCE_DASHBOARD_CACHE_TTL_MS } from "@/lib/finance/income-service";

function buildRequestParams(params: URLSearchParams, forceFresh?: boolean) {
  const nextParams = new URLSearchParams(params);
  if (forceFresh) {
    nextParams.set("fresh", "1");
  }
  return nextParams;
}

async function fetchExpenseDashboardFresh(params: URLSearchParams, forceFresh?: boolean) {
  const requestParams = buildRequestParams(params, forceFresh);
  return fetchJsonWithRetry<ExpenseDashboardResponse>(`/api/gastos?${requestParams.toString()}`);
}

export async function fetchExpenseDashboard(
  params: URLSearchParams,
  options?: {
    forceFresh?: boolean;
    useCache?: boolean;
  }
) {
  const useCache = options?.useCache ?? true;
  if (!useCache) {
    return fetchExpenseDashboardFresh(params, true);
  }

  return getFinanceResourceCached<ExpenseDashboardResponse>({
    prefix: FINANCE_EXPENSE_CACHE_PREFIX,
    params,
    ttlMs: FINANCE_DASHBOARD_CACHE_TTL_MS,
    forceFresh: options?.forceFresh,
    loader: () => fetchExpenseDashboardFresh(params, options?.forceFresh),
  });
}
