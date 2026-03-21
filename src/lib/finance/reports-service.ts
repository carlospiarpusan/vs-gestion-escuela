import { fetchJsonWithRetry } from "@/lib/retry";
import { FINANCE_REPORTS_CACHE_PREFIX } from "@/lib/dashboard-client-cache";
import { getFinanceResourceCached } from "@/lib/finance/cache";
import type { AccountingReportResponse } from "@/lib/accounting-dashboard";
import { FINANCE_DASHBOARD_CACHE_TTL_MS } from "@/lib/finance/income-service";

function buildRequestParams(params: URLSearchParams, forceFresh?: boolean) {
  const nextParams = new URLSearchParams(params);
  if (forceFresh) {
    nextParams.set("fresh", "1");
  }
  return nextParams;
}

async function fetchAccountingReportFresh(params: URLSearchParams, forceFresh?: boolean) {
  const requestParams = buildRequestParams(params, forceFresh);
  return fetchJsonWithRetry<AccountingReportResponse>(
    `/api/reportes/contables?${requestParams.toString()}`
  );
}

export async function fetchFinanceReportsDashboard(
  params: URLSearchParams,
  options?: {
    forceFresh?: boolean;
    useCache?: boolean;
  }
) {
  const useCache = options?.useCache ?? true;
  if (!useCache) {
    return fetchAccountingReportFresh(params, true);
  }

  return getFinanceResourceCached<AccountingReportResponse>({
    prefix: FINANCE_REPORTS_CACHE_PREFIX,
    params,
    ttlMs: FINANCE_DASHBOARD_CACHE_TTL_MS,
    forceFresh: options?.forceFresh,
    loader: () => fetchAccountingReportFresh(params, options?.forceFresh),
  });
}
