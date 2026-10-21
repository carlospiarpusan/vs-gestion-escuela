import { z } from "zod";
import { VS_BILLING_SCHOOL } from "./scope";
import { getTodayDateString, isValidDateOnly } from "@/lib/date-utils";
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
const accountCode = z.string().regex(/^11\d{0,10}$/);
export const invoiceCollectionChoiceSchema = z.discriminatedUnion("state", [
  z.object({ state: z.literal("pending") }).strict(),
  z
    .object({
      state: z.literal("received"),
      confirmed: z.literal(true),
      cashAccountCode: accountCode.optional(),
    })
    .strict(),
]);
const reviewedCollectionSchema = z.discriminatedUnion("state", [
  z.object({ state: z.literal("pending") }).strict(),
  z
    .object({
      state: z.literal("received"),
      confirmed: z.literal(true),
      cashAccountCode: accountCode,
      date: z.iso.date(),
      amount: z.number().int().positive().max(1_000_000_000_000),
    })
    .strict(),
]);
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
  capabilities: z
    .object({
      paymentCollection: z.boolean().optional(),
      accountingPreflight: z.boolean().optional(),
      businessStatus: z.boolean().optional(),
    })
    .optional(),
  collectionAccounts: z
    .array(z.object({ code: accountCode, name: z.string().min(1).max(200) }))
    .max(10000)
    .optional(),
  defaultCollectionAccounts: z
    .array(z.object({ method: z.string().min(1).max(200), accountCode }))
    .max(100)
    .optional(),
  canConfirmCollections: z.boolean().optional(),
  accounting: z.object({ ready: z.boolean(), issues: invoiceDataIssuesSchema }).optional(),
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
        collection: invoiceCollectionChoiceSchema.optional(),
      })
      .strict()
      .refine(
        (payment) => payment.condition !== "credito" || payment.collection?.state !== "received",
        {
          path: ["collection"],
          message: "Los abonos a crédito se registran desde Cartera en FacturaX.",
        }
      ),
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
  payment: z
    .object({
      method: z.string().min(1).max(200),
      condition: z.enum(["contado", "credito"]),
      dueDate: z.iso.date(),
      collection: reviewedCollectionSchema.optional(),
    })
    .strict(),
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
    business: z
      .object({
        accounting: z.object({
          state: z.enum(["pending", "posted", "not_required"]),
          journalReference: z.string().max(200).nullable(),
          issue: z.string().max(2000).nullable(),
        }),
        collection: z.object({
          state: z.enum(["unregistered", "pending", "partial", "paid", "not_required"]),
          balance: cents.nullable(),
          paid: cents.nullable(),
          issue: z.string().max(2000).nullable(),
          receipts: z
            .array(
              z.object({
                reference: z.string().max(200),
                amount: cents,
                receivedOn: z.string().max(80),
                recordedOn: z.string().max(80),
              })
            )
            .max(10000),
        }),
      })
      .optional(),
  })
  .refine((s) => s.state !== "accepted" || !!(s.number && s.documentId && s.cufe));
export type FacturaxCatalog = z.infer<typeof facturaxCatalogSchema>;
export type FacturaxQuote = z.infer<typeof facturaxQuoteSchema>;
export type FacturaxStatus = z.infer<typeof facturaxStatusSchema>;
export function invoiceQuotePaymentIssue(
  quote: FacturaxQuote,
  selected?: z.infer<typeof facturaxSelectionSchema>["payment"]
) {
  const payment = quote.payment;
  const received = payment.collection?.state === "received" ? payment.collection : null;
  if (
    received &&
    (payment.condition !== "contado" ||
      received.amount !== quote.totals.total ||
      received.date !== payment.dueDate)
  )
    return "El recaudo revisado no coincide con la forma de pago o el total de la factura.";
  if (selected && !selected.collection && received)
    return "La revisión confirma un recaudo que no autorizaste. Actualiza el catálogo y revisa nuevamente.";
  if (
    selected &&
    (selected.method !== payment.method ||
      selected.condition !== payment.condition ||
      selected.dueDate !== payment.dueDate)
  )
    return "FacturaX devolvió datos de pago distintos a los seleccionados. Revisa nuevamente.";
  if (selected?.collection && selected.collection.state !== payment.collection?.state)
    return "FacturaX no confirmó la elección de recaudo. Actualiza el catálogo y revisa nuevamente.";
  if (
    selected?.collection?.state === "received" &&
    selected.collection.cashAccountCode &&
    received?.cashAccountCode !== selected.collection.cashAccountCode
  )
    return "La cuenta receptora de la revisión no coincide con la seleccionada.";
  return null;
}
export function invoiceCollectionIssues(
  catalog: FacturaxCatalog,
  payment: z.infer<typeof facturaxSelectionSchema>["payment"]
) {
  const issues: { field: string; message: string }[] = [];
  if (catalog.capabilities?.accountingPreflight && catalog.accounting?.ready !== true)
    issues.push(
      ...(catalog.accounting?.issues.length
        ? catalog.accounting.issues
        : [
            {
              field: "accounting.configuration",
              message: "Completa la configuración contable en FacturaX antes de emitir.",
            },
          ])
    );
  if (!catalog.capabilities?.paymentCollection) {
    if (payment.collection)
      issues.push({
        field: "payment.collection",
        message:
          "FacturaX aún no admite confirmar recaudos por esta conexión. Actualiza el catálogo.",
      });
    return issues;
  }
  const choice = payment.collection;
  if (!choice)
    issues.push({
      field: "payment.collection",
      message: "Selecciona si el pago está pendiente o fue recibido.",
    });
  else if (choice.state === "received") {
    if (payment.method === "Instrumento no definido")
      issues.push({
        field: "payment.method",
        message: "Selecciona el medio de pago efectivamente recibido.",
      });
    if (payment.condition === "credito")
      issues.push({
        field: "payment.collection",
        message: "Registra los abonos a crédito desde Cartera en FacturaX.",
      });
    if (catalog.canConfirmCollections !== true)
      issues.push({
        field: "payment.collection",
        message:
          "El responsable de la conexión no tiene permiso para confirmar recaudos en FacturaX.",
      });
    const fallback =
      catalog.defaultCollectionAccounts?.filter((entry) => entry.method === payment.method) ?? [];
    const code = choice.cashAccountCode || (fallback.length === 1 ? fallback[0].accountCode : "");
    if (!code || catalog.collectionAccounts?.filter((entry) => entry.code === code).length !== 1)
      issues.push({
        field: "payment.collection.cashAccountCode",
        message: "Selecciona una cuenta receptora válida de FacturaX.",
      });
  }
  return issues;
}
export function invoicePaymentDateIssue(
  payment: z.infer<typeof facturaxSelectionSchema>["payment"],
  today = getTodayDateString()
) {
  if (!isValidDateOnly(payment.dueDate)) return "Selecciona una fecha de vencimiento válida.";
  if (payment.condition === "contado" && payment.dueDate !== today)
    return "La factura de contado debe vencer en la fecha de emisión de Bogotá.";
  if (payment.condition === "credito" && payment.dueDate < today)
    return "El vencimiento a crédito no puede ser anterior a la fecha de emisión de Bogotá.";
  return null;
}
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
