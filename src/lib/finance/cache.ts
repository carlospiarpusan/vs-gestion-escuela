import { getClientResourceCached, invalidateClientResourceCache } from "@/lib/client-resource-cache";
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
  persistToSession = false,
  loader,
}: {
  prefix: string;
  params?: URLSearchParams | string;
  ttlMs: number;
  forceFresh?: boolean;
  persistToSession?: boolean;
  loader: () => Promise<T>;
}) {
  return getClientResourceCached<T>({
    key: buildFinanceCacheKey(prefix, params),
    ttlMs,
    forceFresh,
    persistToSession,
    loader,
  });
}

export function invalidateFinanceCache(prefixes: string | string[]) {
  invalidateClientResourceCache(prefixes);
}
