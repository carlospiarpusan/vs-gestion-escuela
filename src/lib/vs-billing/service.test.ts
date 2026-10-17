// @vitest-environment node
import { readFileSync } from "node:fs";
import { PGlite } from "@electric-sql/pglite";
import { afterAll, beforeAll, beforeEach, describe, expect, it, vi } from "vitest";
import {
  authenticateConnectionToken,
  getBillingStudent,
  hashConnectionToken,
  listConnectionKeys,
  revokeConnectionKey,
  rotateConnectionKey,
  searchBillingStudents,
  updateConnectionExpiry,
  deleteConnectionKey,
} from "./service";
import { canManageVsBilling, VS_BILLING_SCHOOL } from "./scope";
import type { Rol } from "@/types/database";

const mock = vi.hoisted(() => ({ query: vi.fn(), release: vi.fn() }));
vi.mock("@/lib/server-db", () => ({
  getServerDbPool: () => ({
    query: mock.query,
    connect: async () => ({ query: mock.query, release: mock.release }),
  }),
}));
let db: PGlite;
let originalExpiry: unknown;
let migratedExpiry: unknown;
const actor = "10000000-0000-4000-8000-000000000001";
const student = "10000000-0000-4000-8000-000000000002";
const otherSchool = "20000000-0000-4000-8000-000000000001";
const admin = { activo: true, rol: "admin_escuela" as Rol, escuela_id: VS_BILLING_SCHOOL.id };

beforeAll(async () => {
  db = new PGlite();
  await db.exec(`
    create role anon; create role authenticated;
    create table escuelas (id uuid primary key, cif text);
    create table perfiles (id uuid primary key, rol text, activo boolean, escuela_id uuid);
    create table alumnos (id uuid primary key, escuela_id uuid references escuelas(id),
      nombre text, apellidos text, dni text, tipo_documento text, email text,
      valor_total numeric, categorias text[], numero_contrato text, credencial text, estado text);
    insert into escuelas values ('${VS_BILLING_SCHOOL.id}', '${VS_BILLING_SCHOOL.nit}'), ('${otherSchool}', '900000000');
    insert into perfiles values ('${actor}', 'admin_escuela', true, '${VS_BILLING_SCHOOL.id}');
    insert into alumnos values ('${student}', '${VS_BILLING_SCHOOL.id}', 'Persona', 'Ficticia', '12345678', 'CC', 'demo@example.com', 850000, ARRAY['A2'], 'CONTRATO-SECRETO', 'PASSWORD-NUNCA-EXPORTAR', 'activo'),
      ('${otherSchool}', '${otherSchool}', 'Persona', 'Otra Escuela', '99999999', 'CC', null, 1000000, ARRAY['B1'], 'OTRO', 'PRIVATE', 'activo');
  `);
  await db.exec(
    readFileSync(
      new URL("../../../supabase/migrations/053_vs_facturacion_api.sql", import.meta.url),
      "utf8"
    )
  );
  originalExpiry = (
    await db.query(
      `insert into vs_facturacion_api_keys
    (escuela_id, nombre, token_hash, identificador) values ($1, 'Existente', $2, '...')
    returning expires_at`,
      [VS_BILLING_SCHOOL.id, "e".repeat(64)]
    )
  ).rows[0];
  await db.exec(
    readFileSync(
      new URL(
        "../../../supabase/migrations/054_vs_facturacion_connection_lifecycle.sql",
        import.meta.url
      ),
      "utf8"
    )
  );
  migratedExpiry = (await db.query("select expires_at from vs_facturacion_api_keys")).rows[0];
}, 30000);
beforeEach(async () => {
  mock.query.mockReset();
  mock.release.mockClear();
  mock.query.mockImplementation((sql: string, values?: unknown[]) => db.query(sql, values));
  await db.exec(`truncate vs_facturacion_api_events, vs_facturacion_api_keys;
    update perfiles set rol = 'admin_escuela', activo = true, escuela_id = '${VS_BILLING_SCHOOL.id}';
    update escuelas set cif = '${VS_BILLING_SCHOOL.nit}' where id = '${VS_BILLING_SCHOOL.id}';
    delete from alumnos where id not in ('${student}', '${otherSchool}');`);
});
afterAll(async () => {
  await db?.close();
});

describe("alcance de la conexion", () => {
  it("requiere activacion explicita", () =>
    expect(canManageVsBilling(false, admin, admin.escuela_id)).toBe(false));
  it("admite solo la escuela autorizada", () => {
    expect(canManageVsBilling(true, admin, null)).toBe(true);
    expect(canManageVsBilling(true, { ...admin, escuela_id: otherSchool }, admin.escuela_id)).toBe(
      false
    );
    expect(canManageVsBilling(true, { ...admin, activo: false }, admin.escuela_id)).toBe(false);
  });
  it.each(["alumno", "instructor", "recepcion", "administrativo", "admin_sede"] as Rol[])(
    "rechaza el rol %s",
    (rol) => expect(canManageVsBilling(true, { ...admin, rol }, admin.escuela_id)).toBe(false)
  );
  it("el superadministrador debe seleccionar la escuela", () => {
    expect(canManageVsBilling(true, { ...admin, rol: "super_admin" }, null)).toBe(false);
    expect(canManageVsBilling(true, { ...admin, rol: "super_admin" }, otherSchool)).toBe(false);
    expect(canManageVsBilling(true, { ...admin, rol: "super_admin" }, admin.escuela_id)).toBe(true);
  });
});

describe("API privada sobre PostgreSQL en memoria", () => {
  it("la migracion conserva la vigencia existente", () =>
    expect(migratedExpiry).toEqual(originalExpiry));
  it("mantiene 90 dias por defecto", async () => {
    const { clave } = await rotateConnectionKey("Predeterminada", actor);
    expect(Date.parse(clave.expires_at!) - Date.now()).toBeGreaterThan(89.99 * 86_400_000);
    expect(Date.parse(clave.expires_at!) - Date.now()).toBeLessThanOrEqual(90 * 86_400_000);
  });
  it("permite crear una clave sin vencimiento que sigue exigiendo un responsable activo", async () => {
    const { clave, token } = await rotateConnectionKey("Permanente", actor, null);
    expect(clave.expires_at).toBeNull();
    expect(await authenticateConnectionToken(`Bearer ${token}`)).toBe(clave.id);
    await db.exec("update perfiles set activo = false");
    expect(await authenticateConnectionToken(`Bearer ${token}`)).toBeNull();
  });
  it("acepta una vigencia mayor de 90 dias sin cambiar la clave", async () => {
    const { clave, token } = await rotateConnectionKey("Temporal", actor);
    const future = new Date(Date.now() + 365 * 86_400_000).toISOString();
    const updated = await updateConnectionExpiry(clave.id, future, actor);
    expect(Date.parse(updated!.expires_at!)).toBe(Date.parse(future));
    expect(await authenticateConnectionToken(`Bearer ${token}`)).toBe(clave.id);
    expect((await db.query("select token_hash from vs_facturacion_api_keys")).rows[0]).toEqual({
      token_hash: hashConnectionToken(token),
    });
  });
  it("edita a sin vencimiento y permite volver a fecha conservando la auditoria", async () => {
    const { clave, token } = await rotateConnectionKey("Temporal", actor);
    expect((await updateConnectionExpiry(clave.id, null, actor))!.expires_at).toBeNull();
    expect(await authenticateConnectionToken(`Bearer ${token}`)).toBe(clave.id);
    const future = new Date(Date.now() + 10 * 86_400_000).toISOString();
    await updateConnectionExpiry(clave.id, future, actor);
    const events = (
      await db.query<{ expires_at_before: Date | null; expires_at_after: Date | null }>(
        "select expires_at_before, expires_at_after from vs_facturacion_api_events where accion = 'vigencia_editada' order by created_at"
      )
    ).rows;
    expect(events).toHaveLength(2);
    expect(events[0].expires_at_before).not.toBeNull();
    expect(events[0].expires_at_after).toBeNull();
    expect(events[1].expires_at_before).toBeNull();
    expect(new Date(events[1].expires_at_after!).toISOString()).toBe(future);
  });
  it("puede renovar una clave vencida pero no una revocada o eliminada", async () => {
    const { clave, token } = await rotateConnectionKey("Temporal", actor);
    await db.exec(
      "update vs_facturacion_api_keys set created_at=now()-interval '91 days', expires_at=now()-interval '1 day'"
    );
    await updateConnectionExpiry(clave.id, null, actor);
    expect(await authenticateConnectionToken(`Bearer ${token}`)).toBe(clave.id);
    await revokeConnectionKey(clave.id, actor);
    expect(await updateConnectionExpiry(clave.id, null, actor)).toBeNull();
    await deleteConnectionKey(clave.id, actor);
    expect(await updateConnectionExpiry(clave.id, null, actor)).toBeNull();
    expect(await authenticateConnectionToken(`Bearer ${token}`)).toBeNull();
  });
  it.each(["2020-01-01T12:00:00Z", "infinity", "fecha invalida"])(
    "rechaza vigencia invalida %s sin alterar claves",
    async (expiry) => {
      const { clave, token } = await rotateConnectionKey("Actual", actor);
      await expect(updateConnectionExpiry(clave.id, expiry, actor)).rejects.toThrow();
      await expect(rotateConnectionKey("Otra", actor, expiry)).rejects.toThrow();
      expect(await authenticateConnectionToken(`Bearer ${token}`)).toBe(clave.id);
    }
  );
  it("eliminar una conexion sin vencimiento cancela acceso, oculta el registro y conserva auditoria", async () => {
    const before = (await db.query("select * from alumnos order by id")).rows;
    const { clave, token } = await rotateConnectionKey("Permanente", actor, null);
    await deleteConnectionKey(clave.id, actor);
    await deleteConnectionKey(clave.id, actor);
    expect(await listConnectionKeys()).toHaveLength(0);
    expect(await authenticateConnectionToken(`Bearer ${token}`)).toBeNull();
    const row = (
      await db.query<{ revoked_at: unknown; deleted_at: unknown }>(
        "select revoked_at,deleted_at from vs_facturacion_api_keys"
      )
    ).rows[0];
    expect(row.revoked_at).not.toBeNull();
    expect(row.deleted_at).not.toBeNull();
    expect((await db.query("select * from vs_facturacion_api_events")).rows).toHaveLength(2);
    expect((await db.query("select * from alumnos order by id")).rows).toEqual(before);
    expect((await rotateConnectionKey("Nueva", actor)).clave.id).not.toBe(clave.id);
  });
  it("no modifica conexiones inexistentes", async () => {
    expect(await updateConnectionExpiry(otherSchool, null, actor)).toBeNull();
    await deleteConnectionKey(otherSchool, actor);
    expect((await db.query("select * from vs_facturacion_api_events")).rows).toHaveLength(0);
  });
  it.each(["editar", "eliminar"])("revierte %s si falla su auditoria", async (operation) => {
    const { clave, token } = await rotateConnectionKey("Actual", actor);
    mock.query.mockImplementation((sql: string, values?: unknown[]) => {
      if (sql.includes("insert into public.vs_facturacion_api_events"))
        throw new Error("fallo simulado");
      return db.query(sql, values);
    });
    await expect(
      operation === "editar"
        ? updateConnectionExpiry(clave.id, null, actor)
        : deleteConnectionKey(clave.id, actor)
    ).rejects.toThrow("fallo simulado");
    mock.query.mockImplementation((sql: string, values?: unknown[]) => db.query(sql, values));
    expect((await listConnectionKeys())[0]).toEqual(clave);
    expect(await authenticateConnectionToken(`Bearer ${token}`)).toBe(clave.id);
  });
  it("guarda solo hash de una clave aleatoria y registra auditoria", async () => {
    const result = await rotateConnectionKey("vs-facturacion", actor);
    expect(result.token).toMatch(/^cs_vsf_[A-Za-z0-9_-]{43}$/);
    const rows = (await db.query<{ token_hash: string }>("select * from vs_facturacion_api_keys"))
      .rows;
    expect(rows[0].token_hash).toBe(hashConnectionToken(result.token));
    expect(JSON.stringify(rows)).not.toContain(result.token);
    expect(JSON.stringify(await listConnectionKeys())).not.toContain(rows[0].token_hash);
    expect((await db.query("select * from vs_facturacion_api_events")).rows).toHaveLength(1);
  });
  it("valida la clave y registra su ultimo uso", async () => {
    const { token, clave } = await rotateConnectionKey("vs-facturacion", actor);
    expect(await authenticateConnectionToken(`Bearer ${token}`)).toBe(clave.id);
    expect((await listConnectionKeys())[0].last_used_at).not.toBeNull();
  });
  it.each([null, "", "Bearer incorrecto", "Basic user:pass", `Bearer cs_vsf_${"a".repeat(44)}`])(
    "rechaza formato de credencial invalido %s sin consultar datos",
    async (authorization) => {
      mock.query.mockClear();
      expect(await authenticateConnectionToken(authorization)).toBeNull();
      expect(mock.query).not.toHaveBeenCalled();
    }
  );
  it("rechaza claves desconocidas", async () =>
    expect(await authenticateConnectionToken(`Bearer cs_vsf_${"a".repeat(43)}`)).toBeNull());
  it("rotar revoca la clave anterior sin alterar otros datos", async () => {
    const before = (await db.query("select * from alumnos order by id")).rows;
    const first = await rotateConnectionKey("Primera", actor);
    const second = await rotateConnectionKey("Segunda", actor);
    expect(second.token).not.toBe(first.token);
    expect(await authenticateConnectionToken(`Bearer ${first.token}`)).toBeNull();
    expect(await authenticateConnectionToken(`Bearer ${second.token}`)).toBe(second.clave.id);
    expect((await db.query("select * from alumnos order by id")).rows).toEqual(before);
    expect((await db.query("select * from vs_facturacion_api_events")).rows).toHaveLength(3);
  });
  it("revocar es idempotente", async () => {
    const { token, clave } = await rotateConnectionKey("vs-facturacion", actor);
    await revokeConnectionKey(clave.id, actor);
    await revokeConnectionKey(clave.id, actor);
    expect(await authenticateConnectionToken(`Bearer ${token}`)).toBeNull();
    expect(
      (await db.query("select * from vs_facturacion_api_events where accion = 'clave_revocada'"))
        .rows
    ).toHaveLength(1);
  });
  it("rechaza claves vencidas", async () => {
    const { token } = await rotateConnectionKey("vs-facturacion", actor);
    await db.exec(
      "update vs_facturacion_api_keys set created_at = now() - interval '91 days', expires_at = now() - interval '1 day'"
    );
    expect(await authenticateConnectionToken(`Bearer ${token}`)).toBeNull();
  });
  it("revierte la rotacion completa si falla la auditoria", async () => {
    const first = await rotateConnectionKey("Primera", actor);
    mock.query.mockImplementation((sql: string, values?: unknown[]) => {
      if (sql.includes("insert into public.vs_facturacion_api_events"))
        throw new Error("fallo simulado");
      return db.query(sql, values);
    });
    await expect(rotateConnectionKey("Segunda", actor)).rejects.toThrow("fallo simulado");
    mock.query.mockImplementation((sql: string, values?: unknown[]) => db.query(sql, values));
    expect(await authenticateConnectionToken(`Bearer ${first.token}`)).toBe(first.clave.id);
    expect(await listConnectionKeys()).toHaveLength(1);
  });
  it.each(["activo = false", "rol = 'alumno'", `escuela_id = '${otherSchool}'`])(
    "suspende acceso si cambia el responsable: %s",
    async (update) => {
      const { token } = await rotateConnectionKey("vs-facturacion", actor);
      await db.exec(`update perfiles set ${update}`);
      expect(await authenticateConnectionToken(`Bearer ${token}`)).toBeNull();
    }
  );
  it("rechaza NIT diferente o digito de verificacion incorrecto", async () => {
    const { token } = await rotateConnectionKey("vs-facturacion", actor);
    for (const nit of ["900000000", "901171550-1"]) {
      await db.query("update escuelas set cif = $1 where id = $2", [nit, VS_BILLING_SCHOOL.id]);
      expect(await authenticateConnectionToken(`Bearer ${token}`)).toBeNull();
    }
    await db.query("update escuelas set cif = $1 where id = $2", [
      "901.171.550-0",
      VS_BILLING_SCHOOL.id,
    ]);
    expect(await authenticateConnectionToken(`Bearer ${token}`)).not.toBeNull();
  });
  it("exporta EXCLUSIVAMENTE identidad y correo del alumno", async () => {
    const result = await getBillingStudent(student);
    expect(result).toEqual({
      schema_version: 1,
      source: "condusoft",
      source_reference: `condusoft:alumno:${student}`,
      alumno: {
        id: student,
        nombre: "Persona",
        apellidos: "Ficticia",
        nombre_completo: "Persona Ficticia",
        tipo_documento: "CC",
        documento: "12345678",
        email: "demo@example.com",
      },
    });
    const serialized = JSON.stringify(result);
    for (const forbidden of [
      "850000",
      "A2",
      "CONTRATO-SECRETO",
      "PASSWORD",
      "matricula",
      "curso",
      "valor",
      "impuestos",
      "pago",
    ])
      expect(serialized).not.toContain(forbidden);
    const sql = mock.query.mock.calls.map((call) => String(call[0])).join("\n");
    expect(sql).not.toMatch(
      /matriculas|ingresos|valor_total|categorias|numero_contrato|credencial|select\s+\*/i
    );
  });
  it("no revela alumnos de otras escuelas por UUID o busqueda", async () => {
    expect(await getBillingStudent(otherSchool)).toBeNull();
    expect((await searchBillingStudents("99999999", null)).data).toHaveLength(0);
    expect((await searchBillingStudents("Persona", null)).data).toHaveLength(1);
  });
  it("trata comodines e intentos de SQL como texto literal", async () => {
    expect((await searchBillingStudents("%__", null)).data).toHaveLength(0);
    expect((await searchBillingStudents("' OR true --", null)).data).toHaveLength(0);
    expect((await searchBillingStudents("12345678", null)).data).toHaveLength(1);
  });
  it("pagina de 20 en 20 sin repetir alumnos", async () => {
    for (let i = 10; i < 32; i++)
      await db.query(
        "insert into alumnos (id, escuela_id, nombre, apellidos, dni) values ($1,$2,$3,$4,$5)",
        [
          `10000000-0000-4000-8000-${String(i).padStart(12, "0")}`,
          VS_BILLING_SCHOOL.id,
          "Persona",
          "Demo",
          String(i),
        ]
      );
    const first = await searchBillingStudents("Persona", null);
    const second = await searchBillingStudents("Persona", first.next_cursor);
    expect(first.data).toHaveLength(20);
    expect(second.data).toHaveLength(3);
    expect(second.next_cursor).toBeNull();
    expect(new Set([...first.data, ...second.data].map((row) => row.alumno.id)).size).toBe(23);
  });
  it("la base de datos impide claves de otra escuela", async () => {
    await expect(
      db.query(
        "insert into vs_facturacion_api_keys (escuela_id,nombre,token_hash,identificador) values ($1,'otra',$2,'...')",
        [otherSchool, "a".repeat(64)]
      )
    ).rejects.toMatchObject({ code: "23514" });
  });
  it.each(["anon", "authenticated"])("no permite consultar las claves como %s", async (role) => {
    await rotateConnectionKey("vs-facturacion", actor);
    await db.exec(`set role ${role}`);
    try {
      await expect(db.query("select * from vs_facturacion_api_keys")).rejects.toMatchObject({
        code: "42501",
      });
    } finally {
      await db.exec("reset role");
    }
  });
  it("RLS protege incluso si se concede SELECT por error", async () => {
    await rotateConnectionKey("vs-facturacion", actor);
    await db.exec(
      "grant select on vs_facturacion_api_keys to authenticated; set role authenticated;"
    );
    try {
      expect((await db.query("select * from vs_facturacion_api_keys")).rows).toHaveLength(0);
    } finally {
      await db.exec("reset role; revoke select on vs_facturacion_api_keys from authenticated;");
    }
  });
});
