export type ContractPrefix = "CAR" | "MOT" | "COM";

function normalizeCategoryLabel(value: string) {
  return value
    .normalize("NFD")
    .replace(/\p{Diacritic}/gu, "")
    .toUpperCase()
    .replace(/\s+/g, " ")
    .trim();
}

function isHistoricalContract(value: string) {
  return /^\d{4}-(CAR|MOT|COM)-/.test(value);
}

function hasKnownPrefix(value: string) {
  return /^(CAR|MOT|COM|APT|PRA)-/.test(value) || isHistoricalContract(value);
}

function stripKnownPrefix(value: string) {
  if (isHistoricalContract(value)) return value;
  return value.replace(/^(CAR|CARRO|MOT|MOTO|COM|COMBO|COMBOS|A2|A1|AM|AUTO)-/i, "");
}

export function getContractPrefix(categorias: string[] | null | undefined): ContractPrefix {
  const normalized = (categorias ?? [])
    .map((item) => normalizeCategoryLabel(item))
    .filter(Boolean);

  const hasMoto = normalized.some((item) => /^(AM|A1|A2|A)\b/.test(item));
  const hasCarro = normalized.some((item) => /^(B|C|RC)\d*/.test(item));
  const hasComboLabel = normalized.some((item) => /\bY\b/.test(item) || item.includes("+") || item.includes("/"));

  if (hasComboLabel || (hasMoto && hasCarro)) return "COM";
  if (hasMoto) return "MOT";
  return "CAR";
}

export function normalizeContractNumber(
  rawValue: string | null | undefined,
  categorias: string[] | null | undefined
) {
  const normalized = String(rawValue ?? "").trim().toUpperCase();
  if (!normalized) return null;
  if (hasKnownPrefix(normalized)) return normalized;

  const prefix = getContractPrefix(categorias);
  const suffix = stripKnownPrefix(normalized).replace(/\s+/g, "");
  if (!suffix) return null;

  return `${prefix}-${suffix}`;
}

export function getContractPrefixHint(categorias: string[] | null | undefined) {
  return `${getContractPrefix(categorias)}-123`;
}
