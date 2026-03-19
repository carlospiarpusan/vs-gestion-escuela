import { z } from "zod";

export const instructorSchema = z.object({
  nombre: z.string().min(2, "El nombre debe tener al menos 2 caracteres."),
  apellidos: z.string().min(2, "Los apellidos deben tener al menos 2 caracteres."),
  dni: z.string().min(5, "La cédula debe tener al menos 5 caracteres."),
  email: z.string().email("Correo electrónico inválido.").or(z.literal("")).optional(),
  telefono: z.string().min(7, "El teléfono debe tener mínimo 7 dígitos."),
  licencia: z.string().min(2, "La licencia es obligatoria."),
  especialidad: z.string().optional(),
  especialidades: z.array(z.string()).min(1, "Debes seleccionar al menos una especialidad."),
  estado: z.string(),
  color: z.string().optional(),
});
