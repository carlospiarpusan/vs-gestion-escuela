import { lazy, Suspense, type ComponentType } from "react";
import { act, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  request: vi.fn(),
  mutate: vi.fn(),
  insert: vi.fn().mockResolvedValue({ error: null }),
  error: vi.fn(),
  success: vi.fn(),
  auth: {
    perfil: {
      id: "admin-test",
      rol: "admin_escuela",
      escuela_id: "school-test",
      sede_id: "sede-test",
    },
  },
}));

vi.mock("@/hooks/useAuth", () => ({ useAuth: () => mocks.auth }));
vi.mock("next/navigation", () => ({ useSearchParams: () => new URLSearchParams() }));
vi.mock("next/dynamic", () => ({
  default: (loader: () => Promise<{ default: ComponentType<object> }>) => {
    const Component = lazy(loader);
    return function DeferredComponent(props: object) {
      return (
        <Suspense fallback={null}>
          <Component {...props} />
        </Suspense>
      );
    };
  },
}));
vi.mock("@/lib/dashboard-client-cache", () => ({
  getDashboardListCached: ({ loader }: { loader: () => unknown }) => loader(),
  getDashboardCatalogCached: ({ loader }: { loader: () => unknown }) => loader(),
  invalidateDashboardClientCaches: vi.fn(),
}));
vi.mock("@/lib/server-cache-client", () => ({ revalidateTaggedServerCaches: vi.fn() }));
vi.mock("@/lib/school-categories", () => ({ fetchSchoolCategories: async () => ["A2", "B1"] }));
vi.mock("@/lib/retry", () => ({
  fetchJsonWithRetry: mocks.request,
  runSupabaseMutationWithRetry: mocks.mutate,
}));
vi.mock("@/lib/supabase", () => ({
  createClient: () => ({ from: () => ({ insert: mocks.insert }) }),
}));
vi.mock("sonner", () => ({ toast: { error: mocks.error, success: mocks.success } }));
vi.mock("./alumnos/useContractPreview", () => ({
  useContractPreview: () => ({ preview: null, loading: false, error: null, hasCategorias: false }),
}));

import AlumnosPage from "./alumnos/page";
import InstructoresPage from "./instructores/page";
import VehiculosPage from "./vehiculos/page";
import { emptyForm } from "./alumnos/constants";

beforeEach(() => {
  vi.stubGlobal(
    "ResizeObserver",
    class {
      observe() {}
      unobserve() {}
      disconnect() {}
    }
  );
  vi.clearAllMocks();
  localStorage.clear();
  mocks.request.mockImplementation(async (url: string) => {
    if (url.startsWith("/api/alumnos?"))
      return {
        rows: [],
        totalCount: 0,
        summary: { regularCount: 0, specialCount: 0, periodStudentCount: 0 },
        _catalogs: {
          categoriasEscuela: ["A2", "B1"],
          tramitadorOptions: [],
          defaultSedeId: "sede-test",
        },
      };
    if (url.startsWith("/api/vehiculos?"))
      return {
        rows: [],
        totalCount: 0,
        _catalogs: { vehiculos: [], instructores: [], currentInstructorId: null },
      };
    if (url === "/api/vehiculos/catalogos")
      return { vehiculos: [], instructores: [], currentInstructorId: null };
    return { rows: [], totalCount: 0 };
  });
  mocks.mutate.mockImplementation((operation: () => unknown) => operation());
});

afterEach(() => vi.unstubAllGlobals());

describe("deferred dashboard forms", () => {
  it("loads the student list once when catalogs and an unchanged profile arrive", async () => {
    const view = render(<AlumnosPage />);
    await act(async () => {});
    expect(mocks.request).toHaveBeenCalledOnce();
    expect(mocks.request.mock.calls[0][0]).toContain("include_catalogs=1");
    mocks.auth.perfil = { ...mocks.auth.perfil };
    view.rerender(<AlumnosPage />);
    await act(async () => {});
    expect(mocks.request).toHaveBeenCalledOnce();
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
  });

  it.each([
    [
      "student",
      AlumnosPage,
      "Nuevo alumno",
      "Crear alumno",
      "El nombre debe tener al menos 2 caracteres.",
    ],
    [
      "instructor",
      InstructoresPage,
      "Nuevo Instructor",
      "Crear Instructor",
      "El nombre debe tener al menos 2 caracteres.",
    ],
    [
      "vehicle",
      VehiculosPage,
      "Nuevo Vehículo",
      "Crear Vehículo",
      "La marca debe tener al menos 2 caracteres.",
    ],
  ])(
    "keeps %s validation and re-enables saving after invalid input",
    async (_kind, Page, open, save, message) => {
      render(<Page />);
      await act(async () => {});
      fireEvent.click(screen.getByRole("button", { name: open }));
      await screen.findByRole("dialog");
      const consent = screen.queryByRole("checkbox", { name: /Autorizo el tratamiento/ });
      if (consent) fireEvent.click(consent);
      fireEvent.click(screen.getByRole("button", { name: save }));
      await waitFor(() => expect(mocks.error).toHaveBeenCalledWith(message));
      expect(screen.getByRole("button", { name: save })).toBeEnabled();
      expect(mocks.mutate).not.toHaveBeenCalled();
      expect(mocks.request.mock.calls.some(([, options]) => options?.method === "POST")).toBe(
        false
      );
    }
  );

  it("preserves the student draft when the lazy modal unmounts", async () => {
    render(<AlumnosPage />);
    fireEvent.click(screen.getByRole("button", { name: "Nuevo alumno" }));
    fireEvent.change(await screen.findByPlaceholderText("Nombre"), {
      target: { value: "Borrador" },
    });
    fireEvent.click(screen.getByRole("button", { name: "Cerrar modal" }));
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "Nuevo alumno" }));
    expect(await screen.findByPlaceholderText("Nombre")).toHaveValue("Borrador");
  });

  it("saves a valid student with the selected date unchanged and one mutation", async () => {
    localStorage.setItem(
      "dashboard:alumnos:form",
      JSON.stringify({
        ...emptyForm,
        nombre: "Prueba",
        apellidos: "Velocidad",
        dni: "999999",
        telefono: "3001234567",
        email: "prueba@example.com",
        direccion: "Calle 1 numero 2",
        departamento: "Nariño",
        ciudad: "IPIALES",
        municipio_codigo: "52356",
        regimen_fiscal: "ordinario",
        lugar_expedicion_documento: "Bogota",
        categorias: ["B1"],
        fecha_inscripcion: "2026-09-01",
        consentimiento_datos: true,
      })
    );
    render(<AlumnosPage />);
    await act(async () => {});
    fireEvent.click(screen.getByRole("button", { name: "Nuevo alumno" }));
    const save = await screen.findByRole("button", { name: "Crear alumno" });
    const responsibility = screen.getByRole("combobox", { name: /Tipo de contribuyente/ });
    expect(responsibility).toHaveValue("R-99-PN");
    expect(responsibility.querySelectorAll("option")).toHaveLength(5);
    fireEvent.change(responsibility, { target: { value: "O-15" } });
    fireEvent.click(save);
    fireEvent.click(save);
    await waitFor(() => expect(mocks.success).toHaveBeenCalledWith("Alumno registrado"));
    const writes = mocks.request.mock.calls.filter(([url]) => url === "/api/alumnos/manage");
    expect(writes).toHaveLength(1);
    expect(JSON.parse(writes[0][1].body)).toMatchObject({
      fecha_inscripcion: "2026-09-01",
      categorias: ["B1"],
      datos_facturacion: {
        country: "CO",
        cityCode: "52356",
        responsibilities: "O-15",
        taxRegime: "ordinario",
      },
    });
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
  });
  it("exige contacto y ubicación al crear y reinicia municipio al cambiar departamento", async () => {
    localStorage.setItem(
      "dashboard:alumnos:form",
      JSON.stringify({
        ...emptyForm,
        nombre: "Prueba",
        apellidos: "Fiscal",
        dni: "12345678",
        telefono: "3001234567",
        lugar_expedicion_documento: "Ipiales",
        categorias: ["B1"],
        consentimiento_datos: true,
      })
    );
    render(<AlumnosPage />);
    await act(async () => {});
    fireEvent.click(screen.getByRole("button", { name: "Nuevo alumno" }));
    const email = await screen.findByLabelText(/Correo electrónico para facturación/);
    expect(email).toBeRequired();
    expect(screen.getByLabelText(/^Dirección/)).toBeRequired();
    expect(screen.getByLabelText(/^País/)).toHaveValue("CO");
    expect(screen.getByLabelText(/Tipo de contribuyente/)).toHaveValue("R-99-PN");
    fireEvent.change(screen.getByLabelText(/Tipo de contribuyente/), { target: { value: "O-47" } });
    expect(screen.getByLabelText(/^Régimen fiscal/)).toHaveValue("simple");
    fireEvent.change(screen.getByLabelText(/^Régimen fiscal/), { target: { value: "especial" } });
    expect(screen.getByLabelText(/Tipo de contribuyente/)).toHaveValue("R-99-PN");
    fireEvent.change(screen.getByLabelText(/^Régimen fiscal/), { target: { value: "simple" } });
    expect(screen.getByLabelText(/Tipo de contribuyente/)).toHaveValue("O-47");
    fireEvent.change(screen.getByLabelText(/Tipo de contribuyente/), { target: { value: "O-15" } });
    expect(screen.getByLabelText(/^Régimen fiscal/)).toHaveValue("");
    fireEvent.click(screen.getByRole("button", { name: "Crear alumno" }));
    await waitFor(() => expect(mocks.error).toHaveBeenCalled());
    expect(mocks.request.mock.calls.filter(([url]) => url === "/api/alumnos/manage")).toHaveLength(
      0
    );
    fireEvent.change(screen.getByLabelText(/^Departamento/), { target: { value: "Nariño" } });
    fireEvent.change(screen.getByLabelText(/^Municipio/), { target: { value: "52356" } });
    expect(screen.getByLabelText(/^Municipio/)).toHaveValue("52356");
    fireEvent.change(screen.getByLabelText(/^Departamento/), { target: { value: "Antioquia" } });
    expect(screen.getByLabelText(/^Municipio/)).toHaveValue("");
    expect(screen.queryByRole("option", { name: "IPIALES" })).not.toBeInTheDocument();
  });
  it("completa los campos nuevos en un borrador anterior sin perder sus datos", async () => {
    const oldDraft: Record<string, unknown> = {
      ...emptyForm,
      nombre: "Prueba",
      apellidos: "Anterior",
      dni: "12345678",
      telefono: "3001234567",
      email: "prueba@example.com",
      direccion: "Calle 1 numero 2",
      departamento: "Nariño",
      ciudad: "IPIALES",
      lugar_expedicion_documento: "Ipiales",
      categorias: ["B1"],
      consentimiento_datos: true,
    };
    delete oldDraft.pais;
    delete oldDraft.municipio_codigo;
    delete oldDraft.regimen_fiscal;
    localStorage.setItem("dashboard:alumnos:form", JSON.stringify(oldDraft));
    render(<AlumnosPage />);
    await act(async () => {});
    fireEvent.click(screen.getByRole("button", { name: "Nuevo alumno" }));
    await screen.findByRole("dialog");
    fireEvent.change(screen.getByLabelText(/^Municipio/), { target: { value: "52356" } });
    fireEvent.change(screen.getByLabelText(/^Régimen fiscal/), { target: { value: "ordinario" } });
    fireEvent.click(screen.getByRole("button", { name: "Crear alumno" }));
    await waitFor(() => expect(mocks.success).toHaveBeenCalledWith("Alumno registrado"));
    const writes = mocks.request.mock.calls.filter(([url]) => url === "/api/alumnos/manage");
    expect(JSON.parse(writes[0][1].body)).toMatchObject({
      nombre: "Prueba",
      email: "prueba@example.com",
      datos_facturacion: { country: "CO", cityCode: "52356" },
    });
  });
});
