import { z } from "zod";
import { getTodayDateString, isValidDateOnly } from "@/lib/date-utils";
import { calculateEnrollmentAnsv } from "@/lib/ansv";
import { studentContactEmailSchema } from "@/lib/student-contact-email";

const optionalDateOnlySchema = z
  .string()
  .refine((val) => !val || isValidDateOnly(val), "Selecciona una fecha válida.")
  .optional();
const requiredDateOnlySchema = z.string().refine(isValidDateOnly, "Selecciona una fecha válida.");

const alumnoFields = z.object({
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
  email: z
    .string()
    .trim()
    .max(254)
    .email("Correo electrónico inválido.")
    .or(z.literal(""))
    .optional(),
  fecha_nacimiento: optionalDateOnlySchema,
  fecha_inscripcion: optionalDateOnlySchema,
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
  fecha_examen_teorico: optionalDateOnlySchema,
  nota_examen_practico: z
    .string()
    .refine(
      (val) => !val || (!Number.isNaN(Number(val)) && Number(val) >= 0 && Number(val) <= 100),
      "La calificación práctica debe estar entre 0 y 100."
    )
    .optional(),
  fecha_examen_practico: optionalDateOnlySchema,
});

export const alumnoSchema = alumnoFields
  .extend({
    email: studentContactEmailSchema,
    tipo_registro: z.enum(["regular", "aptitud_conductor", "practica_adicional"]),
    fecha_inscripcion: requiredDateOnlySchema,
    sexo: z.enum(["M", "F", ""]).optional(),
    categorias: z.array(z.string()),
    ansv_categoria: z.string().optional(),
    consentimiento_datos: z.literal(true, {
      error: "Debes confirmar la autorización de tratamiento de datos.",
    }),
  })
  .superRefine((value, ctx) => {
    if (value.fecha_inscripcion > getTodayDateString())
      ctx.addIssue({
        code: "custom",
        path: ["fecha_inscripcion"],
        message: "La fecha de inscripción o servicio no puede ser futura.",
      });
    if (value.fecha_nacimiento && value.fecha_nacimiento > value.fecha_inscripcion)
      ctx.addIssue({
        code: "custom",
        path: ["fecha_nacimiento"],
        message:
          "La fecha de nacimiento no puede ser posterior a la fecha de inscripción o servicio.",
      });
    if (value.tipo_registro === "regular") {
      try {
        calculateEnrollmentAnsv({
          fechaNacimiento: value.fecha_nacimiento,
          sexo: value.sexo,
          fechaMatricula: value.fecha_inscripcion,
          categorias: value.categorias,
          categoria: value.ansv_categoria,
        });
      } catch (error) {
        ctx.addIssue({
          code: "custom",
          path: ["fecha_nacimiento"],
          message: (error as Error).message,
        });
      }
    }
  });

// Historic students may not yet have the contact fields required for new registrations.
export const alumnoEditSchema = alumnoFields.extend({
  nombre: z.string().trim().min(1, "El nombre es obligatorio."),
  apellidos: z.string().trim().min(1, "Los apellidos son obligatorios."),
  telefono: z
    .string()
    .trim()
    .refine(
      (value) => !value || value.replace(/\D/g, "").length >= 7,
      "El teléfono debe tener al menos 7 dígitos."
    ),
  lugar_expedicion_documento: z.string().trim().max(160),
});

export const abonoSchema = z.object({
  monto: z.string().refine((val) => {
    const num = parseFloat(val);
    return !Number.isNaN(num) && num > 0;
  }, "El monto del abono debe ser mayor a 0."),
});

export const matriculaSchema = z.object({
  fecha_inscripcion: requiredDateOnlySchema,
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
