import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { NextResponse } from "next/server";
import {
  GET as listKeys,
  POST as createKey,
  DELETE as revokeKey,
  PATCH as editKey,
} from "@/app/api/integraciones/vs-facturacion/claves/route";
import { POST as searchStudents } from "@/app/api/integraciones/vs-facturacion/v1/alumnos/buscar/route";
import { GET as getStudent } from "@/app/api/integraciones/vs-facturacion/v1/alumnos/[id]/route";
import { GET as connection } from "@/app/api/integraciones/vs-facturacion/v1/conexion/route";
import { VS_BILLING_SCHOOL } from "./scope";

const mocks = vi.hoisted(() => ({
  auth: vi.fn(),
  query: vi.fn(),
  limit: vi.fn(),
  token: vi.fn(),
  keys: vi.fn(),
  rotate: vi.fn(),
  revoke: vi.fn(),
  edit: vi.fn(),
  remove: vi.fn(),
  search: vi.fn(),
  student: vi.fn(),
}));
vi.mock("@/lib/api-auth", async (original) => ({
  ...(await original<typeof import("@/lib/api-auth")>()),
  authorizeApiRequest: mocks.auth,
}));
vi.mock("@/lib/server-db", () => ({ getServerDbPool: () => ({ query: mocks.query }) }));
vi.mock("@/lib/rate-limit", async (original) => ({
  ...(await original<typeof import("@/lib/rate-limit")>()),
  rateLimit: mocks.limit,
}));
vi.mock("./service", () => ({
  authenticateConnectionToken: mocks.token,
  listConnectionKeys: mocks.keys,
  rotateConnectionKey: mocks.rotate,
  revokeConnectionKey: mocks.revoke,
  updateConnectionExpiry: mocks.edit,
  deleteConnectionKey: mocks.remove,
  searchBillingStudents: mocks.search,
  getBillingStudent: mocks.student,
}));
const id = "10000000-0000-4000-8000-000000000001";
const profile = {
  id,
  rol: "admin_escuela",
  activo: true,
  escuela_id: VS_BILLING_SCHOOL.id,
  sede_id: null,
};
function request(method = "GET", body?: unknown, headers?: Record<string, string>, query = "") {
  return new Request(`https://condusoft.co/api/integraciones/vs-facturacion${query}`, {
    method,
    headers: { "Content-Type": "application/json", Origin: "https://condusoft.co", ...headers },
    ...(body ? { body: JSON.stringify(body) } : {}),
  });
}
beforeEach(() => {
  vi.resetAllMocks();
  vi.stubEnv("VS_BILLING_API_ENABLED", "true");
  mocks.auth.mockResolvedValue({ ok: true, perfil: profile });
  mocks.query.mockResolvedValue({ rows: [{ cif: VS_BILLING_SCHOOL.nit }] });
  mocks.limit.mockResolvedValue({ ok: true });
  mocks.token.mockImplementation(async (authorization) =>
    authorization === "Bearer demo" ? id : null
  );
  mocks.keys.mockResolvedValue([]);
  mocks.search.mockResolvedValue({ data: [], next_cursor: null });
});
afterEach(() => vi.unstubAllEnvs());

describe("administracion de claves", () => {
  it.each([listKeys, createKey, revokeKey, editKey])(
    "requiere sesion autenticada",
    async (handler) => {
      mocks.auth.mockResolvedValue({
        ok: false,
        response: NextResponse.json({ error: "No autorizado" }, { status: 401 }),
      });
      expect((await handler(request())).status).toBe(401);
      expect(mocks.query).not.toHaveBeenCalled();
    }
  );
  it("queda desactivado por defecto", async () => {
    vi.stubEnv("VS_BILLING_API_ENABLED", "");
    expect((await listKeys(request())).status).toBe(404);
    expect(mocks.query).not.toHaveBeenCalled();
  });
  it("no permite cambiar escuela mediante parametros", async () => {
    mocks.auth.mockResolvedValue({ ok: true, perfil: { ...profile, escuela_id: id } });
    expect(
      (await listKeys(request("GET", undefined, undefined, `?escuela_id=${VS_BILLING_SCHOOL.id}`)))
        .status
    ).toBe(404);
    expect(mocks.keys).not.toHaveBeenCalled();
  });
  it("no acepta superadministrador sin escuela seleccionada", async () => {
    mocks.auth.mockResolvedValue({
      ok: true,
      perfil: { ...profile, rol: "super_admin", escuela_id: null },
    });
    expect((await listKeys(request())).status).toBe(404);
  });
  it("acepta superadministrador en el contexto autorizado", async () => {
    mocks.auth.mockResolvedValue({
      ok: true,
      perfil: { ...profile, rol: "super_admin", escuela_id: null },
    });
    expect(
      (
        await listKeys(
          request("GET", undefined, { cookie: `dashboard_school_id=${VS_BILLING_SCHOOL.id}` })
        )
      ).status
    ).toBe(200);
  });
  it("comprueba el NIT antes de entregar o crear claves", async () => {
    mocks.query.mockResolvedValue({ rows: [{ cif: "900000000" }] });
    expect((await listKeys(request())).status).toBe(409);
    expect(mocks.keys).not.toHaveBeenCalled();
  });
  it("bloquea CSRF al crear, editar, revocar y eliminar", async () => {
    for (const origin of ["https://otro.example", "null", ""]) {
      expect(
        (await createKey(request("POST", { nombre: "VS", confirmar_rotacion: true }, { origin })))
          .status
      ).toBe(403);
      expect((await revokeKey(request("DELETE", { id }, { origin }))).status).toBe(403);
      expect(
        (await revokeKey(request("DELETE", { id, accion: "eliminar" }, { origin }))).status
      ).toBe(403);
      expect((await editKey(request("PATCH", { id, expires_at: null }, { origin }))).status).toBe(
        403
      );
    }
    expect(mocks.rotate).not.toHaveBeenCalled();
    expect(mocks.revoke).not.toHaveBeenCalled();
    expect(mocks.edit).not.toHaveBeenCalled();
    expect(mocks.remove).not.toHaveBeenCalled();
  });
  it("requiere confirmar expresamente la rotacion", async () => {
    expect((await createKey(request("POST", { nombre: "VS" }))).status).toBe(400);
    expect(mocks.rotate).not.toHaveBeenCalled();
  });
  it("solo devuelve el token una vez al generarlo, sin cache", async () => {
    mocks.rotate.mockResolvedValue({ clave: { id }, token: "demo-secret" });
    const response = await createKey(request("POST", { nombre: "VS", confirmar_rotacion: true }));
    expect(response.status).toBe(201);
    expect(response.headers.get("cache-control")).toBe("private, no-store");
    expect(await response.json()).toHaveProperty("token", "demo-secret");
    expect(await (await listKeys(request())).text()).not.toContain("demo-secret");
  });
  it("no acepta scopes de escritura ni otra escuela", async () => {
    expect(
      (
        await createKey(
          request("POST", { nombre: "VS", confirmar_rotacion: true, scopes: ["alumnos:escribir"] })
        )
      ).status
    ).toBe(400);
    expect(mocks.rotate).not.toHaveBeenCalled();
  });
  it("limita la frecuencia de rotacion", async () => {
    mocks.limit.mockResolvedValue({ ok: false });
    expect(
      (await createKey(request("POST", { nombre: "VS", confirmar_rotacion: true }))).status
    ).toBe(429);
    expect(mocks.rotate).not.toHaveBeenCalled();
  });
  it.each([null, "2099-12-31T23:59:00-05:00"])("permite crear con vigencia %s", async (expiry) => {
    mocks.rotate.mockResolvedValue({ clave: { id, expires_at: expiry }, token: "demo" });
    expect(
      (
        await createKey(
          request("POST", { nombre: "VS", confirmar_rotacion: true, expires_at: expiry })
        )
      ).status
    ).toBe(201);
    expect(mocks.rotate).toHaveBeenCalledWith("VS", id, expiry);
  });
  it.each([null, "2099-12-31T23:59:00-05:00"])(
    "edita vigencia %s sin entregar un token",
    async (expiry) => {
      mocks.edit.mockResolvedValue({ id, expires_at: expiry });
      const response = await editKey(request("PATCH", { id, expires_at: expiry }));
      expect(response.status).toBe(200);
      expect(response.headers.get("cache-control")).toBe("private, no-store");
      expect(await response.json()).toEqual({ clave: { id, expires_at: expiry } });
      expect(mocks.edit).toHaveBeenCalledWith(id, expiry, id);
    }
  );
  it.each([
    {},
    { id },
    { id, expires_at: "2020-01-01T12:00:00Z" },
    { id, expires_at: "2099-02-30T12:00:00Z" },
    { id, expires_at: "infinity" },
    { id, expires_at: "2099-12-31T12:00" },
    { id, expires_at: null, escuela_id: id },
    { id, expires_at: null, revoked_at: null },
    { id, expires_at: null, deleted_at: null },
  ])("rechaza edicion invalida %j", async (body) => {
    expect((await editKey(request("PATCH", body))).status).toBe(400);
    expect(mocks.edit).not.toHaveBeenCalled();
  });
  it("rechaza crear con vigencia pasada", async () => {
    expect(
      (
        await createKey(
          request("POST", {
            nombre: "VS",
            confirmar_rotacion: true,
            expires_at: "2020-01-01T00:00:00Z",
          })
        )
      ).status
    ).toBe(400);
    expect(mocks.rotate).not.toHaveBeenCalled();
  });
  it("no edita una clave inexistente o revocada", async () => {
    mocks.edit.mockResolvedValue(null);
    expect((await editKey(request("PATCH", { id, expires_at: null }))).status).toBe(404);
  });
  it("limita ediciones reiteradas", async () => {
    mocks.limit.mockResolvedValue({ ok: false });
    expect((await editKey(request("PATCH", { id, expires_at: null }))).status).toBe(429);
    expect(mocks.edit).not.toHaveBeenCalled();
  });
  it("conserva DELETE sin accion como revocacion y exige opcion explicita para eliminar", async () => {
    expect((await revokeKey(request("DELETE", { id }))).status).toBe(200);
    expect(mocks.revoke).toHaveBeenCalledWith(id, id);
    expect(mocks.remove).not.toHaveBeenCalled();
    expect((await revokeKey(request("DELETE", { id, accion: "eliminar" }))).status).toBe(200);
    expect(mocks.remove).toHaveBeenCalledWith(id, id);
    expect((await revokeKey(request("DELETE", { id, accion: "borrar_todo" }))).status).toBe(400);
  });
  it("no permite editar ni eliminar desde otra escuela", async () => {
    mocks.auth.mockResolvedValue({ ok: true, perfil: { ...profile, escuela_id: id } });
    expect((await editKey(request("PATCH", { id, expires_at: null }))).status).toBe(404);
    expect((await revokeKey(request("DELETE", { id, accion: "eliminar" }))).status).toBe(404);
    expect(mocks.edit).not.toHaveBeenCalled();
    expect(mocks.remove).not.toHaveBeenCalled();
  });
});

describe("API consumida por vs-facturacion", () => {
  const consumer = (method = "GET", body?: unknown) =>
    request(method, body, { authorization: "Bearer demo" });
  it("no acepta cookies como sustituto del token", async () => {
    expect(
      (await searchStudents(request("POST", { q: "12345678" }, { cookie: "session=demo" }))).status
    ).toBe(401);
    expect(mocks.search).not.toHaveBeenCalled();
  });
  it("no consulta datos cuando la integracion esta desactivada", async () => {
    vi.stubEnv("VS_BILLING_API_ENABLED", "false");
    expect((await connection(consumer())).status).toBe(404);
    expect(mocks.token).not.toHaveBeenCalled();
  });
  it.each([
    { q: "ab" },
    { q: "a".repeat(101) },
    { q: "Persona", escuela_id: id },
    { q: "Persona", incluir_valores: true },
    { q: "Persona", cursor: "not-uuid" },
  ])("valida consulta y no acepta campos adicionales: %j", async (body) => {
    expect((await searchStudents(consumer("POST", body))).status).toBe(400);
    expect(mocks.search).not.toHaveBeenCalled();
  });
  it("busca por el cuerpo POST y no por parametros de URL", async () => {
    const response = await searchStudents(consumer("POST", { q: "Persona" }));
    expect(response.status).toBe(200);
    expect(mocks.search).toHaveBeenCalledWith("Persona", null);
    expect(response.headers.get("cache-control")).toBe("private, no-store");
    expect(response.headers.get("access-control-allow-origin")).toBeNull();
  });
  it("no permite enumerar alumnos ajenos con un UUID", async () => {
    mocks.student.mockResolvedValue(null);
    expect((await getStudent(consumer(), { params: Promise.resolve({ id }) })).status).toBe(404);
  });
  it("valida el UUID antes de consultar", async () => {
    expect(
      (await getStudent(consumer(), { params: Promise.resolve({ id: "' OR true" }) })).status
    ).toBe(400);
    expect(mocks.student).not.toHaveBeenCalled();
  });
  it("anuncia solo los datos basicos y permiso de lectura", async () => {
    const payload = await (await connection(consumer())).json();
    expect(payload.permisos).toEqual(["alumnos:leer"]);
    expect(payload.campos).toEqual([
      "id",
      "nombre",
      "apellidos",
      "nombre_completo",
      "tipo_documento",
      "documento",
      "email",
    ]);
  });
  it("limita consultas por IP y por clave", async () => {
    mocks.limit.mockResolvedValueOnce({ ok: true }).mockResolvedValueOnce({ ok: false });
    const response = await searchStudents(consumer("POST", { q: "Persona" }));
    expect(response.status).toBe(429);
    expect(response.headers.get("retry-after")).toBe("60");
    expect(mocks.search).not.toHaveBeenCalled();
  });
  it("no expone datos internos ante fallos", async () => {
    mocks.search.mockRejectedValue(new Error("PRIVATE SQL AND PASSWORD"));
    const response = await searchStudents(consumer("POST", { q: "Persona" }));
    expect(response.status).toBe(503);
    expect(await response.text()).not.toContain("PRIVATE");
  });
});
