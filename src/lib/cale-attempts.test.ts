// @vitest-environment node
import { PGlite } from "@electric-sql/pglite";
import { afterAll, beforeAll, beforeEach, expect, it, vi } from "vitest";
import { saveCaleAttempt } from "./cale-attempts";
vi.mock("server-only", () => ({}));
const mock = vi.hoisted(() => ({ connect: vi.fn(), release: vi.fn() }));
vi.mock("@/lib/server-db", () => ({ getServerDbPool: () => ({ connect: mock.connect }) }));
let db: PGlite;
const id = "10000000-0000-4000-8000-000000000001";
const scope = { escuela_id: id, sede_id: id, alumno_id: id };
const attempt = {
  ...scope,
  user_id: id,
  tipo: "teorico",
  fecha: "2026-10-15",
  hora: "21:30:00",
  resultado: "suspendido",
  intentos: 1,
  modulo_origen: "cale_practica",
  fuente_banco: "cale",
  total_preguntas: 1,
  respuestas_correctas: 0,
  porcentaje: 0,
  tiempo_segundos: 20,
  notas: "Prueba local",
};
const question = {
  ...scope,
  pregunta_id: id,
  categoria_id: id,
  categoria_nombre: "General",
  codigo_externo: "LOCAL",
  pregunta_texto: "Pregunta de prueba",
  orden_pregunta: 1,
};
const answer = {
  ...scope,
  pregunta_id: id,
  orden_pregunta: 1,
  respuesta_alumno: "b",
  respuesta_omitida: false,
  es_correcta: false,
  categoria_nombre: "General",
  pregunta_texto: "Pregunta de prueba",
  imagen_url: null,
  opcion_a: "A",
  opcion_b: "B",
  opcion_c: "C",
  opcion_d: "D",
  respuesta_correcta: "a",
  explicacion: null,
  fundamento_legal: null,
  tiempo_segundos: null,
};
beforeAll(async () => {
  db = new PGlite();
  await db.exec(`
    create table examenes (
      id uuid default gen_random_uuid() primary key, escuela_id uuid not null, sede_id uuid not null,
      user_id uuid not null, alumno_id uuid not null, tipo text not null, fecha date not null, hora time,
      resultado text, intentos int, modulo_origen text, fuente_banco text, total_preguntas int,
      respuestas_correctas int, porcentaje int, tiempo_segundos int, notas text
    );
    create table examenes_cale_preguntas (
      id bigint generated always as identity primary key, escuela_id uuid not null, sede_id uuid not null,
      alumno_id uuid not null, examen_id uuid not null references examenes(id), pregunta_id uuid,
      categoria_id uuid, categoria_nombre text, codigo_externo text, pregunta_texto text not null,
      orden_pregunta int not null check (orden_pregunta > 0), unique (examen_id, orden_pregunta)
    );
    create table respuestas_examen (
      id uuid default gen_random_uuid() primary key, escuela_id uuid not null, sede_id uuid not null,
      alumno_id uuid not null, examen_id uuid references examenes(id), pregunta_id uuid not null,
      orden_pregunta int, respuesta_alumno text check (respuesta_alumno in ('a','b','c','d')),
      respuesta_omitida bool not null, es_correcta bool not null, categoria_nombre text, pregunta_texto text,
      imagen_url text, opcion_a text, opcion_b text, opcion_c text, opcion_d text, respuesta_correcta text,
      explicacion text, fundamento_legal text, tiempo_segundos int
    );
  `);
});
beforeEach(async () => {
  vi.clearAllMocks();
  await db.exec("truncate respuestas_examen, examenes_cale_preguntas, examenes");
  mock.connect.mockResolvedValue({
    query: (sql: string, params?: unknown[]) => db.query(sql, params),
    release: mock.release,
  });
});
afterAll(async () => {
  await db.close();
});
async function counts() {
  return (
    await db.query<{ exams: number; questions: number; answers: number }>(`select
    (select count(*)::int from examenes) as exams,
    (select count(*)::int from examenes_cale_preguntas) as questions,
    (select count(*)::int from respuestas_examen) as answers`)
  ).rows[0];
}
it("guarda el intento y sus detalles en la misma transaccion y conserva el alcance", async () => {
  const result = await saveCaleAttempt({ attempt, questions: [question], answers: [answer] });
  expect(await counts()).toEqual({ exams: 1, questions: 1, answers: 1 });
  const row = (
    await db.query("select escuela_id,sede_id,alumno_id,examen_id from respuestas_examen")
  ).rows[0];
  expect(row).toEqual({ ...scope, examen_id: result.id });
  expect(mock.release).toHaveBeenCalledWith(false);
});
it.each(["questions", "answers"])(
  "revierte todo el intento si falla la escritura de %s",
  async (failure) => {
    await expect(
      saveCaleAttempt({
        attempt,
        questions: [{ ...question, orden_pregunta: failure === "questions" ? 0 : 1 }],
        answers: [{ ...answer, respuesta_alumno: failure === "answers" ? "invalida" : "b" }],
      })
    ).rejects.toThrow();
    expect(await counts()).toEqual({ exams: 0, questions: 0, answers: 0 });
    expect(mock.release).toHaveBeenCalledWith(false);
  }
);
it("guarda un intento sin respuestas incorrectas sin generar un insert vacio", async () => {
  await saveCaleAttempt({ attempt, questions: [question], answers: [] });
  expect(await counts()).toEqual({ exams: 1, questions: 1, answers: 0 });
});
it("descarta la conexion si tambien falla el rollback y conserva el error original", async () => {
  const query = vi
    .fn()
    .mockResolvedValueOnce({ rows: [] })
    .mockRejectedValueOnce(new Error("Fallo original"))
    .mockRejectedValueOnce(new Error("Conexion perdida"));
  mock.connect.mockResolvedValue({ query, release: mock.release });
  await expect(saveCaleAttempt({ attempt, questions: [question], answers: [] })).rejects.toThrow(
    "Fallo original"
  );
  expect(mock.release).toHaveBeenCalledWith(true);
});
