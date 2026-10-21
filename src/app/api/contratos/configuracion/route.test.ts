// @vitest-environment node
import { PGlite } from "@electric-sql/pglite";
import { NextResponse } from "next/server";
import { afterAll, afterEach, beforeAll, beforeEach, expect, it, vi } from "vitest";
import { GET, PUT } from "./route";

const mocks = vi.hoisted(() => ({ auth: vi.fn(), query: vi.fn(), release: vi.fn() }));
vi.mock("@/lib/api-auth", async (original) => ({
  ...(await original<typeof import("@/lib/api-auth")>()),
  authorizeApiRequest: mocks.auth,
}));
vi.mock("@/lib/server-db", () => ({
  getServerDbPool: () => ({
    query: mocks.query,
    connect: async () => ({ query: mocks.query, release: mocks.release }),
  }),
}));
const school = "10000000-0000-4000-8000-000000000001";
const other = "10000000-0000-4000-8000-000000000002";
let db: PGlite;
beforeAll(async () => {
  db = new PGlite();
  const configFields = [
    "nombre_legal_escuela",
    "nit_escuela",
    "representante_legal_nombre",
    "representante_legal_tipo_documento",
    "representante_legal_numero_documento",
    "representante_legal_lugar_expedicion",
    "direccion_legal_escuela",
    "telefono_legal_escuela",
    "ciudad_firma",
    "pie_direccion",
    "pie_telefonos",
    "pie_correo",
    "cargo_firmante",
  ];
  await db.exec(`create table configuracion_contratos_escuela(escuela_id uuid primary key,
    ${configFields.map((field) => `${field} text`).join(",")},updated_at timestamptz);
    create type contract_type as enum ('moto','vehiculo','combo');
    create table plantillas_contrato_escuela(id uuid default gen_random_uuid(), escuela_id uuid,
      tipo_plantilla contract_type,titulo text,html_plantilla text,updated_at timestamptz,
      unique(escuela_id,tipo_plantilla));`);
}, 30000);
beforeEach(async () => {
  vi.clearAllMocks();
  mocks.auth.mockResolvedValue({
    ok: true,
    perfil: { id: "staff", rol: "admin_escuela", escuela_id: school },
  });
  mocks.query.mockImplementation((sql, values) => db.query(sql, values));
  vi.spyOn(console, "error").mockImplementation(() => undefined);
  await db.exec("truncate configuracion_contratos_escuela,plantillas_contrato_escuela");
  await db.query(
    "insert into plantillas_contrato_escuela(escuela_id,tipo_plantilla,titulo,html_plantilla) values($1,'vehiculo','Original','Vehiculo original'),($2,'moto','Otra escuela','No modificar')",
    [school, other]
  );
});
afterEach(() => vi.restoreAllMocks());
afterAll(async () => {
  await db?.close();
});
const request = (body: unknown) =>
  new Request("https://condusoft.co/api/contratos/configuracion", {
    method: "PUT",
    headers: { "content-type": "application/json", cookie: `dashboard_school_id=${other}` },
    body: JSON.stringify(body),
  });
const template = (type: string) => ({
  tipo_plantilla: type,
  titulo: `Nuevo ${type}`,
  html_plantilla: `Texto ${type}`,
});
it("guarda los tres formatos de la escuela autorizada sin tocar otra escuela", async () => {
  const result = await PUT(
    request({
      configuracion: { nombre_legal_escuela: "Escuela demo" },
      plantillas: [template("moto"), template("vehiculo"), template("combo")],
    })
  );
  expect(result.status).toBe(200);
  expect(
    (
      await db.query(
        "select count(*)::int as total from plantillas_contrato_escuela where escuela_id=$1",
        [school]
      )
    ).rows
  ).toEqual([{ total: 3 }]);
  expect(
    (
      await db.query("select html_plantilla from plantillas_contrato_escuela where escuela_id=$1", [
        other,
      ])
    ).rows
  ).toEqual([{ html_plantilla: "No modificar" }]);
  expect(mocks.auth).toHaveBeenCalledWith(["super_admin", "admin_escuela"], expect.any(Request));
  expect(mocks.release).toHaveBeenCalledOnce();
});
it("revierte encabezado y formatos juntos si falla una escritura", async () => {
  mocks.query.mockImplementation((sql: string, values?: unknown[]) => {
    if (sql.includes("insert into plantillas") && values?.[1] === "combo")
      throw new Error("private failure");
    return db.query(sql, values);
  });
  const result = await PUT(
    request({
      configuracion: { nombre_legal_escuela: "No guardar" },
      plantillas: [template("moto"), template("combo")],
    })
  );
  expect(result.status).toBe(500);
  expect(JSON.stringify(await result.json())).not.toContain("private");
  expect(
    (await db.query("select count(*)::int as total from configuracion_contratos_escuela")).rows
  ).toEqual([{ total: 0 }]);
  expect(
    (
      await db.query("select html_plantilla from plantillas_contrato_escuela where escuela_id=$1", [
        school,
      ])
    ).rows
  ).toEqual([{ html_plantilla: "Vehiculo original" }]);
});
it("rechaza tipos desconocidos y repetidos antes de escribir", async () => {
  for (const plantillas of [[template("desconocido")], [template("moto"), template("moto")]]) {
    expect((await PUT(request({ plantillas }))).status).toBe(400);
  }
  expect(mocks.query).not.toHaveBeenCalled();
});
it("consulta solo la escuela del administrador y devuelve su identificador", async () => {
  const result = await GET(request({}));
  const body = await result.json();
  expect(body.escuelaId).toBe(school);
  expect(body.plantillas).toHaveLength(1);
  expect(body.plantillas[0].html_plantilla).toBe("Vehiculo original");
});
it("no accede a las plantillas sin autorizacion", async () => {
  mocks.auth.mockResolvedValue({
    ok: false,
    response: NextResponse.json({ error: "No autorizado" }, { status: 401 }),
  });
  expect((await PUT(request({ plantillas: [template("moto")] }))).status).toBe(401);
  expect((await GET(request({}))).status).toBe(401);
  expect(mocks.query).not.toHaveBeenCalled();
});
