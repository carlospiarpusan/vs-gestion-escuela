/**
 * Shared helpers for API route handlers.
 *
 * Extracts common patterns (parsing, WHERE-clause building, pagination)
 * that were duplicated across 7+ API routes.
 *
 * @module lib/api-helpers
 */

// ── Parsing ──────────────────────────────────────────────────────────

/** Safely parse an integer from a query-string value with clamping. */
export function parseInteger(value: string | null, fallback: number, min: number, max: number) {
  const parsed = Number(value);
  if (!Number.isFinite(parsed)) return fallback;
  return Math.min(max, Math.max(min, Math.floor(parsed)));
}

/** Coerce an unknown value to a number, treating falsy as 0. */
export function toNumber(value: unknown) {
  return Number(value || 0);
}

/** Split a comma-separated query param into a trimmed string array. */
export function parseStringArray(value: string | null) {
  return (value ?? "")
    .split(",")
    .map((item) => item.trim())
    .filter(Boolean);
}

// ── WHERE-clause builder ─────────────────────────────────────────────

export type WhereBuilder = {
  /** Parameterised values accumulated so far. */
  values: Array<string | number>;
  /** WHERE fragments (joined with AND). */
  where: string[];
  /** Push a value and return its `$N` placeholder. */
  addValue: (value: string | number) => string;
  /** Build the final `WHERE …` clause string (empty-safe). */
  toSql: () => string;
};

/** Create a reusable WHERE-clause builder with parameterised placeholders. */
export function createWhereBuilder(): WhereBuilder {
  const values: Array<string | number> = [];
  const where: string[] = [];

  const addValue = (value: string | number) => {
    values.push(value);
    return `$${values.length}`;
  };

  const toSql = () => (where.length > 0 ? where.join(" AND ") : "TRUE");

  return { values, where, addValue, toSql };
}

// ── Pagination ───────────────────────────────────────────────────────

export type PaginationRefs = {
  offset: number;
  limitRef: string;
  offsetRef: string;
  /** Append pageSize and offset to the builder's values array. */
  values: [number, number];
};

/**
 * Compute LIMIT / OFFSET placeholders for a parameterised query.
 *
 * Call **after** all WHERE values have been pushed so the placeholder
 * indices are correct.
 */
export function buildPaginationRefs(
  page: number,
  pageSize: number,
  currentValueCount: number
): PaginationRefs {
  const offset = page * pageSize;
  return {
    offset,
    limitRef: `$${currentValueCount + 1}`,
    offsetRef: `$${currentValueCount + 2}`,
    values: [pageSize, offset],
  };
}

// ── Standard list-endpoint params ────────────────────────────────────

export type ListParams = {
  search: string;
  page: number;
  pageSize: number;
};

/** Extract the standard pagination + search params from a URL. */
export function parseListParams(url: URL, defaults: { pageSize?: number } = {}): ListParams {
  const pageSize = defaults.pageSize ?? 10;
  return {
    search: (url.searchParams.get("q") ?? "").trim(),
    page: parseInteger(url.searchParams.get("page"), 0, 0, 100_000),
    pageSize: parseInteger(url.searchParams.get("pageSize"), pageSize, 1, 50),
  };
}
