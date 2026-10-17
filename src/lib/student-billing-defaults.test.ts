import { expect, it, vi } from "vitest";
import {
  studentBillingFormDefaults,
  DEFAULT_STUDENT_BILLING_PROFILE,
} from "./student-billing-defaults";
import { studentBillingContactSchema } from "./student-billing-contact";
import { emptyForm, applyAlumnoBillingDefaults } from "@/app/dashboard/alumnos/constants";

vi.mock("@/lib/supabase", () => ({ createClient: vi.fn() }));

it("preselecciona Colombia, Ipiales y el perfil habitual sin inventar contacto", () => {
  const initial = studentBillingFormDefaults({});
  expect(initial).toEqual({
    ciudad: "IPIALES",
    departamento: "Nari\u00f1o",
    datos_facturacion: DEFAULT_STUDENT_BILLING_PROFILE,
  });
  expect(studentBillingContactSchema.safeParse(initial).success).toBe(false);
  expect(emptyForm).toMatchObject({
    ciudad: "IPIALES",
    departamento: "Nari\u00f1o",
    pais: "CO",
    municipio_codigo: "52356",
    regimen_fiscal: "ordinario",
    responsabilidad_fiscal: "R-99-PN",
    metodo_pago_abono: "efectivo",
    email: "",
    telefono: "",
    direccion: "",
  });
});
it("conserva ubicacion y declaraciones fiscales ya seleccionadas", () => {
  const contact = {
    ciudad: "MEDELL\u00cdN",
    departamento: "Antioquia",
    datos_facturacion: {
      ...DEFAULT_STUDENT_BILLING_PROFILE,
      cityCode: "05001",
      taxRegime: "especial",
      responsibilities: "O-15",
    },
  };
  expect(studentBillingFormDefaults(contact)).toEqual(contact);
  expect(contact.datos_facturacion.cityCode).toBe("05001");
});
it("no propone Ipiales si ya hay un departamento distinto", () => {
  const initial = studentBillingFormDefaults({ departamento: "Antioquia" });
  expect(initial.departamento).toBe("Antioquia");
  expect(initial.datos_facturacion.cityCode).toBe("");
});
it("recupera el codigo de un municipio guardado sin cambiar su ubicacion", () => {
  expect(
    studentBillingFormDefaults({ ciudad: "ipiales", departamento: "Nari\u00f1o" })
  ).toMatchObject({
    ciudad: "IPIALES",
    departamento: "Nari\u00f1o",
    datos_facturacion: { cityCode: "52356" },
  });
  expect(studentBillingFormDefaults({ ciudad: "Desconocido" })).toMatchObject({
    ciudad: "Desconocido",
    departamento: "",
    datos_facturacion: { cityCode: "" },
  });
});
it("deriva el departamento del codigo guardado antes de ofrecer predeterminados", () => {
  expect(studentBillingFormDefaults({ datos_facturacion: { cityCode: "05001" } })).toMatchObject({
    ciudad: "MEDELL\u00cdN",
    departamento: "Antioquia",
    datos_facturacion: { cityCode: "05001" },
  });
});
it.each([{ taxRegime: "simple" }, { responsibilities: "O-47" }])(
  "mantiene coherente un perfil SIMPLE parcial %j",
  (datos_facturacion) => {
    expect(studentBillingFormDefaults({ datos_facturacion }).datos_facturacion).toMatchObject({
      taxRegime: "simple",
      responsibilities: "O-47",
    });
  }
);
it("no oculta datos fiscales o ubicaciones incoherentes ya guardados", () => {
  const initial = studentBillingFormDefaults({
    ciudad: "IPIALES",
    departamento: "Antioquia",
    datos_facturacion: {
      cityCode: "52356",
      taxRegime: "simple",
      responsibilities: "R-99-PN",
      taxScheme: "01",
    },
  });
  expect(initial).toMatchObject({
    departamento: "Antioquia",
    datos_facturacion: {
      cityCode: "52356",
      taxRegime: "simple",
      responsibilities: "R-99-PN",
      taxScheme: "01",
    },
  });
  expect(
    studentBillingContactSchema.safeParse({
      ...initial,
      email: "ana@example.com",
      telefono: "3001234567",
      direccion: "Calle 1",
    }).success
  ).toBe(false);
});
it("completa solo campos vacios de un borrador nuevo y conserva las otras elecciones", () => {
  const draft = {
    ...emptyForm,
    ciudad: "",
    departamento: "",
    pais: "",
    municipio_codigo: "",
    regimen_fiscal: "",
  };
  expect(applyAlumnoBillingDefaults(draft)).toEqual(emptyForm);
  const chosen = {
    ...emptyForm,
    ciudad: "MEDELL\u00cdN",
    departamento: "Antioquia",
    municipio_codigo: "05001",
    regimen_fiscal: "especial",
    responsabilidad_fiscal: "O-13",
    metodo_pago_abono: "nequi" as const,
  };
  expect(applyAlumnoBillingDefaults(chosen)).toEqual(chosen);
});
