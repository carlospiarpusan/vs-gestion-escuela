import "server-only";
import type { PoolClient } from "pg";
import { getServerDbPool } from "@/lib/server-db";

const ATTEMPT_COLUMNS = [
  "escuela_id",
  "sede_id",
  "user_id",
  "alumno_id",
  "tipo",
  "fecha",
  "hora",
  "resultado",
  "intentos",
  "modulo_origen",
  "fuente_banco",
  "total_preguntas",
  "respuestas_correctas",
  "porcentaje",
  "tiempo_segundos",
  "notas",
] as const;
const QUESTION_COLUMNS = [
  "escuela_id",
  "sede_id",
  "alumno_id",
  "pregunta_id",
  "categoria_id",
  "categoria_nombre",
  "codigo_externo",
  "pregunta_texto",
  "orden_pregunta",
  "examen_id",
] as const;
const ANSWER_COLUMNS = [
  "escuela_id",
  "sede_id",
  "alumno_id",
  "pregunta_id",
  "orden_pregunta",
  "respuesta_alumno",
  "respuesta_omitida",
  "es_correcta",
  "categoria_nombre",
  "pregunta_texto",
  "imagen_url",
  "opcion_a",
  "opcion_b",
  "opcion_c",
  "opcion_d",
  "respuesta_correcta",
  "explicacion",
  "fundamento_legal",
  "tiempo_segundos",
  "examen_id",
] as const;

type Attempt = Record<(typeof ATTEMPT_COLUMNS)[number], unknown>;
type Question = Record<Exclude<(typeof QUESTION_COLUMNS)[number], "examen_id">, unknown>;
type Answer = Record<Exclude<(typeof ANSWER_COLUMNS)[number], "examen_id">, unknown>;

// Table and column identifiers only come from the fixed lists above.
async function insertRows(
  client: PoolClient,
  table: "examenes" | "examenes_cale_preguntas" | "respuestas_examen",
  columns: readonly string[],
  rows: Record<string, unknown>[],
  returningId = false
) {
  const values = rows.flatMap((row) => columns.map((column) => row[column]));
  const placeholders = rows
    .map(
      (_, rowIndex) =>
        `(${columns.map((_, columnIndex) => `$${rowIndex * columns.length + columnIndex + 1}`).join(",")})`
    )
    .join(",");
  return client.query<{ id: string }>(
    `insert into public.${table} (${columns.join(",")}) values ${placeholders}${returningId ? " returning id" : ""}`,
    values
  );
}

export async function saveCaleAttempt(input: {
  attempt: Attempt;
  questions: Question[];
  answers: Answer[];
}) {
  const client = await getServerDbPool().connect();
  let discardConnection = false;
  try {
    await client.query("begin");
    const saved = await insertRows(client, "examenes", ATTEMPT_COLUMNS, [input.attempt], true);
    const exam = saved.rows[0];
    if (!exam) throw new Error("No se pudo crear el intento CALE.");
    await insertRows(
      client,
      "examenes_cale_preguntas",
      QUESTION_COLUMNS,
      input.questions.map((question) => ({ ...question, examen_id: exam.id }))
    );
    if (input.answers.length > 0) {
      await insertRows(
        client,
        "respuestas_examen",
        ANSWER_COLUMNS,
        input.answers.map((answer) => ({ ...answer, examen_id: exam.id }))
      );
    }
    await client.query("commit");
    return exam;
  } catch (error) {
    try {
      await client.query("rollback");
    } catch {
      discardConnection = true;
    }
    throw error;
  } finally {
    client.release(discardConnection);
  }
}
