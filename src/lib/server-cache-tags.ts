type CacheScope = {
  escuelaId?: string | null;
  sedeId?: string | null;
};

function unique(values: string[]) {
  return Array.from(new Set(values.filter(Boolean)));
}

export function buildScopeCacheTags(scope?: CacheScope | null) {
  const escuelaId = scope?.escuelaId || null;
  const sedeId = scope?.sedeId || null;

  return unique([
    "scope",
    escuelaId ? `scope:school:${escuelaId}` : "",
    escuelaId && sedeId ? `scope:branch:${escuelaId}:${sedeId}` : "",
  ]);
}

export function buildFinanceCacheTags(
  kind: "income" | "expense" | "portfolio" | "cash" | "reports",
  scope?: CacheScope | null
) {
  return unique(["finance", `finance:${kind}`, ...buildScopeCacheTags(scope)]);
}

export function buildDashboardCacheTags(
  kind: "admin" | "superadmin" | "alumno",
  options?: CacheScope & { userId?: string | null }
) {
  return unique([
    "dashboard",
    `dashboard:${kind}`,
    ...(kind !== "alumno" ? buildScopeCacheTags(options) : []),
    options?.userId ? `user:${options.userId}` : "",
  ]);
}

export function buildDashboardListCacheTags(name: string, scope?: CacheScope | null) {
  return unique(["dashboard", `dashboard:list:${name}`, ...buildScopeCacheTags(scope)]);
}

export function buildBroadFinanceInvalidationTags(scope?: CacheScope | null) {
  return unique([
    "finance",
    "finance:income",
    "finance:expense",
    "finance:portfolio",
    "finance:cash",
    "finance:reports",
    ...buildScopeCacheTags(scope),
  ]);
}

export function buildBroadDashboardInvalidationTags(scope?: CacheScope | null) {
  return unique([
    "dashboard",
    "dashboard:admin",
    "dashboard:superadmin",
    ...buildScopeCacheTags(scope),
  ]);
}

export function buildScopedMutationRevalidationTags(options?: {
  scope?: CacheScope | null;
  includeFinance?: boolean;
  includeDashboard?: boolean;
  userId?: string | null;
}) {
  return unique([
    ...(options?.includeFinance === false ? [] : buildBroadFinanceInvalidationTags(options?.scope)),
    ...(options?.includeDashboard === false
      ? []
      : buildBroadDashboardInvalidationTags(options?.scope)),
    options?.userId ? `user:${options.userId}` : "",
  ]);
}
