// @vitest-environment node
import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({ query: vi.fn(), authorize: vi.fn() }));
vi.mock("@/lib/api-auth", async (original) => ({
  ...(await original<typeof import("@/lib/api-auth")>()),
  authorizeApiRequest: mocks.authorize,
  resolveEscuelaIdForRequest: (_request: Request, perfil: { escuela_id: string }) =>
    perfil.escuela_id,
}));
vi.mock("@/lib/server-db", () => ({ getServerDbPool: () => ({ query: mocks.query }) }));
vi.mock("@/lib/server-read-cache", () => ({
  getServerReadCached: ({ loader }: { loader: () => unknown }) => loader(),
}));

import { GET as getAlumnos } from "./alumnos/route";
import { GET as getReport } from "./reportes/contables/route";

const perfil = {
  id: "11111111-1111-4111-8111-111111111111",
  rol: "admin_escuela",
  escuela_id: "22222222-2222-4222-8222-222222222222",
  sede_id: null,
  activo: true,
};

beforeEach(() => {
  vi.clearAllMocks();
  mocks.authorize.mockResolvedValue({ ok: true, perfil });
  mocks.query.mockResolvedValue({ rows: [] });
});

describe("parallel dashboard reads", () => {
  it("starts student catalogs without waiting for the list", async () => {
    let release!: () => void;
    const ready = new Promise<void>((resolve) => {
      release = resolve;
    });
    mocks.query.mockImplementation(async () => {
      await ready;
      return { rows: [] };
    });
    const responsePromise = getAlumnos(
      new Request("https://example.com/api/alumnos?include_catalogs=1")
    );
    await vi.waitFor(() => expect(mocks.query).toHaveBeenCalledTimes(5));
    expect(mocks.query.mock.calls.some(([sql]) => sql.includes("select categorias"))).toBe(true);
    for (const [, values] of mocks.query.mock.calls) expect(values[0]).toBe(perfil.escuela_id);
    release();
    const body = await (await responsePromise).json();
    expect(body.totalCount).toBe(0);
    expect(body._catalogs).toEqual({
      categoriasEscuela: [],
      tramitadorOptions: [],
      defaultSedeId: null,
    });
  });

  it("does not query catalogs on subsequent list requests", async () => {
    await getAlumnos(new Request("https://example.com/api/alumnos"));
    expect(mocks.query).toHaveBeenCalledTimes(2);
  });

  it("starts report schools, years and branches together", async () => {
    let release!: () => void;
    const ready = new Promise<void>((resolve) => {
      release = resolve;
    });
    mocks.query.mockImplementation(async () => {
      await ready;
      return { rows: [] };
    });
    const responsePromise = getReport(
      new Request("https://example.com/api/reportes/contables?include=options")
    );
    await vi.waitFor(() => expect(mocks.query).toHaveBeenCalledTimes(3));
    release();
    expect((await responsePromise).status).toBe(200);
  });

  it("keeps a branch administrator scoped to their branch", async () => {
    const sedeId = "33333333-3333-4333-8333-333333333333";
    mocks.authorize.mockResolvedValue({
      ok: true,
      perfil: { ...perfil, rol: "admin_sede", sede_id: sedeId },
    });
    const response = await getReport(
      new Request(
        "https://example.com/api/reportes/contables?include=options&sede_id=44444444-4444-4444-8444-444444444444"
      )
    );
    const body = await response.json();
    expect(body.filters.scope).toEqual({ escuelaId: perfil.escuela_id, sedeId });
    expect(mocks.query).toHaveBeenCalledWith(
      "select id, nombre, escuela_id from sedes where id = $1",
      [sedeId]
    );
  });

  it.each([getAlumnos, getReport])("does not query data before authorization", async (handler) => {
    mocks.authorize.mockResolvedValue({ ok: false, response: new Response(null, { status: 401 }) });
    expect((await handler(new Request("https://example.com/api/test"))).status).toBe(401);
    expect(mocks.query).not.toHaveBeenCalled();
  });
});
