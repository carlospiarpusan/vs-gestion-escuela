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
