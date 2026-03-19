import { z } from "zod";
import { PASSWORD_MIN_LENGTH } from "@/lib/password-policy";

const strongPasswordSchema = z
  .string()
  .min(PASSWORD_MIN_LENGTH, `La contraseña debe tener al menos ${PASSWORD_MIN_LENGTH} caracteres`)
  .regex(/[A-Z]/, "La contraseña debe incluir al menos una mayúscula")
  .regex(/[0-9]/, "La contraseña debe incluir al menos un número");

export const createAlumnoSchema = z.object({
  nombre: z.string().min(2, "Nombre muy corto").max(200),
  email: z.string().email("Email inválido").nullable().optional(),
  dni: z.string().min(5, "Cédula muy corta").max(30, "Cédula muy larga"),
  escuela_id: z.string().uuid("ID de escuela inválido"),
  sede_id: z.string().uuid("ID de sede inválido"),
});

export const createInstructorSchema = z.object({
  nombre: z.string().min(2, "Nombre muy corto").max(200),
  email: z.string().email("Email inválido").nullable().optional(),
  dni: z.string().min(5, "Cédula muy corta").max(30, "Cédula muy larga"),
  escuela_id: z.string().uuid("ID de escuela inválido"),
  sede_id: z.string().uuid("ID de sede inválido"),
});

export const createAdministrativoSchema = z.object({
  nombre: z.string().min(2, "Nombre muy corto").max(200),
  cedula: z.string().min(5, "Cédula muy corta").max(30, "Cédula muy larga"),
  email: z.string().email("Email inválido").nullable().optional(),
  escuela_id: z.string().uuid("ID de escuela inválido"),
  sede_id: z.string().uuid("ID de sede inválido"),
});

export const createAdminEscuelaSchema = z.object({
  escuela_id: z.string().uuid("ID de escuela inválido"),
  nombre: z.string().trim().min(2, "Nombre muy corto").max(200),
  email: z.string().trim().email("Email inválido"),
  password: strongPasswordSchema,
});

export const createEscuelaSchema = z
  .object({
    nombre: z.string().trim().min(2, "Nombre muy corto").max(200),
    cif: z.string().trim().min(2, "NIT muy corto").max(100),
    telefono: z.string().trim().max(50).nullable().optional(),
    email: z.string().trim().email("Email inválido").nullable().optional(),
    direccion: z.string().trim().max(250).nullable().optional(),
    plan: z.enum(["gratuito", "basico", "profesional", "enterprise"]),
    estado: z.enum(["activa", "inactiva", "suspendida"]),
    max_alumnos: z.number().int().min(1).max(100000),
    max_sedes: z.number().int().min(1).max(1000),
    categorias: z.array(z.string().min(1).max(50)).max(50).default([]),
    crear_admin: z.boolean().default(false),
    admin: z
      .object({
        nombre: z.string().trim().min(2, "Nombre muy corto").max(200),
        email: z.string().trim().email("Email inválido"),
        password: strongPasswordSchema,
      })
      .optional(),
  })
  .superRefine((value, ctx) => {
    if (value.crear_admin && !value.admin) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "Faltan los datos del administrador.",
        path: ["admin"],
      });
    }
  });

export const buscarEmailCedulaSchema = z.object({
  cedula: z.string().min(3, "Cédula muy corta").max(30),
});
