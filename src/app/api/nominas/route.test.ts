// @vitest-environment node
import { readFileSync } from "node:fs";
import { PGlite } from "@electric-sql/pglite";
import { afterEach, beforeEach, expect, it, vi } from "vitest";
import { POST, PATCH, DELETE, GET } from "./route";

const mock = vi.hoisted(() => ({
  auth: vi.fn(),
  pool: vi.fn(),
  admin: vi.fn(),
  revalidate: vi.fn(),
}));
vi.mock("server-only", () => ({}));
vi.mock("@/lib/api-auth", async (original) => ({
  ...(await original<typeof import("@/lib/api-auth")>()),
  authorizeApiRequest: mock.auth,
  buildSupabaseAdminClient: mock.admin,
}));
vi.mock("@/lib/server-db", () => ({ getServerDbPool: mock.pool }));
vi.mock("@/lib/server-read-cache", () => ({ revalidateServerReadCache: mock.revalidate }));
const school = "10000000-0000-4000-8000-000000000001";
const sede = "10000000-0000-4000-8000-000000000002";
const actor = "10000000-0000-4000-8000-000000000003";
const instructor = "10000000-0000-4000-8000-000000000004";
const otherSede = "10000000-0000-4000-8000-000000000005";
const otherSchool = "10000000-0000-4000-8000-000000000006";
const otherInstructor = "10000000-0000-4000-8000-000000000007";
const body = {
  escuela_id: school,
  sede_id: sede,
  empleado_tipo: "instructor",
  empleado_id: instructor,
  empleado_nombre: "No confiar en el cliente",
  periodo_anio: 2026,
  periodo_mes: 10,
  tipo_contrato: "prestacion_servicios",
  salario_base: 1000,
  conceptos: [
    { tipo: "devengo", concepto: "Bono", valor: 100 },
    { tipo: "deduccion", concepto: "Deducción", valor: 50 },
  ],
};
const request = (data: unknown, method = "POST") =>
  new Request("https://example.com/api/nominas", {
    method,
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(data),
  });
const profile = {
  id: actor,
  rol: "admin_escuela",
  escuela_id: school,
  sede_id: sede,
  activo: true,
};
let db: PGlite;
let log: ReturnType<typeof vi.spyOn>;
beforeEach(async () => {
  vi.resetAllMocks();
  log = vi.spyOn(console, "error").mockImplementation(() => undefined);
  db = new PGlite();
  await db.exec(`create schema auth; create table auth.users(id uuid primary key);
    create function auth.uid() returns uuid language sql as $$select null::uuid$$;
    create table escuelas(id uuid primary key);
    create table sedes(id uuid primary key,escuela_id uuid references escuelas(id));
    create table perfiles(id uuid primary key,nombre text,escuela_id uuid,sede_id uuid,rol text);
    create table instructores(id uuid primary key,nombre text,apellidos text,escuela_id uuid,sede_id uuid);
    insert into auth.users values('${actor}');
    insert into escuelas values('${school}'),('${otherSchool}');
    insert into sedes values('${sede}','${school}'),('${otherSede}','${school}');
    insert into instructores values('${instructor}','Ana','Prueba','${school}','${sede}'),('${otherInstructor}','Otra','Prueba','${school}','${otherSede}');
    insert into perfiles values('${actor}','Admin','${school}','${sede}','admin_escuela');`);
  await db.exec(
    readFileSync(
      new URL("../../../../supabase/migrations/044_nominas.sql", import.meta.url),
      "utf8"
    )
  );
  const query = (sql: string, values?: unknown[]) => db.query(sql, values);
  mock.pool.mockReturnValue({ query, connect: async () => ({ query, release: vi.fn() }) });
  mock.auth.mockResolvedValue({ ok: true, perfil: profile });
});
afterEach(async () => {
  log.mockRestore();
  await db?.close();
});
async function create() {
  const response = await POST(request(body));
  expect(response.status).toBe(201);
  return (await response.json()).nomina;
}
async function snapshot() {
  return {
    payroll: (await db.query("select * from nominas order by id")).rows,
    concepts: (await db.query("select * from nomina_conceptos order by id")).rows,
  };
}

it("guarda cabecera, conceptos y totales juntos con el nombre del empleado real", async () => {
  const row = await create();
  expect(row).toMatchObject({
    empleado_nombre: "Ana Prueba",
    salario_base: 1000,
    total_devengado: 1100,
    total_deducciones: 50,
    neto_pagar: 1050,
  });
  expect(row.nomina_conceptos).toHaveLength(3);
  expect(mock.revalidate).toHaveBeenCalledTimes(1);
});
it("un fallo de caché no presenta una nómina guardada como fallida", async () => {
  mock.revalidate.mockImplementation(() => {
    throw Error("cache failure");
  });
  await create();
  expect((await snapshot()).payroll).toHaveLength(1);
});
it("rechaza montos fuera de precisión y conceptos vacíos antes de escribir", async () => {
  expect((await POST(request({ ...body, salario_base: 1000.123 }))).status).toBe(400);
  expect(
    (
      await POST(
        request({ ...body, conceptos: [{ tipo: "devengo", concepto: "   ", valor: 100 }] })
      )
    ).status
  ).toBe(400);
  expect(await snapshot()).toEqual({ payroll: [], concepts: [] });
});
it("al actualizar solo salario recalcula totales y conserva otros conceptos", async () => {
  const row = await create();
  const response = await PATCH(request({ nomina_id: row.id, salario_base: 2000 }, "PATCH"));
  expect(response.status).toBe(200);
  const updated = (await response.json()).nomina;
  expect(updated).toMatchObject({
    salario_base: 2000,
    total_devengado: 2100,
    total_deducciones: 50,
    neto_pagar: 2050,
  });
  expect(updated.nomina_conceptos).toHaveLength(3);
  expect(
    updated.nomina_conceptos.find((c: { concepto: string }) => c.concepto === "Honorarios").valor
  ).toBe(2000);
});
it("una nómina duplicada devuelve 409 sin crear líneas adicionales", async () => {
  await create();
  const before = await snapshot();
  expect((await POST(request(body))).status).toBe(409);
  expect(await snapshot()).toEqual(before);
});
it("si falla un concepto no queda una cabecera sin detalle", async () => {
  await db.exec("alter table nomina_conceptos add constraint fail_test check(concepto <> 'FALLA')");
  const response = await POST(
    request({ ...body, conceptos: [{ tipo: "devengo", concepto: "FALLA", valor: 5 }] })
  );
  expect(response.status).toBe(500);
  expect(await snapshot()).toEqual({ payroll: [], concepts: [] });
  expect(mock.revalidate).not.toHaveBeenCalled();
});
it.each(["conceptos", "cabecera"])(
  "fallo de %s al editar conserva la nómina original",
  async (failure) => {
    const row = await create();
    const before = await snapshot();
    await db.exec(
      failure === "conceptos"
        ? "alter table nomina_conceptos add constraint fail_test check(concepto <> 'FALLA')"
        : "alter table nominas add constraint fail_test check(salario_base < 1500)"
    );
    const response = await PATCH(
      request(
        {
          nomina_id: row.id,
          salario_base: 2000,
          conceptos: [
            { tipo: "devengo", concepto: failure === "conceptos" ? "FALLA" : "Nuevo", valor: 5 },
          ],
        },
        "PATCH"
      )
    );
    expect(response.status).toBe(500);
    expect(await snapshot()).toEqual(before);
  }
);
it.each(["admin_sede", "administrativo"])(
  "%s no modifica ni elimina nóminas de otra sede",
  async (rol) => {
    const row = await create();
    const before = await snapshot();
    mock.auth.mockResolvedValue({ ok: true, perfil: { ...profile, rol, sede_id: otherSede } });
    expect(
      (await PATCH(request({ nomina_id: row.id, notas: "No permitido" }, "PATCH"))).status
    ).toBe(403);
    expect(
      (
        await DELETE(
          new Request(`https://example.com/api/nominas?id=${row.id}`, { method: "DELETE" })
        )
      ).status
    ).toBe(403);
    expect(await snapshot()).toEqual(before);
  }
);
it("no permite asociar sede o empleado ajenos a la escuela", async () => {
  await db.query("update sedes set escuela_id=$1 where id=$2", [otherSchool, otherSede]);
  expect((await POST(request({ ...body, sede_id: otherSede }))).status).toBe(400);
  await db.query("update instructores set escuela_id=$1 where id=$2", [
    otherSchool,
    otherInstructor,
  ]);
  expect((await POST(request({ ...body, empleado_id: otherInstructor }))).status).toBe(400);
  expect(await snapshot()).toEqual({ payroll: [], concepts: [] });
});
it("un administrativo no puede crear para un empleado de otra sede", async () => {
  mock.auth.mockResolvedValue({ ok: true, perfil: { ...profile, rol: "administrativo" } });
  expect((await POST(request({ ...body, empleado_id: otherInstructor }))).status).toBe(403);
});
it("no elimina una nómina aprobada y sí elimina un borrador con sus conceptos", async () => {
  const row = await create();
  await PATCH(request({ nomina_id: row.id, estado: "aprobada" }, "PATCH"));
  const deletion = new Request(`https://example.com/api/nominas?id=${row.id}`, {
    method: "DELETE",
  });
  expect((await DELETE(deletion)).status).toBe(400);
  await PATCH(request({ nomina_id: row.id, estado: "borrador" }, "PATCH"));
  expect((await DELETE(deletion)).status).toBe(200);
  expect(await snapshot()).toEqual({ payroll: [], concepts: [] });
});
it("rechaza fecha de pago imposible e ID inválido antes de guardar", async () => {
  const row = await create();
  const before = await snapshot();
  expect(
    (await PATCH(request({ nomina_id: row.id, fecha_pago: "2026-02-31" }, "PATCH"))).status
  ).toBe(400);
  expect(
    (await DELETE(new Request("https://example.com/api/nominas?id=invalid", { method: "DELETE" })))
      .status
  ).toBe(400);
  expect(await snapshot()).toEqual(before);
});
it("sede_id vacío no amplía el GET a toda la escuela", async () => {
  mock.auth.mockResolvedValue({ ok: true, perfil: { ...profile, rol: "administrativo" } });
  const filters: [string, unknown][] = [];
  const chain = {
    select: () => chain,
    eq: (key: string, value: unknown) => {
      filters.push([key, value]);
      return chain;
    },
    order: () => chain,
    in: () => chain,
    then: (resolve: (value: unknown) => unknown) =>
      Promise.resolve({ data: [], error: null }).then(resolve),
  };
  mock.admin.mockReturnValue({ from: () => chain });
  expect((await GET(new Request("https://example.com/api/nominas?sede_id="))).status).toBe(200);
  expect(filters.filter(([key]) => key === "sede_id")).toHaveLength(4);
  expect(filters.filter(([key]) => key === "sede_id").every(([, value]) => value === sede)).toBe(
    true
  );
});
it("un administrativo sin sede no puede listar nóminas", async () => {
  mock.auth.mockResolvedValue({
    ok: true,
    perfil: { ...profile, rol: "administrativo", sede_id: null },
  });
  expect((await GET(new Request("https://example.com/api/nominas"))).status).toBe(403);
  expect(mock.admin).not.toHaveBeenCalled();
});
