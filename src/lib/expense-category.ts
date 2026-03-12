import type { CategoriaGasto } from "@/types/database";

function normalizeExpenseText(value: string | null | undefined) {
  return (value || "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/\s+/g, " ")
    .trim()
    .toLowerCase();
}

const TRAMITADOR_PATTERN = /\b(tramitador|tramite|tramites|gestion documental|gestion de licencia|tramite de licencia|tramites de licencia)\b/;

export function isTramitadorExpenseText(...values: Array<string | null | undefined>) {
  const haystack = normalizeExpenseText(values.filter(Boolean).join(" "));
  return TRAMITADOR_PATTERN.test(haystack);
}

export function normalizeExpenseCategory(
  categoria: CategoriaGasto,
  ...values: Array<string | null | undefined>
): CategoriaGasto {
  if (isTramitadorExpenseText(...values)) {
    return "tramitador";
  }

  return categoria;
}
