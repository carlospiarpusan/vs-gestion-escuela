// @vitest-environment node
import { beforeEach, expect, it, vi } from "vitest";
import { POST } from "./route";

const mock = vi.hoisted(() => ({
  query: vi.fn(),
  limit: vi.fn(),
  client: vi.fn(),
  signIn: vi.fn(),
  signOut: vi.fn(),
}));
vi.mock("@supabase/supabase-js", () => ({ createClient: mock.client }));
vi.mock("@/lib/server-db", () => ({ getServerDbPool: () => ({ query: mock.query }) }));
vi.mock("@/lib/rate-limit", () => ({
  rateLimit: mock.limit,
  getRateLimitKey: () => "login:test-ip",
}));
const id = "10000000-0000-4000-8000-000000000001";
const session = { access_token: "synthetic-access", refresh_token: "synthetic-refresh" };
const input = { cedula: "12345678", password: "  Test-Password-123  " };
function request(value: unknown = input, origin?: string, contentType = "application/json") {
  return new Request("https://condusoft.co/api/public/mobile-login", {
    method: "POST",
    headers: { "Content-Type": contentType, ...(origin ? { Origin: origin } : {}) },
    body: JSON.stringify(value),
  });
}
beforeEach(() => {
  vi.resetAllMocks();
  mock.limit.mockResolvedValue({ ok: true });
  mock.query
    .mockResolvedValueOnce({ rows: [{ id, email: "instructor@example.test", activo: true }] })
    .mockResolvedValue({ rows: [{ id }] });
  mock.signIn.mockResolvedValue({ data: { user: { id }, session }, error: null });
  mock.signOut.mockResolvedValue({ error: null });
  mock.client.mockReturnValue({ auth: { signInWithPassword: mock.signIn, signOut: mock.signOut } });
});
it("autentica al instructor con correo real desde Android sin revelar el correo", async () => {
  const response = await POST(request());
  expect(response.status).toBe(200);
  expect(await response.json()).toEqual({ session });
  expect(response.headers.get("set-cookie")).toBeNull();
  expect(response.headers.get("cache-control")).toContain("no-store");
  expect(mock.signIn).toHaveBeenCalledExactlyOnceWith({
    email: "instructor@example.test",
    password: input.password,
  });
  expect(mock.client.mock.calls[0][2].auth).toMatchObject({
    persistSession: false,
    autoRefreshToken: false,
  });
});
it.each([
  { rows: [{ id, email: "instructor@example.test", activo: false }] },
  { rows: [{ id }, { id: "another" }] },
])("no autentica un perfil inactivo o una cedula ambigua", async ({ rows }) => {
  mock.query.mockReset().mockResolvedValue({ rows });
  expect((await POST(request())).status).toBe(401);
  expect(mock.signIn).not.toHaveBeenCalled();
});
it("conserva la proteccion de contrasena inicial igual a cedula", async () => {
  expect((await POST(request({ ...input, password: input.cedula }))).status).toBe(401);
  expect(mock.signIn).not.toHaveBeenCalled();
});
it("no entrega tokens si la cuenta autenticada no coincide con el perfil", async () => {
  mock.signIn.mockResolvedValue({ data: { user: { id: "other" }, session }, error: null });
  const response = await POST(request());
  expect(response.status).toBe(401);
  expect(await response.json()).toEqual({ error: "Cédula o contraseña incorrectos." });
  expect(mock.signOut).toHaveBeenCalledWith({ scope: "local" });
});
it.each([400, 429, 503])(
  "no expone tokens ni detalles privados ante un error %s",
  async (status) => {
    mock.signIn.mockResolvedValue({
      data: { user: null, session: null },
      error: { status, message: "private backend detail" },
    });
    const response = await POST(request());
    expect(response.status).toBe(status === 400 ? 401 : status);
    const body = JSON.stringify(await response.json());
    expect(body).not.toContain("synthetic");
    expect(body).not.toContain("private backend detail");
  }
);
it("comparte el limite de intentos y rechaza el acceso cuando se agota", async () => {
  mock.limit.mockResolvedValue({ ok: false });
  expect((await POST(request())).status).toBe(429);
  expect(mock.query).not.toHaveBeenCalled();
});
it("rechaza otro origen y formatos no JSON antes de leer cuentas", async () => {
  expect((await POST(request(input, "https://attacker.example"))).status).toBe(403);
  expect((await POST(request(input, undefined, "text/plain"))).status).toBe(415);
  expect(mock.query).not.toHaveBeenCalled();
});
