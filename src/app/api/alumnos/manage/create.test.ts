// @vitest-environment node
import { readFileSync } from "node:fs";
import { PGlite } from "@electric-sql/pglite";
import { afterEach, beforeEach, expect, it, vi } from "vitest";
import { POST, PUT } from "./route";
import { PUT as updateEnrollment, POST as createEnrollment } from "../matriculas/route";

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
  consentimiento_datos: true,
  sede_id: school,
  tipo_registro: "regular",
  nombre: "Ana",
  apellidos: "Prueba",
  dni: "12345678",
  tipo_documento: "CC",
  email: "ana@example.com",
  telefono: "3001234567",
  lugar_expedicion_documento: "Ipiales",
  fecha_nacimiento: "2000-01-15",
  sexo: "F",
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
    alter table alumnos add facturado boolean not null default false;
    alter table alumnos add numero_factura_electronica text;
    alter table alumnos add fecha_factura timestamptz;
    create table gastos(id uuid default gen_random_uuid(),escuela_id uuid,sede_id uuid,user_id uuid,categoria text,concepto text,monto numeric,metodo_pago text,proveedor text,fecha date,recurrente boolean,notas text);
    create table facturax_contract_invoices(contrato_id uuid primary key references matriculas_alumno(id),alumno_id uuid references alumnos(id));
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

it.each(["fecha_nacimiento", "sexo", "fecha_inscripcion"])(
  "exige %s para ANSV antes de crear la cuenta",
  async (field) => {
    expect((await POST(request({ ...body, [field]: null }))).status).toBe(400);
    expect(mock.createUser).not.toHaveBeenCalled();
    expect((await db.query("select * from alumnos")).rows).toHaveLength(0);
  }
);

it.each([false, undefined, null])(
  "exige autorización de datos explícita: %s",
  async (consentimiento_datos) => {
    const response = await POST(request({ ...body, consentimiento_datos }));
    expect(response.status).toBe(400);
    expect(mock.createUser).not.toHaveBeenCalled();
    expect((await db.query("select * from alumnos")).rows).toHaveLength(0);
  }
);

it("rechaza una fecha de nacimiento que daría seis años antes de crear la cuenta", async () => {
  const response = await POST(request({ ...body, fecha_nacimiento: "2019-11-20" }));
  expect(response.status).toBe(400);
  expect((await response.json()).error).toMatch(/fecha de nacimiento.*16 años/);
  expect(mock.createUser).not.toHaveBeenCalled();
  expect((await db.query("select * from matriculas_alumno")).rows).toHaveLength(0);
});

it("acepta 16 años cumplidos en la inscripción y guarda los datos requeridos", async () => {
  expect((await POST(request({ ...body, fecha_nacimiento: "2010-09-01" }))).status).toBe(200);
  expect((await db.query("select sexo,consentimiento_datos from alumnos")).rows).toEqual([
    { sexo: "F", consentimiento_datos: true },
  ]);
  expect(
    (await db.query<{ ansv: unknown }>("select ansv from matriculas_alumno")).rows[0].ansv
  ).toMatchObject({ edad: 16, status: "calculated" });
});

it.each(["aptitud_conductor", "practica_adicional"])(
  "exige fecha de servicio pero no nacimiento ni sexo en %s",
  async (tipo_registro) => {
    const service = { ...body, tipo_registro, fecha_nacimiento: null, sexo: null };
    expect((await POST(request({ ...service, fecha_inscripcion: null }))).status).toBe(400);
    expect(mock.createUser).not.toHaveBeenCalled();
    expect((await POST(request(service))).status).toBe(200);
    expect((await db.query("select * from matriculas_alumno")).rows).toHaveLength(0);
  }
);

it("rechaza fecha futura de inscripción sin crear cuentas", async () => {
  expect((await POST(request({ ...body, fecha_inscripcion: "2099-01-01" }))).status).toBe(400);
  expect(mock.createUser).not.toHaveBeenCalled();
});

it("guarda un único aporte ANSV del combo y conserva el cálculo al editar la ficha", async () => {
  const created = await POST(request({ ...body, categorias: ["A2", "C1"], ansv_categoria: "C1" }));
  expect(created.status).toBe(200);
  const row = (
    await db.query<{ id: string; ansv: unknown }>("select id,ansv from matriculas_alumno")
  ).rows[0];
  expect(row.ansv).toMatchObject({
    categoria: "C1",
    edad: 26,
    valorPesos: 8800,
    sexo: "F",
    vigencia: 2026,
  });
  const student = (await db.query<{ id: string }>("select id from alumnos")).rows[0];
  expect(
    (
      await PUT(
        request({
          ...body,
          alumno_id: student.id,
          solo_ficha: true,
          fecha_nacimiento: "1990-01-01",
        })
      )
    ).status
  ).toBe(200);
  expect(
    (await db.query<{ ansv: unknown }>("select ansv from matriculas_alumno")).rows[0].ansv
  ).toEqual(row.ansv);
});

it("no elige arbitrariamente categoría ANSV para un combo", async () => {
  expect((await POST(request({ ...body, categorias: ["A2", "B1"] }))).status).toBe(400);
  expect(mock.createUser).not.toHaveBeenCalled();
});

it.each([{ fecha_nacimiento: "2019-11-20" }, { fecha_nacimiento: null }, { sexo: null }])(
  "no permite borrar datos ANSV completos ni introducir un nacimiento incorrecto: %j",
  async (change) => {
    expect((await POST(request(body))).status).toBe(200);
    const student = (await db.query<{ id: string }>("select id from alumnos")).rows[0];
    const result = await PUT(
      request({ ...body, alumno_id: student.id, solo_ficha: true, ...change })
    );
    expect(result.status).toBe(400);
    expect(
      (await db.query("select sexo,fecha_nacimiento::text as nacimiento from alumnos")).rows
    ).toEqual([{ sexo: "F", nacimiento: body.fecha_nacimiento }]);
  }
);

it("conserva la edición ajena a ANSV de una ficha antigua incompleta", async () => {
  expect((await POST(request(body))).status).toBe(200);
  await db.query("update alumnos set fecha_nacimiento=null,sexo=null");
  const student = (await db.query<{ id: string }>("select id from alumnos")).rows[0];
  expect(
    (
      await PUT(
        request({
          ...body,
          alumno_id: student.id,
          solo_ficha: true,
          fecha_nacimiento: null,
          sexo: null,
          nombre: "Ana actualizada",
        })
      )
    ).status
  ).toBe(200);
});

it("una nueva matrícula rechaza la fecha errónea heredada y revierte su contrato", async () => {
  expect((await POST(request(body))).status).toBe(200);
  await db.query("update alumnos set fecha_nacimiento='2019-11-20'");
  const student = (await db.query<{ id: string }>("select id from alumnos")).rows[0];
  const response = await createEnrollment(
    request({
      alumno_id: student.id,
      sede_id: school,
      categorias: ["B1"],
      fecha_inscripcion: "2026-10-19",
    })
  );
  expect(response.status).toBe(400);
  expect((await response.json()).error).toMatch(/fecha de nacimiento.*16 años/);
  expect((await db.query("select * from matriculas_alumno")).rows).toHaveLength(1);
});

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

async function newEnrollment() {
  const response = await POST(request({ ...body, estado: "pre_registrado", abono: 0 }));
  expect(response.status).toBe(200);
  const student = (await db.query<{ id: string }>("select id from alumnos")).rows[0];
  const enrollment = (
    await db.query<{ id: string; numero_contrato: string }>(
      "select id,numero_contrato from matriculas_alumno"
    )
  ).rows[0];
  return { student, enrollment };
}
it("crea otra matrícula con su propio cálculo y no cambia el contrato previo", async () => {
  const target = await newEnrollment();
  const old = (
    await db.query<{ ansv: unknown }>("select ansv from matriculas_alumno where id=$1", [
      target.enrollment.id,
    ])
  ).rows[0].ansv;
  const result = await createEnrollment(
    new Request("https://condusoft.co/api/alumnos/matriculas", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        alumno_id: target.student.id,
        sede_id: school,
        fecha_inscripcion: "2026-10-01",
        categorias: ["A2", "C1"],
        ansv_categoria: "A2",
        valor_total: 100000,
      }),
    })
  );
  expect(result.status).toBe(200);
  expect(
    (
      await db.query<{ ansv: unknown }>("select ansv from matriculas_alumno where id=$1", [
        target.enrollment.id,
      ])
    ).rows[0].ansv
  ).toEqual(old);
  const created = await result.json();
  expect(
    (
      await db.query<{ ansv: unknown }>("select ansv from matriculas_alumno where id=$1", [
        created.matricula_id,
      ])
    ).rows[0].ansv
  ).toMatchObject({ categoria: "A2", valorPesos: 9100 });
});
function editRequest(value: unknown) {
  return new Request("https://condusoft.co/api/alumnos/matriculas", {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(value),
  });
}
function enrollmentEdit(target: Awaited<ReturnType<typeof newEnrollment>>) {
  return {
    alumno_id: target.student.id,
    matricula_id: target.enrollment.id,
    sede_id: school,
    fecha_inscripcion: "2026-10-19",
    categorias: ["B1"],
    valor_total: 150000,
    estado: "activo",
    notas: "Corregido",
    abono: 0,
    tiene_tramitador: false,
  };
}

it("updates a legacy student without contact completion and preserves its cancelled enrollment and contract counter", async () => {
  const { student, enrollment } = await newEnrollment();
  await db.query("update matriculas_alumno set estado='cancelado' where id=$1", [enrollment.id]);
  const before = (await db.query("select * from matriculas_alumno")).rows;
  const response = await PUT(
    editRequest({
      ...body,
      alumno_id: student.id,
      solo_ficha: true,
      estado: "pre_registrado",
      nombre: "Nombre editado",
      email: null,
      telefono: "",
      lugar_expedicion_documento: "",
      datos_facturacion: undefined,
      categorias: [],
      abono: 0,
      fecha_nacimiento: "2000-01-15",
    })
  );
  expect(response.status).toBe(200);
  expect(
    (await db.query("select nombre,fecha_nacimiento::text as nacimiento from alumnos")).rows[0]
  ).toEqual({ nombre: "Nombre editado", nacimiento: "2000-01-15" });
  expect((await db.query("select * from matriculas_alumno")).rows).toEqual(before);
  expect(
    (
      await db.query<{ siguiente_consecutivo_car: number }>(
        "select siguiente_consecutivo_car from configuracion_contratos_escuela"
      )
    ).rows[0].siguiente_consecutivo_car
  ).toBe(2);
});

it("edits and cancels an enrollment without allocating or recycling a contract number", async () => {
  const target = await newEnrollment();
  const response = await updateEnrollment(
    editRequest({ ...enrollmentEdit(target), estado: "cancelado" })
  );
  expect(response.status).toBe(200);
  expect(
    (await db.query("select numero_contrato,estado,valor_total from matriculas_alumno")).rows[0]
  ).toMatchObject({ numero_contrato: "CAR-0001", estado: "cancelado", valor_total: "150000" });
  expect((await db.query("select * from ingresos")).rows).toHaveLength(0);
  expect(
    (
      await db.query<{ siguiente_consecutivo_car: number }>(
        "select siguiente_consecutivo_car from configuracion_contratos_escuela"
      )
    ).rows[0].siguiente_consecutivo_car
  ).toBe(2);
  expect(
    (await POST(request({ ...body, dni: "87654321", estado: "pre_registrado", abono: 0 }))).status
  ).toBe(200);
  expect(
    (await db.query("select numero_contrato from matriculas_alumno order by numero_contrato")).rows
  ).toEqual([{ numero_contrato: "CAR-0001" }, { numero_contrato: "CAR-0002" }]);
});

it.each([null, 10000])(
  "does not reduce the enrollment value below collected payments (%s)",
  async (value) => {
    const target = await newEnrollment();
    await db.query(
      "insert into ingresos(alumno_id,matricula_id,monto,estado) values($1,$2,20000,'cobrado')",
      [target.student.id, target.enrollment.id]
    );
    const before = (await db.query("select * from matriculas_alumno")).rows;
    const response = await updateEnrollment(
      editRequest({ ...enrollmentEdit(target), valor_total: value })
    );
    expect(response.status).toBe(400);
    expect((await response.json()).error).toMatch(/abonos cobrados/);
    expect((await db.query("select * from matriculas_alumno")).rows).toEqual(before);
  }
);

it("keeps an invoiced enrollment unchanged", async () => {
  const target = await newEnrollment();
  await db.query("insert into facturax_contract_invoices values($1,$2)", [
    target.enrollment.id,
    target.student.id,
  ]);
  const before = (await db.query("select * from matriculas_alumno")).rows;
  expect((await updateEnrollment(editRequest(enrollmentEdit(target)))).status).toBe(409);
  expect((await db.query("select * from matriculas_alumno")).rows).toEqual(before);
});

it("rejects editing an enrollment outside the administrator's school", async () => {
  const target = await newEnrollment();
  mock.auth.mockResolvedValue({
    ok: true,
    perfil: { id: actor, rol: "admin_escuela", escuela_id: user, sede_id: school, activo: true },
  });
  const before = (await db.query("select * from matriculas_alumno")).rows;
  expect((await updateEnrollment(editRequest(enrollmentEdit(target)))).status).toBe(403);
  expect((await db.query("select * from matriculas_alumno")).rows).toEqual(before);
});

it("rejects an extra payment in the editing request without creating any income", async () => {
  const target = await newEnrollment();
  expect(
    (await updateEnrollment(editRequest({ ...enrollmentEdit(target), abono: 1000 }))).status
  ).toBe(400);
  expect((await db.query("select * from ingresos")).rows).toHaveLength(0);
});

it("allows cancelling an invoiced course while preserving the invoice, contract and financial values", async () => {
  const target = await newEnrollment();
  await db.query("insert into facturax_contract_invoices values($1,$2)", [
    target.enrollment.id,
    target.student.id,
  ]);
  const response = await updateEnrollment(
    editRequest({
      ...enrollmentEdit(target),
      valor_total: body.valor_total,
      fecha_inscripcion: body.fecha_inscripcion,
      estado: "cancelado",
    })
  );
  expect(response.status).toBe(200);
  expect(
    (await db.query("select numero_contrato,estado,valor_total from matriculas_alumno")).rows[0]
  ).toMatchObject({ numero_contrato: "CAR-0001", estado: "cancelado", valor_total: "100000" });
  expect((await db.query("select * from facturax_contract_invoices")).rows).toHaveLength(1);
});

it("records a newly assigned intermediary once and does not duplicate its expense if the edit is submitted again", async () => {
  const target = await newEnrollment();
  const edit = {
    ...enrollmentEdit(target),
    tiene_tramitador: true,
    tramitador_nombre: "Agencia de prueba",
    tramitador_valor: 5000,
  };
  expect((await updateEnrollment(editRequest(edit))).status).toBe(200);
  expect((await updateEnrollment(editRequest(edit))).status).toBe(200);
  const expenses = (await db.query("select monto,proveedor from gastos")).rows;
  expect(expenses).toEqual([{ monto: "5000", proveedor: "Agencia de prueba" }]);
  expect((await updateEnrollment(editRequest({ ...edit, tramitador_valor: 10000 }))).status).toBe(
    409
  );
  expect((await db.query("select monto,proveedor from gastos")).rows).toEqual(expenses);
});
