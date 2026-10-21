// @vitest-environment node
import { beforeEach, expect, it, vi } from "vitest";
import { MailProviderError } from "@/lib/email-oauth-providers";
const mock = vi.hoisted(() => ({ auth: vi.fn(), sync: vi.fn(), scope: vi.fn() }));
vi.mock("@/lib/api-auth", async (original) => ({
  ...(await original<typeof import("@/lib/api-auth")>()),
  authorizeApiRequest: mock.auth,
}));
vi.mock("@/lib/email-invoice-sync", async (original) => ({
  ...(await original<typeof import("@/lib/email-invoice-sync")>()),
  syncEmailInvoiceIntegrationBySchool: mock.sync,
  assertEmailInvoiceSedeScope: mock.scope,
}));
import { POST } from "./route";
const school = "10000000-0000-4000-8000-000000000002";
const request = (input: unknown = { mode: "historical", months_back: 24, max_messages: 2000 }) =>
  new Request("https://condusoft.co/api/gastos/facturas-correo/sync", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(input),
  });
beforeEach(() => {
  vi.resetAllMocks();
  mock.auth.mockResolvedValue({ ok: true, perfil: { rol: "admin_escuela", escuela_id: school } });
  mock.scope.mockResolvedValue(undefined);
});

it("accepts the requested 24-month, 2000-message historical search", async () => {
  mock.sync.mockResolvedValue({ imported: 1, truncated: true });
  const response = await POST(request());
  expect(response.status).toBe(200);
  expect(mock.sync).toHaveBeenCalledWith(school, {
    mode: "historical",
    monthsBack: 24,
    maxMessages: 2000,
  });
  expect(await response.json()).toEqual({ summary: { imported: 1, truncated: true } });
});

it.each(["rate_limit", "quota"] as const)(
  "returns a recoverable provider %s with Retry-After",
  async (kind) => {
    mock.sync.mockRejectedValue(new MailProviderError("Espera para continuar.", 403, kind, 60500));
    const response = await POST(request());
    expect(response.status).toBe(429);
    expect(response.headers.get("Retry-After")).toBe("61");
    expect(await response.json()).toEqual({
      error: "Espera para continuar.",
      code: `mail_${kind}`,
    });
  }
);

it("distinguishes provider permissions from a ConduSoft authorization failure", async () => {
  mock.sync.mockRejectedValue(
    new MailProviderError("Autoriza la lectura.", 403, "reconnect", null)
  );
  const response = await POST(request());
  expect(response.status).toBe(502);
  expect(response.headers.has("Retry-After")).toBe(false);
  expect((await response.json()).code).toBe("mail_reconnect");
});

it("uses the authenticated school even when staff submit another school id", async () => {
  const response = await POST(request({ escuela_id: "10000000-0000-4000-8000-000000000004" }));
  expect(response.status).toBe(200);
  expect(mock.scope).toHaveBeenCalledWith(school, null);
  expect(mock.sync).toHaveBeenCalledWith(school, expect.any(Object));
});

it("rejects fractional and oversized batches before accessing email", async () => {
  for (const max_messages of [1.5, 2001]) {
    expect((await POST(request({ max_messages }))).status).toBe(400);
  }
  expect(mock.sync).not.toHaveBeenCalled();
});
