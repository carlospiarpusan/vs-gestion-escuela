// @vitest-environment node
import { PGlite } from "@electric-sql/pglite";
import { beforeAll, afterAll, beforeEach, afterEach, it, expect, vi } from "vitest";
import { NextResponse } from "next/server";
import { GET } from "./route";

const mock = vi.hoisted(() => ({
  auth: vi.fn(),
  query: vi.fn(),
  cache: new Map<string, unknown>(),
  cacheCall: vi.fn(),
}));
vi.mock("server-only", () => ({}));
vi.mock("@/lib/api-auth", async (original) => ({
  ...(await original<typeof import("@/lib/api-auth")>()),
  authorizeApiRequest: mock.auth,
}));
vi.mock("@/lib/server-db", () => ({ getServerDbPool: () => ({ query: mock.query }) }));
vi.mock("@/lib/server-read-cache", () => ({
  getServerReadCached: async (options: {
    key: string[];
    tags: string[];
    bypass: boolean;
    loader: () => Promise<unknown>;
  }) => {
    mock.cacheCall(options);
    const key = JSON.stringify(options.key);
    if (!options.bypass && mock.cache.has(key)) return mock.cache.get(key);
    const result = await options.loader();
    if (!options.bypass) mock.cache.set(key, result);
    return result;
  },
}));
const school = "10000000-0000-4000-8000-000000000001",
  branch = "10000000-0000-4000-8000-000000000002",
  otherBranch = "10000000-0000-4000-8000-000000000003",
  otherSchool = "10000000-0000-4000-8000-000000000009";
const a1 = "20000000-0000-4000-8000-000000000001",
  a2 = "20000000-0000-4000-8000-000000000002",
  a3 = "20000000-0000-4000-8000-000000000003",
  a4 = "20000000-0000-4000-8000-000000000004";
const m1 = "30000000-0000-4000-8000-000000000001",
  m2 = "30000000-0000-4000-8000-000000000002",
  cancelled = "30000000-0000-4000-8000-000000000003";
const profile = { id: a1, rol: "admin_sede", escuela_id: school, sede_id: branch, activo: true };
let db: PGlite;
beforeAll(async () => {
  db = new PGlite();
  await db.exec(`
    create table sedes(id uuid primary key,escuela_id uuid,nombre text);
    create table alumnos(id uuid primary key,escuela_id uuid,sede_id uuid,tipo_registro text,valor_total numeric,fecha_inscripcion date,created_at timestamptz default now(),email text,telefono text,direccion text,dni text,tipo_documento text);
    create table matriculas_alumno(id uuid primary key,escuela_id uuid,sede_id uuid,alumno_id uuid,valor_total numeric,fecha_inscripcion date,categorias text[],estado text default 'activo');
    create table ingresos(escuela_id uuid,sede_id uuid,alumno_id uuid,matricula_id uuid,fecha date,fecha_vencimiento date,estado text,monto numeric,categoria text);
    create table gastos(escuela_id uuid,sede_id uuid,fecha date,estado_pago text,monto numeric,categoria text);
    insert into sedes values ('${branch}','${school}','Centro'),('${otherBranch}','${school}','Norte'),('${otherSchool}','${otherSchool}','Privada');
    insert into alumnos(id,escuela_id,sede_id,tipo_registro,valor_total,fecha_inscripcion,email,telefono,direccion,dni,tipo_documento) values
      ('${a1}','${school}','${branch}','regular',1000,'2026-01-01','demo@example.invalid','123','Calle','111','CC'),
      ('${a2}','${school}','${branch}','regular',500,'2026-10-10',null,'123','Calle','1.1.1','CC'),
      ('${a3}','${school}','${branch}','practica_adicional',300,'2026-04-01','demo@example.invalid','123','Calle','222','CC'),
      ('${a4}','${school}','${branch}','regular',1000,'2025-01-01','demo@example.invalid','123','Calle','333','CC'),
      ('${otherBranch}','${school}','${otherBranch}','regular',9000,'2026-10-01',null,null,null,'111','CC'),
      ('${otherSchool}','${otherSchool}','${otherSchool}','regular',99999,'2026-10-01',null,null,null,'111','CC');
    insert into matriculas_alumno values
      ('${m1}','${school}','${branch}','${a1}',1000,'2026-01-01',array['B1'],'activo'),
      ('${m2}','${school}','${branch}','${a2}',500,'2026-10-10',array['A2 Y B1'],'activo'),
      ('${cancelled}','${school}','${branch}','${a2}',900,'2026-10-05',array['A2'],'cancelado'),
      ('${otherBranch}','${school}','${otherBranch}','${otherBranch}',9000,'2026-10-01',array['A2'],'activo'),
      ('${otherSchool}','${otherSchool}','${otherSchool}','${otherSchool}',99999,'2026-10-01',array['A2'],'activo');
    insert into ingresos values
      ('${school}','${branch}','${a1}','${m1}','2026-01-10',null,'cobrado',100,'matricula'),
      ('${school}','${branch}','${a1}','${m1}','2026-10-10',null,'cobrado',100,'matricula'),
      ('${school}','${branch}','${a1}','${m1}','2026-10-03','2026-10-20','pendiente',200,'matricula'),
      ('${school}','${branch}','${a1}','${m1}','2026-10-04','2026-11-05','pendiente',300,'matricula'),
      ('${school}','${branch}','${a2}','${m2}','2026-10-10',null,'cobrado',100,'matricula'),
      ('${school}','${branch}','${a3}',null,'2026-04-05',null,'cobrado',100,'clase_suelta'),
      ('${school}','${branch}',null,null,'2026-10-10',null,'pendiente',50,'clase_suelta'),
      ('${school}','${branch}','${a1}',null,'2026-10-01',null,'cobrado',25,'matricula'),
      ('${school}','${branch}',null,null,'2026-10-01',null,'anulado',900,'otros'),
      ('${school}','${branch}',null,null,'2026-10-27',null,'cobrado',900,'otros'),
      ('${school}','${branch}',null,null,'2026-09-01',null,'cobrado',50,'otros'),
      ('${school}','${branch}',null,null,'2026-09-27',null,'cobrado',20,'otros'),
      ('${school}','${otherBranch}',null,null,'2026-10-01',null,'cobrado',9000,'otros'),
      ('${otherSchool}','${otherSchool}',null,null,'2026-10-01',null,'cobrado',99999,'otros');
    insert into gastos values
      ('${school}','${branch}','2026-10-10','pagado',80,'combustible'),
      ('${school}','${branch}','2026-10-11','pendiente',60,'otros'),
      ('${school}','${branch}','2026-10-12','anulado',500,'otros'),
      ('${school}','${branch}','2026-09-01','pagado',40,'combustible'),
      ('${school}','${branch}','2026-09-27','pagado',200,'combustible'),
      ('${school}','${otherBranch}','2026-10-01','pagado',9000,'otros'),
      ('${otherSchool}','${otherSchool}','2026-10-01','pagado',99999,'otros');
  `);
}, 20000);
afterAll(async () => {
  vi.useRealTimers();
  await db?.close();
});
beforeEach(async () => {
  vi.clearAllMocks();
  mock.cache.clear();
  vi.useFakeTimers({ toFake: ["Date"] });
  vi.setSystemTime(new Date("2026-10-26T15:00:00Z"));
  mock.auth.mockResolvedValue({ ok: true, perfil: profile });
  mock.query.mockImplementation((sql: string, values: unknown[]) => db.query(sql, values));
  await db.exec("begin");
});
afterEach(async () => {
  await db.exec("rollback");
  vi.useRealTimers();
});
const req = (query = "") => new Request(`https://example.com/api/reportes/analisis?${query}`);
async function read(query = "") {
  const response = await GET(req(query));
  expect(response.status).toBe(200);
  return response.json();
}

it("executes one read-only statement and returns only scoped aggregates, never student identities", async () => {
  const r = await read(`escuela_id=${otherSchool}&sede_id=${otherBranch}`);
  expect(mock.query).toHaveBeenCalledTimes(1);
  expect(r.scope).toEqual({ schoolId: school, branchId: branch });
  expect(r.current).toMatchObject({
    enrollments: 1,
    collected: 225,
    collectedCount: 3,
    paidExpenses: 80,
    pendingExpenses: 60,
    cashFlow: 145,
  });
  expect(r.previous).toMatchObject({ collected: 50, paidExpenses: 40 });
  expect(r.courses).toEqual([{ label: "A2 + B1", count: 1 }]);
  expect(r.quality).toMatchObject({
    students: 4,
    incompleteContact: 1,
    duplicateDocuments: 1,
    regularsWithoutContract: 1,
    unlinkedCollections: 1,
  });
  expect(JSON.stringify(r)).not.toMatch(/demo@example|1\.1\.1|Privada|99999/);
  expect(r.branches.map((b: { name: string }) => b.name)).toEqual(["Centro"]);
  expect(r.periods).toBeUndefined();
  expect(mock.query.mock.calls[0][0]).not.toMatch(
    /facturax|insert into|update public|delete from/i
  );
});
it("includes old outstanding contracts without counting pending installments twice or calling unknown dates overdue", async () => {
  const r = await read();
  expect(r.portfolio).toMatchObject({
    balance: 1450,
    obligations: 4,
    overdue: 200,
    withoutSchedule: 950,
  });
  expect(r.portfolio.aging.find((b: { bucket: string }) => b.bucket === "90+").balance).toBe(1000);
  expect(r.alerts.map((a: { id: string }) => a.id)).toContain("overdue");
});
it("keeps current debt independent of a historical period and caps overdue installments at remaining balance", async () => {
  await db.exec(
    `insert into ingresos values('${school}','${branch}','${a1}','${m1}','2026-10-15','2026-10-16','pendiente',900,'matricula')`
  );
  const r = await read("year=2025&month=01");
  expect(r.current.collected).toBe(0);
  expect(r.portfolio.balance).toBe(1450);
  expect(r.portfolio.overdue).toBe(800);
  expect(r.window.today).toBe("2026-10-26");
});
it("does not broaden a staff profile without a branch or execute SQL for invalid filters", async () => {
  for (const query of [
    "year=2027",
    "month=11",
    "month=13",
    "year=2026.5",
    "sede_id=bad",
    "foo=1",
    "year=1;select 1",
    `sede_id=bad&sede_id=${branch}`,
  ])
    expect((await GET(req(query))).status).toBe(400);
  expect(mock.query).not.toHaveBeenCalled();
  mock.auth.mockResolvedValue({ ok: true, perfil: { ...profile, sede_id: null } });
  expect((await GET(req())).status).toBe(403);
  expect(mock.query).not.toHaveBeenCalled();
});
it("rejects absent authentication and limits allowed roles before querying", async () => {
  mock.auth.mockResolvedValue({
    ok: false,
    response: NextResponse.json({ error: "No autorizado" }, { status: 401 }),
  });
  expect((await GET(req())).status).toBe(401);
  expect(mock.auth).toHaveBeenCalledWith([
    "super_admin",
    "admin_escuela",
    "admin_sede",
    "administrativo",
  ]);
  expect(mock.query).not.toHaveBeenCalled();
});
it("school admins can select a branch, but never a branch belonging to another school", async () => {
  mock.auth.mockResolvedValue({ ok: true, perfil: { ...profile, rol: "admin_escuela" } });
  const all = await read();
  expect(all.current.collected).toBe(9225);
  expect(all.quality.students).toBe(5);
  const selected = await read(`sede_id=${otherBranch}`);
  expect(selected.current.collected).toBe(9000);
  expect(selected.branches.map((b: { name: string }) => b.name)).toEqual(["Centro", "Norte"]);
  expect((await GET(req(`sede_id=${otherSchool}`))).status).toBe(403);
});
it("isolates cache entries by identity, school, branch, comparison window and manual refresh", async () => {
  await read();
  await read();
  expect(mock.query).toHaveBeenCalledTimes(1);
  await read("fresh=1");
  expect(mock.query).toHaveBeenCalledTimes(2);
  mock.auth.mockResolvedValue({ ok: true, perfil: { ...profile, sede_id: otherBranch } });
  await read();
  expect(mock.query).toHaveBeenCalledTimes(3);
  expect(mock.cacheCall.mock.calls[0][0].tags).toContain(`finance:reports:school:${school}`);
  expect(mock.cacheCall.mock.calls[0][0].ttlMs).toBe(300000);
});
it("zero-fills months, reports missing values without inventing revenue, and has no comparison growth without a base", async () => {
  const r = await read("year=2026&month=all");
  expect(r.monthly).toHaveLength(10);
  expect(r.monthly.find((m: { month: string }) => m.month === "2026-02")).toMatchObject({
    enrollments: 0,
    collected: 0,
    paidExpenses: 0,
  });
  await db.exec(`update matriculas_alumno set valor_total=null where id='${m2}'`);
  const next = await read("fresh=1");
  expect(next.quality.contractsWithoutValue).toBe(1);
  expect(next.portfolio.balance).toBe(1050);
  expect(next.changes.enrollments).toBeNull();
});
it("returns a generic failure without source SQL, identities or secrets", async () => {
  const consoleSpy = vi.spyOn(console, "error").mockImplementation(() => {});
  mock.query.mockRejectedValueOnce(new Error("private database secret@example.invalid"));
  const response = await GET(req());
  expect(response.status).toBe(500);
  expect(JSON.stringify(await response.json())).not.toContain("secret@example.invalid");
  expect(consoleSpy).toHaveBeenCalledWith("school_analysis_failed");
  consoleSpy.mockRestore();
});

it("aggregates ten thousand movements without transferring source rows or adding SQL roundtrips", async () => {
  await db.exec(`
    insert into ingresos select '${school}','${branch}',null,null,'2026-10-10',null,'cobrado',1.25,'otros' from generate_series(1,10000);
    insert into gastos select '${school}','${branch}','2026-10-10','pagado',1,'suministros' from generate_series(1,10000);
  `);
  const result = await read();
  expect(result.current.collected).toBe(12725);
  expect(result.current.paidExpenses).toBe(10080);
  expect(result.current.collectedCount).toBe(10003);
  expect(mock.query).toHaveBeenCalledTimes(1);
  expect(JSON.stringify(result).length).toBeLessThan(12000);
}, 15000);

it("recognizes scheduled future installments without recording future collections or creating future standalone debt", async () => {
  await db.exec(`insert into ingresos values
    ('${school}','${branch}','${a1}','${m1}','2026-11-01','2026-11-05','pendiente',300,'matricula'),
    ('${school}','${branch}',null,null,'2026-11-01','2026-11-05','pendiente',900,'clase_suelta')`);
  const result = await read();
  expect(result.portfolio).toMatchObject({ balance: 1450, overdue: 200, withoutSchedule: 650 });
  expect(result.current.collected).toBe(225);
});

it("asigna matrícula, abono y cartera a la sede del contrato aunque la ficha esté en otra sede", async () => {
  const contract = "30000000-0000-4000-8000-000000000010";
  const contractElsewhere = "30000000-0000-4000-8000-000000000011";
  const before = await read();
  await db.query(
    `insert into matriculas_alumno values
     ($1,$2,$3,$4,500000,'2026-10-10',array['B1'],'activo'),
     ($5,$2,$4,$6,250000,'2026-10-10',array['B1'],'activo')`,
    [contract, school, branch, otherBranch, contractElsewhere, a4]
  );
  await db.query(
    `insert into ingresos values
     ($1,$2,$3,$4,'2026-10-10',null,'cobrado',100000,'matricula')`,
    [school, branch, otherBranch, contract]
  );

  const after = await read("fresh=1");
  expect(after.current.enrollments).toBe(before.current.enrollments + 1);
  expect(after.current.collected).toBe(before.current.collected + 100_000);
  expect(after.portfolio.balance).toBe(before.portfolio.balance + 400_000);
  expect(after.quality.students).toBe(before.quality.students);
  expect(after.quality.regularsWithoutContract).toBe(before.quality.regularsWithoutContract - 1);
});
