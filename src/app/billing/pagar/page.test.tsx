// @vitest-environment node
import { createHmac, randomUUID } from "node:crypto";
import { PGlite } from "@electric-sql/pglite";
import { renderToStaticMarkup } from "react-dom/server";
import { afterAll, afterEach, beforeAll, beforeEach, expect, it, vi } from "vitest";
import type { PublicBillingTokenPayload } from "@/lib/billing/hub";
import { prepareRateLimitStore } from "@/lib/rate-limit";
import BillingPagarPage from "./page";

const mock = vi.hoisted(() => ({
  query: vi.fn(),
  request: vi.fn(),
  redirect: vi.fn((url: string) => {
    throw new Error(url);
  }),
}));
vi.mock("@/lib/server-db", () => ({ getServerDbPool: () => ({ query: mock.query }) }));
vi.mock("next/navigation", () => ({ redirect: mock.redirect }));

const checkoutUrl = "https://checkout.wompi.co/p/?reference=prueba";
const response = (checkoutUrl: string | null, scheduled = false) =>
  Response.json({ ok: true, checkoutUrl, scheduled, message: "Cambio para el próximo periodo." });

let db: PGlite;
beforeAll(async () => {
  db = new PGlite();
  await db.waitReady;
  await db.exec(`
    create table planes_config (
      id text primary key,
      nombre text not null,
      descripcion text,
      precio_mensual numeric(12, 2) not null,
      precio_anual numeric(12, 2) not null,
      max_alumnos_default int not null default 50,
      max_sedes_default int not null default 1,
      caracteristicas jsonb not null default '[]',
      activo boolean not null,
      updated_by uuid,
      updated_at timestamptz,
      created_at timestamptz
    );
    insert into planes_config (id, nombre, precio_mensual, precio_anual, activo) values
      ('basico', 'Básico', 1000, 10000, true),
      ('enterprise', 'Enterprise', 2000, 20000, false);
  `);
  mock.query.mockImplementation((sql: string, params?: unknown[]) => db.query(sql, params));
});
beforeEach(() => {
  global.__autoescuelaRateLimitLastCleanupAt = Date.now();
  vi.stubEnv("CONDUSOFT_PUBLIC_BILLING_TOKEN_SECRET", "signing-key-for-tests");
  vi.stubEnv("CONDUSOFT_BILLING_SHARED_SECRET", "hub-key-for-tests");
  vi.stubEnv("CLOVENT_BILLING_HUB_URL", "https://hub.example.invalid");
  vi.stubGlobal("fetch", mock.request);
  vi.spyOn(console, "error").mockImplementation(() => undefined);
});
afterEach(() => {
  mock.query.mockClear();
  mock.redirect.mockClear();
  mock.request.mockReset();
  vi.unstubAllGlobals();
  vi.unstubAllEnvs();
  vi.restoreAllMocks();
});
afterAll(async () => {
  global.__autoescuelaRateLimitLastCleanupAt = undefined;
  global.__autoescuelaRateLimitStoreReady = undefined;
  await db.close();
});

function paymentLink(overrides: Partial<PublicBillingTokenPayload> = {}) {
  const payload: PublicBillingTokenPayload = {
    empresa_id: randomUUID(),
    target_plan_code: "basico",
    billing_interval: "monthly",
    operation_type: "renewal",
    exp: Math.floor(Date.now() / 1000) + 900,
    nonce: randomUUID(),
    ...overrides,
  };
  const key = ["billing_nonce", payload.empresa_id, payload.nonce].join(":");
  const encoded = Buffer.from(JSON.stringify(payload)).toString("base64url");
  const signature = createHmac("sha256", "signing-key-for-tests").update(encoded).digest("hex");
  const searchParams = Promise.resolve({ token: [encoded, signature].join(".") });
  return {
    key,
    expiration: payload.exp,
    open: async () => renderToStaticMarkup(await BillingPagarPage({ searchParams })),
  };
}

it("permite reintentar tras un fallo temporal y consume el enlace al dirigir a Wompi", async () => {
  mock.request.mockRejectedValueOnce(new Error("Servicio temporalmente fuera de línea"));
  mock.request.mockResolvedValueOnce(response(checkoutUrl));
  const payment = paymentLink();

  expect(await payment.open()).toContain("Vuelve a abrir el enlace para intentarlo");
  expect(
    (await db.query("select key from api_rate_limits where key = $1", [payment.key])).rows
  ).toEqual([]);
  await expect(payment.open()).rejects.toThrow(checkoutUrl);

  expect(
    (
      await db.query(
        "select count, extract(epoch from reset_at)::int as expiration from api_rate_limits where key = $1",
        [payment.key]
      )
    ).rows
  ).toEqual([{ count: 1, expiration: payment.expiration }]);
  expect(await payment.open()).toContain("ya fue utilizado");
  expect(mock.request).toHaveBeenCalledTimes(2);
});

it("solo envía una solicitud al proveedor cuando dos personas abren el mismo enlace", async () => {
  let respond!: (result: Response) => void;
  mock.request.mockReturnValueOnce(
    new Promise<Response>((resolve) => {
      respond = resolve;
    })
  );
  const payment = paymentLink();
  const result = payment.open();
  const redirected = expect(result).rejects.toThrow(checkoutUrl);

  try {
    await vi.waitFor(() => expect(mock.request).toHaveBeenCalledTimes(1));
    expect(await payment.open()).toContain("está en uso");
    expect(mock.request).toHaveBeenCalledTimes(1);
  } finally {
    respond(response(checkoutUrl));
    await redirected;
  }
});

it("recupera una reserva que expiró antes de confirmar el pago", async () => {
  const payment = paymentLink();
  await prepareRateLimitStore();
  await db.query("insert into api_rate_limits values ($1, 0, now() - interval '1 second')", [
    payment.key,
  ]);

  mock.request.mockResolvedValueOnce(response(checkoutUrl));
  await expect(payment.open()).rejects.toThrow(checkoutUrl);
});

it("permite reintentar cuando el proveedor devuelve un destino inesperado", async () => {
  mock.request.mockResolvedValueOnce(response("https://example.invalid/pago"));
  mock.request.mockResolvedValueOnce(response("https://hub.example.invalid/checkout"));
  const payment = paymentLink();
  expect(await payment.open()).toContain("Vuelve a abrir el enlace");
  expect(mock.redirect).not.toHaveBeenCalled();
  await expect(payment.open()).rejects.toThrow("https://hub.example.invalid/checkout");
});

it("rechaza el plan inactivo antes del cobro y libera la reserva del enlace", async () => {
  const payment = paymentLink({ target_plan_code: "enterprise" });

  expect(await payment.open()).toContain("Este plan no está disponible para contratar.");
  expect(mock.request).not.toHaveBeenCalled();
  expect(mock.redirect).not.toHaveBeenCalled();
  expect(
    (await db.query("select key from api_rate_limits where key = $1", [payment.key])).rows
  ).toEqual([]);
});

it("rechaza enlaces vencidos y parámetros repetidos sin reservar ni contactar al proveedor", async () => {
  expect(await paymentLink({ exp: Math.floor(Date.now() / 1000) }).open()).toContain(
    "El enlace de pago expiró"
  );
  const page = await BillingPagarPage({ searchParams: Promise.resolve({ token: ["a", "b"] }) });
  expect(renderToStaticMarkup(page)).toContain("Token de pago inválido");
  expect(mock.query).not.toHaveBeenCalled();
  expect(mock.request).not.toHaveBeenCalled();
});

it("confirma un cambio programado aunque el proveedor no devuelva una redirección", async () => {
  const payment = paymentLink({ operation_type: "downgrade_schedule" });
  mock.request.mockResolvedValueOnce(response(null, true));
  expect(await payment.open()).toContain("Cambio programado");
  expect(await payment.open()).toContain("ya fue utilizado");
  expect(mock.request).toHaveBeenCalledTimes(1);
  expect(mock.redirect).not.toHaveBeenCalled();
});
