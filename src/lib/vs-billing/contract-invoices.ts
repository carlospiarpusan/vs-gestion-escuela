import "server-only";
import { createHash } from "node:crypto";
import { z } from "zod";
import { getServerDbPool } from "@/lib/server-db";
import { revalidateServerReadCache } from "@/lib/server-read-cache";
import { VS_BILLING_SCHOOL } from "./scope";
import {
  assertInvoiceIdentity,
  quoteMatchesStudent,
  invoiceQuotePaymentIssue,
  facturaxStatusSchema,
  type ContractInvoice,
  type FacturaxStatus,
} from "./facturax-contract";
import { FacturaxError, facturaxRequest } from "./facturax-client";
import { studentContactEmailSchema, hasStudentContactEmail } from "@/lib/student-contact-email";
import { studentBillingContactSchema } from "@/lib/student-billing-contact";
import {
  getQuotedCustomerIssues,
  InvoiceDataIncompleteError,
  type InvoiceStudentContact,
} from "./student-invoice-data";
import { invoiceStudent } from "./facturax-contract";

const CONTACT_COLUMNS =
  "id,nombre,apellidos,dni,tipo_documento,email,telefono,direccion,ciudad,departamento,datos_facturacion,sede_id";
type ContactRow = InvoiceStudentContact & { sede_id: string };
function storedContact(row: InvoiceStudentContact) {
  return {
    email: row.email,
    telefono: row.telefono ?? null,
    direccion: row.direccion ?? null,
    ciudad: row.ciudad ?? null,
    departamento: row.departamento ?? null,
    datos_facturacion: row.datos_facturacion ?? null,
  };
}
export function invoiceContactView(row: InvoiceStudentContact) {
  const contact = {
    id: row.id,
    nombre: row.nombre,
    apellidos: row.apellidos,
    dni: row.dni,
    tipo_documento: row.tipo_documento,
    ...storedContact(row),
  };
  return {
    ...contact,
    version: createHash("sha256").update(JSON.stringify(contact)).digest("hex"),
  };
}

export async function invoiceContact(studentId: string) {
  const row = (
    await getServerDbPool().query<ContactRow>(
      `select ${CONTACT_COLUMNS} from public.alumnos where id=$1 and escuela_id=$2`,
      [studentId, VS_BILLING_SCHOOL.id]
    )
  ).rows[0];
  if (!row) throw new FacturaxError("Alumno no encontrado en esta escuela.", 404);
  return row;
}

export async function saveInvoiceBillingContact(
  studentId: string,
  input: z.infer<typeof studentBillingContactSchema>,
  version: string,
  expectedSede: string
) {
  const contact = studentBillingContactSchema.strict().parse(input);
  const current = await invoiceContact(studentId);
  if (current.sede_id !== expectedSede || invoiceContactView(current).version !== version)
    throw new FacturaxError("La ficha cambio. Recarga los datos antes de guardar.", 409);
  const row = (
    await getServerDbPool().query<ContactRow>(
      `update public.alumnos set email=$1,telefono=$2,direccion=$3,ciudad=$4,departamento=$5,datos_facturacion=$6::jsonb
     where id=$7 and escuela_id=$8 and sede_id is not distinct from $9
       and jsonb_build_object('email',email,'telefono',telefono,'direccion',direccion,'ciudad',ciudad,
           'departamento',departamento,'datos_facturacion',datos_facturacion)=$10::jsonb
       and nombre is not distinct from $11 and apellidos is not distinct from $12
       and dni is not distinct from $13 and tipo_documento is not distinct from $14
     returning ${CONTACT_COLUMNS}`,
      [
        contact.email,
        contact.telefono,
        contact.direccion,
        contact.ciudad,
        contact.departamento,
        contact.datos_facturacion,
        studentId,
        VS_BILLING_SCHOOL.id,
        expectedSede,
        storedContact(current),
        current.nombre,
        current.apellidos,
        current.dni,
        current.tipo_documento,
      ]
    )
  ).rows[0];
  if (!row) throw new FacturaxError("La ficha cambio. Recarga los datos antes de guardar.", 409);
  revalidateServerReadCache(`scope:school:${VS_BILLING_SCHOOL.id}`);
  return invoiceContactView(row);
}

export async function addInvoiceContactEmail(studentId: string, email: string) {
  const normalized = studentContactEmailSchema.parse(email);
  const row = (
    await getServerDbPool().query<{ email: string }>(
      `update public.alumnos set email=$1
     where id=$2 and escuela_id=$3
       and (email is null or btrim(email)='' or lower(btrim(email)) like '%.local')
     returning email`,
      [normalized, studentId, VS_BILLING_SCHOOL.id]
    )
  ).rows[0];
  if (!row) {
    const current = await invoiceContact(studentId);
    if (current.email?.trim().toLowerCase() !== normalized)
      throw new FacturaxError(
        "El alumno ya tiene un correo guardado. Actualiza su ficha para cambiarlo.",
        409
      );
  }
  revalidateServerReadCache(`scope:school:${VS_BILLING_SCHOOL.id}`);
  return { email: normalized };
}

export async function invoiceContract(studentId: string, contractId: string) {
  const row = (
    await getServerDbPool().query<{
      id: string;
      nombre: string;
      apellidos: string;
      dni: string;
      tipo_documento: string | null;
      email: string | null;
      contrato_id: string;
      estado: string;
      alumno_estado: string;
      sede_id: string;
      telefono: string;
      direccion: string | null;
      ciudad: string | null;
      departamento: string | null;
      datos_facturacion: unknown;
      ansv: unknown;
      categorias: string[];
      fecha_nacimiento: string | Date | null;
      sexo: string | null;
      fecha_inscripcion: string | Date | null;
    }>(
      `select a.id,a.nombre,a.apellidos,a.dni,a.tipo_documento,a.email,a.estado as alumno_estado,
        m.id as contrato_id,m.estado,m.sede_id,
        a.telefono,a.direccion,a.ciudad,a.departamento,a.datos_facturacion,m.ansv,m.categorias,
        a.fecha_nacimiento,a.sexo,m.fecha_inscripcion
      from public.alumnos a join public.matriculas_alumno m on m.alumno_id=a.id and m.escuela_id=a.escuela_id
      where a.id=$1 and m.id=$2 and a.escuela_id=$3`,
      [studentId, contractId, VS_BILLING_SCHOOL.id]
    )
  ).rows[0];
  if (!row) throw new FacturaxError("Contrato no encontrado en esta escuela.", 404);
  return row;
}
export async function contractInvoices(
  studentId: string,
  sedeId: string | null = null
): Promise<ContractInvoice[]> {
  const rows = (
    await getServerDbPool().query<{
      contrato_id: string;
      request_id: string;
      last_status: unknown;
    }>(
      `select contrato_id,request_id,last_status from public.facturax_contract_invoices i
       where escuela_id=$1 and alumno_id=$2 and ($3::uuid is null or exists (
         select 1 from public.matriculas_alumno m where m.id=i.contrato_id and m.escuela_id=i.escuela_id and m.sede_id=$3))`,
      [VS_BILLING_SCHOOL.id, studentId, sedeId]
    )
  ).rows;
  return rows.map((row) => ({
    contratoId: row.contrato_id,
    requestId: row.request_id,
    status: row.last_status ? facturaxStatusSchema.parse(row.last_status) : null,
  }));
}
export async function syncContractInvoice(
  studentId: string,
  contractId: string,
  action: "status" | "refresh" | "email" = "status"
) {
  const saved = (await contractInvoices(studentId)).find((i) => i.contratoId === contractId);
  if (!saved) throw new FacturaxError("Este contrato no tiene una solicitud de factura.", 404);
  const result = await facturaxRequest(
    facturaxStatusSchema,
    action === "email"
      ? { action, id: saved.requestId, confirmed: true }
      : { action, id: saved.requestId },
    action === "status" ? saved.requestId : undefined
  );
  return saveInvoiceStatus(studentId, contractId, saved.requestId, result);
}
async function saveInvoiceStatus(
  studentId: string,
  contractId: string,
  requestId: string,
  result: FacturaxStatus
) {
  assertInvoiceIdentity(result, requestId, studentId);
  const updated = await getServerDbPool().query<{ last_status: unknown }>(
    `update public.facturax_contract_invoices set last_status=$1,updated_at=now()
    where escuela_id=$2 and alumno_id=$3 and contrato_id=$4 and request_id=$5
    and (last_status is null or (
      (last_status->>'documentId' is null or $1::jsonb->>'documentId'=last_status->>'documentId')
      and (last_status->>'state'<>'accepted' or $1::jsonb->>'state'='accepted')
      and (last_status->>'emailState' is distinct from 'sent' or $1::jsonb->>'emailState'='sent')
    )) returning last_status`,
    [result, VS_BILLING_SCHOOL.id, studentId, contractId, requestId]
  );
  const persisted =
    updated.rows[0]?.last_status ??
    (
      await getServerDbPool().query<{ last_status: unknown }>(
        `select last_status from public.facturax_contract_invoices
       where escuela_id=$1 and alumno_id=$2 and contrato_id=$3 and request_id=$4`,
        [VS_BILLING_SCHOOL.id, studentId, contractId, requestId]
      )
    ).rows[0]?.last_status;
  if (!persisted)
    throw new FacturaxError(
      "No se pudo confirmar el estado guardado. Consulta la solicitud antes de volver a emitir.",
      409
    );
  const status = facturaxStatusSchema.parse(persisted);
  assertInvoiceIdentity(status, requestId, studentId);
  revalidateServerReadCache(`scope:school:${VS_BILLING_SCHOOL.id}`);
  return { contratoId: contractId, requestId, status };
}
export async function emitContractInvoice(
  studentId: string,
  contractId: string,
  requestId: string,
  actorId: string
) {
  const currentStudent = invoiceStudent(await invoiceContract(studentId, contractId));
  const remote = await facturaxRequest(facturaxStatusSchema, null, requestId);
  assertInvoiceIdentity(remote, requestId, studentId);
  if (remote.state === "quoted" && !hasStudentContactEmail(remote.quote?.customer.email))
    throw new FacturaxError(
      "Agrega el correo del alumno y prepara una nueva revision antes de emitir.",
      409
    );
  if (remote.state === "quoted") {
    if (remote.quote) {
      const paymentIssue = invoiceQuotePaymentIssue(remote.quote);
      if (paymentIssue) throw new FacturaxError(paymentIssue, 409);
    }
    const customer = remote.quote?.customer;
    const issues = customer
      ? getQuotedCustomerIssues(customer)
      : [{ field: "student.name", message: "Falta el cliente de la revision." }];
    if (!remote.quote?.sourceStudent)
      issues.push({
        field: "student.name",
        message:
          "La revision no conserva los datos originales del alumno. Genera una nueva revision.",
      });
    if (issues.length)
      throw new InvoiceDataIncompleteError(
        issues,
        "Completa los datos y prepara una nueva revision antes de emitir."
      );
    if (!remote.quote || !quoteMatchesStudent(remote.quote, currentStudent))
      throw new FacturaxError(
        "Los datos del alumno cambiaron. Prepara una nueva revision antes de emitir.",
        409
      );
  }
  const existing = (await contractInvoices(studentId)).find((i) => i.contratoId === contractId);
  if (existing && existing.requestId !== requestId)
    throw new FacturaxError("Ya hay una solicitud para este contrato. Consulta su estado.", 409);
  if (!existing) {
    if (remote.state !== "quoted")
      throw new FacturaxError(
        "Esta solicitud ya fue emitida. Revisa su asociacion en FacturaX.",
        409
      );
    // Reserve before the network mutation. Concurrent tabs cannot create different invoices for one contract.
    await getServerDbPool().query(
      `insert into public.facturax_contract_invoices(contrato_id,escuela_id,alumno_id,request_id,created_by)
      values($1,$2,$3,$4,$5) on conflict do nothing`,
      [contractId, VS_BILLING_SCHOOL.id, studentId, requestId, actorId]
    );
    const reservation = (await contractInvoices(studentId)).find(
      (i) => i.contratoId === contractId
    );
    if (reservation?.requestId !== requestId)
      throw new FacturaxError(
        "La solicitud ya esta asociada o este contrato tiene otra factura.",
        409
      );
  }
  const result = await facturaxRequest(facturaxStatusSchema, {
    action: "emit",
    id: requestId,
    studentId,
    confirmProduction: true,
  });
  return saveInvoiceStatus(studentId, contractId, requestId, result);
}

export async function discardInvoicePreparation(studentId: string, contractId: string) {
  const saved = (await contractInvoices(studentId)).find((i) => i.contratoId === contractId);
  if (!saved) throw new FacturaxError("No hay una preparacion pendiente.", 404);
  const result = await facturaxRequest(z.object({ id: z.uuid(), cancelled: z.literal(true) }), {
    action: "cancel",
    id: saved.requestId,
    studentId,
    confirmed: true,
  });
  if (result.id !== saved.requestId) throw new FacturaxError("Respuesta de descarte no valida.");
  await getServerDbPool().query(
    "delete from public.facturax_contract_invoices where escuela_id=$1 and alumno_id=$2 and contrato_id=$3 and request_id=$4",
    [VS_BILLING_SCHOOL.id, studentId, contractId, saved.requestId]
  );
  return { cancelled: true };
}
