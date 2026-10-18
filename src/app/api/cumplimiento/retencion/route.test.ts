// @vitest-environment node
import { beforeEach, expect, it, vi } from "vitest";
import { NextResponse } from "next/server";
import { GET, POST } from "./route";
import { RetentionError } from "@/lib/data-retention-service";

const mocks = vi.hoisted(() => ({ auth: vi.fn(), read: vi.fn(), change: vi.fn() }));
vi.mock("@/lib/api-auth", async (original) => ({
  ...(await original<typeof import("@/lib/api-auth")>()),
  authorizeApiRequest: mocks.auth,
}));
vi.mock("@/lib/data-retention-service", async (original) => ({
  ...(await original<typeof import("@/lib/data-retention-service")>()),
  getRetentionOverview: mocks.read,
  changeRetention: mocks.change,
}));
const school = "10000000-0000-4000-8000-000000000001",
  other = "10000000-0000-4000-8000-000000000002",
  actor = "20000000-0000-4000-8000-000000000001";
const profile = (rol = "super_admin") => ({ id: actor, rol, escuela_id: school, activo: true });
const request = (body: unknown) =>
  new Request("https://condusoft.co/api/cumplimiento/retencion", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(body),
  });
const command = {
  action: "record",
  schoolId: school,
  cancelledOn: "2026-10-18",
  evidenceRef: "ticket-demo",
  confirmed: true,
};
beforeEach(() => {
  vi.clearAllMocks();
  mocks.auth.mockResolvedValue({ ok: true, perfil: profile() });
  mocks.read.mockResolvedValue({ cases: [] });
  mocks.change.mockResolvedValue({ caseId: other });
});
it("no consulta ni escribe sin autenticacion", async () => {
  mocks.auth.mockResolvedValue({
    ok: false,
    response: NextResponse.json({ error: "No autorizado" }, { status: 401 }),
  });
  expect((await GET(new Request("https://condusoft.co/api/cumplimiento/retencion"))).status).toBe(
    401
  );
  expect((await POST(request(command))).status).toBe(401);
  expect(mocks.read).not.toHaveBeenCalled();
  expect(mocks.change).not.toHaveBeenCalled();
});
it("el administrador consulta solo su escuela aunque solicite otra", async () => {
  mocks.auth.mockResolvedValue({ ok: true, perfil: profile("admin_escuela") });
  const response = await GET(
    new Request(`https://condusoft.co/api/cumplimiento/retencion?escuela_id=${other}`)
  );
  expect(response.status).toBe(200);
  expect(mocks.read).toHaveBeenCalledWith(school);
  expect(response.headers.get("cache-control")).toBe("no-store");
});
it("el superadministrador puede seleccionar la escuela y registrar una baja confirmada", async () => {
  await GET(new Request(`https://condusoft.co/api/cumplimiento/retencion?escuela_id=${other}`));
  expect(mocks.read).toHaveBeenCalledWith(other);
  expect((await POST(request(command))).status).toBe(200);
  expect(mocks.auth).toHaveBeenLastCalledWith(["super_admin"], expect.any(Request));
  expect(mocks.change).toHaveBeenCalledWith(command, actor);
});
it("exige confirmacion y rechaza acciones o campos no previstos", async () => {
  for (const body of [
    { ...command, confirmed: false },
    { ...command, action: "delete" },
    { ...command, deleteStudents: true },
    { ...command, cancelledOn: "2026-02-30" },
  ])
    expect((await POST(request(body))).status).toBe(400);
  expect(mocks.change).not.toHaveBeenCalled();
});
it("devuelve conflictos sin exponer errores internos", async () => {
  mocks.change.mockRejectedValueOnce(new RetentionError("Baja ya registrada", 409));
  expect((await POST(request(command))).status).toBe(409);
  mocks.change.mockRejectedValueOnce(new Error("private connection string"));
  const response = await POST(request(command));
  expect(response.status).toBe(500);
  expect(JSON.stringify(await response.json())).not.toContain("private");
});
