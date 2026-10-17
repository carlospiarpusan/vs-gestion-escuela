import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, expect, it, vi } from "vitest";
import { COLOMBIA_MUNICIPALITIES } from "@/lib/student-billing-contact";
import type { InvoiceContactSnapshot } from "@/lib/vs-billing/student-invoice-data";
import InvoiceContactEditor from "./InvoiceContactEditor";

afterEach(() => vi.restoreAllMocks());
const billingProfile = {
  country: "CO",
  cityCode: "52356",
  personType: "2",
  responsibilities: "R-99-PN",
  taxRegime: "ordinario",
  taxScheme: "ZZ",
};
const contact: InvoiceContactSnapshot = {
  id: "10000000-0000-4000-8000-000000000001",
  nombre: "Ana",
  apellidos: "Prueba",
  dni: "12345678",
  tipo_documento: "CC",
  email: "ana@example.com",
  telefono: "3001234567",
  direccion: "Calle 1 numero 2",
  ciudad: "IPIALES",
  departamento: "Nariño",
  version: "a".repeat(64),
  datos_facturacion: billingProfile,
};

it("reutiliza municipios al escribir y guarda el municipio del nuevo departamento", async () => {
  const entries = Object.entries;
  let scans = 0;
  vi.spyOn(Object, "entries").mockImplementation((value) => {
    if (value === COLOMBIA_MUNICIPALITIES) scans += 1;
    return entries(value);
  });
  const onSave = vi.fn().mockResolvedValue(contact);
  const onSaved = vi.fn();
  render(
    <InvoiceContactEditor
      contact={contact}
      disabled={false}
      onSave={onSave}
      onSaved={onSaved}
      onBusy={vi.fn()}
      onReload={vi.fn()}
    />
  );
  expect(scans).toBe(1);
  for (let index = 0; index < 10; index += 1)
    fireEvent.change(screen.getByLabelText("Direccion"), {
      target: { value: `Calle ${index} numero 1` },
    });
  expect(scans).toBe(1);
  expect(screen.getByLabelText("Municipio")).toHaveValue("52356");
  fireEvent.change(screen.getByLabelText("Departamento"), { target: { value: "Antioquia" } });
  expect(scans).toBe(2);
  expect(screen.getByLabelText("Municipio")).toHaveValue("");
  expect(screen.queryByRole("option", { name: "IPIALES" })).not.toBeInTheDocument();
  fireEvent.click(screen.getByRole("button", { name: "Guardar datos" }));
  expect(onSave).not.toHaveBeenCalled();
  expect(screen.getByRole("alert")).toHaveTextContent(/Completa los campos/);
  fireEvent.change(screen.getByLabelText("Municipio"), { target: { value: "05001" } });
  fireEvent.click(screen.getByRole("button", { name: "Guardar datos" }));
  await waitFor(() => expect(onSaved).toHaveBeenCalledWith(contact));
  expect(onSave).toHaveBeenCalledWith({
    email: contact.email,
    telefono: contact.telefono,
    direccion: "Calle 9 numero 1",
    departamento: "Antioquia",
    ciudad: "MEDELLÍN",
    datos_facturacion: { ...billingProfile, cityCode: "05001" },
  });
  expect(scans).toBe(2);
});
