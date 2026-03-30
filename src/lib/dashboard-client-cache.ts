import {
  getClientResourceCached,
  invalidateClientResourceCache,
  readClientResourceCache,
} from "@/lib/client-resource-cache";
import {
  DASHBOARD_CATALOG_CACHE_TTL_MS,
  DASHBOARD_SUMMARY_CACHE_TTL_MS,
  buildDashboardSummaryCacheKey,
} from "@/lib/dashboard-admin-summary";

export const DASHBOARD_SUMMARY_CACHE_PREFIX = "dashboard-summary:";
export const DASHBOARD_CATALOG_CACHE_PREFIX = "dashboard-catalog:";
export const DASHBOARD_LIST_CACHE_PREFIX = "dashboard-list:";
export const ACCOUNTING_REPORT_CACHE_PREFIX = "accounting-report:";
export const FINANCE_INCOME_CACHE_PREFIX = "finance-income:";
export const FINANCE_EXPENSE_CACHE_PREFIX = "finance-expense:";
export const FINANCE_PORTFOLIO_CACHE_PREFIX = "finance-portfolio:";
export const FINANCE_CASH_CACHE_PREFIX = "finance-cash:";
export const FINANCE_REPORTS_CACHE_PREFIX = "finance-reports:v2:";

type CacheScope = {
  id?: string | null;
  rol?: string | null;
  escuelaId?: string | null;
  sedeId?: string | null;
};

function serializeScope(scope: CacheScope) {
  return `${scope.id || "anon"}:${scope.rol || "unknown"}:${scope.escuelaId || "global"}:${scope.sedeId || "all"}`;
}

export function serializeSearchParams(params: URLSearchParams) {
  const entries = Array.from(params.entries()).sort(
    ([leftKey, leftValue], [rightKey, rightValue]) => {
      if (leftKey === rightKey) return leftValue.localeCompare(rightValue);
      return leftKey.localeCompare(rightKey);
    }
  );

  return new URLSearchParams(entries).toString();
}

export function buildDashboardSummaryClientCacheKey(
  kind: "admin" | "superadmin" | "alumno",
  scope: CacheScope
) {
  return buildDashboardSummaryCacheKey(kind, {
    id: scope.id ?? null,
    rol: scope.rol ?? null,
    escuela_id: scope.escuelaId ?? null,
    sede_id: scope.sedeId ?? null,
  });
}

export async function getDashboardSummaryCached<T>({
  kind,
  scope,
  forceFresh = false,
  loader,
}: {
  kind: "admin" | "superadmin" | "alumno";
  scope: CacheScope;
  forceFresh?: boolean;
  loader: () => Promise<T>;
}) {
  return getClientResourceCached<T>({
    key: buildDashboardSummaryClientCacheKey(kind, scope),
    ttlMs: DASHBOARD_SUMMARY_CACHE_TTL_MS,
    forceFresh,
    policy: "summary",
    loader,
  });
}

export function readDashboardSummaryCache<T>(
  kind: "admin" | "superadmin" | "alumno",
  scope: CacheScope
) {
  return readClientResourceCache<T>(buildDashboardSummaryClientCacheKey(kind, scope));
}

export function buildDashboardCatalogCacheKey(
  name: string,
  scope: CacheScope,
  params?: URLSearchParams | string
) {
  const serializedParams =
    typeof params === "string" ? params : params ? serializeSearchParams(params) : "";
  return `${DASHBOARD_CATALOG_CACHE_PREFIX}${name}:${serializeScope(scope)}${serializedParams ? `:${serializedParams}` : ""}`;
}

export async function getDashboardCatalogCached<T>({
  name,
  scope,
  ttlMs = DASHBOARD_CATALOG_CACHE_TTL_MS,
  forceFresh = false,
  params,
  loader,
}: {
  name: string;
  scope: CacheScope;
  ttlMs?: number;
  forceFresh?: boolean;
  params?: URLSearchParams | string;
  loader: () => Promise<T>;
}) {
  return getClientResourceCached<T>({
    key: buildDashboardCatalogCacheKey(name, scope, params),
    ttlMs,
    forceFresh,
    policy: "catalog",
    loader,
  });
}

export function buildDashboardListCacheKey(
  name: string,
  scope: CacheScope,
  params?: URLSearchParams | string
) {
  const serializedParams =
    typeof params === "string" ? params : params ? serializeSearchParams(params) : "";
  return `${DASHBOARD_LIST_CACHE_PREFIX}${name}:${serializeScope(scope)}${serializedParams ? `:${serializedParams}` : ""}`;
}

export async function getDashboardListCached<T>({
  name,
  scope,
  ttlMs = DASHBOARD_SUMMARY_CACHE_TTL_MS,
  forceFresh = false,
  params,
  loader,
}: {
  name: string;
  scope: CacheScope;
  ttlMs?: number;
  forceFresh?: boolean;
  params?: URLSearchParams | string;
  loader: () => Promise<T>;
}) {
  return getClientResourceCached<T>({
    key: buildDashboardListCacheKey(name, scope, params),
    ttlMs,
    forceFresh,
    policy: "list",
    loader,
  });
}

export function invalidateDashboardClientCaches(
  prefixes: string | string[] = [
    DASHBOARD_SUMMARY_CACHE_PREFIX,
    DASHBOARD_CATALOG_CACHE_PREFIX,
    DASHBOARD_LIST_CACHE_PREFIX,
    ACCOUNTING_REPORT_CACHE_PREFIX,
    FINANCE_INCOME_CACHE_PREFIX,
    FINANCE_EXPENSE_CACHE_PREFIX,
    FINANCE_PORTFOLIO_CACHE_PREFIX,
    FINANCE_CASH_CACHE_PREFIX,
    FINANCE_REPORTS_CACHE_PREFIX,
  ]
) {
  invalidateClientResourceCache(prefixes);
}
