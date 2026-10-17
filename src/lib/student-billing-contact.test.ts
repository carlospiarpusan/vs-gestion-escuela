import { expect, it } from "vitest";
import {
  studentBillingContactSchema,
  studentBillingProfileFromForm,
  COLOMBIA_MUNICIPALITIES,
  BILLING_DEPARTMENTS,
  BILLING_RESPONSIBILITIES,
} from "./student-billing-contact";
import { invoiceStudent } from "./vs-billing/facturax-contract";

const contact = {
  email: "alumno@example.com",
  telefono: "3001234567",
  direccion: "Calle 1 numero 2",
  departamento: "Nariño",
  ciudad: "IPIALES",
  datos_facturacion: {
    country: "CO",
    cityCode: "52356",
    personType: "2",
    responsibilities: "R-99-PN",
    taxRegime: "ordinario",
    taxScheme: "ZZ",
  },
};
it("valida contacto y perfil de un alumno nuevo sin confundir régimen y responsabilidad", () => {
  expect(studentBillingContactSchema.parse(contact)).toEqual(contact);
  expect(
    studentBillingProfileFromForm({
      pais: "CO",
      municipio_codigo: "52356",
      regimen_fiscal: "ordinario",
    })
  ).toEqual(contact.datos_facturacion);
  expect(Object.keys(COLOMBIA_MUNICIPALITIES).length).toBeGreaterThan(1100);
  expect(BILLING_DEPARTMENTS).toHaveLength(33);
  for (const [code, pair] of Object.entries(COLOMBIA_MUNICIPALITIES)) {
    expect(code).toMatch(/^\d{5}$/);
    expect(pair).toHaveLength(2);
  }
});
it.each(BILLING_RESPONSIBILITIES)(
  "conserva la responsabilidad seleccionada: $value",
  ({ value }) => {
    const fiscal = studentBillingProfileFromForm({
      pais: "CO",
      municipio_codigo: "52356",
      responsabilidad_fiscal: value,
      regimen_fiscal: value === "O-47" ? "simple" : "ordinario",
    });
    expect(
      studentBillingContactSchema.parse({ ...contact, datos_facturacion: fiscal }).datos_facturacion
    ).toEqual(fiscal);
    expect(
      invoiceStudent({
        ...contact,
        datos_facturacion: fiscal,
        id: "test",
        nombre: "Ana",
        apellidos: "Prueba",
        dni: "12345678",
        tipo_documento: "CC",
      }).fiscal?.responsibilities
    ).toBe(value);
  }
);
it("rechaza responsabilidades inventadas y SIMPLE incoherente en ambos sentidos", () => {
  for (const fiscal of [
    { responsibilities: "inventado", taxRegime: "ordinario" },
    { responsibilities: "O-47", taxRegime: "ordinario" },
    { responsibilities: "R-99-PN", taxRegime: "simple" },
  ]) {
    expect(
      studentBillingContactSchema.safeParse({
        ...contact,
        datos_facturacion: { ...contact.datos_facturacion, ...fiscal },
      }).success
    ).toBe(false);
  }
});
it.each(["email", "telefono", "direccion", "departamento", "ciudad"])(
  "exige %s para crear",
  (field) => {
    expect(studentBillingContactSchema.safeParse({ ...contact, [field]: "" }).success).toBe(false);
  }
);
it.each(["country", "cityCode", "taxRegime", "responsibilities"])(
  "exige perfil válido: %s",
  (field) => {
    expect(
      studentBillingContactSchema.safeParse({
        ...contact,
        datos_facturacion: { ...contact.datos_facturacion, [field]: "" },
      }).success
    ).toBe(false);
  }
);
it("rechaza un municipio de otro departamento, código desconocido y SIMPLE con R-99-PN", () => {
  expect(
    studentBillingContactSchema.safeParse({ ...contact, departamento: "Antioquia" }).success
  ).toBe(false);
  expect(
    studentBillingContactSchema.safeParse({
      ...contact,
      datos_facturacion: { ...contact.datos_facturacion, cityCode: "99999" },
    }).success
  ).toBe(false);
  expect(
    studentBillingContactSchema.safeParse({
      ...contact,
      datos_facturacion: { ...contact.datos_facturacion, taxRegime: "simple" },
    }).success
  ).toBe(false);
});
it("envía solo los datos fiscales de contacto, sin matrícula ni valores de curso", () => {
  const input = {
    ...contact,
    id: "10000000-0000-4000-8000-000000000001",
    nombre: "Ana",
    apellidos: "Prueba",
    dni: "12345678",
    tipo_documento: "CC",
    valor_total: 999999,
    matriculas: ["privada"],
    numero_contrato: "privado",
  };
  expect(invoiceStudent(input)).toEqual({
    id: input.id,
    name: "Ana Prueba",
    document: "12345678",
    documentType: "CC",
    email: contact.email,
    fiscal: {
      documentType: "13",
      personType: "2",
      countryCode: "CO",
      departmentCode: "52",
      address: contact.direccion,
      cityCode: "52356",
      phone: contact.telefono,
      responsibilities: "R-99-PN",
      taxRegime: "ordinario",
      taxScheme: "ZZ",
    },
  });
  expect(invoiceStudent({ ...input, tipo_documento: "PAS" }).fiscal?.documentType).toBe("41");
  expect(() => invoiceStudent({ ...input, direccion: "" })).toThrow();
});
