// @vitest-environment node
import { afterEach, beforeEach, expect, it, vi } from "vitest";
import { GET, POST } from "./route";
const mock = vi.hoisted(() => ({ auth: vi.fn(), save: vi.fn(), available: 40 }));
const id = "10000000-0000-4000-8000-000000000001";
const questionIds = Array.from(
  { length: 40 },
  (_, index) => `20000000-0000-4000-8000-${String(index + 1).padStart(12, "0")}`
);
const answers = Object.fromEntries(questionIds.map((id) => [id, "a"]));
vi.mock("@/lib/cale-attempts", () => ({ saveCaleAttempt: mock.save }));
vi.mock("@/lib/api-auth", async (original) => ({
  ...(await original<typeof import("@/lib/api-auth")>()),
  authorizeApiRequest: mock.auth,
  buildSupabaseAdminClient: () => ({
    from: (table: string) => {
      const value =
        table === "alumnos"
          ? { id, escuela_id: id, sede_id: id }
          : table === "preguntas_examen"
            ? Array.from({ length: mock.available }, (_, index) => ({
                id: `20000000-0000-4000-8000-${String(index + 1).padStart(12, "0")}`,
                categoria_id: id,
                pregunta: "Prueba",
                respuesta_correcta: "a",
                opcion_a: "A",
                opcion_b: "B",
                opcion_c: "C",
                opcion_d: "D",
                imagen_url: null,
                explicacion: null,
                fundamento_legal: null,
                codigo_externo: "LOCAL",
              }))
            : table === "categorias_examen"
              ? [{ id, nombre: "General" }]
              : [];
      const builder = {
        select: () => builder,
        eq: () => builder,
        maybeSingle: async () => ({ data: value }),
        in: async () => ({ data: value }),
        like: async () => ({ count: 0 }),
        then: (resolve: (value: unknown) => unknown) =>
          Promise.resolve({ data: value }).then(resolve),
      };
      return builder;
    },
  }),
}));
beforeEach(() => {
  vi.clearAllMocks();
  vi.useFakeTimers();
  mock.available = 40;
  mock.auth.mockResolvedValue({ ok: true, perfil: { id, rol: "alumno" } });
  mock.save.mockResolvedValue({ id });
});
afterEach(() => vi.useRealTimers());
it.each([
  ["2026-10-16T02:30:00.000Z", "2026-10-15", "21:30:00"],
  ["2026-10-16T05:00:00.000Z", "2026-10-16", "00:00:00"],
])("registra fecha y hora de Bogota al guardar (%s)", async (now, fecha, hora) => {
  vi.setSystemTime(new Date(now));
  const response = await POST(
    new Request("http://localhost/api/examenes/cale/practica", {
      method: "POST",
      body: JSON.stringify({ questionIds, answers, elapsedSeconds: 20 }),
    })
  );
  expect(response.status).toBe(200);
  expect(mock.save).toHaveBeenCalledWith(
    expect.objectContaining({
      attempt: expect.objectContaining({ fecha, hora, escuela_id: id, sede_id: id, alumno_id: id }),
      questions: questionIds.map((pregunta_id) => expect.objectContaining({ pregunta_id })),
      answers: [],
    })
  );
  expect((await response.json()).summary.savedAt).toBe(now);
});
it("no guarda intentos sin ninguna respuesta", async () => {
  const response = await POST(
    new Request("http://localhost/api/examenes/cale/practica", {
      method: "POST",
      body: JSON.stringify({ questionIds, answers: {} }),
    })
  );
  expect(response.status).toBe(400);
  expect(mock.save).not.toHaveBeenCalled();
});

it.each([
  { questionIds: questionIds.slice(0, 39), answers },
  { questionIds: [...questionIds.slice(0, 39), questionIds[0]], answers },
  { questionIds, answers: Object.fromEntries(questionIds.slice(0, 39).map((id) => [id, "a"])) },
  { questionIds, answers: { ...answers, [questionIds[39]]: "invalid" } },
])("rechaza un examen incompleto o con preguntas duplicadas", async (body) => {
  const response = await POST(
    new Request("http://localhost/api/examenes/cale/practica", {
      method: "POST",
      body: JSON.stringify(body),
    })
  );
  expect(response.status).toBe(400);
  expect(mock.save).not.toHaveBeenCalled();
  expect(await response.json()).not.toHaveProperty("summary");
});

it("prepara exactamente 40 preguntas y no revela respuestas antes de finalizar", async () => {
  const response = await GET(new Request("http://localhost/api/examenes/cale/practica?count=10"));
  expect(response.status).toBe(200);
  const body = await response.json();
  expect(body.questions).toHaveLength(40);
  expect(new Set(body.questions.map((q: { id: string }) => q.id)).size).toBe(40);
  expect(body.questions[0]).not.toHaveProperty("respuesta_correcta");
  expect(body.questions[0]).not.toHaveProperty("explicacion");
});

it("no prepara un examen recortado cuando faltan preguntas", async () => {
  mock.available = 39;
  const response = await GET(new Request("http://localhost/api/examenes/cale/practica"));
  expect(response.status).toBe(409);
  expect(await response.json()).not.toHaveProperty("questions");
});
