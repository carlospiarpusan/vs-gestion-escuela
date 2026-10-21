import type { TipoPlantillaContratoEscuela } from "@/types/database";
import source from "./contract-templates/sin-fronteras.json";

export const CONTRACT_PAGE_BREAK = "\n---PAGE_BREAK---\n";
export const SIN_FRONTERAS_SCHOOL_ID = "a5320c4a-3bf6-4da5-b365-da17d7001d4f";
export const SIN_FRONTERAS_TEMPLATE_TITLE = "SF-GC-FORM-01";
export const CONTRACT_TEMPLATE_LABELS: Record<TipoPlantillaContratoEscuela, string> = {
  vehiculo: "Vehiculo",
  moto: "Moto",
  combo: "Combo",
};
export const CONTRACT_FORMATION_LABELS: Record<TipoPlantillaContratoEscuela, string> = {
  vehiculo: "vehículo",
  moto: "motocicleta",
  combo: "motocicleta y vehículo",
};

export function splitContractTemplate(text: string): [string, string] {
  const parts = text.split(CONTRACT_PAGE_BREAK);
  return [parts[0] ?? "", parts.slice(1).join(CONTRACT_PAGE_BREAK)];
}

export function replaceContractVariables(text: string, variables: Record<string, string>) {
  // One pass prevents student data containing {{...}} from being interpreted as another variable.
  return text.replace(/\{\{([A-Z_]+)\}\}/g, (token, key) => variables[key] ?? token);
}

export function getContractAgeRequirement(categories: string[]) {
  return categories.some((category) => /^R?C[123]?$/.test(category.trim().toUpperCase()))
    ? "Tener 18 años cumplidos para vehículos de servicio público."
    : "Tener 16 años cumplidos.";
}

export function getSinFronterasTemplates() {
  return (["moto", "vehiculo", "combo"] as const).map((type) => ({
    tipo_plantilla: type,
    titulo: `${SIN_FRONTERAS_TEMPLATE_TITLE} - ${CONTRACT_TEMPLATE_LABELS[type]}`,
    html_plantilla: source.page1.join("\n\n") + CONTRACT_PAGE_BREAK + source.page2.join("\n\n"),
  }));
}

export function usesSinFronterasForm(schoolId: string, title: string | null | undefined) {
  return (
    schoolId === SIN_FRONTERAS_SCHOOL_ID && Boolean(title?.startsWith(SIN_FRONTERAS_TEMPLATE_TITLE))
  );
}

export const SIN_FRONTERAS_FORM = {
  code: source.formCode,
  issuedOn: source.issuedOn,
  version: source.version,
};
