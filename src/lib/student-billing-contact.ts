import { z } from "zod";
import municipalities from "./colombia-municipios.json";
import { studentContactEmailSchema } from "./student-contact-email";

export const COLOMBIA_MUNICIPALITIES = municipalities as unknown as Record<
  string,
  [string, string]
>;
export const BILLING_DEPARTMENTS = [
  ...new Set(Object.values(COLOMBIA_MUNICIPALITIES).map((m) => m[1])),
].sort((a, b) => a.localeCompare(b, "es"));
export const BILLING_RESPONSIBILITIES = [
  { value: "R-99-PN", label: "R-99-PN - No aplica / otras" },
  { value: "O-13", label: "O-13 - Gran contribuyente" },
  { value: "O-15", label: "O-15 - Autorretenedor" },
  { value: "O-23", label: "O-23 - Agente de retención de IVA" },
  { value: "O-47", label: "O-47 - Régimen SIMPLE" },
] as const;
export const studentBillingProfileSchema = z
  .object({
    country: z.literal("CO"),
    cityCode: z
      .string()
      .refine(
        (code) => /^\d{5}$/.test(code) && Object.hasOwn(COLOMBIA_MUNICIPALITIES, code),
        "Selecciona un municipio válido."
      ),
    personType: z.literal("2"),
    responsibilities: z.enum(["R-99-PN", "O-13", "O-15", "O-23", "O-47"], {
      message: "Selecciona el tipo de contribuyente según el RUT.",
    }),
    taxRegime: z.enum(["ordinario", "especial", "simple"], {
      message: "Selecciona el régimen fiscal según el RUT.",
    }),
    taxScheme: z.literal("ZZ"),
  })
  .strict()
  .superRefine((value, ctx) => {
    if ((value.taxRegime === "simple") !== (value.responsibilities === "O-47")) {
      ctx.addIssue({
        code: "custom",
        path: ["taxRegime"],
        message: "El régimen SIMPLE debe coincidir con la responsabilidad O-47 del RUT.",
      });
    }
  });
export type StudentBillingProfile = z.infer<typeof studentBillingProfileSchema>;

export const studentBillingContactSchema = z
  .object({
    email: studentContactEmailSchema,
    telefono: z
      .string()
      .trim()
      .max(30)
      .refine(
        (value) => /^\+?[\d ()-]+$/.test(value) && /^\d{7,15}$/.test(value.replace(/\D/g, "")),
        "El teléfono debe tener entre 7 y 15 dígitos."
      ),
    direccion: z.string().trim().min(3, "La dirección es obligatoria.").max(200),
    ciudad: z.string().trim().min(1, "Selecciona un municipio."),
    departamento: z.string().trim().min(1, "Selecciona un departamento."),
    datos_facturacion: studentBillingProfileSchema,
  })
  .superRefine((value, ctx) => {
    const municipality = COLOMBIA_MUNICIPALITIES[value.datos_facturacion.cityCode];
    if (
      municipality &&
      (municipality[0] !== value.ciudad || municipality[1] !== value.departamento)
    )
      ctx.addIssue({
        code: "custom",
        path: ["ciudad"],
        message: "El municipio no corresponde al departamento seleccionado.",
      });
  });

export function studentBillingProfileFromForm(form: {
  pais: string;
  municipio_codigo: string;
  regimen_fiscal: string;
  responsabilidad_fiscal?: string;
}) {
  return {
    country: form.pais,
    cityCode: form.municipio_codigo,
    personType: "2" as const,
    responsibilities: form.responsabilidad_fiscal ?? "R-99-PN",
    taxRegime: form.regimen_fiscal,
    taxScheme: "ZZ" as const,
  };
}
