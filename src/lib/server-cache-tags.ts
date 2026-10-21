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
    ...(escuelaId ? [] : ["scope", "scope:aggregate"]),
    escuelaId ? `scope:school:${escuelaId}` : "",
    escuelaId && sedeId ? `scope:branch:${escuelaId}:${sedeId}` : "",
  ]);
}

function domainReadTags(domain: string, scope?: CacheScope | null) {
  const group = domain.split(":")[0];
  return unique([
    group,
    domain,
    ...buildScopeCacheTags(scope),
    ...(scope?.escuelaId
      ? [`${group}:school:${scope.escuelaId}`, `${domain}:school:${scope.escuelaId}`]
      : [`${group}:aggregate`, `${domain}:aggregate`]),
  ]);
}

function domainInvalidationTags(domain: string, scope?: CacheScope | null) {
  return [scope?.escuelaId ? `${domain}:school:${scope.escuelaId}` : domain];
}

export function buildFinanceCacheTags(
  kind: "income" | "expense" | "portfolio" | "cash" | "reports",
  scope?: CacheScope | null
) {
  return domainReadTags(`finance:${kind}`, scope);
}

export function buildFinanceInvalidationTags(
  kind: "income" | "expense" | "portfolio" | "cash" | "reports",
  scope?: CacheScope | null
) {
  return domainInvalidationTags(`finance:${kind}`, scope);
}

export function buildDashboardCacheTags(
  kind: "admin" | "superadmin" | "alumno",
  options?: CacheScope & { userId?: string | null }
) {
  return unique([
    ...domainReadTags(`dashboard:${kind}`, options),
    options?.userId ? `user:${options.userId}` : "",
  ]);
}

export function buildDashboardInvalidationTags(
  kind: "admin" | "superadmin" | "alumno",
  options?: CacheScope & { userId?: string | null }
) {
  return kind === "alumno" && options?.userId
    ? [`user:${options.userId}`]
    : domainInvalidationTags(`dashboard:${kind}`, options);
}

export function buildDashboardListCacheTags(name: string, scope?: CacheScope | null) {
  return domainReadTags(`dashboard:list:${name}`, scope);
}

export function buildDashboardListInvalidationTags(name: string, scope?: CacheScope | null) {
  return domainInvalidationTags(`dashboard:list:${name}`, scope);
}

export function buildBroadFinanceInvalidationTags(scope?: CacheScope | null) {
  return domainInvalidationTags("finance", scope);
}

export function buildBroadDashboardInvalidationTags(scope?: CacheScope | null) {
  return domainInvalidationTags("dashboard", scope);
}

export function buildIncomeMutationInvalidationTags(scope?: CacheScope | null) {
  return unique([
    ...(["income", "portfolio", "cash", "reports"] as const).flatMap((kind) =>
      buildFinanceInvalidationTags(kind, scope)
    ),
    ...buildDashboardInvalidationTags("admin", scope ?? undefined),
    ...buildDashboardInvalidationTags("alumno", scope ?? undefined),
    ...buildDashboardListInvalidationTags("alumnos", scope),
  ]);
}

export function buildExpenseMutationInvalidationTags(scope?: CacheScope | null) {
  return (["expense", "cash", "reports"] as const).flatMap((kind) =>
    buildFinanceInvalidationTags(kind, scope)
  );
}

// Global reports depend on every school. Their aggregate tags are assigned only
// to global reads, never to another school's private cache entries.
export function expandMutationCacheTags(tags: string[]) {
  return unique(
    tags.flatMap((tag) => {
      const match = /^(finance(?::[a-z-]+)?|dashboard(?::[a-z-]+){0,2}|scope):school:[^:]+$/.exec(
        tag
      );
      if (!match) return [tag];
      return [tag, `${match[1]}:aggregate`, "scope:aggregate", "dashboard:aggregate"];
    })
  );
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
