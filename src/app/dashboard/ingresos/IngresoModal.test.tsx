import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, beforeEach, expect, it, vi } from "vitest";
import IngresoModal from "./IngresoModal";
import * as constants from "./constants";
import { invalidateClientResourceCache } from "@/lib/client-resource-cache";
const mocks = vi.hoisted(() => ({ fetch: vi.fn() }));
vi.mock("@/hooks/useAuth", () => ({
  useAuth: () => ({
    perfil: { id: "actor", rol: "admin_escuela", escuela_id: "school", sede_id: "branch" },
  }),
}));
vi.mock("@/hooks/useDeviceVariant", () => ({ useIsMobileVariant: () => false }));
beforeEach(() => {
  vi.clearAllMocks();
  invalidateClientResourceCache("");
  sessionStorage.clear();
  vi.stubGlobal("fetch", mocks.fetch);
});
afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
});
const props = () => ({
  open: true,
  editing: null,
  error: "",
  form: constants.emptyForm,
  alumnos: [],
  matriculasDisponibles: [],
  saving: false,
  setForm: vi.fn(),
  onAlumnoChange: vi.fn(),
  onClose: vi.fn(),
  onSave: vi.fn(),
});
it("does not render or download the full catalog while editing unrelated fields", () => {
  const p = props(),
    alumnos = Array.from({ length: 1000 }, (_, i) => ({
      id: `student-${i}`,
      nombre: `Alumno ${i}`,
      apellidos: "Prueba",
      dni: String(i),
    }));
  const view = render(<IngresoModal {...p} alumnos={alumnos} />);
  for (let i = 0; i < 10; i++)
    view.rerender(
      <IngresoModal
        {...p}
        alumnos={alumnos}
        form={{ ...p.form, concepto: `Concepto ${i}`, monto: String(i + 1) }}
      />
    );
  expect(screen.queryAllByRole("option", { name: /Alumno \d/ })).toHaveLength(0);
  expect(mocks.fetch).not.toHaveBeenCalled();
  view.rerender(<IngresoModal {...p} catalogsLoading />);
  expect(screen.getByRole("button", { name: "Crear ingreso" })).toBeDisabled();
});
it("restores the historic selection and looks up a new student without dropping its matrícula", async () => {
  const ana = { id: "student", nombre: "Ana", apellidos: "Prueba", dni: "123" },
    luis = { id: "other", nombre: "Luis", apellidos: "Nuevo", dni: "456" };
  mocks.fetch.mockImplementation(
    async (url: string) =>
      new Response(
        JSON.stringify({ rows: [url.includes("id=student") ? ana : luis], hasMore: false }),
        { status: 200 }
      )
  );
  const p = props();
  render(
    <IngresoModal
      {...p}
      alumnos={[ana]}
      form={{ ...p.form, alumno_id: "student", matricula_id: "contract" }}
      matriculasDisponibles={[
        {
          id: "contract",
          alumno_id: "student",
          numero_contrato: "CT-123",
          categorias: ["A2"],
          valor_total: 1000,
          fecha_inscripcion: "2026-10-01",
        },
      ]}
    />
  );
  await screen.findByText("Ana Prueba · 123");
  expect(screen.getByText("Ana Prueba")).toBeDefined();
  expect(
    (screen.getByRole("option", { name: "Contrato CT-123" }) as HTMLOptionElement).selected
  ).toBe(true);
  expect(p.onAlumnoChange).not.toHaveBeenCalled();
  fireEvent.change(screen.getByRole("combobox", { name: "Alumno" }), { target: { value: "Luis" } });
  fireEvent.click(await screen.findByRole("option", { name: "Luis Nuevo · 456" }));
  await waitFor(() => expect(p.onAlumnoChange).toHaveBeenCalledWith("other"));
});
