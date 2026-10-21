// @vitest-environment node
import { PGlite } from "@electric-sql/pglite";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { POST } from "./route";

const mock = vi.hoisted(() => ({
  auth: vi.fn(),
  pool: vi.fn(),
  cache: vi.fn(),
  query: vi.fn(),
  release: vi.fn(),
}));

vi.mock("server-only", () => ({}));
vi.mock("@/lib/api-auth", async (original) => ({
  ...(await original<typeof import("@/lib/api-auth")>()),
  authorizeApiRequest: mock.auth,
}));

vi.mock("@/lib/server-db", () => ({ getServerDbPool: mock.pool }));
vi.mock("@/lib/server-read-cache", () => ({ revalidateServerReadCache: mock.cache }));

const escuelaId = "20000000-0000-4000-8000-000000000001";
const sedeId = "20000000-0000-4000-8000-000000000002";
const userId = "20000000-0000-4000-8000-000000000003";
const alumnoId = "20000000-0000-4000-8000-000000000004";
const matriculaId = "20000000-0000-4000-8000-000000000005";

const createRequest = (body: unknown) =>
  new Request("https://example.com/api/alumnos/cancelar", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });

let db: PGlite;
let inTransaction: boolean;

describe("POST /api/alumnos/cancelar", () => {
  beforeEach(async () => {
    vi.resetAllMocks();
    db = new PGlite();
    inTransaction = false;

    await db.exec(`
      create table perfiles (
        id uuid primary key,
        rol text,
        activo boolean default true
      );
      create table alumnos (
        id uuid primary key,
        user_id uuid,
        escuela_id uuid,
        sede_id uuid,
        tipo_registro text,
        numero_contrato text,
        estado text default 'activo'
      );
      create table matriculas_alumno (
        id uuid primary key,
        alumno_id uuid references alumnos(id),
        numero_contrato text,
        prefijo_contrato text,
        consecutivo_contrato bigint,
        estado text default 'activo',
        notas text,
        updated_by uuid,
        updated_at timestamptz
      );

      insert into perfiles values ('${userId}', 'alumno', true);
      insert into alumnos values ('${alumnoId}', '${userId}', '${escuelaId}', '${sedeId}', 'regular', '001', 'activo');
      insert into matriculas_alumno values ('${matriculaId}', '${alumnoId}', '001', null, null, 'activo', 'Matricula inicial', null, null);
    `);

    mock.query.mockImplementation(async (sql: string, values?: unknown[]) => {
      const result = await db.query(sql, values);
      if (sql === "BEGIN") inTransaction = true;
      if (sql === "ROLLBACK" || sql === "COMMIT") inTransaction = false;
      return result;
    });

    mock.release.mockImplementation(() => expect(inTransaction).toBe(false));

    mock.pool.mockReturnValue({
      query: (sql: string, values?: unknown[]) => db.query(sql, values),
      connect: async () => ({ query: mock.query, release: mock.release }),
    });

    mock.auth.mockResolvedValue({
      ok: true,
      perfil: {
        id: userId,
        escuela_id: escuelaId,
        sede_id: sedeId,
        rol: "admin_escuela",
        activo: true,
      },
    });
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("cancela alumno y matriculas, desactiva perfil y revalida cache", async () => {
    const res = await POST(createRequest({ alumno_id: alumnoId, motivo: "Retiro voluntario" }));
    expect(res.status).toBe(200);

    const body = await res.json();
    expect(body).toEqual({ ok: true, mode: "cancelled", alumno_id: alumnoId });

    // Verifica que el alumno pasó a inactivo
    const alumnoRow = (
      await db.query<{ estado: string }>("select estado from alumnos where id = $1", [alumnoId])
    ).rows[0];
    expect(alumnoRow?.estado).toBe("inactivo");

    // Verifica que la matrícula pasó a cancelada con la nota
    const matRow = (
      await db.query<{ estado: string; notas: string }>(
        "select estado, notas from matriculas_alumno where id = $1",
        [matriculaId]
      )
    ).rows[0];
    expect(matRow?.estado).toBe("cancelado");
    expect(matRow?.notas).toContain("Cancelado por admin_escuela: Retiro voluntario");

    // Verifica que el perfil de alumno fue desactivado
    const perfilRow = (
      await db.query<{ activo: boolean }>("select activo from perfiles where id = $1", [userId])
    ).rows[0];
    expect(perfilRow?.activo).toBe(false);

    // Verifica que se llamó a la revalidación de caché
    expect(mock.cache).toHaveBeenCalledWith(
      expect.arrayContaining([
        expect.stringContaining("alumnos"),
        expect.stringContaining("cartera"),
        expect.stringContaining("contratos"),
      ])
    );
  });

  it("rechaza cancelacion si el alumno no tiene contrato asignado", async () => {
    await db.exec(`
      update alumnos set numero_contrato = null where id = '${alumnoId}';
      update matriculas_alumno set numero_contrato = null where id = '${matriculaId}';
    `);

    const res = await POST(createRequest({ alumno_id: alumnoId }));
    expect(res.status).toBe(400);

    const body = await res.json();
    expect(body.error).toContain("no tiene un contrato asignado");
  });

  it("rechaza cancelacion si el usuario pertenece a otra escuela", async () => {
    mock.auth.mockResolvedValue({
      ok: true,
      perfil: {
        id: userId,
        escuela_id: "99999999-9999-4999-8999-999999999999",
        sede_id: sedeId,
        rol: "admin_escuela",
        activo: true,
      },
    });

    const res = await POST(createRequest({ alumno_id: alumnoId }));
    expect(res.status).toBe(403);
  });
});
