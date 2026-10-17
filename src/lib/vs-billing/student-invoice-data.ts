import { z } from "zod";
import {
  COLOMBIA_MUNICIPALITIES,
  studentBillingContactSchema,
} from "@/lib/student-billing-contact";

export type InvoiceStudentContact = {
  id: string;
  nombre: string;
  apellidos: string;
  dni: string;
  tipo_documento: string | null;
  email: string | null;
  telefono?: string | null;
  direccion?: string | null;
  ciudad?: string | null;
  departamento?: string | null;
  datos_facturacion?: unknown;
};
export type InvoiceDataIssue = { field: string; message: string };
export const invoiceDataIssuesSchema = z
  .array(z.object({ field: z.string().min(1).max(100), message: z.string().min(1).max(500) }))
  .max(32);
export type InvoiceContactSnapshot = InvoiceStudentContact & { version: string };
export const INVOICE_DATA_CODE = "INVOICE_DATA_INCOMPLETE";
export const INVOICE_FIELD_LABELS: Record<string, string> = {
  "student.name": "Nombre y apellidos",
  "student.document": "Numero de identificacion",
  "student.documentType": "Tipo de documento",
  "student.email": "Correo electronico",
  "student.fiscal.phone": "Telefono",
  "student.fiscal.address": "Direccion",
  "student.fiscal.countryCode": "Pais",
  "student.fiscal.departmentCode": "Departamento",
  "student.fiscal.cityCode": "Municipio",
  "student.fiscal.personType": "Tipo de persona",
  "student.fiscal.documentType": "Tipo fiscal de documento",
  "student.fiscal.responsibilities": "Responsabilidad fiscal",
  "student.fiscal.taxRegime": "Regimen fiscal",
  "student.fiscal.taxScheme": "Tratamiento tributario",
};
const fieldPaths: Record<string, string> = {
  nombre: "student.name",
  apellidos: "student.name",
  dni: "student.document",
  tipo_documento: "student.documentType",
  name: "student.name",
  document: "student.document",
  documentType: "student.documentType",
  email: "student.email",
  telefono: "student.fiscal.phone",
  direccion: "student.fiscal.address",
  ciudad: "student.fiscal.cityCode",
  departamento: "student.fiscal.departmentCode",
  "datos_facturacion.country": "student.fiscal.countryCode",
  "datos_facturacion.cityCode": "student.fiscal.cityCode",
  "datos_facturacion.personType": "student.fiscal.personType",
  "datos_facturacion.responsibilities": "student.fiscal.responsibilities",
  "datos_facturacion.taxRegime": "student.fiscal.taxRegime",
  "datos_facturacion.taxScheme": "student.fiscal.taxScheme",
};
const identitySchema = z
  .object({
    name: z.string().trim().min(3).max(200),
    document: z
      .string()
      .trim()
      .min(3)
      .max(24)
      .regex(/^[a-zA-Z0-9-]+$/),
    documentType: z.enum(["CC", "CE", "TI", "PAS", "PP"]),
  })
  .superRefine((value, ctx) => {
    if (["CC", "CE", "TI"].includes(value.documentType) && !/^\d{5,20}$/.test(value.document))
      ctx.addIssue({
        code: "custom",
        path: ["document"],
        message: "Este documento debe contener entre 5 y 20 digitos.",
      });
  });
export class InvoiceDataIncompleteError extends Error {
  readonly status = 422;
  readonly code = INVOICE_DATA_CODE;
  constructor(
    public issues: InvoiceDataIssue[],
    message = "Completa los datos del alumno antes de facturar."
  ) {
    super(message);
  }
}
export function getStudentInvoiceIssues(row: InvoiceStudentContact): InvoiceDataIssue[] {
  const identity = identitySchema.safeParse({
    name: `${row.nombre ?? ""} ${row.apellidos ?? ""}`.trim(),
    document: row.dni,
    documentType: row.tipo_documento,
  });
  const contact = studentBillingContactSchema.safeParse({
    ...row,
    datos_facturacion: row.datos_facturacion ?? {},
  });
  const errors = [
    ...(identity.success ? [] : identity.error.issues),
    ...(contact.success ? [] : contact.error.issues),
  ];
  const issues = mapValidationIssues(errors);
  if (!row.nombre?.trim() || !row.apellidos?.trim())
    issues.set("student.name", {
      field: "student.name",
      message: "Completa nombre y apellidos del alumno.",
    });
  if (
    !contact.success &&
    ![...issues.keys()].some(
      (field) => field.startsWith("student.fiscal.") || field === "student.email"
    )
  )
    issues.set("student.fiscal.taxRegime", {
      field: "student.fiscal.taxRegime",
      message: "Revisa el perfil fiscal del alumno.",
    });
  return [...issues.values()];
}
function mapValidationIssues(errors: z.core.$ZodIssue[]) {
  const issues = new Map<string, InvoiceDataIssue>();
  for (const issue of errors) {
    const field = fieldPaths[issue.path.join(".")];
    if (!field) continue;
    issues.set(field, {
      field,
      message:
        issue.code === "custom"
          ? issue.message
          : `Completa o revisa ${INVOICE_FIELD_LABELS[field].toLowerCase()}.`,
    });
  }
  return issues;
}
export function assertStudentInvoiceData(row: InvoiceStudentContact) {
  const issues = getStudentInvoiceIssues(row);
  if (issues.length) throw new InvoiceDataIncompleteError(issues);
  const identity = identitySchema.parse({
    name: `${row.nombre} ${row.apellidos}`.trim(),
    document: row.dni,
    documentType: row.tipo_documento,
  });
  return {
    nombre: row.nombre.trim(),
    apellidos: row.apellidos.trim(),
    dni: identity.document,
    tipo_documento: identity.documentType,
    ...studentBillingContactSchema.parse(row),
  };
}
export const invoiceFiscalSchema = z.object({
  documentType: z.enum(["13", "22", "12", "41"]),
  personType: z.literal("2"),
  countryCode: z.literal("CO"),
  departmentCode: z.string().regex(/^\d{2}$/),
  cityCode: z.string(),
  address: z.string(),
  phone: z.string(),
  responsibilities: z.string(),
  taxRegime: z.string(),
  taxScheme: z.literal("ZZ"),
});
export const invoiceCustomerFiscalSchema = invoiceFiscalSchema.extend({
  taxRegime: z.enum(["ordinario", "simple", "especial"]),
  responsibilities: z.string().trim().min(1).max(30),
  taxScheme: z.enum(["01", "04", "ZA", "ZZ"]),
});
export function getQuotedCustomerIssues(customer: {
  name: string;
  document: string;
  documentType: string;
  email: string;
  fiscal?: unknown;
}): InvoiceDataIssue[] {
  const parsed = invoiceCustomerFiscalSchema.safeParse(customer.fiscal);
  if (!parsed.success) {
    return parsed.error.issues.map((issue) => {
      const field = issue.path.length
        ? `student.fiscal.${String(issue.path[0])}`
        : "student.fiscal.countryCode";
      return {
        field,
        message: `La revision no contiene ${INVOICE_FIELD_LABELS[field]?.toLowerCase() ?? "el perfil fiscal completo"}.`,
      };
    });
  }
  const fiscal = parsed.data;
  const municipality = COLOMBIA_MUNICIPALITIES[fiscal.cityCode];
  const identity = identitySchema.safeParse(customer);
  const contact = z
    .object({
      email: studentBillingContactSchema.shape.email,
      telefono: studentBillingContactSchema.shape.telefono,
      direccion: studentBillingContactSchema.shape.direccion,
      ciudad: z.string().min(1),
    })
    .safeParse({
      email: customer.email,
      telefono: fiscal.phone,
      direccion: fiscal.address,
      ciudad: municipality?.[0] ?? "",
    });
  const issues = [
    ...mapValidationIssues([
      ...(identity.success ? [] : identity.error.issues),
      ...(contact.success ? [] : contact.error.issues),
    ]).values(),
  ];
  const mappedDocument = (
    { CC: "13", CE: "22", TI: "12", PP: "41", PAS: "41" } as Record<string, string>
  )[customer.documentType];
  if (fiscal.documentType !== mappedDocument)
    issues.push({
      field: "student.fiscal.documentType",
      message: "El tipo fiscal de documento no coincide con la identificacion.",
    });
  if (fiscal.departmentCode !== fiscal.cityCode.slice(0, 2))
    issues.push({
      field: "student.fiscal.departmentCode",
      message: "El departamento de la revision no corresponde al municipio.",
    });
  const responsibilities = fiscal.responsibilities.split(";");
  if (responsibilities.some((code) => !["R-99-PN", "O-13", "O-15", "O-23", "O-47"].includes(code)))
    issues.push({
      field: "student.fiscal.responsibilities",
      message: "Revisa las responsabilidades fiscales de la revision.",
    });
  if ((fiscal.taxRegime === "simple") !== responsibilities.includes("O-47"))
    issues.push({
      field: "student.fiscal.taxRegime",
      message: "El regimen y las responsabilidades de la revision no coinciden.",
    });
  return issues;
}
