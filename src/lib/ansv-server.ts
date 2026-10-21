import "server-only";
import type { PoolClient } from "pg";
import { calculateEnrollmentAnsv, type AnsvSnapshot } from "./ansv";
import { extractDateOnly } from "./date-utils";

export async function saveContractAnsv(
  client: Pick<PoolClient, "query">,
  input: {
    alumnoId: string;
    escuelaId: string;
    contratoId: string;
    categorias: string[];
    fechaMatricula: string;
    categoria?: string | null;
  }
): Promise<AnsvSnapshot> {
  const student = (
    await client.query<{ fecha_nacimiento: string | Date | null; sexo: string | null }>(
      "select fecha_nacimiento,sexo from public.alumnos where id=$1 and escuela_id=$2 for update",
      [input.alumnoId, input.escuelaId]
    )
  ).rows[0];
  if (!student) throw new Error("Alumno no encontrado para calcular ANSV.");
  const snapshot = calculateEnrollmentAnsv({
    fechaNacimiento: extractDateOnly(student.fecha_nacimiento),
    sexo: student.sexo,
    fechaMatricula: input.fechaMatricula,
    categorias: input.categorias,
    categoria: input.categoria,
  });
  await client.query(
    "update public.matriculas_alumno set ansv=$1::jsonb where id=$2 and alumno_id=$3 and escuela_id=$4",
    [JSON.stringify(snapshot), input.contratoId, input.alumnoId, input.escuelaId]
  );
  return snapshot;
}
