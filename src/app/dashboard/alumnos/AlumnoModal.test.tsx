import { fireEvent, render, screen } from "@testing-library/react";
import { useState } from "react";
import { afterEach, expect, it, vi } from "vitest";
import { COLOMBIA_MUNICIPALITIES } from "@/lib/student-billing-contact";
import AlumnoModal from "./AlumnoModal";
import { emptyForm } from "./constants";

vi.mock("@/lib/supabase", () => ({ createClient: vi.fn() }));
vi.mock("./useContractPreview", () => ({
  useContractPreview: () => ({ preview: null, loading: false, error: null, hasCategorias: false }),
}));
vi.mock("@/components/dashboard/Modal", () => ({
  default: ({ children }: { children: React.ReactNode }) => <div role="dialog">{children}</div>,
}));
afterEach(() => vi.restoreAllMocks());

function Form() {
  const [form, setForm] = useState({ ...emptyForm });
  return (
    <AlumnoModal
      modalOpen
      setModalOpen={vi.fn()}
      editing={null}
      editingHasMultipleMatriculas={false}
      editingMatricula={null}
      isAptitudForm={false}
      isPracticeForm={false}
      form={form}
      setForm={setForm}
      saving={false}
      handleSave={vi.fn()}
      toggleCategoria={vi.fn()}
      openNewMatricula={vi.fn()}
      categoriasEscuela={[]}
      tramitadorOptions={[]}
    />
  );
}

it("muestra las preselecciones al crear y mantiene municipio y regimen editables", () => {
  render(<Form />);
  expect(screen.getByLabelText(/País/)).toHaveValue("CO");
  expect(screen.getByLabelText(/Departamento/)).toHaveValue("Nari\u00f1o");
  expect(screen.getByLabelText(/Municipio/)).toHaveValue("52356");
  expect(screen.getByLabelText(/Régimen fiscal/)).toHaveValue("ordinario");
  expect(screen.getByLabelText(/Tipo de contribuyente/)).toHaveValue("R-99-PN");
  fireEvent.change(screen.getByLabelText(/Departamento/), { target: { value: "Antioquia" } });
  expect(screen.getByLabelText(/Municipio/)).toHaveValue("");
  fireEvent.change(screen.getByLabelText(/Municipio/), { target: { value: "05001" } });
  expect(screen.getByLabelText(/Municipio/)).toHaveValue("05001");
  fireEvent.change(screen.getByLabelText(/Régimen fiscal/), { target: { value: "simple" } });
  expect(screen.getByLabelText(/Tipo de contribuyente/)).toHaveValue("O-47");
  fireEvent.change(screen.getByLabelText(/Tipo de contribuyente/), { target: { value: "O-13" } });
  fireEvent.change(screen.getByLabelText(/Régimen fiscal/), { target: { value: "especial" } });
  expect(screen.getByLabelText(/Tipo de contribuyente/)).toHaveValue("O-13");
  expect(screen.getByLabelText(/Régimen fiscal/)).toHaveValue("especial");
  expect(screen.getByLabelText(/Dirección/)).toHaveAttribute("required");
});

it("solo reconstruye la lista de municipios cuando cambia el departamento", () => {
  const entries = Object.entries;
  let scans = 0;
  vi.spyOn(Object, "entries").mockImplementation((value) => {
    if (value === COLOMBIA_MUNICIPALITIES) scans += 1;
    return entries(value);
  });
  render(<Form />);
  expect(scans).toBe(1);
  for (let index = 0; index < 10; index += 1)
    fireEvent.change(screen.getByLabelText(/Correo electrónico para facturación/), {
      target: { value: `alumno${index}@example.com` },
    });
  expect(scans).toBe(1);
  fireEvent.change(screen.getByLabelText(/Departamento/), { target: { value: "Antioquia" } });
  expect(scans).toBe(2);
  expect(screen.getByLabelText(/Municipio/)).toHaveValue("");
  expect(screen.getByRole("option", { name: "MEDELLÍN" })).toHaveValue("05001");
  expect(screen.queryByRole("option", { name: "IPIALES" })).not.toBeInTheDocument();
  expect(screen.getByLabelText(/Correo electrónico para facturación/)).toHaveAttribute("required");
});
