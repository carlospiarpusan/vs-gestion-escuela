import { COLOMBIA_MUNICIPALITIES } from "./student-billing-contact";

export const DEFAULT_STUDENT_BILLING_PROFILE = {
  country: "CO",
  cityCode: "52356",
  personType: "2",
  taxRegime: "ordinario",
  responsibilities: "R-99-PN",
  taxScheme: "ZZ",
} as const;

// Form suggestions only: the API still requires explicit, validated saved data.
export function studentBillingFormDefaults(contact: {
  ciudad?: string | null;
  departamento?: string | null;
  datos_facturacion?: unknown;
}) {
  const profile =
    typeof contact.datos_facturacion === "object" && contact.datos_facturacion !== null
      ? (contact.datos_facturacion as Record<string, unknown>)
      : {};
  const saved = (field: string) =>
    typeof profile[field] === "string" ? profile[field].trim() : "";
  const savedCity = contact.ciudad?.trim() ?? "";
  const savedDepartment = contact.departamento?.trim() ?? "";
  let cityCode = saved("cityCode");
  if (!cityCode && savedCity) {
    const matches = Object.entries(COLOMBIA_MUNICIPALITIES).filter(
      ([, pair]) =>
        pair[0].toLocaleUpperCase("es") === savedCity.toLocaleUpperCase("es") &&
        (!savedDepartment || pair[1] === savedDepartment)
    );
    if (matches.length === 1) cityCode = matches[0][0];
  }
  const defaultMunicipality = COLOMBIA_MUNICIPALITIES[DEFAULT_STUDENT_BILLING_PROFILE.cityCode];
  if (!cityCode && !savedCity && (!savedDepartment || savedDepartment === defaultMunicipality[1]))
    cityCode = DEFAULT_STUDENT_BILLING_PROFILE.cityCode;
  const municipality = COLOMBIA_MUNICIPALITIES[cityCode];
  const regime = saved("taxRegime");
  const responsibility = saved("responsibilities");
  return {
    ciudad:
      municipality &&
      (!savedCity || savedCity.toLocaleUpperCase("es") === municipality[0].toLocaleUpperCase("es"))
        ? municipality[0]
        : savedCity,
    departamento: savedDepartment || municipality?.[1] || "",
    datos_facturacion: {
      country: saved("country") || DEFAULT_STUDENT_BILLING_PROFILE.country,
      cityCode,
      personType: saved("personType") || DEFAULT_STUDENT_BILLING_PROFILE.personType,
      taxRegime:
        regime ||
        (responsibility === "O-47" ? "simple" : DEFAULT_STUDENT_BILLING_PROFILE.taxRegime),
      responsibilities:
        responsibility ||
        (regime === "simple" ? "O-47" : DEFAULT_STUDENT_BILLING_PROFILE.responsibilities),
      taxScheme: saved("taxScheme") || DEFAULT_STUDENT_BILLING_PROFILE.taxScheme,
    },
  };
}
