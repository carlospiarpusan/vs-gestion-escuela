import { z } from "zod";

export const studentContactEmailSchema = z
  .string()
  .trim()
  .toLowerCase()
  .pipe(z.email("Ingresa un correo electronico valido.").max(254))
  .refine((email) => !email.endsWith(".local"), "Ingresa el correo real del alumno.");

export function hasStudentContactEmail(email: string | null | undefined) {
  return studentContactEmailSchema.safeParse(email).success;
}
