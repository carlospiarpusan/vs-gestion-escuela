import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, beforeEach, expect, it, vi } from "vitest";
import type { ReactNode } from "react";
import { CaleModule } from "../src/components/module-screen";
import { profile } from "./fixtures";

const mocks = vi.hoisted(() => ({
  prepare: vi.fn(),
  evaluate: vi.fn(),
  submit: vi.fn(),
  sync: vi.fn(),
  online: false,
}));
vi.mock("expo-router", () => ({ router: { push: vi.fn() } }));
vi.mock("../src/components/hours-screen", () => ({ HoursScreen: () => null }));
vi.mock("react-native", () => ({
  View: ({ children }: { children: ReactNode }) => <div>{children}</div>,
  Text: ({ children }: { children: ReactNode }) => <span>{children}</span>,
  Pressable: ({
    children,
    onPress,
    disabled,
  }: {
    children: ReactNode;
    onPress: () => void;
    disabled?: boolean;
  }) => (
    <button disabled={disabled} onClick={onPress}>
      {children}
    </button>
  ),
  StyleSheet: { create: (styles: unknown) => styles },
}));
vi.mock("../src/components/primitives", () => ({
  Panel: ({ title, children }: { title: string; children: ReactNode }) => (
    <section>
      <h2>{title}</h2>
      {children}
    </section>
  ),
  PrimaryButton: ({
    label,
    disabled,
    onPress,
  }: {
    label: string;
    disabled?: boolean;
    onPress: () => void;
  }) => (
    <button disabled={disabled} onClick={onPress}>
      {label}
    </button>
  ),
  StatGrid: () => <span>Result stats</span>,
  Tag: ({ label }: { label: string }) => <span>{label}</span>,
}));
vi.mock("../src/context/app-context", () => ({
  useApp: () => ({ isOnline: mocks.online, syncNow: mocks.sync }),
}));
vi.mock("../src/lib/data", () => ({
  CALE_QUESTION_COUNT: 40,
  buildOfflinePractice: mocks.prepare,
  evaluateOfflinePractice: mocks.evaluate,
  submitCaleAttempt: mocks.submit,
}));

const questions = Array.from({ length: 40 }, (_, index) => ({
  id: `question-${index + 1}`,
  pregunta: `Pregunta ${index + 1}`,
  opcion_a: `Respuesta ${index + 1}`,
}));

beforeEach(() => {
  mocks.online = false;
  mocks.prepare.mockResolvedValue(questions);
  mocks.evaluate.mockResolvedValue({
    percentage: 100,
    correctCount: 40,
    total: 40,
    approved: true,
  });
  mocks.submit.mockResolvedValue({ queued: true });
  mocks.sync.mockResolvedValue(undefined);
});
afterEach(cleanup);

async function prepare() {
  render(<CaleModule profile={{ ...profile(), rol: "alumno" }} />);
  fireEvent.click(screen.getByRole("button", { name: "Preparar simulacro" }));
  await screen.findByRole("button", { name: "Finalizar práctica" });
  for (const button of screen.getAllByRole("button", { name: /^A\. Respuesta/ }))
    fireEvent.click(button);
}

it("requires all 40 answers before enabling submission or showing results", async () => {
  render(<CaleModule profile={{ ...profile(), rol: "alumno" }} />);
  fireEvent.click(screen.getByRole("button", { name: "Preparar simulacro" }));
  const finish = (await screen.findByRole("button", {
    name: "Finalizar práctica",
  })) as HTMLButtonElement;
  expect(finish.disabled).toBe(true);
  fireEvent.click(finish);
  expect(mocks.submit).not.toHaveBeenCalled();
  expect(mocks.prepare).toHaveBeenCalledWith(40);
  const options = screen.getAllByRole("button", { name: /^A\. Respuesta/ });
  for (const button of options.slice(0, 39)) fireEvent.click(button);
  expect(finish.disabled).toBe(true);
  fireEvent.click(finish);
  expect(mocks.evaluate).not.toHaveBeenCalled();
  expect(mocks.submit).not.toHaveBeenCalled();
  expect(screen.queryByRole("heading", { name: "Resultado local" })).toBeNull();
  fireEvent.click(options[39]);
  expect(finish.disabled).toBe(false);
  expect(screen.queryByRole("heading", { name: "Resultado local" })).toBeNull();
});

it("refreshes the offline pending count after storing an attempt and prevents duplicate submission", async () => {
  await prepare();
  fireEvent.click(screen.getByRole("button", { name: "Finalizar práctica" }));
  await screen.findByRole("heading", { name: "Resultado local" });
  await waitFor(() => expect(mocks.sync).toHaveBeenCalledTimes(1));
  expect(mocks.submit).toHaveBeenCalledWith(
    expect.objectContaining({
      offline: true,
      answers: Object.fromEntries(questions.map((question) => [question.id, "a"])),
    })
  );
  const saved = screen.getByRole("button", { name: "Práctica guardada" }) as HTMLButtonElement;
  expect(saved.disabled).toBe(true);
  fireEvent.click(saved);
  expect(mocks.submit).toHaveBeenCalledTimes(1);
});

it("does not show a saved result when submission fails and allows a retry", async () => {
  mocks.submit.mockRejectedValueOnce(new Error("Storage unavailable"));
  await prepare();
  fireEvent.click(screen.getByRole("button", { name: "Finalizar práctica" }));
  await screen.findByText("Storage unavailable");
  expect(screen.queryByRole("heading", { name: "Resultado local" })).toBeNull();
  expect(mocks.sync).not.toHaveBeenCalled();
  expect(
    (screen.getByRole("button", { name: "Finalizar práctica" }) as HTMLButtonElement).disabled
  ).toBe(false);
});

it("submits online and refreshes the account summary", async () => {
  mocks.online = true;
  await prepare();
  fireEvent.click(screen.getByRole("button", { name: "Finalizar práctica" }));
  await waitFor(() => expect(mocks.sync).toHaveBeenCalledTimes(1));
  expect(mocks.submit).toHaveBeenCalledWith(expect.objectContaining({ offline: false }));
});

it("does not start a shortened exam when the local bank has fewer than 40 questions", async () => {
  mocks.prepare.mockResolvedValue(questions.slice(0, 39));
  render(<CaleModule profile={{ ...profile(), rol: "alumno" }} />);
  fireEvent.click(screen.getByRole("button", { name: "Preparar simulacro" }));
  await screen.findByText(/Se necesitan 40 preguntas/);
  expect(screen.queryByRole("button", { name: "Finalizar práctica" })).toBeNull();
});

it("freezes answers while saving and after displaying results", async () => {
  let resolve!: (value: unknown) => void;
  mocks.submit.mockReturnValueOnce(
    new Promise((done) => {
      resolve = done;
    })
  );
  await prepare();
  fireEvent.click(screen.getByRole("button", { name: "Finalizar práctica" }));
  await waitFor(() => expect(mocks.submit).toHaveBeenCalledTimes(1));
  expect(
    (screen.getAllByRole("button", { name: /^A\. Respuesta/ })[0] as HTMLButtonElement).disabled
  ).toBe(true);
  expect(screen.queryByRole("heading", { name: "Resultado local" })).toBeNull();
  expect(
    (screen.getByRole("button", { name: "Preparar simulacro" }) as HTMLButtonElement).disabled
  ).toBe(true);
  resolve({ queued: true });
  await screen.findByRole("heading", { name: "Resultado local" });
  expect(
    (screen.getAllByRole("button", { name: /^A\. Respuesta/ })[0] as HTMLButtonElement).disabled
  ).toBe(true);
});

it("does not show partial results if the local bank changes during the exam", async () => {
  mocks.evaluate.mockResolvedValueOnce({
    percentage: 100,
    correctCount: 39,
    total: 39,
    approved: true,
  });
  await prepare();
  fireEvent.click(screen.getByRole("button", { name: "Finalizar práctica" }));
  await screen.findByText(/El banco CALE cambió/);
  expect(mocks.submit).not.toHaveBeenCalled();
  expect(screen.queryByRole("heading", { name: "Resultado local" })).toBeNull();
});
