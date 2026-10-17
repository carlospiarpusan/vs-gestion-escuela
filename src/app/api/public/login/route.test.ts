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
vi.mock("next/headers", () => ({ cookies: async () => ({ getAll: () => [] }) }));
vi.mock("@supabase/ssr", () => ({ createServerClient: mock.client }));
vi.mock("@/lib/server-db", () => ({ getServerDbPool: () => ({ query: mock.query }) }));
vi.mock("@/lib/rate-limit", () => ({
  rateLimit: mock.limit,
  getRateLimitKey: () => "login:test-ip",
}));
const id = "10000000-0000-4000-8000-000000000001";
const input = { cedula: "12345678", password: "fictional-password" };
const request = (value: unknown = input, origin = "https://condusoft.co") =>
  new Request("https://condusoft.co/api/public/login", {
    method: "POST",
    headers: { "Content-Type": "application/json", Origin: origin },
    body: JSON.stringify(value),
  });
beforeEach(() => {
  vi.resetAllMocks();
  mock.limit.mockResolvedValue({ ok: true });
  mock.query
    .mockResolvedValueOnce({ rows: [{ id, email: "student@example.com", activo: true }] })
    .mockResolvedValue({ rows: [{ id }] });
  mock.signIn.mockResolvedValue({
    data: {
      user: { id },
      session: { access_token: "synthetic-access", refresh_token: "synthetic-refresh" },
    },
    error: null,
  });
  mock.signOut.mockResolvedValue({ error: null });
  mock.client.mockImplementation(
    (
      _url: string,
      _key: string,
      options: { cookies: { setAll: (values: unknown[]) => void } }
    ) => ({
      auth: {
        signInWithPassword: async (value: unknown) => {
          const result = await mock.signIn(value);
          if (!result.error)
            options.cookies.setAll([
              {
                name: "sb-test-auth-token",
                value: "synthetic-session",
                options: { path: "/", secure: true, sameSite: "lax" },
              },
            ]);
          return result;
        },
        signOut: mock.signOut,
      },
    })
  );
});
it("autentica por cédula con correo real sin devolverlo ni exponer tokens como JSON", async () => {
  const response = await POST(request());
  expect(response.status).toBe(200);
  expect(await response.json()).toEqual({ ok: true });
  expect(response.headers.get("cache-control")).toContain("no-store");
  expect(response.headers.get("set-cookie")).toContain("sb-test-auth-token=synthetic-session");
  expect(mock.signIn).toHaveBeenCalledWith({
    email: "student@example.com",
    password: input.password,
  });
});
it("conserva el fallback de cuentas internas antiguas", async () => {
  mock.query
    .mockReset()
    .mockResolvedValueOnce({ rows: [] })
    .mockResolvedValue({ rows: [{ id }] });
  mock.signIn
    .mockResolvedValueOnce({ data: { user: null }, error: { status: 400 } })
    .mockResolvedValue({
      data: {
        user: { id },
        session: { access_token: "synthetic-access", refresh_token: "synthetic-refresh" },
      },
      error: null,
    });
  expect((await POST(request())).status).toBe(200);
  expect(mock.signIn).toHaveBeenNthCalledWith(2, {
    email: "12345678@instructor.local",
    password: input.password,
  });
});
it("no entrega cookies si la contraseña es incorrecta", async () => {
  mock.signIn.mockResolvedValue({
    data: { user: null },
    error: { status: 400, message: "Private backend detail" },
  });
  const response = await POST(request());
  expect(response.status).toBe(401);
  expect(await response.json()).toEqual({ error: "Cédula o contraseña incorrectos." });
  expect(response.headers.get("set-cookie")).toBeNull();
});
it("la cédula sola no permite entrar a cuentas con correo real y contraseña inicial predecible", async () => {
  const response = await POST(request({ ...input, password: input.cedula }));
  expect(response.status).toBe(401);
  expect(await response.json()).toEqual({ error: "Cédula o contraseña incorrectos." });
  expect(mock.signIn).not.toHaveBeenCalled();
  expect(response.headers.get("set-cookie")).toBeNull();
});
it("bloquea usuarios inactivos y cédulas ambiguas sin revelar existencia", async () => {
  for (const rows of [
    [{ id, email: "student@example.com", activo: false }],
    [{ id }, { id: "other" }],
  ]) {
    mock.query.mockReset().mockResolvedValue({ rows });
    const response = await POST(request());
    expect(response.status).toBe(401);
    expect(await response.json()).toEqual({ error: "Cédula o contraseña incorrectos." });
  }
  expect(mock.signIn).not.toHaveBeenCalled();
});
it("no entrega cookies si el usuario autenticado no coincide con el perfil", async () => {
  mock.signIn.mockResolvedValue({
    data: {
      user: { id: "other" },
      session: { access_token: "synthetic-access", refresh_token: "synthetic-refresh" },
    },
    error: null,
  });
  const response = await POST(request());
  expect(response.status).toBe(401);
  expect(response.headers.get("set-cookie")).toBeNull();
  expect(mock.signOut).toHaveBeenCalledWith({ scope: "local" });
});
it("rechaza solicitudes de otro origen antes de consultar datos", async () => {
  expect((await POST(request(input, "https://attacker.example"))).status).toBe(403);
  expect(mock.query).not.toHaveBeenCalled();
  expect(mock.client).not.toHaveBeenCalled();
});
it("limita intentos y evita autenticar cuando la cuota está agotada", async () => {
  mock.limit.mockResolvedValue({ ok: false });
  expect((await POST(request())).status).toBe(429);
  expect(mock.query).not.toHaveBeenCalled();
  expect(mock.client).not.toHaveBeenCalled();
});
it("no filtra fallos de base de datos o del servicio de acceso", async () => {
  mock.query.mockRejectedValue(new Error("private detail"));
  const response = await POST(request());
  expect(response.status).toBe(503);
  expect(JSON.stringify(await response.json())).not.toContain("private detail");
});
