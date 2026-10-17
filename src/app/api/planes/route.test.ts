// @vitest-environment node
import { beforeEach, expect, it, vi } from "vitest";
import { NextResponse } from "next/server";
import { PATCH } from "./route";
const mock = vi.hoisted(() => ({ auth: vi.fn(), query: vi.fn() }));
vi.mock("@/lib/api-auth", async (original) => ({
  ...(await original<typeof import("@/lib/api-auth")>()),
  authorizeApiRequest: mock.auth,
}));
vi.mock("@/lib/server-db", () => ({ getServerDbPool: () => ({ query: mock.query }) }));
vi.mock("@/lib/server-read-cache", () => ({
  getServerReadCached: vi.fn(),
  revalidateServerReadCache: vi.fn(),
}));
const id = "10000000-0000-4000-8000-000000000001";
beforeEach(() => {
  vi.clearAllMocks();
  mock.auth.mockResolvedValue({ ok: true, perfil: { id, rol: "super_admin" } });
  mock.query.mockResolvedValue({
    rowCount: 1,
    rows: [{ id: "basico", precio_mensual: 0, precio_anual: 0, caracteristicas: [] }],
  });
});
function request(body: unknown) {
  return new Request("http://localhost/api/planes", {
    method: "PATCH",
    body: JSON.stringify(body),
  });
}
it.each([
  null,
  [],
  { id: "basico", precio_mensual: null },
  { id: "basico", precio_mensual: true },
  { id: "basico", precio_anual: "" },
  { id: "basico", activo: "false" },
  { id: "basico", max_alumnos_default: 1.5 },
  { id: "basico", max_sedes_default: 2.9 },
  { id: "basico", caracteristicas: [{ invalid: true }] },
  { id: "basico", nombre: {} },
])("rechaza valores de plan de tipo incorrecto antes de escribir (%j)", async (body) => {
  const response = await PATCH(request(body));
  expect(response.status).toBe(400);
  expect(mock.query).not.toHaveBeenCalled();
});
it("acepta precio cero y desactivacion explicitos del superadministrador", async () => {
  const response = await PATCH(request({ id: "basico", precio_mensual: 0, activo: false }));
  expect(response.status).toBe(200);
  expect(mock.query).toHaveBeenCalledWith(expect.any(String), [0, false, id, "basico"]);
});
it("no escribe planes si la autorizacion es rechazada", async () => {
  mock.auth.mockResolvedValue({
    ok: false,
    response: NextResponse.json({ error: "No autorizado" }, { status: 403 }),
  });
  expect((await PATCH(request({ id: "basico", precio_mensual: 0 }))).status).toBe(403);
  expect(mock.query).not.toHaveBeenCalled();
});
