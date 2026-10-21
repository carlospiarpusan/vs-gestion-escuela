import { NextResponse } from "next/server";
import { z } from "zod";
import { readAnsvSnapshot } from "@/lib/ansv";
import { extractDateOnly } from "@/lib/date-utils";
import { resolveInvoiceAnsv } from "@/lib/vs-billing/invoice-ansv";
import { normalizeStoredCourseCategories } from "@/lib/course-categories";
import {
  authorizeInvoiceStaff,
  CONNECTION_HEADERS,
  connectionError,
} from "@/lib/vs-billing/access";
import {
  facturaxConfigured,
  FacturaxError,
  facturaxRequest,
} from "@/lib/vs-billing/facturax-client";
import {
  facturaxCatalogSchema,
  facturaxQuoteSchema,
  facturaxSelectionSchema,
  invoiceStudent,
  invoicePaymentDateIssue,
  invoiceCollectionIssues,
  invoiceQuotePaymentIssue,
} from "@/lib/vs-billing/facturax-contract";
import {
  contractInvoices,
  discardInvoicePreparation,
  emitContractInvoice,
  invoiceContract,
  syncContractInvoice,
  invoiceContact,
  addInvoiceContactEmail,
  invoiceContactView,
  saveInvoiceBillingContact,
} from "@/lib/vs-billing/contract-invoices";
import { rateLimit } from "@/lib/rate-limit";
import { ensureSedeScope } from "@/lib/api-auth";
import { studentContactEmailSchema } from "@/lib/student-contact-email";
import { studentBillingContactSchema } from "@/lib/student-billing-contact";
import {
  getStudentInvoiceIssues,
  InvoiceDataIncompleteError,
} from "@/lib/vs-billing/student-invoice-data";

export const runtime = "nodejs";
export const maxDuration = 60;
const ids = { alumnoId: z.uuid(), contratoId: z.uuid() };
const command = z.discriminatedUnion("action", [
  z
    .object({
      action: z.literal("billing_contact"),
      alumnoId: z.uuid(),
      contact: studentBillingContactSchema.strict(),
      version: z.string().regex(/^[a-f0-9]{64}$/),
    })
    .strict(),
  z
    .object({
      action: z.literal("contact_email"),
      alumnoId: z.uuid(),
      email: studentContactEmailSchema,
    })
    .strict(),
  z.object({ action: z.literal("catalog"), ...ids }).strict(),
  z.object({ action: z.literal("quote"), ...ids, ...facturaxSelectionSchema.shape }).strict(),
  z
    .object({ action: z.literal("emit"), ...ids, requestId: z.uuid(), confirmed: z.literal(true) })
    .strict(),
  z.object({ action: z.literal("refresh"), ...ids }).strict(),
  z.object({ action: z.literal("discard"), ...ids, confirmed: z.literal(true) }).strict(),
  z.object({ action: z.literal("email"), ...ids, confirmed: z.literal(true) }).strict(),
]);
const json = (data: unknown) => NextResponse.json(data, { headers: CONNECTION_HEADERS });
function failure(error: unknown) {
  if (error instanceof InvoiceDataIncompleteError)
    return NextResponse.json(
      {
        error: error.message,
        code: error.code,
        issues: error.issues,
        missingFields: error.issues.map((issue) => issue.field),
      },
      { status: error.status, headers: CONNECTION_HEADERS }
    );
  if (error instanceof FacturaxError) return connectionError(error.message, error.status);
  if (error instanceof z.ZodError || error instanceof SyntaxError)
    return connectionError("Datos de facturacion no validos.", 400);
  return connectionError(
    "No se pudo completar la operacion de FacturaX. Consulta el estado antes de volver a emitir.",
    503
  );
}
async function readCommand(request: Request) {
  if (!request.headers.get("content-type")?.startsWith("application/json"))
    throw new FacturaxError("Se requiere JSON.", 415);
  const reader = request.body?.getReader();
  if (!reader) throw new FacturaxError("Solicitud vacia.", 400);
  let bytes = 0;
  const chunks: Uint8Array[] = [];
  try {
    while (true) {
      const { value, done } = await reader.read();
      if (done) break;
      bytes += value.byteLength;
      if (bytes > 32768) {
        await reader.cancel();
        throw new FacturaxError("Solicitud demasiado grande.", 413);
      }
      chunks.push(value);
    }
  } finally {
    reader.releaseLock();
  }
  return command.parse(JSON.parse(Buffer.concat(chunks).toString("utf8")));
}
export async function GET(request: Request) {
  try {
    const auth = await authorizeInvoiceStaff(request);
    if (!auth.ok) return auth.response;
    if (!facturaxConfigured()) return json({ enabled: false, invoices: [] });
    const alumnoId = z.uuid().parse(new URL(request.url).searchParams.get("alumnoId"));
    const contact = await invoiceContact(alumnoId);
    if (ensureSedeScope(auth.perfil, contact.sede_id))
      return connectionError("Alumno fuera de tu sede.", 403);
    const sedeId = ["super_admin", "admin_escuela"].includes(auth.perfil.rol)
      ? null
      : auth.perfil.sede_id;
    return json({
      enabled: true,
      email: contact.email,
      contact: invoiceContactView(contact),
      issues: getStudentInvoiceIssues(contact),
      invoices: await contractInvoices(alumnoId, sedeId),
    });
  } catch (error) {
    return failure(error);
  }
}
export async function POST(request: Request) {
  try {
    const auth = await authorizeInvoiceStaff(request);
    if (!auth.ok) return auth.response;
    if (!facturaxConfigured())
      throw new FacturaxError("Falta activar la conexion de emision con FacturaX.");
    const allowed = await rateLimit(`facturax-invoice:${auth.perfil.id}`, 30, 60_000);
    if (!allowed.ok) return connectionError("Demasiadas solicitudes. Espera un minuto.", 429);
    const input = await readCommand(request);
    if (input.action === "billing_contact") {
      const contact = await invoiceContact(input.alumnoId);
      if (ensureSedeScope(auth.perfil, contact.sede_id))
        return connectionError("Alumno fuera de tu sede.", 403);
      const updated = await saveInvoiceBillingContact(
        input.alumnoId,
        input.contact,
        input.version,
        contact.sede_id
      );
      return json({
        contact: updated,
        email: updated.email,
        issues: getStudentInvoiceIssues(updated),
      });
    }
    if (input.action === "contact_email") {
      const contact = await invoiceContact(input.alumnoId);
      if (ensureSedeScope(auth.perfil, contact.sede_id))
        return connectionError("Alumno fuera de tu sede.", 403);
      return json(await addInvoiceContactEmail(input.alumnoId, input.email));
    }
    const student = await invoiceContract(input.alumnoId, input.contratoId);
    if (ensureSedeScope(auth.perfil, student.sede_id))
      return connectionError("Contrato fuera de tu sede.", 403);
    if (input.action === "discard")
      return json(await discardInvoicePreparation(input.alumnoId, input.contratoId));
    if (input.action === "refresh" || input.action === "email")
      return json(await syncContractInvoice(input.alumnoId, input.contratoId, input.action));
    if (student.estado === "cancelado" || student.alumno_estado === "inactivo")
      throw new FacturaxError(
        "No se puede emitir para un alumno inactivo o contrato cancelado.",
        409
      );
    const invoiceData = invoiceStudent(student);
    if (input.action === "catalog") {
      const catalog = await facturaxRequest(facturaxCatalogSchema, {
        action: "catalog",
        student: invoiceData,
      });
      const ansvContext = {
        fechaNacimiento: extractDateOnly(student.fecha_nacimiento) ?? "",
        sexo: student.sexo ?? "",
        fechaMatricula: extractDateOnly(student.fecha_inscripcion) ?? "",
        categorias: normalizeStoredCourseCategories(student.categorias),
      };
      const ansv = resolveInvoiceAnsv(student.ansv, ansvContext);
      return json({
        ...catalog,
        ansv: ansv.snapshot,
        ansvContext: readAnsvSnapshot(student.ansv) ? null : ansvContext,
        contractCategories: normalizeStoredCourseCategories(student.categorias),
      });
    }
    if (input.action === "quote") {
      const paymentIssue = invoicePaymentDateIssue(input.payment);
      if (paymentIssue) throw new FacturaxError(paymentIssue, 400);
      if ((await contractInvoices(input.alumnoId)).some((i) => i.contratoId === input.contratoId))
        throw new FacturaxError("Este contrato ya tiene una solicitud. Consulta su estado.", 409);
      const catalog = await facturaxRequest(facturaxCatalogSchema, {
        action: "catalog",
        student: invoiceData,
      });
      const collectionIssues = invoiceCollectionIssues(catalog, input.payment);
      if (collectionIssues.length)
        throw new InvoiceDataIncompleteError(
          collectionIssues,
          collectionIssues.map((issue) => issue.message).join(" ")
        );
      const quote = await facturaxRequest(facturaxQuoteSchema, {
        action: "quote",
        student: invoiceData,
        items: input.items,
        payment: input.payment,
        delivery: input.delivery,
      });
      if (quote.studentId !== input.alumnoId)
        throw new FacturaxError("La respuesta no corresponde al alumno.");
      const quotePaymentIssue = invoiceQuotePaymentIssue(quote, input.payment);
      if (quotePaymentIssue) throw new FacturaxError(quotePaymentIssue, 409);
      return json(quote);
    }
    return json(
      await emitContractInvoice(input.alumnoId, input.contratoId, input.requestId, auth.perfil.id)
    );
  } catch (error) {
    return failure(error);
  }
}
