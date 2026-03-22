/**
 * Shared utility functions for API routes.
 *
 * These helpers are used across multiple route handlers for parsing
 * query-string parameters and coercing database values.
 */

/**
 * Parse a string value as an integer, clamped to [`min`, `max`].
 *
 * Returns `fallback` when the value is `null`, empty, or not a finite number.
 *
 * @example
 * ```ts
 * const page = parseInteger(searchParams.get("page"), 1, 1, 1000);
 * const limit = parseInteger(searchParams.get("limit"), 20, 1, 100);
 * ```
 */
export function parseInteger(
  value: string | null,
  fallback: number,
  min: number,
  max: number
): number {
  const parsed = Number(value);
  if (!Number.isFinite(parsed)) return fallback;
  return Math.min(max, Math.max(min, Math.floor(parsed)));
}

/**
 * Coerce an unknown value to a number.
 *
 * Treats falsy values (`null`, `undefined`, `""`, `0`) as `0`.
 * Useful for normalizing numeric columns that may come back as
 * strings from the database driver.
 *
 * @example
 * ```ts
 * const total = toNumber(row.total_pagado);
 * ```
 */
export function toNumber(value: unknown): number {
  return Number(value || 0);
}

/**
 * Split a comma-separated query-string value into a trimmed,
 * non-empty string array.
 *
 * Returns an empty array when `value` is `null` or contains only
 * whitespace / commas.
 *
 * @example
 * ```ts
 * const estados = parseStringArray(searchParams.get("estados"));
 * // "activo, retirado" -> ["activo", "retirado"]
 * // null               -> []
 * ```
 */
export function parseStringArray(value: string | null): string[] {
  return (value ?? "")
    .split(",")
    .map((item) => item.trim())
    .filter(Boolean);
}

// ---------------------------------------------------------------------------
// List endpoint helpers (shared across 9+ route handlers)
// ---------------------------------------------------------------------------

/**
 * Parse standard list query-string parameters (`q`, `page`, `pageSize`).
 *
 * @example
 * ```ts
 * const { search, page, pageSize } = parseListParams(url);
 * ```
 */
export function parseListParams(url: URL) {
  return {
    search: (url.searchParams.get("q") ?? "").trim(),
    page: parseInteger(url.searchParams.get("page"), 0, 0, 100_000),
    pageSize: parseInteger(url.searchParams.get("pageSize"), 10, 1, 50),
  };
}

/**
 * Accumulator for building parameterised WHERE clauses.
 *
 * @example
 * ```ts
 * const wb = createWhereBuilder();
 * wb.where.push(`t.escuela_id = ${wb.addValue(escuelaId)}`);
 * const sql = wb.toSql(); // "t.escuela_id = $1"
 * ```
 */
export function createWhereBuilder() {
  const values: Array<string | number> = [];
  const where: string[] = [];

  function addValue(value: string | number) {
    values.push(value);
    return `$${values.length}`;
  }

  function toSql() {
    return where.length > 0 ? where.join(" AND ") : "true";
  }

  return { values, where, addValue, toSql };
}

/**
 * Build `$N` placeholder references for LIMIT / OFFSET, positioned
 * after the WHERE-clause parameter slots.
 *
 * @example
 * ```ts
 * const pg = buildPaginationRefs(page, pageSize, wb.values.length);
 * // sql: `LIMIT ${pg.limitRef} OFFSET ${pg.offsetRef}`
 * // params: [...wb.values, ...pg.values]
 * ```
 */
export function buildPaginationRefs(page: number, pageSize: number, existingParamCount: number) {
  const offset = page * pageSize;
  return {
    limitRef: `$${existingParamCount + 1}`,
    offsetRef: `$${existingParamCount + 2}`,
    values: [pageSize, offset] as [number, number],
  };
}
