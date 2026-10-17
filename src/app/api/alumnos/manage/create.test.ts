// @vitest-environment node
import { readFileSync } from "node:fs";
import { PGlite } from "@electric-sql/pglite";
import { afterEach, beforeEach, expect, it, vi } from "vitest";
import { POST } from "./route";

const mock = vi.hoisted(() => ({
  auth: vi.fn(),
  pool: vi.fn(),
  admin: vi.fn(),
  createUser: vi.fn(),
  deleteUser: vi.fn(),
  updateUser: vi.fn(),
}));
vi.mock("server-only", () => ({}));
vi.mock("@/lib/api-auth", async (original) => ({
  ...(await original<typeof import("@/lib/api-auth")>()),
  authorizeApiRequest: mock.auth,
  buildSupabaseAdminClient: mock.admin,
}));
vi.mock("@/lib/server-db", () => ({ getServerDbPool: mock.pool }));

const school = "10000000-0000-4000-8000-000000000001";
const actor = "10000000-0000-4000-8000-000000000002";
const user = "10000000-0000-4000-8000-000000000003";
const body = {
  sede_id: school,
  tipo_registro: "regular",
  nombre: "Ana",
  apellidos: "Prueba",
  dni: "12345678",
  tipo_documento: "CC",
  email: "ana@example.com",
  telefono: "3001234567",
  lugar_expedicion_documento: "Ipiales",
  direccion: "Calle 1 numero 2",
  departamento: "Nariño",
  ciudad: "IPIALES",
  categorias: ["B1"],
  estado: "activo",
  fecha_inscripcion: "2026-09-01",
  valor_total: 100000,
  abono: 20000,
  datos_facturacion: {
    country: "CO",
    cityCode: "52356",
    personType: "2",
    responsibilities: "R-99-PN",
    taxRegime: "ordinario",
    taxScheme: "ZZ",
  },
};
const request = (value: unknown, selectedSchool?: string) =>
  new Request("https://condusoft.co/api/alumnos/manage", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      ...(selectedSchool ? { Cookie: `dashboard_school_id=${selectedSchool}` } : {}),
    },
    body: JSON.stringify(value),
  });
let db: PGlite;
beforeEach(async () => {
  vi.resetAllMocks();
  db = new PGlite();
  await db.exec(`
    create table escuelas(id uuid primary key);
    create table sedes(id uuid primary key, escuela_id uuid references escuelas(id));
    create table perfiles(id uuid primary key, rol text, email text, cedula text, escuela_id uuid, sede_id uuid);
    insert into escuelas values('${school}');
    insert into sedes values('${school}','${school}');
    insert into perfiles values('${actor}','admin_escuela','admin@example.com',null,'${school}','${school}');
  `);
  const schema = readFileSync(
    new URL("../../../../../supabase/schema.sql", import.meta.url),
    "utf8"
  );
  for (const table of ["alumnos", "matriculas_alumno"]) {
    const start = schema.indexOf(`create table public.${table} (`);
    await db.exec(schema.slice(start, schema.indexOf("\n);", start) + 3));
  }
  await db.exec(`
    alter table alumnos add consentimiento_datos boolean not null default false;
    alter table alumnos add consentimiento_fecha timestamptz;
    create table configuracion_contratos_escuela(
      escuela_id uuid primary key, nombre_legal_escuela text,
      siguiente_consecutivo_mot bigint default 1, siguiente_consecutivo_car bigint default 1,
      siguiente_consecutivo_com bigint default 1, updated_at timestamptz);
    create table ingresos(id uuid default gen_random_uuid(), escuela_id uuid, sede_id uuid, user_id uuid,
      alumno_id uuid references alumnos(id), matricula_id uuid references matriculas_alumno(id),
      categoria text, concepto text, monto numeric, metodo_pago text, fecha date, estado text, notas text);
  `);
  const query = (sql: string, values?: unknown[]) => db.query(sql, values);
  mock.pool.mockReturnValue({ query, connect: async () => ({ query, release: vi.fn() }) });
  mock.auth.mockResolvedValue({
    ok: true,
    perfil: { id: actor, rol: "admin_escuela", escuela_id: school, sede_id: school, activo: true },
  });
  mock.createUser.mockResolvedValue({ data: { user: { id: user } }, error: null });
  mock.updateUser.mockResolvedValue({ data: { user: { id: user } }, error: null });
  mock.deleteUser.mockImplementation(async (id: string) =>
    db.query("delete from perfiles where id=$1", [id])
  );
  mock.admin.mockReturnValue({
    auth: {
      admin: {
        createUser: mock.createUser,
        deleteUser: mock.deleteUser,
        updateUserById: mock.updateUser,
      },
    },
    from: () => ({
      upsert: async (profile: {
        id: string;
        rol: string;
        email: string;
        cedula: string;
        escuela_id: string;
        sede_id: string;
      }) => {
        await db.query("insert into perfiles values($1,$2,$3,$4,$5,$6)", [
          profile.id,
          profile.rol,
          profile.email,
          profile.cedula,
          profile.escuela_id,
          profile.sede_id,
        ]);
        return { error: null };
      },
    }),
  });
});
afterEach(async () => db?.close());

it.each(["otra escuela", "otra sede"])(
  "no reutiliza una cuenta de %s fuera del alcance del actor",
  async (scope) => {
    const other = "20000000-0000-4000-8000-000000000001";
    await db.query("insert into perfiles values($1,'alumno',$2,$3,$4,$5)", [
      user,
      body.email,
      body.dni,
      scope === "otra escuela" ? other : school,
      other,
    ]);
    mock.auth.mockResolvedValue({
      ok: true,
      perfil: {
        id: actor,
        rol: "administrativo",
        escuela_id: school,
        sede_id: school,
        activo: true,
      },
    });
    const response = await POST(request(body));
    expect(response.status).toBe(400);
    expect(await response.json()).toEqual({
      error: "La cédula o correo ya tiene una cuenta registrada.",
    });
    expect(mock.updateUser).not.toHaveBeenCalled();
    expect(mock.createUser).not.toHaveBeenCalled();
    expect(mock.deleteUser).not.toHaveBeenCalled();
    expect((await db.query("select count(*)::int as total from alumnos")).rows).toEqual([
      { total: 0 },
    ]);
  }
);

it("permite reutilizar una cuenta sin alumno vinculado dentro de la escuela", async () => {
  await db.query("insert into perfiles values($1,'alumno',$2,$3,$4,$4)", [
    user,
    body.email,
    body.dni,
    school,
  ]);
  const response = await POST(request(body));
  expect(response.status).toBe(200);
  expect(mock.updateUser).toHaveBeenCalledTimes(1);
  expect(mock.createUser).not.toHaveBeenCalled();
  expect((await db.query("select user_id from alumnos")).rows).toEqual([{ user_id: user }]);
});

it("no crea sin escuela asignada aunque reciba una cookie de escuela", async () => {
  mock.auth.mockResolvedValue({
    ok: true,
    perfil: { id: actor, rol: "super_admin", escuela_id: null, sede_id: null },
  });
  const response = await POST(request(body, school));
  expect(response.status).toBe(400);
  expect(mock.createUser).not.toHaveBeenCalled();
});

it("no permite al personal cambiar su escuela mediante la cookie", async () => {
  const response = await POST(request(body, "20000000-0000-4000-8000-000000000001"));
  expect(response.status).toBe(200);
  expect((await db.query("select escuela_id from alumnos")).rows).toEqual([{ escuela_id: school }]);
});

it("el superadministrador debe seleccionar escuela antes de crear", async () => {
  mock.auth.mockResolvedValue({
    ok: true,
    perfil: { id: actor, rol: "super_admin", escuela_id: null, sede_id: null },
  });
  expect((await POST(request(body))).status).toBe(400);
  expect(mock.createUser).not.toHaveBeenCalled();
});

it.each(["R-99-PN", "O-13", "O-15", "O-23", "O-47"])(
  "crea alumno, contrato y abono con responsabilidad %s",
  async (responsibilities) => {
    const fiscal = {
      ...body.datos_facturacion,
      responsibilities,
      taxRegime: responsibilities === "O-47" ? "simple" : "ordinario",
    };
    const response = await POST(request({ ...body, datos_facturacion: fiscal }));
    expect(await response.json()).toEqual({ ok: true });
    expect(response.status).toBe(200);
    const student = (
      await db.query(
        "select email,telefono,direccion,datos_facturacion,numero_contrato from alumnos"
      )
    ).rows;
    expect(student).toEqual([
      {
        email: body.email,
        telefono: body.telefono,
        direccion: body.direccion,
        datos_facturacion: fiscal,
        numero_contrato: "CAR-0001",
      },
    ]);
    expect(
      (
        await db.query(
          "select fecha_inscripcion::text,categorias,valor_total from matriculas_alumno"
        )
      ).rows
    ).toEqual([{ fecha_inscripcion: "2026-09-01", categorias: ["B1"], valor_total: "100000" }]);
    expect((await db.query("select monto from ingresos")).rows).toEqual([{ monto: "20000" }]);
    expect(mock.createUser).toHaveBeenCalledTimes(1);
    expect(mock.deleteUser).not.toHaveBeenCalled();
  }
);

it("un fallo de guardado revierte alumno, contrato, abono y cuenta nueva", async () => {
  const log = vi.spyOn(console, "error").mockImplementation(() => undefined);
  await db.exec("alter table ingresos add constraint reject_test check(monto<0)");
  const response = await POST(request(body));
  expect(response.status).toBe(400);
  for (const table of [
    "alumnos",
    "matriculas_alumno",
    "ingresos",
    "configuracion_contratos_escuela",
  ]) {
    expect((await db.query(`select count(*)::int as total from ${table}`)).rows).toEqual([
      { total: 0 },
    ]);
  }
  expect(mock.deleteUser).toHaveBeenCalledWith(user);
  expect(log).toHaveBeenCalledWith("alumnos.manage.failed", {
    operation: "create",
    stage: "abono",
    code: "23514",
  });
  log.mockRestore();
});
