// @vitest-environment node
import { PGlite } from "@electric-sql/pglite";
import { afterAll, beforeAll, beforeEach, expect, it, vi } from "vitest";
import { GET as getAdminSummary } from "./admin-summary/route";
import { GET as getAnalytics } from "./superadmin-analytics/route";
import { GET as getSchools } from "../escuelas/route";
import { getAdminDashboardSummary } from "@/lib/dashboard-admin-summary-server";

const mocks = vi.hoisted(() => ({ auth: vi.fn(), query: vi.fn() }));
vi.mock("server-only", () => ({}));
vi.mock("@/lib/api-auth", async (original) => ({
  ...(await original<typeof import("@/lib/api-auth")>()),
  authorizeApiRequest: mocks.auth,
}));
vi.mock("@/lib/server-db", () => ({ getServerDbPool: () => ({ query: mocks.query }) }));
vi.mock("@/lib/server-read-cache", () => ({
  getServerReadCached: ({ loader }: { loader: () => unknown }) => loader(),
  revalidateServerReadCache: vi.fn(),
}));
const school = "10000000-0000-4000-8000-000000000001";
const branch = "10000000-0000-4000-8000-000000000002";
const otherBranch = "10000000-0000-4000-8000-000000000003";
const student = "10000000-0000-4000-8000-000000000004";
const profile = {
  id: student,
  rol: "admin_sede",
  escuela_id: school,
  sede_id: branch,
  activo: true,
};
let db: PGlite;

beforeAll(async () => {
  db = new PGlite();
  // Deliberately no clases table: the active summaries must not depend on the retired module.
  await db.exec(`
    create table escuelas(id uuid primary key,nombre text,plan text default 'basico',estado text default 'activa',
      cif text,telefono text,email text,direccion text,categorias text[],max_alumnos int default 50,max_sedes int default 1,
      fecha_alta date default current_date,created_at timestamptz default now());
    create table sedes(id uuid,escuela_id uuid,estado text);
    create table perfiles(id uuid,escuela_id uuid,nombre text,email text,rol text,activo boolean,ultimo_acceso timestamptz,created_at timestamptz default now());
    create table alumnos(id uuid,escuela_id uuid,sede_id uuid,tipo_registro text,estado text,categorias text[],fecha_inscripcion date,created_at timestamptz default now());
    create table matriculas_alumno(id uuid,escuela_id uuid,sede_id uuid,alumno_id uuid,estado text,categorias text[],fecha_inscripcion date,created_at timestamptz default now());
    create table ingresos(id uuid,escuela_id uuid,sede_id uuid,alumno_id uuid,categoria text,estado text,monto numeric,fecha date);
    create table gastos(id uuid,monto numeric,fecha date);
    create table examenes(id uuid,escuela_id uuid,sede_id uuid,resultado text,created_at timestamptz default now());
    create table instructores(id uuid,escuela_id uuid,estado text);
    create table vehiculos(id uuid);
    create table horas_trabajo(id uuid);
    create table nominas(id uuid);
    insert into escuelas(id,nombre) values('${school}','Escuela de prueba');
    insert into sedes values('${branch}','${school}','activa');
    insert into perfiles(id,escuela_id,nombre,email,rol,activo,ultimo_acceso) values('${student}','${school}','Admin','admin@example.com','admin_escuela',true,now());
    insert into alumnos(id,escuela_id,sede_id,tipo_registro,estado,categorias) values('${student}','${school}','${branch}','regular','activo',array['A2']);
    insert into ingresos values('${student}','${school}','${branch}','${student}','matricula','cobrado',125000,(now() at time zone 'America/Bogota')::date);
    insert into examenes(escuela_id,sede_id,resultado) values('${school}','${branch}','pendiente'),('${school}','${otherBranch}','pendiente');
  `);
}, 15000);
afterAll(async () => {
  await db?.close();
});
beforeEach(() => {
  vi.clearAllMocks();
  mocks.auth.mockResolvedValue({ ok: true, perfil: profile });
  mocks.query.mockImplementation((sql: string, values?: unknown[]) => db.query(sql, values));
});

it("keeps branch exam and income totals correctly scoped after removing the class counter", async () => {
  const response = await getAdminSummary(
    new Request("https://example.com/api/dashboard/admin-summary")
  );
  expect(response.status).toBe(200);
  expect(response.headers.get("Cache-Control")).toBe("private, no-store");
  const payload = await response.json();
  expect(payload.stats).toMatchObject({ alumnos: 1, examenesPendientes: 1, ingresosMes: 125000 });
  expect(payload.stats).not.toHaveProperty("clasesHoy");
});

it("returns the same branch-scoped financial summary through server rendering and the API", async () => {
  const response = await getAdminSummary(
    new Request("https://example.com/api/dashboard/admin-summary")
  );
  const payload = await response.json();
  const serverPayload = await getAdminDashboardSummary({ ...profile, rol: "admin_sede" }, school);
  expect(serverPayload).toEqual(payload);
  expect(serverPayload.stats).toMatchObject({ ingresosMes: 125000, examenesPendientes: 1 });
});

it("refuses inactive, student and cross-school profiles before loading or consulting cached data", async () => {
  for (const actor of [
    { ...profile, rol: "admin_sede" as const, activo: false },
    { ...profile, rol: "alumno" as const },
    { ...profile, rol: "admin_sede" as const, escuela_id: otherBranch },
  ]) {
    await expect(getAdminDashboardSummary(actor, school)).rejects.toThrow("Acceso denegado");
  }
  expect(mocks.query).not.toHaveBeenCalled();
});

it("loads real analytics SQL without the retired table and preserves active financial metrics", async () => {
  mocks.auth.mockResolvedValue({ ok: true, perfil: { ...profile, rol: "super_admin" } });
  const response = await getAnalytics(
    new Request("https://example.com/api/dashboard/superadmin-analytics")
  );
  expect(response.status).toBe(200);
  const payload = await response.json();
  expect(payload.monthlyGrowth).toHaveLength(6);
  expect(payload.monthlyGrowth.at(-1)).toMatchObject({ alumnos: 1, ingresos: 125000, examenes: 2 });
  expect(payload.topSchools[0]).toMatchObject({
    id: school,
    alumnos_activos: 1,
    ingresos_mes: 125000,
  });
  expect(payload.dataVolume.some((row: { tabla: string }) => row.tabla === "clases")).toBe(false);
});

it("lists schools without an unused class aggregate", async () => {
  mocks.auth.mockResolvedValue({ ok: true, perfil: { ...profile, rol: "super_admin" } });
  const response = await getSchools();
  expect(response.status).toBe(200);
  const payload = await response.json();
  expect(payload.escuelas[0]).toMatchObject({
    id: school,
    alumnos_activos: 1,
    ingresos_mes: 125000,
    sedes_activas: 1,
  });
  expect(payload.escuelas[0]).not.toHaveProperty("clases_mes");
});

it("never queries the database before authenticating dashboard requests", async () => {
  mocks.auth.mockResolvedValue({ ok: false, response: new Response(null, { status: 401 }) });
  for (const handler of [getAdminSummary, getAnalytics, getSchools]) {
    expect((await handler(new Request("https://example.com/api/dashboard"))).status).toBe(401);
  }
  expect(mocks.query).not.toHaveBeenCalled();
});
