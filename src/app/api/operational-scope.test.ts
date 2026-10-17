// @vitest-environment node
import { readFileSync } from "node:fs";
import { PGlite } from "@electric-sql/pglite";
import { afterAll, afterEach, beforeAll, beforeEach, describe, expect, it, vi } from "vitest";
import { GET as getHours } from "./horas/route";
import { GET as getStudents } from "./alumnos/route";
import { GET as getInstructors } from "./instructores/route";
import { GET as getClasses } from "./clases/route";
import { GET as getVehicles } from "./vehiculos/route";
import { GET as getMaintenance } from "./mantenimiento/route";
import { GET as getStaff } from "./administrativos/route";
import { GET as getStudentCatalogs } from "./alumnos/catalogos/route";
import { GET as getClassCatalogs } from "./clases/catalogos/route";
import { GET as getVehicleCatalogs } from "./vehiculos/catalogos/route";
import { GET as getCash } from "./caja-diaria/route";
import { GET as getIncome } from "./ingresos/route";
import { GET as getExpenses } from "./gastos/route";
import { GET as getPortfolio } from "./cartera/route";
import { GET as getReports } from "./reportes/contables/route";

const mocks = vi.hoisted(() => ({ auth: vi.fn(), pool: vi.fn(), cache: vi.fn() }));
vi.mock("server-only", () => ({}));
vi.mock("@/lib/api-auth", async (original) => ({
  ...(await original<typeof import("@/lib/api-auth")>()),
  authorizeApiRequest: mocks.auth,
}));
vi.mock("@/lib/server-db", () => ({ getServerDbPool: mocks.pool }));
vi.mock("@/lib/server-read-cache", () => ({
  getServerReadCached: mocks.cache,
}));

const id = (n: number) => `10000000-0000-4000-8000-${String(n).padStart(12, "0")}`;
const school = id(1);
const otherSchool = id(2);
const sede = id(11);
const otherSede = id(12);
const profile = { id: id(101), rol: "admin_sede", escuela_id: school, sede_id: sede, activo: true };
const request = (path: string) => new Request(`https://example.com/api/${path}`);
const listHandlers = [
  ["alumnos", getStudents],
  ["instructores", getInstructors],
  ["clases", getClasses],
  ["vehiculos", getVehicles],
  ["mantenimiento", getMaintenance],
  ["administrativos", getStaff],
] as const;
const catalogHandlers = [
  ["alumnos/catalogos", getStudentCatalogs],
  ["clases/catalogos", getClassCatalogs],
  ["vehiculos/catalogos", getVehicleCatalogs],
] as const;
const allHandlers = [...listHandlers, ...catalogHandlers, ["horas", getHours] as const];
const financeHandlers = [
  ["caja-diaria", getCash],
  ["ingresos", getIncome],
  ["gastos", getExpenses],
  ["cartera", getPortfolio],
  ["reportes/contables", getReports],
] as const;
let db: PGlite;
let query: ReturnType<typeof vi.fn>;

beforeAll(async () => {
  db = new PGlite();
  await db.exec(`
    create table escuelas(id uuid primary key,categorias text[]);
    create table sedes(id uuid primary key,escuela_id uuid,nombre text,es_principal boolean default false,created_at timestamptz default now());
    create table perfiles(id uuid primary key,escuela_id uuid,sede_id uuid,nombre text,email text,rol text,telefono text,avatar_url text,activo boolean default true,ultimo_acceso timestamptz,created_at timestamptz default now());
    insert into escuelas values('${school}','{B1}'),('${otherSchool}','{B1}');
    insert into sedes(id,escuela_id,nombre) values('${sede}','${school}','Principal'),('${otherSede}','${school}','Otra'),('${id(13)}','${otherSchool}','Ajena');
  `);
  const schema = readFileSync(new URL("../../../supabase/schema.sql", import.meta.url), "utf8");
  for (const table of [
    "alumnos",
    "matriculas_alumno",
    "instructores",
    "vehiculos",
    "clases",
    "mantenimiento_vehiculos",
    "ingresos",
  ]) {
    const start = schema.indexOf(`create table public.${table} (`);
    await db.exec(schema.slice(start, schema.indexOf("\n);", start) + 3));
  }
  for (const [file, table] of [
    ["014_horas_trabajo.sql", "horas_trabajo"],
    ["033_cierre_horas_a_gastos.sql", "cierres_horas_instructores"],
  ]) {
    // Execute the real table definitions without installing unrelated auth policies.
    const migration = readFileSync(
      new URL(`../../../supabase/migrations/${file}`, import.meta.url),
      "utf8"
    );
    const start = migration.indexOf(`CREATE TABLE IF NOT EXISTS public.${table} (`);
    if (table === "cierres_horas_instructores")
      await db.exec(
        "create table gastos(id uuid primary key,escuela_id uuid,sede_id uuid,categoria text,proveedor text)"
      );
    await db.exec(migration.slice(start, migration.indexOf("\n);", start) + 3));
  }
  await db.exec(`
    alter table alumnos add consentimiento_datos boolean default false;
    alter table alumnos add consentimiento_fecha timestamptz;
    alter table alumnos add facturado boolean default false;
    alter table alumnos add numero_factura_electronica text;
    alter table alumnos add fecha_factura date;
    alter table instructores add especialidades text[] default '{B}';
    alter table instructores add valor_hora numeric default 100;
  `);
  for (let n = 1; n <= 3; n++) {
    const schoolId = n === 3 ? otherSchool : school;
    const branchId = id(10 + n);
    await db.exec(`
      insert into perfiles(id,escuela_id,sede_id,nombre,email,rol) values('${id(100 + n)}','${schoolId}','${branchId}','Personal ${n}','staff${n}@example.com','administrativo');
      insert into alumnos(id,escuela_id,sede_id,user_id,nombre,apellidos,dni,telefono,fecha_inscripcion) values('${id(200 + n)}','${schoolId}','${branchId}','${id(100 + n)}','Alumno ${n}','Prueba','TEST${n}','3000000000','2026-10-01');
      insert into instructores(id,escuela_id,sede_id,user_id,nombre,apellidos,dni,telefono,licencia) values('${id(300 + n)}','${schoolId}','${branchId}','${id(100 + n)}','Instructor ${n}','Prueba','TEST${n}','3000000000','TEST');
      insert into vehiculos(id,escuela_id,sede_id,user_id,marca,modelo,matricula) values('${id(400 + n)}','${schoolId}','${branchId}','${id(100 + n)}','Prueba','Prueba','TEST${n}');
      insert into clases(id,escuela_id,sede_id,user_id,alumno_id,instructor_id,vehiculo_id,fecha,hora_inicio,hora_fin) values('${id(500 + n)}','${schoolId}','${branchId}','${id(100 + n)}','${id(200 + n)}','${id(300 + n)}','${id(400 + n)}','2026-10-01','09:00','10:00');
      insert into mantenimiento_vehiculos(id,escuela_id,sede_id,user_id,vehiculo_id,instructor_id,tipo,descripcion,fecha) values('${id(600 + n)}','${schoolId}','${branchId}','${id(100 + n)}','${id(400 + n)}','${id(300 + n)}','otros','Prueba','2026-10-01');
      insert into horas_trabajo(escuela_id,sede_id,instructor_id,fecha,horas) values('${schoolId}','${branchId}','${id(300 + n)}','2026-10-01',2);
      insert into cierres_horas_instructores(escuela_id,sede_id,instructor_id,periodo_anio,periodo_mes,fecha_cierre,total_horas,valor_hora,monto_total) values('${schoolId}','${branchId}','${id(300 + n)}',2026,10,'2026-10-31',2,100,200);
      insert into gastos(id,escuela_id,sede_id,categoria,proveedor) values('${id(700 + n)}','${schoolId}','${branchId}','tramitador','Proveedor ${n}');
      insert into ingresos(escuela_id,sede_id,user_id,alumno_id,categoria,concepto,monto,fecha) values('${schoolId}','${branchId}','${id(100 + n)}','${id(200 + n)}','matricula','Prueba',${100 * n},'2026-10-01');
    `);
  }
});
beforeEach(() => {
  vi.clearAllMocks();
  query = vi.fn((sql: string, values?: unknown[]) => db.query(sql, values));
  mocks.pool.mockReturnValue({ query });
  mocks.cache.mockImplementation(({ loader }: { loader: () => unknown }) => loader());
  mocks.auth.mockResolvedValue({ ok: true, perfil: profile });
});
afterEach(() => vi.useRealTimers());
afterAll(async () => db?.close());

describe("operational list scope with real SQL", () => {
  it.each(["fecha=2026-02-31", "fecha=2026-13-01", "mes=0000", "mes=0000-01", "mes=2026-13"])(
    "alumnos rejects invalid date filters before SQL: %s",
    async (filter) => {
      expect((await getStudents(request(`alumnos?${filter}`))).status).toBe(400);
      expect(query).not.toHaveBeenCalled();
    }
  );
  it.each(listHandlers)(
    "%s: sede staff cannot read another branch or school",
    async (path, handler) => {
      for (const rol of path === "administrativos"
        ? ["admin_sede"]
        : ["admin_sede", "administrativo"]) {
        mocks.auth.mockResolvedValue({ ok: true, perfil: { ...profile, rol } });
        const result = await handler(
          request(`${path}?sede_id=${otherSede}&escuela_id=${otherSchool}&include_catalogs=1`)
        );
        expect(result.status).toBe(200);
        const payload = await result.json();
        expect(payload.totalCount).toBe(1);
        expect(payload.rows).toHaveLength(1);
        if (payload._catalogs?.alumnos)
          expect(payload._catalogs.alumnos.map((r: { id: string }) => r.id)).toEqual([id(201)]);
        if (payload._catalogs?.instructores)
          expect(payload._catalogs.instructores.map((r: { id: string }) => r.id)).toEqual([
            id(301),
          ]);
        if (payload._catalogs?.vehiculos)
          expect(payload._catalogs.vehiculos.map((r: { id: string }) => r.id)).toEqual([id(401)]);
        if (payload._catalogs?.tramitadorOptions)
          expect(payload._catalogs.tramitadorOptions).toEqual(["Proveedor 1"]);
      }
    }
  );
  it.each(listHandlers)(
    "%s: school admin keeps all their branches and default pagination",
    async (path, handler) => {
      mocks.auth.mockResolvedValue({ ok: true, perfil: { ...profile, rol: "admin_escuela" } });
      const response = await handler(request(path));
      expect(response.status).toBe(200);
      const payload = await response.json();
      expect(payload.totalCount).toBe(2);
      expect(payload.rows).toHaveLength(2);
    }
  );
  it.each(allHandlers)(
    "%s: missing branch fails closed before SQL or cache",
    async (path, handler) => {
      mocks.auth.mockResolvedValue({ ok: true, perfil: { ...profile, sede_id: null } });
      expect((await handler(request(path))).status).toBe(403);
      expect(query).not.toHaveBeenCalled();
      expect(mocks.cache).not.toHaveBeenCalled();
    }
  );
  it.each(catalogHandlers)("%s: catalogs use the same branch boundary", async (path, handler) => {
    const response = await handler(request(path));
    expect(response.status).toBe(200);
    const payload = await response.json();
    if (payload.alumnos)
      expect(payload.alumnos.map((r: { id: string }) => r.id)).toEqual([id(201)]);
    if (payload.instructores)
      expect(payload.instructores.map((r: { id: string }) => r.id)).toEqual([id(301)]);
    if (payload.vehiculos)
      expect(payload.vehiculos.map((r: { id: string }) => r.id)).toEqual([id(401)]);
    if (payload.tramitadorOptions) expect(payload.tramitadorOptions).toEqual(["Proveedor 1"]);
  });
  it.each(allHandlers)("%s: signed-out requests never reach SQL", async (path, handler) => {
    mocks.auth.mockResolvedValue({ ok: false, response: new Response(null, { status: 401 }) });
    expect((await handler(request(path))).status).toBe(401);
    expect(query).not.toHaveBeenCalled();
  });
});

describe("hours reads", () => {
  it.each(["admin_sede", "administrativo", "admin_escuela", "instructor"])(
    "%s keeps the correct instructor/hours/closure scope",
    async (rol) => {
      mocks.auth.mockResolvedValue({ ok: true, perfil: { ...profile, rol } });
      const response = await getHours(request("horas?anio=2026&mes=9&include_closures=1"));
      expect(response.status).toBe(200);
      const payload = await response.json();
      const expected = rol === "admin_escuela" ? [id(301), id(302)] : [id(301)];
      expect(payload.instructores.map((r: { id: string }) => r.id)).toEqual(expected);
      expect(payload.horas.map((r: { instructor_id: string }) => r.instructor_id).sort()).toEqual(
        expected
      );
      expect(
        payload.monthClosures.map((r: { instructor_id: string }) => r.instructor_id).sort()
      ).toEqual(expected);
    }
  );
  it("missing period defaults to Bogota's month, even during a UTC month boundary", async () => {
    vi.useFakeTimers({ toFake: ["Date"] });
    vi.setSystemTime(new Date("2026-11-01T02:00:00Z"));
    const response = await getHours(request("horas?anio=&mes=&include_closures=1"));
    expect(response.status).toBe(200);
    expect((await response.json()).horas).toHaveLength(1);
    expect(
      query.mock.calls.some(
        ([, values]) => values?.includes("2026-10-01") && values.includes("2026-10-31")
      )
    ).toBe(true);
  });
});

describe("financial read boundaries", () => {
  it.each(financeHandlers)(
    "%s: branch users without a branch cannot read financial data",
    async (path, handler) => {
      for (const rol of ["admin_sede", "administrativo"]) {
        mocks.auth.mockResolvedValue({ ok: true, perfil: { ...profile, rol, sede_id: null } });
        expect((await handler(request(path))).status).toBe(403);
        expect(query).not.toHaveBeenCalled();
        expect(mocks.cache).not.toHaveBeenCalled();
      }
    }
  );
  it.each(financeHandlers)("%s: signed-out requests never reach SQL", async (path, handler) => {
    mocks.auth.mockResolvedValue({ ok: false, response: new Response(null, { status: 401 }) });
    expect((await handler(request(path))).status).toBe(401);
    expect(query).not.toHaveBeenCalled();
  });
  it.each(["admin_sede", "administrativo", "admin_escuela"])(
    "cash: %s sees only the correct financial scope",
    async (rol) => {
      mocks.auth.mockResolvedValue({ ok: true, perfil: { ...profile, rol } });
      const response = await getCash(
        request(`caja-diaria?year=2026&month=10&sede_id=${otherSede}&escuela_id=${otherSchool}`)
      );
      expect(response.status).toBe(200);
      expect((await response.json()).stats.totalRegistrado).toBe(
        rol === "admin_escuela" ? 200 : 100
      );
    }
  );
  it.each(["0", "13", "abc", "1e1"])(
    "cash rejects invalid month %s before querying",
    async (month) => {
      expect((await getCash(request(`caja-diaria?month=${month}`))).status).toBe(400);
      expect(query).not.toHaveBeenCalled();
    }
  );
  it("cash normalizes a single-digit month", async () => {
    const response = await getCash(request("caja-diaria?year=2026&month=9"));
    expect(response.status).toBe(200);
    expect((await response.json()).filters.month).toBe("09");
  });
});
