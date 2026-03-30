/**
 * Contract prefix / sequence parsing utilities.
 *
 * Contract numbers follow the pattern: PREFIX-SEQUENCE (e.g. "MOT-0042", "CAR-0015", "COM-0003").
 * PREFIX is derived from the selected categories:
 *   - Only moto categories (A, A1, A2, AM) -> "MOT"
 *   - Only car categories (B, C, D) -> "CAR"
 *   - Mixed categories -> "COM"
 */

export type ContractSequencePrefix = "MOT" | "CAR" | "COM";

const MOTO_CATEGORIES = new Set(["AM", "A1", "A2", "A"]);
const CAR_CATEGORIES = new Set(["B", "C", "D"]);

/**
 * Normalize a stored prefix value (e.g. "MOT", "CAR", "COM") to the canonical enum value,
 * or return null if it is not a recognized prefix.
 */
export function normalizeContractSequencePrefix(
  raw: string | null | undefined
): ContractSequencePrefix | null {
  if (!raw) return null;
  const upper = raw.trim().toUpperCase();
  if (upper === "MOT" || upper === "CAR" || upper === "COM") return upper;
  return null;
}

/**
 * Parse the prefix from a stored contract number string like "MOT-0042" -> "MOT".
 * Returns null if the number does not contain a recognized prefix.
 */
export function parseHistoricContractPrefix(
  contractNumber: string | null | undefined
): ContractSequencePrefix | null {
  if (!contractNumber) return null;
  const match = contractNumber.trim().match(/^(MOT|CAR|COM)\s*-/i);
  if (!match) return null;
  return match[1].toUpperCase() as ContractSequencePrefix;
}

/**
 * Parse the numeric consecutive from a stored contract number like "MOT-0042" -> 42.
 * Returns null if parsing fails.
 */
export function parseHistoricContractConsecutive(
  contractNumber: string | null | undefined
): number | null {
  if (!contractNumber) return null;
  const match = contractNumber.trim().match(/-\s*(\d+)$/);
  if (!match) return null;
  const n = parseInt(match[1], 10);
  return isNaN(n) ? null : n;
}

/**
 * Infer the contract prefix from the categories when the stored contract doesn't include one.
 * E.g. if the student only has moto categories, the prefix should be "MOT".
 */
export function inferHistoricContractPrefix({
  numeroContrato,
  categorias,
}: {
  numeroContrato: string | null | undefined;
  categorias: string[];
}): ContractSequencePrefix | null {
  // If there is a number, try to parse from it first
  if (numeroContrato) {
    const parsed = parseHistoricContractPrefix(numeroContrato);
    if (parsed) return parsed;
  }

  // Infer from categories
  if (!categorias || categorias.length === 0) return null;
  return derivePrefixFromCategories(categorias);
}

/**
 * Given a list of license categories, derive the contract prefix.
 */
export function derivePrefixFromCategories(categorias: string[]): ContractSequencePrefix {
  const hasMoto = categorias.some((c) => MOTO_CATEGORIES.has(c));
  const hasCar = categorias.some((c) => CAR_CATEGORIES.has(c));

  if (hasMoto && hasCar) return "COM";
  if (hasMoto) return "MOT";
  return "CAR";
}
