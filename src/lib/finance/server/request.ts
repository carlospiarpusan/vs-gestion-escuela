import { resolveEscuelaIdForRequest } from "@/lib/api-auth";
import { serializeSearchParams } from "@/lib/dashboard-client-cache";
import { normalizeUuid } from "@/lib/dashboard-scope";
import {
  getCurrentMonthRange,
  normalizeSearch,
  parseDateInput,
  parseInteger,
  resolveScope,
} from "@/app/api/reportes/contables/query-builder";
import type { AllowedPerfil, ReportScope } from "@/app/api/reportes/contables/types";
import type { Rol } from "@/types/database";

export const ALLOWED_FINANCE_ROLES: Rol[] = [
  "super_admin",
  "admin_escuela",
  "admin_sede",
  "administrativo",
];

export function buildFinanceScope(request: Request, perfil: AllowedPerfil, url: URL): ReportScope {
  const requestedSchoolId = normalizeUuid(url.searchParams.get("escuela_id"));
  const requestedSedeId = normalizeUuid(url.searchParams.get("sede_id"));

  return resolveScope(
    perfil,
    resolveEscuelaIdForRequest(request, perfil, requestedSchoolId),
    requestedSedeId
  );
}

export function buildFinanceListContext(
  request: Request,
  perfil: AllowedPerfil,
  options?: {
    defaultPageSize?: number;
    minPageSize?: number;
    maxPageSize?: number;
  }
) {
  const url = new URL(request.url);
  const dateRange = getCurrentMonthRange();
  const from = parseDateInput(url.searchParams.get("from"), dateRange.from);
  const to = parseDateInput(url.searchParams.get("to"), dateRange.to);
  const page = parseInteger(url.searchParams.get("page"), 0, 0, 10_000);
  const pageSize = parseInteger(
    url.searchParams.get("pageSize"),
    options?.defaultPageSize ?? 20,
    options?.minPageSize ?? 10,
    options?.maxPageSize ?? 10_000
  );
  const search = normalizeSearch(url.searchParams.get("q"));
  const scope = buildFinanceScope(request, perfil, url);

  return { url, from, to, page, pageSize, search, scope };
}

export function buildFinanceServerCacheKey(
  kind: string,
  perfilId: string,
  scope: ReportScope,
  params: URLSearchParams
) {
  return [
    "finance-route",
    kind,
    perfilId,
    scope.escuelaId || "global",
    scope.sedeId || "all",
    serializeSearchParams(params),
  ].join(":");
}

export function isFreshDataRequested(params: URLSearchParams) {
  return params.get("fresh") === "1";
}
