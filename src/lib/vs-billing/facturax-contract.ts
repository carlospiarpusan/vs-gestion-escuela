import { z } from "zod";
import { VS_BILLING_SCHOOL } from "./scope";
import {
  assertStudentInvoiceData,
  invoiceFiscalSchema,
  invoiceCustomerFiscalSchema,
  invoiceDataIssuesSchema,
} from "./student-invoice-data";

const identity = { schemaVersion: z.literal(1), issuerNit: z.literal(VS_BILLING_SCHOOL.nit) };
const cents = z.number().int().min(0).max(Number.MAX_SAFE_INTEGER);
const customer = z.object({
  name: z.string().max(200),
  document: z.string().max(24),
  documentType: z.string().max(20),
  email: z.string().max(254),
  fiscal: invoiceCustomerFiscalSchema.partial().optional(),
});
const sourceStudent = customer.extend({ id: z.uuid(), fiscal: invoiceFiscalSchema });
export const facturaxCatalogSchema = z.object({
  ...identity,
  products: z
    .array(
      z.object({
        id: z.uuid(),
        name: z.string().max(200),
        code: z.string().max(100),
        price: cents,
        tax: z.union([z.literal(0), z.literal(5), z.literal(19)]),
        taxTreatment: z.string().max(30),
        available: z.boolean(),
        priceEditable: z.boolean().optional(),
        requiresTaxChoice: z.boolean().optional(),
      })
    )
    .max(10000),
  paymentMethods: z.array(z.string().min(1).max(200)).min(1).max(100),
  customer: customer.nullable(),
  customerIssue: z.string().max(2000).nullable(),
  customerIssues: invoiceDataIssuesSchema.optional(),
});
export const facturaxSelectionSchema = z
  .object({
    items: z
      .array(
        z
          .object({
            productId: z.uuid(),
            // FacturaX uses thousandths: only multiples of 1000 represent whole units.
            quantity: z.number().int().min(1000).max(1_000_000).multipleOf(1000),
            unitPrice: z.number().int().min(1).max(100_000_000_000).optional(),
            taxChoice: z.enum(["19", "5", "excluded", "exempt"]).optional(),
          })
          .strict()
      )
      .min(1)
      .max(100)
      .refine((items) => new Set(items.map((i) => i.productId)).size === items.length),
    payment: z
      .object({
        method: z.string().min(1).max(200),
        condition: z.enum(["contado", "credito"]),
        dueDate: z.iso.date(),
      })
      .strict(),
    delivery: z.enum(["email", "physical"]),
  })
  .strict();
export const facturaxQuoteSchema = z.object({
  ...identity,
  id: z.uuid(),
  studentId: z.uuid(),
  expiresAt: z.iso.datetime(),
  customer,
  sourceStudent: sourceStudent.optional(),
  lines: z
    .array(
      z.object({
        description: z.string().max(200),
        quantity: z.number().int().min(1),
        price: cents,
        tax: z.number(),
        taxTreatment: z.string(),
      })
    )
    .min(1)
    .max(100),
  totals: z.object({ subtotal: cents, vat: cents, total: cents }),
  payment: facturaxSelectionSchema.shape.payment,
  delivery: z.enum(["email", "physical"]),
});
export const facturaxStatusSchema = z
  .object({
    ...identity,
    id: z.uuid(),
    studentId: z.uuid(),
    state: z.enum([
      "quoted",
      "prepared",
      "sending",
      "queued",
      "unknown",
      "accepted",
      "rejected",
      "contingency",
    ]),
    number: z.string().min(1).max(100).nullable(),
    documentId: z.uuid().nullable(),
    cufe: z.string().max(200).nullable(),
    emailState: z.enum(["queued", "sending", "sent", "unknown", "failed"]).nullable(),
    quote: facturaxQuoteSchema.nullable(),
  })
  .refine((s) => s.state !== "accepted" || !!(s.number && s.documentId && s.cufe));
export type FacturaxCatalog = z.infer<typeof facturaxCatalogSchema>;
export type FacturaxQuote = z.infer<typeof facturaxQuoteSchema>;
export type FacturaxStatus = z.infer<typeof facturaxStatusSchema>;
export type ContractInvoice = {
  contratoId: string;
  requestId: string;
  status: FacturaxStatus | null;
};
export const INVOICE_STATES: Record<FacturaxStatus["state"], string> = {
  quoted: "Pendiente de emitir",
  prepared: "Firmada, pendiente de envio",
  sending: "Enviando a DIAN",
  queued: "En proceso DIAN",
  unknown: "Resultado por confirmar",
  accepted: "Validada por DIAN",
  rejected: "Rechazada por DIAN",
  contingency: "Contingencia, pendiente de validacion",
};

export function invoiceStudent(row: {
  id: string;
  nombre: string;
  apellidos: string;
  dni: string;
  tipo_documento: string | null;
  email: string | null;
  datos_facturacion?: unknown;
  telefono?: string | null;
  direccion?: string | null;
  ciudad?: string | null;
  departamento?: string | null;
}) {
  const contact = assertStudentInvoiceData(row);
  const documentType = contact.tipo_documento === "PAS" ? "PP" : contact.tipo_documento;
  // Explicit allowlist: never spread an Alumno or Matricula into an API request.
  return {
    id: row.id,
    name: `${contact.nombre} ${contact.apellidos}`.trim(),
    document: contact.dni,
    documentType,
    email: contact.email,
    fiscal: {
      documentType: ({ CC: "13", CE: "22", PP: "41", TI: "12" } as Record<string, string>)[
        documentType
      ],
      personType: contact.datos_facturacion.personType,
      countryCode: contact.datos_facturacion.country,
      departmentCode: contact.datos_facturacion.cityCode.slice(0, 2),
      address: contact.direccion,
      cityCode: contact.datos_facturacion.cityCode,
      phone: contact.telefono,
      responsibilities: contact.datos_facturacion.responsibilities,
      taxRegime: contact.datos_facturacion.taxRegime,
      taxScheme: contact.datos_facturacion.taxScheme,
    },
  };
}

export function assertInvoiceIdentity(
  status: FacturaxStatus,
  requestId: string,
  studentId: string
) {
  if (status.id !== requestId || status.studentId !== studentId)
    throw new Error("FacturaX devolvio una solicitud de otro alumno.");
}
export function quoteMatchesStudent(
  quote: FacturaxQuote,
  current: ReturnType<typeof invoiceStudent>
) {
  const source = quote.sourceStudent;
  const keys = ["name", "document", "documentType", "email"] as const;
  return (
    !!source &&
    source.id === current.id &&
    keys.every((key) => source[key] === current[key] && quote.customer[key] === current[key]) &&
    Object.entries(current.fiscal).every(
      ([key, value]) => source.fiscal[key as keyof typeof current.fiscal] === value
    )
  );
}
