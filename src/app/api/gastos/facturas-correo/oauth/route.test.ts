// @vitest-environment node
import { beforeEach, afterEach, expect, it, vi } from "vitest";
import { POST, GET } from "./route";
import { decryptSecret, encryptSecret } from "@/lib/email-invoice-sync";
const mock = vi.hoisted(() => ({
  auth: vi.fn(),
  save: vi.fn(),
  exchange: vi.fn(),
  address: vi.fn(),
  cookies: new Map<string, string>(),
  cookieSet: vi.fn(),
  sede: true,
}));
const actor = "10000000-0000-4000-8000-000000000001";
const school = "10000000-0000-4000-8000-000000000002";
const sede = "10000000-0000-4000-8000-000000000003";
vi.mock("next/headers", () => ({
  cookies: async () => ({
    get: (key: string) => ({ value: mock.cookies.get(key) }),
    set: (key: string, value: string, options: unknown) => {
      mock.cookies.set(key, value);
      mock.cookieSet(options);
    },
    delete: ({ name }: { name: string }) => mock.cookies.delete(name),
  }),
}));
vi.mock("@/lib/api-auth", async (original) => ({
  ...(await original<typeof import("@/lib/api-auth")>()),
  authorizeApiRequest: mock.auth,
  buildSupabaseAdminClient: () => ({
    from: () => {
      const query = {
        select: () => query,
        eq: () => query,
        maybeSingle: async () => ({ data: mock.sede ? { id: sede } : null }),
      };
      return query;
    },
  }),
}));
vi.mock("@/lib/email-invoice-sync", async (original) => ({
  ...(await original<typeof import("@/lib/email-invoice-sync")>()),
  saveOAuthEmailIntegration: mock.save,
}));
vi.mock("@/lib/email-oauth-providers", async (original) => ({
  ...(await original<typeof import("@/lib/email-oauth-providers")>()),
  exchangeMailToken: mock.exchange,
  mailAccountAddress: mock.address,
}));
beforeEach(() => {
  vi.clearAllMocks();
  mock.cookies.clear();
  mock.sede = true;
  mock.auth.mockResolvedValue({
    ok: true,
    perfil: { id: actor, rol: "admin_escuela", escuela_id: school, sede_id: sede, activo: true },
  });
  vi.stubEnv("EMAIL_INVOICE_ENCRYPTION_KEY", "test-key");
  vi.stubEnv("EMAIL_INVOICE_GOOGLE_CLIENT_ID", "google-client");
  vi.stubEnv("EMAIL_INVOICE_GOOGLE_CLIENT_SECRET", "google-secret");
  vi.stubEnv("NEXT_PUBLIC_SITE_URL", "https://condusoft.co");
  mock.exchange.mockResolvedValue({ accessToken: "access", refreshToken: "refresh" });
  mock.address.mockResolvedValue("authorized@gmail.com");
  mock.save.mockResolvedValue(undefined);
});
afterEach(() => vi.unstubAllEnvs());
async function start() {
  return POST(
    new Request("https://condusoft.co/api/gastos/facturas-correo/oauth", {
      method: "POST",
      headers: { origin: "https://condusoft.co" },
      body: JSON.stringify({ provider: "gmail_google", sede_id: sede }),
    })
  );
}
function callback(state: string) {
  return GET(
    new Request(
      `https://condusoft.co/api/gastos/facturas-correo/oauth?state=${state}&code=provider-code`
    )
  );
}
function savedState() {
  return JSON.parse(decryptSecret(mock.cookies.get("invoice_mail_oauth")!));
}
it("stores encrypted browser-bound state with a short HttpOnly cookie", async () => {
  const response = await start();
  expect(response.status).toBe(200);
  const body = await response.json();
  expect(body).not.toHaveProperty("refreshToken");
  expect(savedState()).toMatchObject({ actor, school, input: { sede_id: sede } });
  expect(mock.cookieSet).toHaveBeenCalledWith(
    expect.objectContaining({ httpOnly: true, secure: true, sameSite: "lax", maxAge: 600 })
  );
});
it("accepts consent once, uses the provider identity and persists the original school", async () => {
  await start();
  const state = savedState();
  const response = await callback(state.state);
  expect(response.headers.get("location")).toContain("mail=connected");
  expect(mock.save).toHaveBeenCalledWith(
    expect.objectContaining({
      escuelaId: school,
      sedeId: sede,
      actorId: actor,
      correo: "authorized@gmail.com",
      refreshToken: "refresh",
    })
  );
  expect(mock.exchange).toHaveBeenCalledWith(
    "gmail_google",
    expect.objectContaining({ verifier: state.verifier })
  );
  expect((await callback(state.state)).headers.get("location")).toContain("mail=failed");
  expect(mock.save).toHaveBeenCalledTimes(1);
});
it.each(["otro.buzon@gmail.com", "facturas@empresa.example"])(
  "connects the selected Google mailbox %s independently of the administrator login",
  async (correo) => {
    mock.auth.mockResolvedValue({
      ok: true,
      perfil: {
        id: actor,
        email: "admin.personal@example.com",
        rol: "admin_escuela",
        escuela_id: school,
        sede_id: sede,
        activo: true,
      },
    });
    mock.address.mockResolvedValue(correo);
    await start();
    const response = await callback(savedState().state);
    expect(response.headers.get("location")).toContain("mail=connected");
    expect(mock.save).toHaveBeenCalledWith(
      expect.objectContaining({ correo, escuelaId: school, sedeId: sede })
    );
  }
);
it.each(["wrong-state", "expired", "actor-changed", "tampered-cookie", "sede-changed"])(
  "rejects %s before exchanging codes",
  async (scenario) => {
    await start();
    const state = savedState();
    let returned = state.state;
    if (scenario === "wrong-state") returned = "attacker";
    if (scenario === "expired") {
      state.expires = 1;
      mock.cookies.set("invoice_mail_oauth", encryptSecret(JSON.stringify(state)));
    }
    if (scenario === "actor-changed")
      mock.auth.mockResolvedValue({
        ok: true,
        perfil: { id: school, rol: "admin_escuela", escuela_id: school },
      });
    if (scenario === "tampered-cookie") mock.cookies.set("invoice_mail_oauth", "tampered");
    if (scenario === "sede-changed") mock.sede = false;
    expect((await callback(returned)).headers.get("location")).toContain("mail=failed");
    expect(mock.exchange).not.toHaveBeenCalled();
    expect(mock.save).not.toHaveBeenCalled();
  }
);
it("does not persist a token without offline permission", async () => {
  await start();
  const state = savedState();
  mock.exchange.mockResolvedValue({ accessToken: "access" });
  expect((await callback(state.state)).headers.get("location")).toContain("mail=failed");
  expect(mock.save).not.toHaveBeenCalled();
});
it("requires the school-owned destination sede", async () => {
  mock.sede = false;
  expect((await start()).status).toBe(403);
  expect(mock.cookies.size).toBe(0);
});
it("requires an authenticated configure role", async () => {
  mock.auth.mockResolvedValue({ ok: false, response: new Response(null, { status: 403 }) });
  expect((await start()).status).toBe(403);
  expect(mock.cookies.size).toBe(0);
});
it("rejects cross-origin connection requests", async () => {
  const response = await POST(
    new Request("https://condusoft.co/api/gastos/facturas-correo/oauth", {
      method: "POST",
      headers: { origin: "https://attacker.example" },
      body: JSON.stringify({ provider: "gmail_google", sede_id: sede }),
    })
  );
  expect(response.status).toBe(403);
  expect(mock.cookies.size).toBe(0);
});
