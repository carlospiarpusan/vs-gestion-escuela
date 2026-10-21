// @vitest-environment node
import { beforeEach, afterEach, expect, it, vi } from "vitest";
import { NextResponse } from "next/server";
import { calculateAnsv } from "@/lib/ansv";
import { getTodayDateString } from "@/lib/date-utils";
import { GET, POST } from "@/app/api/alumnos/factura-electronica/route";
import {
  VS_BILLING_SCHOOL,
  INVOICE_STAFF_ROLES,
  canIssueVsBilling,
  canManageVsBilling,
} from "./scope";

const mock = vi.hoisted(() => ({
  auth: vi.fn(),
  query: vi.fn(),
  limit: vi.fn(),
  contact: vi.fn(),
  save: vi.fn(),
  saveContact: vi.fn(),
  contract: vi.fn(),
  invoices: vi.fn(),
  remote: vi.fn(),
}));
vi.mock("server-only", () => ({}));
vi.mock("@/lib/api-auth", async (original) => ({
  ...(await original<typeof import("@/lib/api-auth")>()),
  authorizeApiRequest: mock.auth,
}));
vi.mock("@/lib/server-db", () => ({ getServerDbPool: () => ({ query: mock.query }) }));
vi.mock("@/lib/rate-limit", () => ({ rateLimit: mock.limit }));
vi.mock("./contract-invoices", async (original) => ({
  ...(await original<typeof import("./contract-invoices")>()),
  invoiceContact: mock.contact,
  addInvoiceContactEmail: mock.save,
  saveInvoiceBillingContact: mock.saveContact,
  invoiceContract: mock.contract,
  contractInvoices: mock.invoices,
  discardInvoicePreparation: vi.fn(),
  emitContractInvoice: vi.fn(),
  syncContractInvoice: vi.fn(),
}));
vi.mock("./facturax-client", () => ({
  facturaxConfigured: () => true,
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
const id = "10000000-0000-4000-8000-000000000001";
const completeContact = {
  id,
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
  sede_id: id,
};
const body = { action: "contact_email", alumnoId: id, email: "ana@example.com" };
function request(payload: unknown = body, origin = "https://condusoft.co") {
  return new Request("https://condusoft.co/api/alumnos/factura-electronica", {
    method: "POST",
    headers: { "Content-Type": "application/json", origin },
    body: JSON.stringify(payload),
  });
}
beforeEach(() => {
  vi.resetAllMocks();
  vi.stubEnv("VS_BILLING_API_ENABLED", "true");
  mock.auth.mockResolvedValue({
    ok: true,
    perfil: {
      id,
      rol: "admin_escuela",
      activo: true,
      escuela_id: VS_BILLING_SCHOOL.id,
      sede_id: null,
    },
  });
  mock.query.mockResolvedValue({ rows: [{ cif: VS_BILLING_SCHOOL.nit }] });
  mock.limit.mockResolvedValue({ ok: true });
  mock.save.mockResolvedValue({ email: "ana@example.com" });
  mock.contact.mockResolvedValue({ email: null, sede_id: id });
  mock.invoices.mockResolvedValue([]);
});
afterEach(() => vi.unstubAllEnvs());
it("entrega el cálculo del contrato elegido sin enviar nacimiento ni sexo a FacturaX", async () => {
  const ansv = calculateAnsv(
    { fechaNacimiento: "1986-01-01", sexo: "M", fechaMatricula: "2026-09-01", categorias: ["A2"] },
    "2026-10-19"
  );
  mock.contract.mockResolvedValue({
    ...completeContact,
    estado: "activo",
    alumno_estado: "activo",
    ansv,
  });
  mock.remote.mockResolvedValue({ products: [] });
  const response = await POST(request({ action: "catalog", alumnoId: id, contratoId: id }));
  expect(response.status).toBe(200);
  expect((await response.json()).ansv).toEqual(ansv);
  expect(mock.contract).toHaveBeenCalledWith(id, id);
  const sent = mock.remote.mock.calls[0][1];
  expect(sent).not.toHaveProperty("ansv");
  expect(sent.student).not.toHaveProperty("sexo");
  expect(sent.student).not.toHaveProperty("fechaNacimiento");
  expect(sent.student).not.toHaveProperty("valor_total");
});
it("guarda el correo validado sin pedir matricula ni enviar nada a FacturaX", async () => {
  const response = await POST(request({ ...body, email: " ANA@example.com " }));
  expect(response.status).toBe(200);
  expect(mock.save).toHaveBeenCalledWith(id, "ana@example.com");
  expect(mock.contract).not.toHaveBeenCalled();
  expect(mock.remote).not.toHaveBeenCalled();
  expect(response.headers.get("cache-control")).toBe("private, no-store");
});
it.each(["", "invalido", "12345@alumno.local"])("rechaza contacto invalido %s", async (email) => {
  expect((await POST(request({ ...body, email }))).status).toBe(400);
  expect(mock.save).not.toHaveBeenCalled();
});
it("rechaza campos adicionales", async () => {
  expect((await POST(request({ ...body, escuela_id: id, valor_total: 1 }))).status).toBe(400);
  expect(mock.save).not.toHaveBeenCalled();
});
it("requiere sesion y roles autorizados", async () => {
  mock.auth.mockResolvedValue({ ok: false, response: NextResponse.json({}, { status: 401 }) });
  expect((await POST(request())).status).toBe(401);
  expect(mock.auth).toHaveBeenCalledWith(INVOICE_STAFF_ROLES);
  expect(mock.save).not.toHaveBeenCalled();
});
it("rechaza CSRF y no amplia el acceso a otras escuelas", async () => {
  expect((await POST(request(body, "https://otro.example"))).status).toBe(403);
  mock.auth.mockResolvedValue({
    ok: true,
    perfil: { id, rol: "admin_escuela", escuela_id: id, sede_id: null },
  });
  expect((await POST(request())).status).toBe(404);
  expect(mock.save).not.toHaveBeenCalled();
});
it("devuelve el correo actual para evitar datos antiguos de la lista", async () => {
  mock.contact.mockResolvedValue({ ...completeContact, email: "actual@example.com" });
  const response = await GET(
    new Request(`https://condusoft.co/api/alumnos/factura-electronica?alumnoId=${id}`)
  );
  expect(await response.json()).toMatchObject({ enabled: true, email: "actual@example.com" });
});
it("devuelve la ficha vigente, sus campos faltantes y una version para guardado seguro", async () => {
  mock.contact.mockResolvedValue({ ...completeContact, direccion: null, datos_facturacion: null });
  const response = await GET(
    new Request(`https://condusoft.co/api/alumnos/factura-electronica?alumnoId=${id}`)
  );
  const data = await response.json();
  expect(data.contact.version).toMatch(/^[a-f0-9]{64}$/);
  expect(data.issues).toEqual(
    expect.arrayContaining([
      expect.objectContaining({ field: "student.fiscal.address" }),
      expect.objectContaining({ field: "student.fiscal.countryCode" }),
    ])
  );
  expect(data.contact).not.toHaveProperty("sede_id");
});
it("guarda contacto completo sin enviar una solicitud fiscal ni alterar un contrato", async () => {
  mock.contact.mockResolvedValue(completeContact);
  const contact = {
    email: completeContact.email,
    telefono: completeContact.telefono,
    direccion: completeContact.direccion,
    ciudad: completeContact.ciudad,
    departamento: completeContact.departamento,
    datos_facturacion: completeContact.datos_facturacion,
  };
  mock.saveContact.mockResolvedValue({ ...completeContact, version: "a".repeat(64) });
  const response = await POST(
    request({ action: "billing_contact", alumnoId: id, contact, version: "a".repeat(64) })
  );
  expect(response.status).toBe(200);
  expect(mock.saveContact).toHaveBeenCalledWith(id, contact, "a".repeat(64), id);
  expect(mock.contract).not.toHaveBeenCalled();
  expect(mock.remote).not.toHaveBeenCalled();
});
it.each(["catalog", "quote", "emit"])(
  "bloquea %s incompleto antes de comunicarse con FacturaX",
  async (action) => {
    mock.contract.mockResolvedValue({
      ...completeContact,
      estado: "activo",
      alumno_estado: "activo",
      telefono: "",
      datos_facturacion: null,
    });
    const selection = {
      items: [{ productId: id, quantity: 1000 }],
      payment: { method: "Efectivo", condition: "contado", dueDate: "2026-10-14" },
      delivery: "email",
    };
    const response = await POST(
      request({
        action,
        alumnoId: id,
        contratoId: id,
        ...(action === "quote"
          ? selection
          : action === "emit"
            ? { requestId: id, confirmed: true }
            : {}),
      })
    );
    expect(response.status).toBe(422);
    expect(await response.json()).toMatchObject({
      code: "INVOICE_DATA_INCOMPLETE",
      missingFields: expect.arrayContaining(["student.fiscal.phone", "student.fiscal.countryCode"]),
    });
    expect(mock.remote).not.toHaveBeenCalled();
  }
);
it.each(["admin_sede", "administrativo", "recepcion"] as const)(
  "permite facturar a %s solo en su sede, sin administrar claves",
  async (rol) => {
    const perfil = { id, rol, activo: true, escuela_id: VS_BILLING_SCHOOL.id, sede_id: id };
    mock.auth.mockResolvedValue({ ok: true, perfil });
    expect(canIssueVsBilling(true, perfil, perfil.escuela_id)).toBe(true);
    expect(canManageVsBilling(true, perfil, perfil.escuela_id)).toBe(false);
    expect((await POST(request())).status).toBe(200);
    mock.save.mockClear();
    mock.contact.mockResolvedValue({ email: null, sede_id: VS_BILLING_SCHOOL.id });
    expect((await POST(request())).status).toBe(403);
    expect(
      (
        await GET(
          new Request(`https://condusoft.co/api/alumnos/factura-electronica?alumnoId=${id}`)
        )
      ).status
    ).toBe(403);
    expect(mock.save).not.toHaveBeenCalled();
  }
);
it.each(["alumno", "instructor"] as const)("no amplía emisión para %s", async (rol) => {
  const perfil = { id, rol, activo: true, escuela_id: VS_BILLING_SCHOOL.id, sede_id: id };
  mock.auth.mockResolvedValue({ ok: true, perfil });
  expect((await POST(request())).status).toBe(404);
  expect(mock.save).not.toHaveBeenCalled();
});
it("bloquea operaciones sobre un contrato de otra sede antes de llamar a FacturaX", async () => {
  mock.auth.mockResolvedValue({
    ok: true,
    perfil: {
      id,
      rol: "administrativo",
      activo: true,
      escuela_id: VS_BILLING_SCHOOL.id,
      sede_id: id,
    },
  });
  mock.contract.mockResolvedValue({
    estado: "activo",
    alumno_estado: "activo",
    sede_id: VS_BILLING_SCHOOL.id,
    email: "ana@example.com",
  });
  expect((await POST(request({ action: "catalog", alumnoId: id, contratoId: id }))).status).toBe(
    403
  );
  expect(mock.remote).not.toHaveBeenCalled();
});
it("impide preparar una factura sin correo aunque el cliente omita el formulario", async () => {
  mock.contract.mockResolvedValue({ estado: "activo", alumno_estado: "activo", email: null });
  expect(
    (
      await POST(
        request({
          action: "quote",
          alumnoId: id,
          contratoId: id,
          items: [{ productId: id, quantity: 1000 }],
          payment: { method: "Efectivo", condition: "contado", dueDate: "2026-10-13" },
          delivery: "physical",
        })
      )
    ).status
  ).toBe(422);
  expect(mock.remote).not.toHaveBeenCalled();
});

it.each([1, 500, 1001, 1500, 999999, 0, -1000, 1000001])(
  "rechaza cantidades fraccionarias o fuera de rango en la API (%s milesimas)",
  async (quantity) => {
    const response = await POST(
      request({
        action: "quote",
        alumnoId: id,
        contratoId: id,
        items: [{ productId: id, quantity }],
        payment: { method: "Efectivo", condition: "contado", dueDate: "2026-10-15" },
        delivery: "email",
      })
    );
    expect(response.status).toBe(400);
    expect(mock.contract).not.toHaveBeenCalled();
    expect(mock.remote).not.toHaveBeenCalled();
  }
);

const accountingCatalog = {
  schemaVersion: 1,
  issuerNit: VS_BILLING_SCHOOL.nit,
  products: [],
  paymentMethods: ["Efectivo", "Transferencia"],
  customer: null,
  customerIssue: null,
  capabilities: { paymentCollection: true, accountingPreflight: true, businessStatus: true },
  accounting: { ready: true, issues: [] },
  canConfirmCollections: true,
  collectionAccounts: [{ code: "110505", name: "Caja" }],
  defaultCollectionAccounts: [{ method: "Efectivo", accountCode: "110505" }],
};
const baseSelection = () => ({
  action: "quote",
  alumnoId: id,
  contratoId: id,
  items: [{ productId: id, quantity: 1000 }],
  payment: { method: "Efectivo", condition: "contado", dueDate: getTodayDateString() },
  delivery: "email",
});
it.each([
  [undefined, {}, "payment.collection"],
  [{ state: "received", confirmed: true }, { canConfirmCollections: false }, "payment.collection"],
  [
    { state: "received", confirmed: true, cashAccountCode: "119999" },
    {},
    "payment.collection.cashAccountCode",
  ],
  [
    { state: "pending" },
    {
      accounting: {
        ready: false,
        issues: [{ field: "accounting.period", message: "Período cerrado." }],
      },
    },
    "accounting.period",
  ],
])(
  "la API valida elección y configuración vigente antes de preparar (%j)",
  async (collection, overrides, field) => {
    mock.contract.mockResolvedValue({
      ...completeContact,
      estado: "activo",
      alumno_estado: "activo",
    });
    mock.remote.mockResolvedValue({ ...accountingCatalog, ...overrides });
    const selection = baseSelection();
    const response = await POST(
      request({ ...selection, payment: { ...selection.payment, collection } })
    );
    expect(response.status).toBe(422);
    expect(await response.json()).toMatchObject({
      code: "INVOICE_DATA_INCOMPLETE",
      issues: expect.arrayContaining([expect.objectContaining({ field })]),
    });
    expect(mock.remote.mock.calls.map((call) => call[1].action)).toEqual(["catalog"]);
  }
);
it("no permite enviar dinero o fecha de recaudo calculados por el navegador", async () => {
  const selection = baseSelection();
  const response = await POST(
    request({
      ...selection,
      payment: {
        ...selection.payment,
        collection: { state: "received", confirmed: true, amount: 100, date: getTodayDateString() },
      },
    })
  );
  expect(response.status).toBe(400);
  expect(mock.remote).not.toHaveBeenCalled();
});
it("transmite elección de recaudo solo tras verificar el catálogo y conserva respuesta canónica", async () => {
  mock.contract.mockResolvedValue({
    ...completeContact,
    estado: "activo",
    alumno_estado: "activo",
  });
  const selection = baseSelection();
  const received = { state: "received", confirmed: true, cashAccountCode: "110505" };
  const quote = {
    schemaVersion: 1,
    issuerNit: VS_BILLING_SCHOOL.nit,
    id,
    studentId: id,
    payment: {
      ...selection.payment,
      collection: { ...received, amount: 100000, date: getTodayDateString() },
    },
    totals: { total: 100000 },
  };
  mock.remote.mockImplementation(async (_schema, body) =>
    body.action === "catalog" ? accountingCatalog : quote
  );
  const response = await POST(
    request({ ...selection, payment: { ...selection.payment, collection: received } })
  );
  expect(response.status).toBe(200);
  expect((await response.json()).payment.collection).toEqual(quote.payment.collection);
  expect(mock.remote.mock.calls.map((call) => call[1].action)).toEqual(["catalog", "quote"]);
  expect(mock.remote.mock.calls[1][1].payment.collection).toEqual(received);
});

it("calcula ANSV para contratos anteriores sin snapshot y conserva privados los datos de cálculo", async () => {
  mock.contract.mockResolvedValue({
    ...completeContact,
    estado: "activo",
    alumno_estado: "activo",
    ansv: null,
    fecha_nacimiento: new Date("2006-01-01T05:00:00Z"),
    sexo: "M",
    fecha_inscripcion: new Date("2026-09-01T05:00:00Z"),
    categorias: ["A2"],
  });
  mock.remote.mockResolvedValue({ products: [] });
  const response = await POST(request({ action: "catalog", alumnoId: id, contratoId: id }));
  expect(response.status).toBe(200);
  expect(await response.json()).toMatchObject({
    ansv: { valorPesos: 8900 },
    ansvContext: {
      fechaNacimiento: "2006-01-01",
      sexo: "M",
      fechaMatricula: "2026-09-01",
      categorias: ["A2"],
    },
  });
  const sent = mock.remote.mock.calls[0][1];
  expect(sent.student).not.toHaveProperty("sexo");
  expect(sent.student).not.toHaveProperty("fecha_nacimiento");
  expect(sent).not.toHaveProperty("ansvContext");
  expect(mock.query).toHaveBeenCalledTimes(1);
});
