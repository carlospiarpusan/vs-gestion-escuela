/**
 * Build a SQL LIKE pattern that matches a document identifier (cedula, passport, etc.)
 * regardless of formatting differences (dots, dashes, spaces).
 *
 * E.g. input "1.023.456.789" -> "%1023456789%" so it matches "1023456789" or "1.023.456.789".
 * Returns null if the normalized input is empty or too short to be useful.
 */
export function buildDocumentIdentifierLikePattern(search: string): string | null {
  if (!search) return null;
  // Strip everything except letters and digits
  const normalized = search.replace(/[^a-zA-Z0-9]/g, "").toLowerCase();
  // Only search if we have at least 3 characters to avoid too-broad matches
  if (normalized.length < 3) return null;
  return `%${normalized}%`;
}
