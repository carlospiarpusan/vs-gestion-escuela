import { useState } from "react";
import { fireEvent, render, screen } from "@testing-library/react";
import { expect, it, vi } from "vitest";
import AlumnoModal from "./AlumnoModal";
import { emptyForm, type AlumnoFormType, type AlumnoRow } from "./constants";

vi.mock("@/components/dashboard/Modal", () => ({
  default: ({ children }: { children: React.ReactNode }) => <div role="dialog">{children}</div>,
}));
vi.mock("./useContractPreview", () => ({
  useContractPreview: () => ({
    preview: { nextNumber: "CAR-0001" },
    loading: false,
    hasCategorias: true,
  }),
}));
vi.mock("@/lib/supabase", () => ({ createClient: vi.fn() }));

function Fixture({
  save = vi.fn(),
  editing = null,
  initial = {},
  saving = false,
}: {
  save?: () => void;
  editing?: AlumnoRow | null;
  initial?: Partial<AlumnoFormType>;
  saving?: boolean;
}) {
  const [form, setForm] = useState({ ...emptyForm, ...initial });
  return (
    <AlumnoModal
      modalOpen
      setModalOpen={vi.fn()}
      editing={editing}
      editingHasMultipleMatriculas={false}
      editingMatricula={null}
      isAptitudForm={form.tipo_registro === "aptitud_conductor"}
      isPracticeForm={form.tipo_registro === "practica_adicional"}
      form={form}
      setForm={setForm}
      saving={saving}
      handleSave={save}
      toggleCategoria={(category) =>
        setForm((current) => ({
          ...current,
          categorias: current.categorias.includes(category)
            ? current.categorias.filter((value) => value !== category)
            : [...current.categorias, category],
        }))
      }
      openNewMatricula={vi.fn()}
      categoriasEscuela={["A2", "B1"]}
      tramitadorOptions={[]}
    />
  );
}

it("mantiene visibles y marcados los campos obligatorios de registro, facturación y ANSV", () => {
  render(<Fixture />);
  for (const name of [
    /^Nombre \*/,
    /^Apellidos \*/,
    /^Número de documento/,
    /^Tipo de documento/,
    /^Teléfono/,
    /Correo electrónico para facturación/,
    /^Lugar de expedición/,
    /^Fecha de nacimiento/,
    /^Sexo/,
    /^Dirección/,
    /^País/,
    /^Departamento/,
    /^Municipio/,
    /^Régimen fiscal/,
    /Tipo de contribuyente/,
    /^Fecha de inscripción/,
  ]) {
    const field = screen.getByLabelText(name);
    expect(field).toBeRequired();
    expect(field.closest("details")).toBeNull();
  }
  expect(screen.getByLabelText(/^Municipio/)).toHaveValue("52356");
  expect(screen.getByLabelText(/^Régimen fiscal/)).toHaveValue("ordinario");
  expect(screen.getByLabelText(/Tipo de contribuyente/)).toHaveValue("R-99-PN");
  expect(screen.getByLabelText("Método de pago")).toHaveValue("efectivo");
  expect(screen.getByRole("combobox", { name: "Estado" })).toBeInTheDocument();
  expect(screen.getAllByDisplayValue("Activo")).toHaveLength(1);
  expect(screen.queryByText("Resumen del registro")).not.toBeInTheDocument();
});

it("agrupa campos ocasionales sin perder sus valores ni sus controles", () => {
  render(<Fixture initial={{ notas: "Observación guardada" }} />);
  expect(screen.getByLabelText("Notas")).toHaveValue("Observación guardada");
  expect(screen.getByLabelText("Notas").closest("details")).toHaveAttribute("open");
  fireEvent.click(screen.getByLabelText("Tiene tramitador"));
  expect(screen.getByLabelText(/Nombre del tramitador/)).toBeRequired();
  fireEvent.change(screen.getByLabelText(/Nombre del tramitador/), {
    target: { value: "Agencia prueba" },
  });
  fireEvent.click(screen.getByLabelText("Tiene tramitador"));
  fireEvent.click(screen.getByLabelText("Tiene tramitador"));
  expect(screen.getByLabelText(/Nombre del tramitador/)).toHaveValue("Agencia prueba");
  fireEvent.click(screen.getByText("Factura externa registrada"));
  fireEvent.click(screen.getByLabelText("Factura electronica emitida"));
  expect(screen.getByPlaceholderText("FE-001234")).toBeInTheDocument();
});

it("permite teclado para guardar y no envía al cambiar categorías o marcar opciones", () => {
  const save = vi.fn();
  const view = render(<Fixture save={save} />);
  fireEvent.click(screen.getByRole("button", { name: "A2" }));
  expect(screen.getByRole("button", { name: "A2" })).toHaveAttribute("aria-pressed", "true");
  expect(save).not.toHaveBeenCalled();
  fireEvent.submit(view.container.querySelector("form")!);
  expect(save).not.toHaveBeenCalled();
  fireEvent.click(screen.getByLabelText(/Autorizo el tratamiento/));
  fireEvent.submit(view.container.querySelector("form")!);
  expect(save).toHaveBeenCalledOnce();
});

it("no hace nacimiento ni sexo obligatorios en servicios que no liquidan ANSV CEA", () => {
  render(<Fixture initial={{ tipo_registro: "practica_adicional" }} />);
  expect(screen.getByLabelText(/^Fecha de nacimiento/)).not.toBeRequired();
  expect(screen.getByLabelText(/^Sexo/)).not.toBeRequired();
  expect(screen.queryByLabelText(/^Fecha de inscripción/)).not.toBeInTheDocument();
  expect(screen.getByLabelText(/Correo electrónico para facturación/)).toBeRequired();
  expect(screen.getByLabelText(/^Fecha del servicio/)).toBeRequired();
});

it("limita nacimiento a 16 años cumplidos en la inscripción y actualiza el límite al cambiarla", () => {
  render(<Fixture initial={{ fecha_inscripcion: "2026-10-19" }} />);
  expect(screen.getByLabelText(/^Fecha de nacimiento/)).toHaveAttribute("max", "2010-10-19");
  fireEvent.change(screen.getByLabelText(/^Fecha de inscripción/), {
    target: { value: "2025-09-01" },
  });
  expect(screen.getByLabelText(/^Fecha de nacimiento/)).toHaveAttribute("max", "2009-09-01");
});

it("no bloquea la edición de una ficha histórica ni duplica estado", () => {
  const editing = {
    ...emptyForm,
    id: "student",
    tipo_registro: "regular",
    matriculas: [],
  } as unknown as AlumnoRow;
  render(<Fixture editing={editing} />);
  expect(screen.getByLabelText(/^Fecha de nacimiento/)).not.toBeRequired();
  expect(screen.getByLabelText(/^Sexo/)).not.toBeRequired();
  expect(screen.getByLabelText(/Correo electrónico para facturación/)).not.toBeRequired();
  expect(screen.getByRole("button", { name: "Guardar cambios" })).toBeEnabled();
  expect(screen.getAllByDisplayValue("Activo")).toHaveLength(1);
});

it("mantiene requeridos nacimiento y sexo ya completos al editar una ficha regular", () => {
  const editing = {
    ...emptyForm,
    id: "student",
    tipo_registro: "regular",
    fecha_nacimiento: "2000-01-15",
    sexo: "F",
    matriculas: [],
  } as unknown as AlumnoRow;
  render(
    <Fixture
      editing={editing}
      initial={{ fecha_nacimiento: editing.fecha_nacimiento || "", sexo: "F" }}
    />
  );
  expect(screen.getByLabelText(/^Fecha de nacimiento/)).toBeRequired();
  expect(screen.getByLabelText(/^Sexo/)).toBeRequired();
});

it("asigna automáticamente la categoría inicial de ANSV al seleccionar combo A2 y B1", () => {
  render(
    <Fixture
      initial={{
        nombre: "Carlos",
        apellidos: "Perez",
        dni: "12345678",
        telefono: "3001234567",
        email: "carlos@example.com",
        fecha_nacimiento: "2000-01-15",
        sexo: "M",
        fecha_inscripcion: "2026-09-01",
        categorias: ["A2", "B1"],
      }}
    />
  );
  const select = screen.getByRole("combobox", { name: /Categoría principal para ANSV/ });
  expect(select).toHaveValue("A2");
  expect(screen.getByRole("status")).toHaveTextContent(/ANSV A2:/);
  expect(
    screen.queryByText(/Selecciona la categoría para liquidar el único aporte ANSV/)
  ).not.toBeInTheDocument();
});
