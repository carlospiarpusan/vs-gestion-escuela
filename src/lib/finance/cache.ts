import {
  type ClientResourceCachePolicy,
  getClientResourceCached,
  invalidateClientResourceCache,
} from "@/lib/client-resource-cache";
import { serializeSearchParams } from "@/lib/dashboard-client-cache";

export function buildFinanceCacheKey(prefix: string, params?: URLSearchParams | string) {
  const serializedParams =
    typeof params === "string" ? params : params ? serializeSearchParams(params) : "";

  return `${prefix}${serializedParams}`;
}

export async function getFinanceResourceCached<T>({
  prefix,
  params,
  ttlMs,
  forceFresh = false,
  policy = "list",
  persistToSession,
  loader,
}: {
  prefix: string;
  params?: URLSearchParams | string;
  ttlMs: number;
  forceFresh?: boolean;
  policy?: Extract<ClientResourceCachePolicy, "list" | "heavy-report">;
  persistToSession?: boolean;
  loader: () => Promise<T>;
}) {
  return getClientResourceCached<T>({
    key: buildFinanceCacheKey(prefix, params),
    ttlMs,
    forceFresh,
    policy,
    persistToSession,
    loader,
  });
}

export function invalidateFinanceCache(prefixes: string | string[]) {
  invalidateClientResourceCache(prefixes);
}
