// @vitest-environment node
import { PGlite } from "@electric-sql/pglite";
import { afterEach, beforeEach, expect, it, vi } from "vitest";
import { POST } from "./route";
const mock = vi.hoisted(() => ({
  auth: vi.fn(),
  pool: vi.fn(),
  cache: vi.fn(),
  query: vi.fn(),
  release: vi.fn(),
}));
vi.mock("@/lib/api-auth", async (original) => ({
  ...(await original<typeof import("@/lib/api-auth")>()),
  authorizeApiRequest: mock.auth,
}));
vi.mock("@/lib/server-db", () => ({ getServerDbPool: mock.pool }));
vi.mock("@/lib/server-read-cache", () => ({ revalidateServerReadCache: mock.cache }));
const id = "10000000-0000-4000-8000-000000000001";
const mat = "10000000-0000-4000-8000-000000000002";
const other = "10000000-0000-4000-8000-000000000003";
const request = (value: unknown) =>
  new Request("https://example.com/api/alumnos/abonos", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(value),
  });
const body = {
  alumno_id: id,
  matricula_id: mat,
  monto: 60,
  metodo_pago: "efectivo",
  fecha: "2026-09-01",
};
let db: PGlite;
let active: boolean;
let log: ReturnType<typeof vi.spyOn>;
beforeEach(async () => {
  vi.resetAllMocks();
  log = vi.spyOn(console, "error").mockImplementation(() => undefined);
  db = new PGlite();
  active = false;
  await db.exec(`create table alumnos(id uuid primary key,escuela_id uuid,sede_id uuid,tipo_registro text,nombre text,apellidos text,valor_total numeric);
    create table matriculas_alumno(id uuid primary key,alumno_id uuid references alumnos(id),valor_total numeric);
    create table ingresos(id uuid default gen_random_uuid(),escuela_id uuid,sede_id uuid,user_id uuid,alumno_id uuid references alumnos(id),
      matricula_id uuid references matriculas_alumno(id),categoria text,concepto text,monto numeric,metodo_pago text,fecha date,estado text,notas text);
    insert into alumnos values('${id}','${id}','${id}','regular','Ana','Prueba',null),('${other}','${id}','${id}','aptitud_conductor','Otro','Prueba',100);
    insert into matriculas_alumno values('${mat}','${id}',100);`);
  mock.query.mockImplementation(async (sql: string, values?: unknown[]) => {
    const result = await db.query(sql, values);
    if (sql === "BEGIN") active = true;
    if (sql === "ROLLBACK" || sql === "COMMIT") active = false;
    return result;
  });
  mock.release.mockImplementation(() => expect(active).toBe(false));
  mock.pool.mockReturnValue({
    connect: async () => ({ query: mock.query, release: mock.release }),
  });
  mock.auth.mockResolvedValue({
    ok: true,
    perfil: { id, escuela_id: id, sede_id: id, rol: "admin_escuela", activo: true },
  });
});
afterEach(async () => {
  log.mockRestore();
  await db?.close();
});

it("valida saldo y guarda dentro de la misma transacción con alumno y contrato bloqueados", async () => {
  expect((await POST(request(body))).status).toBe(200);
  const statements = mock.query.mock.calls.map(([sql]) => sql as string);
  expect(statements[0]).toBe("BEGIN");
  expect(statements[1]).toContain("for update");
  expect(statements[2]).toContain("for update");
  expect(statements.at(-1)).toBe("COMMIT");
  expect((await db.query("select monto,fecha::text from ingresos")).rows).toEqual([
    { monto: "60", fecha: "2026-09-01" },
  ]);
  expect(mock.release).toHaveBeenCalledTimes(1);
});
it("una segunda solicitud usa el saldo actualizado y no permite sobrepago", async () => {
  expect((await POST(request(body))).status).toBe(200);
  expect((await POST(request(body))).status).toBe(400);
  expect((await db.query("select sum(monto) as total from ingresos")).rows).toEqual([
    { total: "60" },
  ]);
  expect(mock.query.mock.calls.at(-1)?.[0]).toBe("ROLLBACK");
});
it("rechaza contrato de otro alumno y contrato omitido en alumnos regulares", async () => {
  expect((await POST(request({ ...body, alumno_id: other }))).status).toBe(400);
  expect((await POST(request({ ...body, matricula_id: null }))).status).toBe(400);
  expect((await db.query("select count(*)::int as total from ingresos")).rows).toEqual([
    { total: 0 },
  ]);
});
it("mantiene pagos de aptitud sin matrícula", async () => {
  expect((await POST(request({ ...body, alumno_id: other, matricula_id: null }))).status).toBe(200);
  expect((await db.query("select categoria from ingresos")).rows).toEqual([
    { categoria: "examen_aptitud" },
  ]);
});
it("no permite registrar un abono de otra sede", async () => {
  mock.auth.mockResolvedValue({
    ok: true,
    perfil: { id, escuela_id: id, sede_id: other, rol: "administrativo", activo: true },
  });
  expect((await POST(request(body))).status).toBe(403);
  expect((await db.query("select count(*)::int as total from ingresos")).rows).toEqual([
    { total: 0 },
  ]);
});
it("una fecha imposible no abre la transacción", async () => {
  expect((await POST(request({ ...body, fecha: "2026-02-31" }))).status).toBe(400);
  expect(mock.pool).not.toHaveBeenCalled();
});
it("fallo de guardado revierte la operación", async () => {
  await db.exec("alter table ingresos add constraint fail_test check(monto<0)");
  expect((await POST(request(body))).status).toBe(500);
  expect((await db.query("select count(*)::int as total from ingresos")).rows).toEqual([
    { total: 0 },
  ]);
  expect(mock.cache).not.toHaveBeenCalled();
});
it("un fallo de caché después de guardar no presenta el pago como fallido", async () => {
  mock.cache.mockImplementation(() => {
    throw Error("cache failed");
  });
  expect((await POST(request(body))).status).toBe(200);
  expect((await db.query("select monto from ingresos")).rows).toEqual([{ monto: "60" }]);
});
