// @vitest-environment node
import { readFileSync } from "node:fs";
import { PGlite } from "@electric-sql/pglite";
import { afterAll, beforeAll, beforeEach, describe, expect, it, vi } from "vitest";
import {
  contractInvoices,
  discardInvoicePreparation,
  emitContractInvoice,
  invoiceContract,
  syncContractInvoice,
  addInvoiceContactEmail,
  invoiceContact,
  invoiceContactView,
  saveInvoiceBillingContact,
} from "./contract-invoices";
import { facturaxSelectionSchema, invoiceStudent, type FacturaxStatus } from "./facturax-contract";
import { VS_BILLING_SCHOOL } from "./scope";
import { revalidateServerReadCache } from "@/lib/server-read-cache";
vi.mock("server-only", () => ({}));
vi.mock("@/lib/server-read-cache", () => ({ revalidateServerReadCache: vi.fn() }));
const mock = vi.hoisted(() => ({ query: vi.fn(), remote: vi.fn() }));
vi.mock("@/lib/server-db", () => ({ getServerDbPool: () => ({ query: mock.query }) }));
vi.mock("./facturax-client", () => ({
  facturaxRequest: mock.remote,
  FacturaxError: class extends Error {
    constructor(
      message: string,
      public status = 503
    ) {
      super(message);
    }
  },
}));
const student = "10000000-0000-4000-8000-000000000001",
  contract = "10000000-0000-4000-8000-000000000002",
  second = "10000000-0000-4000-8000-000000000003",
  request = "10000000-0000-4000-8000-000000000004",
  actor = "10000000-0000-4000-8000-000000000005",
  other = "10000000-0000-4000-8000-000000000006";
const billingContact = {
  email: "ana@example.com",
  telefono: "3001234567",
  direccion: "Calle 1 numero 2",
  ciudad: "IPIALES",
  departamento: "Nariño",
  datos_facturacion: {
    country: "CO" as const,
    cityCode: "52356",
    personType: "2" as const,
    responsibilities: "R-99-PN" as const,
    taxRegime: "ordinario" as const,
    taxScheme: "ZZ" as const,
  },
};
const fiscal = {
  documentType: "13" as const,
  personType: "2" as const,
  countryCode: "CO" as const,
  departmentCode: "52",
  cityCode: "52356",
  address: billingContact.direccion,
  phone: billingContact.telefono,
  responsibilities: "R-99-PN",
  taxRegime: "ordinario" as const,
  taxScheme: "ZZ" as const,
};
const quoted: FacturaxStatus = {
  schemaVersion: 1,
  issuerNit: VS_BILLING_SCHOOL.nit,
  id: request,
  studentId: student,
  state: "quoted",
  number: null,
  documentId: null,
  cufe: null,
  emailState: null,
  quote: {
    schemaVersion: 1,
    issuerNit: VS_BILLING_SCHOOL.nit,
    id: request,
    studentId: student,
    expiresAt: "2099-01-01T00:00:00.000Z",
    sourceStudent: {
      id: student,
      name: "Ana Prueba",
      document: "12345678",
      documentType: "CC",
      email: billingContact.email,
      fiscal,
    },
    customer: {
      name: "Ana Prueba",
      document: "12345678",
      documentType: "CC",
      email: "ana@example.com",
      fiscal,
    },
    lines: [
      { description: "Servicio", quantity: 1000, price: 100000, tax: 0, taxTreatment: "excluded" },
    ],
    totals: { subtotal: 100000, vat: 0, total: 100000 },
    payment: { method: "Efectivo", condition: "contado", dueDate: "2026-10-13" },
    delivery: "email",
  },
};
const accepted: FacturaxStatus = {
  ...quoted,
  state: "accepted",
  number: "ESF123",
  documentId: other,
  cufe: "a".repeat(96),
};
let db: PGlite;
beforeAll(async () => {
  db = new PGlite();
  await db.exec(`create role anon;create role authenticated;
 create table escuelas(id uuid primary key);create table perfiles(id uuid primary key);
 create table alumnos(id uuid primary key,escuela_id uuid,nombre text,apellidos text,dni text,tipo_documento text,email text,estado text);
 create table matriculas_alumno(id uuid primary key,escuela_id uuid,alumno_id uuid,estado text);
 insert into escuelas values('${VS_BILLING_SCHOOL.id}'),('${other}');insert into perfiles values('${actor}');
 insert into alumnos values('${student}','${VS_BILLING_SCHOOL.id}','Ana','Prueba','12345678','CC','ana@example.com','activo'),('${other}','${other}','Otra','Escuela','12345679','CC','','activo');
 insert into matriculas_alumno values('${contract}','${VS_BILLING_SCHOOL.id}','${student}','activo'),('${second}','${VS_BILLING_SCHOOL.id}','${student}','activo'),('${other}','${other}','${other}','activo');
 alter table alumnos add column sede_id uuid default '${VS_BILLING_SCHOOL.id}';
 alter table alumnos add column telefono text;
 alter table alumnos add column direccion text;
 alter table alumnos add column ciudad text;
 alter table alumnos add column departamento text;
 alter table alumnos add column datos_facturacion jsonb;
 alter table matriculas_alumno add column sede_id uuid default '${VS_BILLING_SCHOOL.id}';`);
  await db.exec("alter table matriculas_alumno add column categorias text[] default '{A2}'");
  await db.exec(
    "alter table alumnos add column fecha_nacimiento date; alter table matriculas_alumno add column fecha_inscripcion date"
  );
  await db.exec(
    readFileSync(
      new URL(
        "../../../supabase/migrations/20261010190934_facturax_contract_invoices.sql",
        import.meta.url
      ),
      "utf8"
    )
  );
  await db.exec(
    readFileSync(
      new URL(
        "../../../supabase/migrations/20261020005811_ansv_contract_snapshot.sql",
        import.meta.url
      ),
      "utf8"
    )
  );
}, 30000);
beforeEach(async () => {
  await db.exec("truncate facturax_contract_invoices");
  await db.query(
    "update alumnos set email=$1,telefono=$2,direccion=$3,ciudad=$4,departamento=$5,datos_facturacion=$6 where id=$7",
    [
      billingContact.email,
      billingContact.telefono,
      billingContact.direccion,
      billingContact.ciudad,
      billingContact.departamento,
      billingContact.datos_facturacion,
      student,
    ]
  );
  await db.query("update matriculas_alumno set sede_id=$1", [VS_BILLING_SCHOOL.id]);
  mock.query.mockImplementation((sql: string, values?: unknown[]) => db.query(sql, values));
  mock.remote.mockReset();
  mock.remote.mockImplementation(async (_schema, body, id) =>
    id ? quoted : body.action === "cancel" ? { id: request, cancelled: true } : accepted
  );
});
afterAll(() => db.close());
describe("factura por contrato", () => {
  it("filtra las facturas por la sede del contrato cuando el personal tiene alcance de sede", async () => {
    await emitContractInvoice(student, contract, request, actor);
    await db.query("update matriculas_alumno set sede_id=$1 where id=$2", [other, contract]);
    expect(await contractInvoices(student, VS_BILLING_SCHOOL.id)).toEqual([]);
    expect(await contractInvoices(student, other)).toHaveLength(1);
    expect(await contractInvoices(student)).toHaveLength(1);
  });
  it("guarda solo el correo faltante, normaliza y lo incluye en los datos enviados a FacturaX", async () => {
    await db.query("update alumnos set email=null where id=$1", [student]);
    expect(await addInvoiceContactEmail(student, " ANA.NUEVA@example.com ")).toEqual({
      email: "ana.nueva@example.com",
    });
    const row = await invoiceContract(student, contract);
    expect(invoiceStudent(row).email).toBe("ana.nueva@example.com");
    expect(row.dni).toBe("12345678");
    expect(await invoiceContact(student)).toMatchObject({ email: "ana.nueva@example.com" });
    expect(revalidateServerReadCache).toHaveBeenCalledWith(`scope:school:${VS_BILLING_SCHOOL.id}`);
    expect(mock.remote).not.toHaveBeenCalled();
  });
  it("no cambia correos ya existentes ni alumnos de otra escuela", async () => {
    await expect(addInvoiceContactEmail(student, "otra@example.com")).rejects.toThrow(/ya tiene/);
    await expect(addInvoiceContactEmail(other, "otra@example.com")).rejects.toThrow(
      /no encontrado/
    );
    expect((await invoiceContact(student)).email).toBe("ana@example.com");
  });
  it.each(["", "invalido", "12345678@alumno.local"])("rechaza el correo %s", async (email) => {
    await expect(addInvoiceContactEmail(student, email)).rejects.toThrow();
  });
  it("permite reemplazar un correo interno y repetir el guardado sin sobreescribir otro contacto", async () => {
    await db.query("update alumnos set email='12345678@alumno.local' where id=$1", [student]);
    await addInvoiceContactEmail(student, "ana@example.com");
    await expect(addInvoiceContactEmail(student, "ana@example.com")).resolves.toEqual({
      email: "ana@example.com",
    });
  });
  it("no emite una revision anterior sin correo", async () => {
    mock.remote.mockResolvedValue({
      ...quoted,
      quote: { ...quoted.quote, customer: { ...quoted.quote!.customer, email: "" } },
    });
    await expect(emitContractInvoice(student, contract, request, actor)).rejects.toThrow(
      /nueva revision/
    );
    expect(await contractInvoices(student)).toEqual([]);
    expect(mock.remote).toHaveBeenCalledTimes(1);
  });
  it("usa columnas reales, solo consulta el alumno del contrato y la escuela autorizada", async () => {
    const row = await invoiceContract(student, contract);
    expect(invoiceStudent(row)).toEqual({
      id: student,
      name: "Ana Prueba",
      document: "12345678",
      documentType: "CC",
      email: "ana@example.com",
      fiscal,
    });
    await expect(invoiceContract(student, other)).rejects.toThrow();
    await expect(invoiceContract(other, other)).rejects.toThrow();
  });
  it("no comparte matricula, categorias, curso ni sus valores", () => {
    const source = {
      ...billingContact,
      id: student,
      nombre: "Ana",
      apellidos: "Prueba",
      dni: "12345678",
      tipo_documento: "CC",
      email: billingContact.email,
      valor_total: 99000,
      matriculas: [{ id: contract }],
      numero_contrato: "PRIVADO",
    };
    expect(Object.keys(invoiceStudent(source)).sort()).toEqual(
      ["id", "name", "document", "documentType", "email", "fiscal"].sort()
    );
    expect(
      facturaxSelectionSchema.safeParse({
        items: [{ productId: other, quantity: 1000, price: 1 }],
        payment: { method: "Efectivo", condition: "contado", dueDate: "2026-10-10" },
        delivery: "email",
      }).success
    ).toBe(false);
  });
  it("no omite el perfil fiscal de alumnos antiguos para seguir facturando", async () => {
    await db.query("update alumnos set datos_facturacion=null where id=$1", [student]);
    expect(() =>
      invoiceStudent({
        ...billingContact,
        id: student,
        nombre: "Ana",
        apellidos: "Prueba",
        dni: "12345678",
        tipo_documento: "CC",
        datos_facturacion: null,
      })
    ).toThrow(/Completa/);
    await expect(emitContractInvoice(student, contract, request, actor)).rejects.toMatchObject({
      code: "INVOICE_DATA_INCOMPLETE",
      status: 422,
    });
    expect(mock.remote).not.toHaveBeenCalled();
    expect(await contractInvoices(student)).toEqual([]);
  });
  it("guarda contacto completo con version y sin modificar identificacion, matricula o valores", async () => {
    const current = await invoiceContact(student);
    const saved = await saveInvoiceBillingContact(
      student,
      { ...billingContact, email: "nuevo@example.com" },
      invoiceContactView(current).version,
      current.sede_id
    );
    expect(saved.email).toBe("nuevo@example.com");
    expect(saved.dni).toBe(current.dni);
    expect(saved.version).not.toBe(invoiceContactView(current).version);
    expect(await contractInvoices(student)).toEqual([]);
    expect(mock.remote).not.toHaveBeenCalled();
  });
  it("rechaza una ficha antigua o de otra sede sin sobreescribir los cambios", async () => {
    const current = await invoiceContact(student);
    const version = invoiceContactView(current).version;
    await db.query("update alumnos set telefono='3009999999' where id=$1", [student]);
    await expect(
      saveInvoiceBillingContact(student, billingContact, version, current.sede_id)
    ).rejects.toThrow(/ficha cambio/);
    await expect(
      saveInvoiceBillingContact(
        student,
        billingContact,
        invoiceContactView(await invoiceContact(student)).version,
        other
      )
    ).rejects.toThrow(/ficha cambio/);
    expect((await invoiceContact(student)).telefono).toBe("3009999999");
  });
  it("la condicion SQL impide sobreescribir un cambio ocurrido despues de leer la ficha", async () => {
    const current = await invoiceContact(student);
    mock.query.mockImplementation(async (sql: string, values?: unknown[]) => {
      if (sql.startsWith("update public.alumnos"))
        await db.query("update alumnos set telefono='3009999999' where id=$1", [student]);
      return db.query(sql, values);
    });
    await expect(
      saveInvoiceBillingContact(
        student,
        { ...billingContact, email: "otro@example.com" },
        invoiceContactView(current).version,
        current.sede_id
      )
    ).rejects.toThrow(/ficha cambio/);
    const row = await invoiceContact(student);
    expect(row.email).toBe(billingContact.email);
    expect(row.telefono).toBe("3009999999");
  });
  it("la condicion SQL impide guardar si el alumno se traslado de sede durante la operacion", async () => {
    const current = await invoiceContact(student);
    mock.query.mockImplementation(async (sql: string, values?: unknown[]) => {
      if (sql.startsWith("update public.alumnos"))
        await db.query("update alumnos set sede_id=$1 where id=$2", [other, student]);
      return db.query(sql, values);
    });
    await expect(
      saveInvoiceBillingContact(
        student,
        { ...billingContact, email: "otro@example.com" },
        invoiceContactView(current).version,
        current.sede_id
      )
    ).rejects.toThrow(/ficha cambio/);
    expect((await invoiceContact(student)).email).toBe(billingContact.email);
    await db.query("update alumnos set sede_id=$1 where id=$2", [VS_BILLING_SCHOOL.id, student]);
  });
  it("una correccion de identificacion simultanea tambien invalida el guardado del contacto anterior", async () => {
    const current = await invoiceContact(student);
    mock.query.mockImplementation(async (sql: string, values?: unknown[]) => {
      if (sql.startsWith("update public.alumnos"))
        await db.query("update alumnos set dni='87654321' where id=$1", [student]);
      return db.query(sql, values);
    });
    await expect(
      saveInvoiceBillingContact(
        student,
        { ...billingContact, email: "otro@example.com" },
        invoiceContactView(current).version,
        current.sede_id
      )
    ).rejects.toThrow(/ficha cambio/);
    expect((await invoiceContact(student)).email).toBe(billingContact.email);
    await db.query("update alumnos set dni=$1 where id=$2", [current.dni, student]);
  });
  it("bloquea una revision antigua sin fiscal antes de reservar o emitir", async () => {
    mock.remote.mockResolvedValue({
      ...quoted,
      quote: { ...quoted.quote, customer: { ...quoted.quote!.customer, fiscal: undefined } },
    });
    await expect(emitContractInvoice(student, contract, request, actor)).rejects.toMatchObject({
      code: "INVOICE_DATA_INCOMPLETE",
    });
    expect(await contractInvoices(student)).toEqual([]);
    expect(mock.remote).toHaveBeenCalledTimes(1);
  });
  it("si el contacto cambio despues de revisar, exige una revision nueva", async () => {
    await db.query("update alumnos set direccion='Calle 2 numero 3' where id=$1", [student]);
    await expect(emitContractInvoice(student, contract, request, actor)).rejects.toThrow(
      /nueva revision/
    );
    expect(await contractInvoices(student)).toEqual([]);
    expect(mock.remote).toHaveBeenCalledTimes(1);
  });
  it("conserva un perfil fiscal efectivo legitimo de FacturaX sin confundirlo con cambios posteriores", async () => {
    mock.remote.mockImplementation(async (_schema, body, id) =>
      id
        ? {
            ...quoted,
            quote: {
              ...quoted.quote,
              customer: {
                ...quoted.quote!.customer,
                fiscal: {
                  ...fiscal,
                  responsibilities: "O-47",
                  taxRegime: "simple",
                  taxScheme: "01",
                },
              },
            },
          }
        : accepted
    );
    await expect(emitContractInvoice(student, contract, request, actor)).resolves.toMatchObject({
      status: { state: "accepted" },
    });
    expect(mock.remote).toHaveBeenCalledTimes(2);
  });
  it("una revision sin datos originales no reserva aunque el cliente efectivo este completo", async () => {
    mock.remote.mockResolvedValue({
      ...quoted,
      quote: { ...quoted.quote, sourceStudent: undefined },
    });
    await expect(emitContractInvoice(student, contract, request, actor)).rejects.toMatchObject({
      code: "INVOICE_DATA_INCOMPLETE",
    });
    expect(await contractInvoices(student)).toEqual([]);
    expect(mock.remote).toHaveBeenCalledTimes(1);
  });
  it("reserva antes de emitir y guarda el numero solo en ese contrato", async () => {
    mock.remote.mockImplementation(async (_schema, body, id) => {
      if (id) return quoted;
      expect((await contractInvoices(student))[0].requestId).toBe(request);
      expect(body).toEqual({
        action: "emit",
        id: request,
        studentId: student,
        confirmProduction: true,
      });
      return accepted;
    });
    const result = await emitContractInvoice(student, contract, request, actor);
    expect(result.status.number).toBe("ESF123");
    expect((await contractInvoices(student)).map((i) => i.contratoId)).toEqual([contract]);
  });
  it("un timeout conserva la reserva y se recupera consultando sin volver a emitir", async () => {
    mock.remote.mockImplementation(async (_schema, body, id) => {
      if (id) return quoted;
      throw Error("timeout");
    });
    await expect(emitContractInvoice(student, contract, request, actor)).rejects.toThrow("timeout");
    expect((await contractInvoices(student))[0].status).toBeNull();
    mock.remote.mockResolvedValue(accepted);
    expect((await syncContractInvoice(student, contract)).status.number).toBe("ESF123");
    expect(mock.remote.mock.lastCall?.[2]).toBe(request);
  });
  it("no asocia una solicitud a dos contratos", async () => {
    await emitContractInvoice(student, contract, request, actor);
    await expect(emitContractInvoice(student, second, request, actor)).rejects.toThrow(/asociada/);
  });
  it("rechaza respuestas de otro alumno", async () => {
    mock.remote.mockResolvedValue({ ...quoted, studentId: other });
    await expect(emitContractInvoice(student, contract, request, actor)).rejects.toThrow(
      /otro alumno/
    );
    expect(await contractInvoices(student)).toEqual([]);
  });
  it("concurrencia de dos revisiones no genera dos emisiones para un contrato", async () => {
    mock.remote.mockImplementation(async (_s, body, id) =>
      id ? { ...quoted, id } : { ...accepted, id: body.id }
    );
    const results = await Promise.allSettled([
      emitContractInvoice(student, contract, request, actor),
      emitContractInvoice(student, contract, other, actor),
    ]);
    expect(results.filter((r) => r.status === "fulfilled")).toHaveLength(1);
    expect(mock.remote.mock.calls.filter((c) => c[1]?.action === "emit")).toHaveLength(1);
  });
  it("una consulta anterior no borra el numero ni regresa una factura aceptada a pendiente", async () => {
    await emitContractInvoice(student, contract, request, actor);
    mock.remote.mockResolvedValue(quoted);
    const response = await syncContractInvoice(student, contract);
    expect(response.status.state).toBe("accepted");
    expect(response.status.number).toBe("ESF123");
    expect((await contractInvoices(student))[0].status?.state).toBe("accepted");
  });
  it("no devuelve un documento ajeno cuando la protección del estado impide sustituirlo", async () => {
    await emitContractInvoice(student, contract, request, actor);
    mock.remote.mockResolvedValue({ ...accepted, documentId: second, number: "OTRA" });
    const response = await syncContractInvoice(student, contract);
    expect(response.status.documentId).toBe(accepted.documentId);
    expect(response.status.number).toBe("ESF123");
  });
  it("guarda el estado contable aditivo y no convierte falta de cartera en saldo cero", async () => {
    const business = {
      accounting: { state: "pending", journalReference: null, issue: "Falta asiento." },
      collection: { state: "unregistered", balance: null, paid: null, issue: null, receipts: [] },
    };
    mock.remote.mockImplementation(async (_schema, _body, id) =>
      id ? quoted : { ...accepted, business }
    );
    const response = await emitContractInvoice(student, contract, request, actor);
    expect(response.status.business).toEqual(business);
    expect((await contractInvoices(student))[0].status?.business).toEqual(business);
    mock.remote.mockResolvedValue(quoted);
    expect((await syncContractInvoice(student, contract)).status.business).toEqual(business);
  });
  it("no reserva ni emite cuando el recaudo de la revisión no coincide con el total", async () => {
    mock.remote.mockResolvedValue({
      ...quoted,
      quote: {
        ...quoted.quote,
        payment: {
          ...quoted.quote!.payment,
          collection: {
            state: "received",
            confirmed: true,
            cashAccountCode: "110505",
            date: "2026-10-20",
            amount: 1,
          },
        },
      },
    });
    await expect(emitContractInvoice(student, contract, request, actor)).rejects.toThrow(
      /recaudo revisado/
    );
    expect(await contractInvoices(student)).toEqual([]);
    expect(mock.remote).toHaveBeenCalledTimes(1);
  });
  it("no libera la asociacion si FacturaX no confirma que sigue sin emitir", async () => {
    await emitContractInvoice(student, contract, request, actor);
    mock.remote.mockRejectedValue(Error("Ya emitida"));
    await expect(discardInvoicePreparation(student, contract)).rejects.toThrow();
    expect(await contractInvoices(student)).toHaveLength(1);
  });
  it("permite descartar solo tras confirmacion del receptor", async () => {
    mock.remote.mockImplementation(async (_s, body, id) =>
      id ? quoted : body.action === "cancel" ? { id: request, cancelled: true } : quoted
    );
    await emitContractInvoice(student, contract, request, actor);
    await discardInvoicePreparation(student, contract);
    expect(await contractInvoices(student)).toEqual([]);
  });
  it.each(["anon", "authenticated"])("no expone registros a %s", async (role) => {
    await emitContractInvoice(student, contract, request, actor);
    await db.exec(`set role ${role}`);
    try {
      await expect(db.query("select * from facturax_contract_invoices")).rejects.toMatchObject({
        code: "42501",
      });
    } finally {
      await db.exec("reset role");
    }
  });
});
