import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { beforeEach, expect, it, vi } from "vitest";
import ContratosPage from "./page";

const mocks = vi.hoisted(() => ({
  perfil: { id: "admin", rol: "admin_escuela", escuela_id: "school" },
  fetch: vi.fn(),
}));
vi.mock("@/hooks/useAuth", () => ({ useAuth: () => ({ perfil: mocks.perfil }) }));
vi.mock("@/lib/retry", () => ({ fetchJsonWithRetry: mocks.fetch }));
vi.mock("@/components/dashboard/PageScaffold", () => ({
  default: ({ children, actions }: { children: React.ReactNode; actions: React.ReactNode }) => (
    <main>
      {actions}
      {children}
    </main>
  ),
}));
beforeEach(() => {
  mocks.fetch.mockReset();
  mocks.fetch.mockResolvedValue({
    escuelaId: "school",
    plantillas: [
      {
        tipo_plantilla: "combo",
        titulo: "Combo",
        html_plantilla: "Combo uno\n---PAGE_BREAK---\nCombo dos",
      },
      {
        tipo_plantilla: "moto",
        titulo: "Moto",
        html_plantilla: "Moto uno\n---PAGE_BREAK---\nMoto dos",
      },
      {
        tipo_plantilla: "vehiculo",
        titulo: "Vehiculo",
        html_plantilla: "Vehiculo uno\n---PAGE_BREAK---\nVehiculo dos",
      },
    ],
  });
});
async function openEditor() {
  render(<ContratosPage />);
  fireEvent.click(await screen.findByRole("button", { name: "Texto del contrato" }));
}
it("carga cada tipo por su identificador, no por el orden de la respuesta", async () => {
  await openEditor();
  expect(screen.getByLabelText("Pagina 1")).toHaveValue("Vehiculo uno");
  fireEvent.change(screen.getByLabelText("Tipo de contrato"), { target: { value: "moto" } });
  expect(screen.getByLabelText("Pagina 1")).toHaveValue("Moto uno");
  expect(screen.getByLabelText("Pagina 2")).toHaveValue("Moto dos");
});
it("guarda moto sin sobrescribir vehiculo y conserva borradores al cambiar de tipo", async () => {
  await openEditor();
  const select = screen.getByLabelText("Tipo de contrato");
  fireEvent.change(select, { target: { value: "moto" } });
  fireEvent.change(screen.getByLabelText("Pagina 1"), { target: { value: "Moto editada" } });
  fireEvent.change(select, { target: { value: "combo" } });
  expect(screen.getByLabelText("Pagina 1")).toHaveValue("Combo uno");
  fireEvent.change(select, { target: { value: "moto" } });
  expect(screen.getByLabelText("Pagina 1")).toHaveValue("Moto editada");
  fireEvent.click(screen.getByRole("button", { name: "Guardar cambios" }));
  await waitFor(() => expect(mocks.fetch).toHaveBeenCalledTimes(2));
  const body = JSON.parse(mocks.fetch.mock.calls[1][1].body);
  expect(body.plantillas).toEqual([
    {
      tipo_plantilla: "moto",
      titulo: "Moto",
      html_plantilla: "Moto editada\n---PAGE_BREAK---\nMoto dos",
    },
  ]);
});
it("guarda juntos los formatos editados y mantiene sus titulos", async () => {
  await openEditor();
  fireEvent.change(screen.getByLabelText("Pagina 1"), { target: { value: "Vehiculo editado" } });
  fireEvent.change(screen.getByLabelText("Tipo de contrato"), { target: { value: "combo" } });
  fireEvent.change(screen.getByLabelText("Pagina 2"), { target: { value: "Combo editado" } });
  fireEvent.click(screen.getByRole("button", { name: "Guardar cambios" }));
  await waitFor(() => expect(mocks.fetch).toHaveBeenCalledTimes(2));
  const body = JSON.parse(mocks.fetch.mock.calls[1][1].body);
  expect(body.plantillas.map((p: { tipo_plantilla: string }) => p.tipo_plantilla)).toEqual([
    "vehiculo",
    "combo",
  ]);
  expect(body.plantillas[1].html_plantilla).toContain("Combo editado");
});
it("no rellena la segunda pagina con texto de otro tipo cuando la plantilla solo tiene una", async () => {
  mocks.fetch.mockResolvedValue({
    escuelaId: "school",
    plantillas: [{ tipo_plantilla: "moto", titulo: "Moto", html_plantilla: "Solo una pagina" }],
  });
  await openEditor();
  fireEvent.change(screen.getByLabelText("Tipo de contrato"), { target: { value: "moto" } });
  expect(screen.getByLabelText("Pagina 2")).toHaveValue("");
});
