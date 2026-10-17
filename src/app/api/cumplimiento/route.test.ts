// @vitest-environment node
import { PGlite } from "@electric-sql/pglite";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { GET } from "./route";

const mock = vi.hoisted(() => ({
  auth: vi.fn(),
  pool: vi.fn(),
}));

vi.mock("@/lib/api-auth", async (original) => ({
  ...(await original<typeof import("@/lib/api-auth")>()),
  authorizeApiRequest: mock.auth,
  resolveEscuelaIdForRequest: vi.fn(
    (_req, _perfil, explicitId) => explicitId || "30000000-0000-4000-8000-000000000001"
  ),
}));

vi.mock("@/lib/server-db", () => ({ getServerDbPool: mock.pool }));

const escuelaId = "30000000-0000-4000-8000-000000000001";
const userId = "30000000-0000-4000-8000-000000000002";

let db: PGlite;

describe("GET /api/cumplimiento", () => {
  beforeEach(async () => {
    vi.resetAllMocks();
    db = new PGlite();

    await db.exec(`
      create table escuelas (id uuid primary key, nombre text);
      create table cumplimiento_escuelas (
        id uuid primary key default gen_random_uuid(),
        escuela_id uuid references escuelas(id),
        politica_privacidad_vigente boolean default true,
        politica_version text default 'v1.0',
        politica_revisada_at timestamptz default now(),
        responsable_nombre text default 'Oficial Datos',
        responsable_cargo text default 'DPO',
        responsable_email text default 'dpo@escuela.com',
        responsable_telefono text default '3001234567',
        canal_contacto text default 'protecciondatos@escuela.com',
        consentimientos_revisados_at timestamptz default now(),
        rnbd_estado text default 'actualizado',
        rnbd_revisado_at timestamptz default now(),
        rnbd_evidencia_ref text default 'RNBD-2026-001',
        notas text,
        created_at timestamptz default now(),
        updated_at timestamptz default now()
      );
      create table cumplimiento_respaldos (
        id uuid primary key default gen_random_uuid(),
        escuela_id uuid references escuelas(id),
        fecha_respaldo date default current_date,
        tipo text,
        resultado text default 'exitoso',
        responsable text,
        evidencia_ref text,
        detalle text,
        created_at timestamptz default now(),
        updated_at timestamptz default now()
      );
      create table cumplimiento_incidentes (
        id uuid primary key default gen_random_uuid(),
        escuela_id uuid references escuelas(id),
        clasificacion text,
        impacto text default 'medio',
        estado text default 'cerrado',
        titulo text,
        descripcion text,
        acciones_tomadas text,
        responsable text,
        fecha_deteccion timestamptz default now(),
        fecha_cierre timestamptz default now(),
        created_at timestamptz default now(),
        updated_at timestamptz default now()
      );
      create table cumplimiento_retencion (
        id uuid primary key default gen_random_uuid(),
        escuela_id uuid references escuelas(id),
        tipo_dato text,
        meses_retencion int default 60,
        criterio_legal text,
        estado_revision text default 'vigente',
        revisado_at timestamptz default now(),
        evidencia_ref text,
        notas text,
        created_at timestamptz default now(),
        updated_at timestamptz default now()
      );

      insert into escuelas values ('${escuelaId}', 'Autoescuela Central');
      insert into cumplimiento_escuelas (escuela_id) values ('${escuelaId}');
      insert into cumplimiento_respaldos (escuela_id, tipo, responsable) values ('${escuelaId}', 'base_datos', 'Admin');
      insert into cumplimiento_incidentes (escuela_id, clasificacion, titulo, descripcion) values ('${escuelaId}', 'otro', 'Prueba', 'Descripcion');
      insert into cumplimiento_retencion (escuela_id, tipo_dato) values ('${escuelaId}', 'alumnos');
    `);

    mock.pool.mockReturnValue({
      query: (sql: string, values?: unknown[]) => db.query(sql, values),
    });

    mock.auth.mockResolvedValue({
      ok: true,
      perfil: { id: userId, escuela_id: escuelaId, rol: "admin_escuela", activo: true },
    });
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("devuelve los datos agregados y listas de cumplimiento", async () => {
    const req = new Request(`https://example.com/api/cumplimiento?escuela_id=${escuelaId}`);
    const res = await GET(req);
    expect(res.status).toBe(200);

    const body = await res.json();
    expect(body.escuelaId).toBe(escuelaId);
    expect(body.overview?.responsable_nombre).toBe("Oficial Datos");
    expect(body.stats.respaldosTotal).toBe(1);
    expect(body.stats.respaldosExitosos).toBe(1);
    expect(body.stats.incidentesTotal).toBe(1);
    expect(body.stats.retencionTotal).toBe(1);
    expect(body.respaldos).toHaveLength(1);
    expect(body.incidentes).toHaveLength(1);
    expect(body.retencion).toHaveLength(1);
  });

  it("rechaza peticion sin permisos", async () => {
    mock.auth.mockResolvedValue({
      ok: false,
      response: new Response(JSON.stringify({ error: "No autorizado" }), { status: 403 }),
    });

    const req = new Request(`https://example.com/api/cumplimiento?escuela_id=${escuelaId}`);
    const res = await GET(req);
    expect(res.status).toBe(403);
  });
});
