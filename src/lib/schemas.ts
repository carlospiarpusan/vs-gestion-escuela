import { z } from "zod";

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
  nombre: z.string().min(2, "Nombre muy corto").max(200),
  email: z.string().email("Email inválido"),
  password: z.string().min(6, "La contraseña debe tener al menos 6 caracteres"),
});

export const buscarEmailCedulaSchema = z.object({
  cedula: z.string().min(3, "Cédula muy corta").max(30),
});
