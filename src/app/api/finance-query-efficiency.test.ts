// @vitest-environment node
import { PGlite } from "@electric-sql/pglite";
import { afterAll, beforeAll, beforeEach, expect, it, vi } from "vitest";
import { GET as expenses } from "./gastos/route";
import { GET as income } from "./ingresos/route";
import { GET as students } from "./alumnos/opciones/route";

const mocks = vi.hoisted(() => ({
  auth: vi.fn(),
  query: vi.fn(),
  cache: new Map<string, unknown>(),
}));
vi.mock("@/lib/api-auth", async (original) => ({
  ...(await original<typeof import("@/lib/api-auth")>()),
  authorizeApiRequest: mocks.auth,
}));
vi.mock("@/lib/server-db", () => ({ getServerDbPool: () => ({ query: mocks.query }) }));
vi.mock("@/lib/server-read-cache", () => ({
  getServerReadCached: async ({
    key,
    bypass,
    loader,
  }: {
    key: string;
    bypass?: boolean;
    loader: () => Promise<unknown>;
  }) => {
    if (!bypass && mocks.cache.has(key)) return mocks.cache.get(key);
    const result = await loader();
    if (!bypass) mocks.cache.set(key, result);
    return result;
  },
}));
let db: PGlite;
const school = "10000000-0000-4000-8000-000000000001",
  branch = "10000000-0000-4000-8000-000000000002",
  otherBranch = "10000000-0000-4000-8000-000000000003";
const student = "10000000-0000-4000-8000-000000000004",
  matricula = "10000000-0000-4000-8000-000000000005";
const profile = {
  id: student,
  escuela_id: school,
  sede_id: branch,
  rol: "admin_sede",
  activo: true,
};
beforeAll(async () => {
  db = new PGlite();
  await db.exec(`
 create table alumnos(id uuid primary key,escuela_id uuid,sede_id uuid,nombre text,apellidos text,dni text,tipo_registro text default 'regular',estado text default 'activo',categorias text[],valor_total numeric,fecha_inscripcion date,numero_contrato text,created_at timestamptz default now());
 create table matriculas_alumno(id uuid primary key,escuela_id uuid,sede_id uuid,alumno_id uuid,numero_contrato text,categorias text[],valor_total numeric,fecha_inscripcion date,estado text default 'activo',created_at timestamptz default now());
 create table ingresos(id uuid default gen_random_uuid(),escuela_id uuid,sede_id uuid,alumno_id uuid,matricula_id uuid,categoria text,concepto text,monto numeric,estado text,metodo_pago text,numero_factura text,fecha date,fecha_vencimiento date,created_at timestamptz default now());
 create table gastos(id uuid default gen_random_uuid(),escuela_id uuid,sede_id uuid,categoria text,concepto text,monto numeric,estado_pago text,metodo_pago text,numero_factura text,fecha date,fecha_vencimiento date,recurrente boolean default false,proveedor text,notas text,created_at timestamptz default now());
 insert into alumnos(id,escuela_id,sede_id,nombre,apellidos,dni,fecha_inscripcion,valor_total) values('${student}','${school}','${branch}','Ana','Demo','123456','2026-10-01',1000);
 insert into matriculas_alumno(id,escuela_id,sede_id,alumno_id,numero_contrato,categorias,valor_total,fecha_inscripcion) values('${matricula}','${school}','${branch}','${student}','CT-123',array['A2'],1000,'2026-10-01');
 insert into ingresos(escuela_id,sede_id,alumno_id,matricula_id,categoria,concepto,monto,estado,metodo_pago,fecha) select '${school}','${branch}','${student}','${matricula}','matricula','Abono '||n,10,'cobrado','efectivo','2026-10-01' from generate_series(1,18)n;
 insert into gastos(escuela_id,sede_id,categoria,concepto,monto,estado_pago,metodo_pago,fecha,fecha_vencimiento,proveedor) values
 ('${school}','${branch}','otros','Compra',100,'pagado','efectivo','2026-10-01','2026-10-01','Demo'),
 ('${school}','${branch}','tramitador','Gestión',50,'pendiente','nequi','2026-10-01','2020-01-01','Gestor'),
 ('${school}','${otherBranch}','otros','Otra sede',999,'pagado','efectivo','2026-10-01','2026-10-01','Otro');
 `);
}, 15000);
afterAll(async () => {
  await db?.close();
});
beforeEach(() => {
  vi.clearAllMocks();
  mocks.cache.clear();
  mocks.auth.mockResolvedValue({ ok: true, perfil: profile });
  mocks.query.mockImplementation((sql: string, values?: unknown[]) => db.query(sql, values));
});
const req = (path: string) => new Request(`https://example.com/api/${path}`);
it("executes one SQL statement for all expense summaries, preserving branch totals and payables", async () => {
  const r = await expenses(req("gastos?from=2026-10-01&to=2026-10-31"));
  expect(r.status).toBe(200);
  const p = await r.json();
  expect(mocks.query).toHaveBeenCalledTimes(1);
  expect(p.summary).toMatchObject({ gastosTotales: 150, totalGastos: 2 });
  expect(p.payables).toMatchObject({ totalPendiente: 50, vencido: 50 });
  expect(p.breakdown.gastosPorCategoria).toHaveLength(2);
  expect(p.breakdown.topProveedoresGasto[0].concepto).toBe("Demo");
  expect(p.breakdown.tramitadorPortfolio[0].pendiente).toBe(50);
});
it("only queries the ledger on another page, and refreshes the summary when filters or fresh change", async () => {
  const url = "ingresos?from=2026-10-01&to=2026-10-31&pageSize=15";
  let r = await income(req(url));
  expect(r.status).toBe(200);
  let p = await r.json();
  expect(p.ledger.rows).toHaveLength(15);
  expect(p.ledger.totalCount).toBe(18);
  expect(mocks.query).toHaveBeenCalledTimes(2);
  r = await income(req(url + "&page=1"));
  p = await r.json();
  expect(p.ledger.rows).toHaveLength(3);
  expect(p.ledger.totalCount).toBe(18);
  expect(mocks.query).toHaveBeenCalledTimes(3);
  await income(req(url + "&metodo=nequi"));
  expect(mocks.query).toHaveBeenCalledTimes(5);
  await income(req(url + "&fresh=1"));
  expect(mocks.query).toHaveBeenCalledTimes(7);
});
it("returns empty expense arrays and zero totals for an empty period", async () => {
  const r = await expenses(req("gastos?from=2027-10-01&to=2027-10-31"));
  expect(r.status).toBe(200);
  const p = await r.json();
  expect(p.summary.gastosTotales).toBe(0);
  expect(p.breakdown.gastosPorCategoria).toEqual([]);
});
it("does not transfer catalogs for an empty search, and searches by contract with branch scope", async () => {
  expect((await students(req("alumnos/opciones"))).status).toBe(200);
  expect(mocks.query).not.toHaveBeenCalled();
  let p = await (await students(req("alumnos/opciones?q=CT-123"))).json();
  expect(p.rows.map((r: { id: string }) => r.id)).toEqual([student]);
  expect(p.hasMore).toBe(false);
  p = await (await students(req(`alumnos/opciones?id=${student}&matriculas=1`))).json();
  expect(p.matriculas.map((r: { id: string }) => r.id)).toEqual([matricula]);
});
it("paginates student results without counting or returning other branches", async () => {
  await db.exec(
    `insert into alumnos(id,escuela_id,sede_id,nombre,apellidos,dni) select gen_random_uuid(),'${school}','${branch}','Prueba',lpad(n::text,2,'0'),'9'||n from generate_series(1,23)n;`
  );
  let p = await (await students(req("alumnos/opciones?q=Prueba"))).json();
  expect(p.rows).toHaveLength(20);
  expect(p.hasMore).toBe(true);
  p = await (await students(req("alumnos/opciones?q=Prueba&page=1"))).json();
  expect(p.rows).toHaveLength(3);
  expect(p.hasMore).toBe(false);
  mocks.auth.mockResolvedValue({ ok: true, perfil: { ...profile, sede_id: otherBranch } });
  p = await (await students(req("alumnos/opciones?q=Prueba"))).json();
  expect(p.rows).toEqual([]);
});
it("rejects a missing branch before SQL and validates selected IDs", async () => {
  expect((await students(req("alumnos/opciones?id=bad"))).status).toBe(400);
  mocks.auth.mockResolvedValue({ ok: true, perfil: { ...profile, sede_id: null } });
  expect((await students(req("alumnos/opciones?q=Ana"))).status).toBe(403);
  expect(mocks.query).not.toHaveBeenCalled();
});
