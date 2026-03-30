import { z } from "zod";

export const alumnoSchema = z.object({
  nombre: z.string().min(2, "El nombre debe tener al menos 2 caracteres."),
  apellidos: z.string().min(2, "Los apellidos deben tener al menos 2 caracteres."),
  dni: z.string().min(5, "La cédula debe tener al menos 5 caracteres."),
  tipo_documento: z.enum(["CC", "CE", "TI", "PAS"], {
    message: "Selecciona el tipo de documento.",
  }),
  telefono: z.string().min(7, "El teléfono debe tener al menos 7 dígitos."),
  lugar_expedicion_documento: z
    .string()
    .trim()
    .min(2, "Debes indicar el lugar de expedición del documento."),
  email: z.string().email("Correo electrónico inválido.").or(z.literal("")).optional(),
  fecha_nacimiento: z.string().optional(),
  valor_total: z
    .string()
    .refine(
      (val) => !val || !Number.isNaN(Number(val)),
      "El valor total debe ser un número válido."
    )
    .optional(),
  abono: z
    .string()
    .refine(
      (val) => !val || !Number.isNaN(Number(val)),
      "El monto del abono debe ser un número válido."
    )
    .optional(),
  tramitador_valor: z
    .string()
    .refine(
      (val) => !val || !Number.isNaN(Number(val)),
      "El valor del tramitador debe ser numérico."
    )
    .optional(),
  nota_examen_teorico: z
    .string()
    .refine(
      (val) => !val || (!Number.isNaN(Number(val)) && Number(val) >= 0 && Number(val) <= 100),
      "La calificación teórica debe estar entre 0 y 100."
    )
    .optional(),
  nota_examen_practico: z
    .string()
    .refine(
      (val) => !val || (!Number.isNaN(Number(val)) && Number(val) >= 0 && Number(val) <= 100),
      "La calificación práctica debe estar entre 0 y 100."
    )
    .optional(),
});

export const abonoSchema = z.object({
  monto: z.string().refine((val) => {
    const num = parseFloat(val);
    return !Number.isNaN(num) && num > 0;
  }, "El monto del abono debe ser mayor a 0."),
});

export const matriculaSchema = z.object({
  valor_total: z
    .string()
    .refine((val) => !val || !Number.isNaN(Number(val)), "El valor total debe ser numérico.")
    .optional(),
  abono: z
    .string()
    .refine((val) => !val || !Number.isNaN(Number(val)), "El abono inicial debe ser numérico.")
    .optional(),
  tramitador_valor: z
    .string()
    .refine(
      (val) => !val || !Number.isNaN(Number(val)),
      "El valor del tramitador debe ser numérico."
    )
    .optional(),
  categorias: z.array(z.string()).min(1, "Debes seleccionar al menos una categoría de curso."),
});
