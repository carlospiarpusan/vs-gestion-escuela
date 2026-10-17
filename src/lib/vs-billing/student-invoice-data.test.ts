import { expect, it } from "vitest";
import {
  getStudentInvoiceIssues,
  getQuotedCustomerIssues,
  INVOICE_FIELD_LABELS,
} from "./student-invoice-data";
import { invoiceStudent, facturaxQuoteSchema } from "./facturax-contract";
const row = {
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
  datos_facturacion: {
    country: "CO",
    cityCode: "52356",
    personType: "2",
    responsibilities: "R-99-PN",
    taxRegime: "ordinario",
    taxScheme: "ZZ",
  },
};
it("el perfil completo conserva cada campo acordado con FacturaX", () => {
  expect(getStudentInvoiceIssues(row)).toEqual([]);
  const student = invoiceStudent({
    ...row,
    valor_total: 99999,
    matriculas: ["privado"],
  } as typeof row);
  expect(student.fiscal).toMatchObject({
    countryCode: "CO",
    departmentCode: "52",
    cityCode: "52356",
    address: row.direccion,
    phone: row.telefono,
  });
  expect(getQuotedCustomerIssues(student)).toEqual([]);
  expect(JSON.stringify(student)).not.toMatch(/valor_total|matriculas|numero_contrato|categorias/);
});
it.each([
  ["nombre", "student.name"],
  ["apellidos", "student.name"],
  ["dni", "student.document"],
  ["tipo_documento", "student.documentType"],
  ["email", "student.email"],
  ["telefono", "student.fiscal.phone"],
  ["direccion", "student.fiscal.address"],
  ["departamento", "student.fiscal.departmentCode"],
  ["ciudad", "student.fiscal.cityCode"],
])("detecta el campo de ficha %s", (field, path) => {
  const incomplete = { ...row, [field]: "" };
  expect(getStudentInvoiceIssues(incomplete)).toContainEqual(
    expect.objectContaining({ field: path })
  );
  expect(() => invoiceStudent(incomplete)).toThrow();
  expect(INVOICE_FIELD_LABELS[path]).toBeTruthy();
});
it.each([
  ["country", "countryCode"],
  ["cityCode", "cityCode"],
  ["personType", "personType"],
  ["responsibilities", "responsibilities"],
  ["taxRegime", "taxRegime"],
  ["taxScheme", "taxScheme"],
])("detecta el campo fiscal %s", (field, path) => {
  expect(
    getStudentInvoiceIssues({
      ...row,
      datos_facturacion: { ...row.datos_facturacion, [field]: "" },
    })
  ).toContainEqual(expect.objectContaining({ field: `student.fiscal.${path}` }));
});
it("un perfil inexistente no se sustituye con supuestos fiscales", () => {
  const issues = getStudentInvoiceIssues({ ...row, datos_facturacion: null });
  expect(issues.map((i) => i.field)).toEqual(
    expect.arrayContaining([
      "student.fiscal.countryCode",
      "student.fiscal.personType",
      "student.fiscal.taxRegime",
      "student.fiscal.cityCode",
    ])
  );
});
it("rechaza departamento incoherente y regimen SIMPLE no declarado", () => {
  expect(getStudentInvoiceIssues({ ...row, departamento: "Antioquia" })).toContainEqual(
    expect.objectContaining({ field: "student.fiscal.cityCode" })
  );
  expect(
    getStudentInvoiceIssues({
      ...row,
      datos_facturacion: { ...row.datos_facturacion, taxRegime: "simple" },
    })
  ).toContainEqual(expect.objectContaining({ field: "student.fiscal.taxRegime" }));
});
it("las revisiones historicas incompletas no se aceptan para emitir", () => {
  const student = invoiceStudent(row);
  expect(getQuotedCustomerIssues({ ...student, fiscal: undefined }).length).toBeGreaterThan(0);
  expect(
    getQuotedCustomerIssues({ ...student, fiscal: { ...student.fiscal, departmentCode: "05" } })
  ).toContainEqual(expect.objectContaining({ field: "student.fiscal.departmentCode" }));
  expect(
    getQuotedCustomerIssues({ ...student, fiscal: { ...student.fiscal, documentType: "41" } })
  ).toContainEqual(expect.objectContaining({ field: "student.fiscal.documentType" }));
});
it("no agrega apellidos ficticios ni acorta un nombre valido al validar la revision", () => {
  const student = invoiceStudent({ ...row, nombre: "A".repeat(100), apellidos: "B".repeat(99) });
  expect(student.name).toHaveLength(200);
  expect(getQuotedCustomerIssues(student)).toEqual([]);
});
it("el esquema de respuesta conserva el perfil fiscal del cliente revisado", () => {
  const customer = invoiceStudent(row);
  const quote = facturaxQuoteSchema.parse({
    schemaVersion: 1,
    issuerNit: "901171550",
    id: row.id,
    studentId: row.id,
    expiresAt: "2099-01-01T00:00:00Z",
    customer,
    lines: [
      { description: "Servicio", quantity: 1000, price: 10000, tax: 0, taxTreatment: "excluded" },
    ],
    totals: { subtotal: 10000, vat: 0, total: 10000 },
    payment: { method: "Efectivo", condition: "contado", dueDate: "2026-10-14" },
    delivery: "email",
  });
  expect(quote.customer.fiscal).toEqual(customer.fiscal);
});
it("el cliente efectivo y el origen del alumno conservan declaraciones independientes", () => {
  const source = invoiceStudent(row);
  const effective = {
    ...source,
    fiscal: { ...source.fiscal, taxRegime: "simple", responsibilities: "O-47", taxScheme: "01" },
  };
  expect(getQuotedCustomerIssues(effective)).toEqual([]);
  const quote = facturaxQuoteSchema.parse({
    schemaVersion: 1,
    issuerNit: "901171550",
    id: row.id,
    studentId: row.id,
    expiresAt: "2099-01-01T00:00:00Z",
    customer: effective,
    sourceStudent: source,
    lines: [
      { description: "Servicio", quantity: 1000, price: 10000, tax: 0, taxTreatment: "excluded" },
    ],
    totals: { subtotal: 10000, vat: 0, total: 10000 },
    payment: { method: "Efectivo", condition: "contado", dueDate: "2026-10-14" },
    delivery: "email",
  });
  expect(quote.customer.fiscal).toEqual(effective.fiscal);
  expect(quote.sourceStudent).toEqual(source);
});
it.each(["ABC", "AB-123", "A".repeat(24)])(
  "conserva pasaporte valido %s segun el contrato de FacturaX",
  (dni) => {
    const student = invoiceStudent({ ...row, dni, tipo_documento: "PAS" });
    expect(student.document).toBe(dni);
    expect(student.documentType).toBe("PP");
    expect(student.fiscal.documentType).toBe("41");
    expect(getQuotedCustomerIssues(student)).toEqual([]);
  }
);
