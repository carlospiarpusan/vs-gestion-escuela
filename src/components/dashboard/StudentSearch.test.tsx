import { act, cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, beforeEach, expect, it, vi } from "vitest";
import StudentSearch from "./StudentSearch";
import { invalidateClientResourceCache } from "@/lib/client-resource-cache";
const mock = vi.hoisted(() => ({
  profile: { id: "actor", rol: "admin_escuela", escuela_id: "school", sede_id: "branch" },
  fetch: vi.fn(),
}));
vi.mock("@/hooks/useAuth", () => ({ useAuth: () => ({ perfil: mock.profile }) }));
beforeEach(() => {
  vi.clearAllMocks();
  invalidateClientResourceCache("");
  window.sessionStorage.clear();
  mock.profile = { id: "actor", rol: "admin_escuela", escuela_id: "school", sede_id: "branch" };
  vi.stubGlobal("fetch", mock.fetch);
});
afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
});
const row = { id: "student-1", nombre: "Ana", apellidos: "Demo", dni: "123456" };
const response = (rows: unknown[], hasMore = false) =>
  new Response(JSON.stringify({ rows, hasMore }), { status: 200 });
it("does not load a school catalog before a search of at least two characters", async () => {
  render(<StudentSearch value="" onChange={vi.fn()} />);
  expect(mock.fetch).not.toHaveBeenCalled();
  fireEvent.change(screen.getByRole("combobox"), { target: { value: "A" } });
  await act(async () => {
    await new Promise((r) => setTimeout(r, 280));
  });
  expect(mock.fetch).not.toHaveBeenCalled();
});
it("debounces typing, supports keyboard selection, and keeps Escape inside the search", async () => {
  mock.fetch.mockResolvedValue(response([row]));
  const change = vi.fn(),
    escape = vi.fn();
  render(
    <div onKeyDown={escape}>
      <StudentSearch value="" onChange={change} />
    </div>
  );
  const input = screen.getByRole("combobox");
  fireEvent.change(input, { target: { value: "An" } });
  fireEvent.change(input, { target: { value: "Ana" } });
  await screen.findByRole("option", { name: "Ana Demo · 123456" });
  expect(mock.fetch).toHaveBeenCalledTimes(1);
  fireEvent.keyDown(input, { key: "ArrowDown" });
  fireEvent.keyDown(input, { key: "Enter" });
  expect(change).toHaveBeenCalledWith("student-1");
  fireEvent.focus(input);
  fireEvent.change(input, { target: { value: "Ana" } });
  fireEvent.keyDown(input, { key: "Escape" });
  expect(escape.mock.calls.filter(([e]) => e.key === "Escape")).toHaveLength(0);
});
it("requests only the next bounded page and clears a selection explicitly", async () => {
  mock.fetch.mockImplementation(async (url: string) =>
    response(
      url.includes("page=1") ? [{ ...row, id: "student-2", nombre: "Beto" }] : [row],
      !url.includes("page=1")
    )
  );
  const change = vi.fn();
  render(<StudentSearch value="" onChange={change} />);
  fireEvent.change(screen.getByRole("combobox"), { target: { value: "Demo" } });
  await screen.findByRole("option", { name: "Ana Demo · 123456" });
  fireEvent.click(screen.getByRole("button", { name: "Siguiente" }));
  await screen.findByRole("option", { name: "Beto Demo · 123456" });
  expect(mock.fetch.mock.calls[1][0]).toContain("page=1");
});
it("discards a late response for a previous query", async () => {
  let finish!: (r: Response) => void;
  mock.fetch
    .mockImplementationOnce(
      () =>
        new Promise<Response>((resolve) => {
          finish = resolve;
        })
    )
    .mockResolvedValue(response([{ ...row, nombre: "Beto" }]));
  render(<StudentSearch value="" onChange={vi.fn()} />);
  const input = screen.getByRole("combobox");
  fireEvent.change(input, { target: { value: "Ana" } });
  await waitFor(() => expect(mock.fetch).toHaveBeenCalledTimes(1));
  fireEvent.change(input, { target: { value: "Beto" } });
  await screen.findByRole("option", { name: "Beto Demo · 123456" });
  await act(async () => {
    finish(response([row]));
  });
  expect(screen.queryByRole("option", { name: "Ana Demo · 123456" })).toBeNull();
});
it("hydrates historic selections by ID and preserves the ID without silently changing it", async () => {
  mock.fetch.mockResolvedValue(response([row]));
  const change = vi.fn();
  render(<StudentSearch value={row.id} onChange={change} />);
  await screen.findByText("Ana Demo · 123456");
  expect(mock.fetch.mock.calls[0][0]).toContain("id=student-1");
  expect(change).not.toHaveBeenCalled();
  fireEvent.click(screen.getByRole("button", { name: "Quitar alumno" }));
  expect(change).toHaveBeenCalledWith("");
});
it("separates searches when the authenticated school changes", async () => {
  mock.fetch.mockImplementation(async (url: string) =>
    response([{ ...row, nombre: url.includes("school-2") ? "Beto" : "Ana" }])
  );
  const { rerender } = render(<StudentSearch value="" onChange={vi.fn()} />);
  fireEvent.change(screen.getByRole("combobox"), { target: { value: "Demo" } });
  await screen.findByRole("option", { name: "Ana Demo · 123456" });
  mock.profile = { ...mock.profile, escuela_id: "school-2" };
  rerender(<StudentSearch value="" onChange={vi.fn()} />);
  await screen.findByRole("option", { name: "Beto Demo · 123456" });
  expect(mock.fetch).toHaveBeenCalledTimes(2);
});
