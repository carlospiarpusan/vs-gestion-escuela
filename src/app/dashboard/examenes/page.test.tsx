import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, beforeEach, expect, it, vi } from "vitest";
import ExamenesPage from "./page";

const mocks = vi.hoisted(() => ({ dashboard: vi.fn(), fetch: vi.fn() }));
vi.mock("@/hooks/useAuth", () => ({
  useAuth: () => ({ perfil: { id: "student", rol: "alumno", escuela_id: "school" } }),
}));
vi.mock("next/navigation", () => ({
  useRouter: () => ({ replace: vi.fn() }),
  useSearchParams: () => new URLSearchParams(),
}));
vi.mock("next/dynamic", () => ({ default: () => () => null }));
vi.mock("@/lib/dashboard-client-cache", () => ({
  getDashboardListCached: () => mocks.dashboard(),
  invalidateDashboardClientCaches: vi.fn(),
}));
const questions = Array.from({ length: 40 }, (_, index) => ({
  id: `question-${index + 1}`,
  categoria_nombre: "General",
  pregunta: `Enunciado ${index + 1}`,
  opcion_a: `Respuesta ${index + 1}`,
  opcion_b: `Alternativa ${index + 1}`,
}));
const result = {
  examId: "exam",
  summary: {
    questionCount: 40,
    answeredCount: 40,
    correctCount: 40,
    incorrectCount: 0,
    percentage: 100,
    elapsedSeconds: 60,
    result: "aprobado",
    savedAt: "2026-10-16T15:00:00Z",
  },
  results: [],
};
const json = (body: unknown, status = 200) => new Response(JSON.stringify(body), { status });
beforeEach(() => {
  vi.clearAllMocks();
  mocks.dashboard.mockResolvedValue({
    categories: [{ id: "general", nombre: "General", questionCount: 40 }],
    history: [],
  });
  mocks.fetch.mockImplementation((_url: string, init: RequestInit) =>
    Promise.resolve(json(init?.method === "POST" ? result : { questions }))
  );
  vi.stubGlobal("fetch", mocks.fetch);
  vi.spyOn(console, "error").mockImplementation(() => {});
});
afterEach(() => {
  vi.unstubAllGlobals();
  vi.restoreAllMocks();
});
async function start() {
  render(<ExamenesPage />);
  fireEvent.click(await screen.findByRole("button", { name: "Iniciar simulacro" }));
  await screen.findByText("Pregunta 1 de 40");
}
function answer(index: number) {
  fireEvent.click(screen.getByText(`Respuesta ${index}`).closest("button")!);
}
function answerAll() {
  const next = screen.getByRole("button", { name: "Siguiente" });
  for (let index = 1; index <= 40; index++) {
    answer(index);
    if (index < 40) fireEvent.click(next);
  }
}

it("permite recorrer y responder las 40 preguntas y solo muestra resultados al finalizar", async () => {
  await start();
  expect(mocks.fetch.mock.calls[0][0]).toContain("count=40");
  const finish = screen.getByRole("button", { name: "Finalizar simulacro" });
  expect(finish).toBeDisabled();
  const next = screen.getByRole("button", { name: "Siguiente" });
  for (let index = 1; index <= 39; index++) {
    answer(index);
    fireEvent.click(next);
  }
  expect(screen.getByText("Pregunta 40 de 40")).toBeInTheDocument();
  expect(finish).toBeDisabled();
  fireEvent.click(finish);
  expect(mocks.fetch).toHaveBeenCalledTimes(1);
  expect(screen.queryByText("Resultado del simulacro")).not.toBeInTheDocument();
  answer(40);
  expect(finish).toBeEnabled();
  expect(screen.queryByText("Resultado del simulacro")).not.toBeInTheDocument();
  fireEvent.click(finish);
  await screen.findByText("Resultado del simulacro");
  const submitted = JSON.parse(mocks.fetch.mock.calls[1][1].body);
  expect(submitted.questionIds).toEqual(questions.map((question) => question.id));
  expect(Object.keys(submitted.answers)).toHaveLength(40);
  expect(screen.getByText("100% de acierto")).toBeInTheDocument();
});

it("conserva las respuestas al volver y permite corregirlas antes de finalizar", async () => {
  await start();
  answer(1);
  fireEvent.click(screen.getByRole("button", { name: "40" }));
  expect(screen.getByText("Pregunta 40 de 40")).toBeInTheDocument();
  fireEvent.click(screen.getByRole("button", { name: "1" }));
  expect(screen.getByRole("button", { name: "A Respuesta 1" })).toHaveAttribute(
    "aria-pressed",
    "true"
  );
  fireEvent.click(screen.getByRole("button", { name: "B Alternativa 1" }));
  expect(screen.getByText("1 respondidas")).toBeInTheDocument();
  expect(mocks.fetch).toHaveBeenCalledTimes(1);
});

it("conserva las 40 respuestas ante un fallo y permite reintentar", async () => {
  await start();
  answerAll();
  mocks.fetch.mockResolvedValueOnce(json({ error: "No se pudo guardar" }, 500));
  fireEvent.click(screen.getByRole("button", { name: "Finalizar simulacro" }));
  await screen.findByText("No se pudo guardar");
  expect(screen.getByText("40 respondidas")).toBeInTheDocument();
  expect(screen.queryByText("Resultado del simulacro")).not.toBeInTheDocument();
  fireEvent.click(screen.getByRole("button", { name: "Finalizar simulacro" }));
  await screen.findByText("Resultado del simulacro");
});

it("bloquea las respuestas y el envío duplicado mientras califica", async () => {
  await start();
  answerAll();
  let resolve!: (value: Response) => void;
  mocks.fetch.mockReturnValueOnce(
    new Promise((done) => {
      resolve = done;
    })
  );
  fireEvent.click(screen.getByRole("button", { name: "Finalizar simulacro" }));
  const pending = screen.getByRole("button", { name: "Calificando..." });
  expect(pending).toBeDisabled();
  expect(screen.getByRole("button", { name: "B Alternativa 40" })).toBeDisabled();
  fireEvent.click(pending);
  expect(mocks.fetch).toHaveBeenCalledTimes(2);
  resolve(json(result));
  await screen.findByText("Resultado del simulacro");
});

it("no inicia un simulacro recortado", async () => {
  mocks.fetch.mockResolvedValueOnce(json({ questions: questions.slice(0, 39) }));
  render(<ExamenesPage />);
  fireEvent.click(await screen.findByRole("button", { name: "Iniciar simulacro" }));
  await screen.findByText("Se necesitan 40 preguntas disponibles para iniciar el simulacro.");
  expect(screen.queryByText("Pregunta 1 de 39")).not.toBeInTheDocument();
});

it("mantiene el resultado guardado aunque falle la actualización del historial", async () => {
  await start();
  answerAll();
  mocks.dashboard.mockRejectedValueOnce(new Error("Historial no disponible"));
  fireEvent.click(screen.getByRole("button", { name: "Finalizar simulacro" }));
  await screen.findByText("Resultado del simulacro");
  await waitFor(() => expect(mocks.dashboard).toHaveBeenCalledTimes(2));
  expect(screen.queryByText("Historial no disponible")).not.toBeInTheDocument();
});
