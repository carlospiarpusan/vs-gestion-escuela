// @vitest-environment node
import { PGlite } from "@electric-sql/pglite";
import { readFileSync } from "node:fs";
import { afterAll, beforeAll, beforeEach, expect, it, vi } from "vitest";
import {
  changeRetention,
  getRetentionOverview,
  runRetentionReview,
} from "./data-retention-service";
import { retentionCommandSchema } from "./data-retention";
import { getTodayDateString } from "./date-utils";

const mock = vi.hoisted(() => ({ query: vi.fn(), release: vi.fn() }));
vi.mock("./server-db", () => ({
  getServerDbPool: () => ({
    query: mock.query,
    connect: async () => ({ query: mock.query, release: mock.release }),
  }),
}));
let db: PGlite;
const school = "10000000-0000-4000-8000-000000000001";
const other = "10000000-0000-4000-8000-000000000002";
const actor = "20000000-0000-4000-8000-000000000001";
const oldDate = "2024-08-31";
const today = getTodayDateString();
const tomorrow = getTodayDateString(new Date(Date.now() + 86400000));
const record = (date = oldDate) =>
  changeRetention(
    {
      action: "record",
      schoolId: school,
      cancelledOn: date,
      evidenceRef: "ticket-demo",
      confirmed: true,
    },
    actor
  );

async function createRetentionDatabase(useEnums = false) {
  const fixture = new PGlite();
  if (useEnums) {
    await fixture.exec(`create type tipo_dato_retencion_cumplimiento as enum
      ('alumnos','instructores','administrativos','contratos','examenes','finanzas','solicitudes_arco');
      create type estado_revision_retencion_cumplimiento as enum ('vigente','pendiente','en_revision');`);
  }
  await fixture.exec(`create role anon; create role authenticated;
    create table escuelas(id uuid primary key,estado text);
    create table perfiles(id uuid primary key);
    create table cumplimiento_retencion(id uuid primary key default gen_random_uuid(), escuela_id uuid references escuelas(id),
      tipo_dato ${useEnums ? "tipo_dato_retencion_cumplimiento" : "text check(tipo_dato in ('alumnos','contratos','examenes','financiero_contable','nominas_personal','biometria_asistencia','solicitudes_arco'))"},
      meses_retencion integer not null default 60 check(meses_retencion>0), criterio_legal text,
      estado_revision ${useEnums ? "estado_revision_retencion_cumplimiento" : "text"});
    insert into escuelas values('${school}','inactiva'),('${other}','activa');
    insert into perfiles values('${actor}');
    insert into cumplimiento_retencion(escuela_id,tipo_dato,meses_retencion,criterio_legal,estado_revision)
      values('${other}','contratos',120,'Regla existente','vigente');`);
  await fixture.exec(
    readFileSync(
      new URL(
        "../../supabase/migrations/20261018213152_school_cancellation_retention.sql",
        import.meta.url
      ),
      "utf8"
    )
  );
  return fixture;
}
beforeAll(async () => {
  db = await createRetentionDatabase();
}, 30000);
beforeEach(async () => {
  mock.query.mockReset();
  mock.release.mockClear();
  mock.query.mockImplementation(async (sql: string, values?: unknown[]) => {
    const result = await db.query(sql, values);
    return { ...result, rowCount: result.affectedRows ?? result.rows.length };
  });
  await db.exec(`truncate school_retention_events,school_retention_cases,school_retention_job_state;
    update escuelas set estado=case when id='${school}' then 'inactiva' else 'activa' end;`);
});
afterAll(async () => {
  await db?.close();
});

it("carga reglas con los tipos enumerados reales de produccion sin duplicarlas", async () => {
  const fixture = await createRetentionDatabase(true);
  try {
    await fixture.query("select public.seed_school_retention_rules()");
    expect(
      (await fixture.query("select count(*)::int as total from cumplimiento_retencion")).rows
    ).toEqual([{ total: 14 }]);
    expect(
      (
        await fixture.query(
          "select tipo_dato from cumplimiento_retencion where escuela_id=$1 order by tipo_dato::text",
          [school]
        )
      ).rows
    ).toEqual(
      [
        "administrativos",
        "alumnos",
        "contratos",
        "examenes",
        "finanzas",
        "instructores",
        "solicitudes_arco",
      ].map((tipo_dato) => ({ tipo_dato }))
    );
    expect(
      (
        await fixture.query(
          "select meses_retencion from cumplimiento_retencion where escuela_id=$1 and tipo_dato='contratos'",
          [other]
        )
      ).rows
    ).toEqual([{ meses_retencion: 120 }]);
  } finally {
    await fixture.close();
  }
}, 30000);

it("carga siete reglas por escuela sin sobreescribir reglas previas ni fijar plazos fiscales", async () => {
  const rows = (
    await db.query<{ tipo_dato: string; meses_retencion: number | null }>(
      "select tipo_dato,meses_retencion from cumplimiento_retencion where escuela_id=$1",
      [school]
    )
  ).rows;
  expect(rows).toHaveLength(7);
  expect(rows.find((row) => row.tipo_dato === "alumnos")?.meses_retencion).toBe(6);
  expect(
    rows.filter((row) => row.tipo_dato !== "alumnos").every((row) => row.meses_retencion === null)
  ).toBe(true);
  expect(
    (
      await db.query(
        "select meses_retencion from cumplimiento_retencion where escuela_id=$1 and tipo_dato='contratos'",
        [other]
      )
    ).rows
  ).toEqual([{ meses_retencion: 120 }]);
  await runRetentionReview();
  await runRetentionReview();
  expect(
    (await db.query("select count(*)::int as total from cumplimiento_retencion")).rows[0]
  ).toEqual({ total: 14 });
});
it.each(["activa", "suspendida"])("no trata una escuela %s como baja definitiva", async (state) => {
  await db.query("update escuelas set estado=$1 where id=$2", [state, school]);
  await expect(record()).rejects.toMatchObject({ status: 409 });
  expect(
    (await db.query("select count(*)::int as total from school_retention_cases")).rows[0]
  ).toEqual({ total: 0 });
});
it("calcula seis meses calendario sin desbordar el fin de febrero", async () => {
  await record();
  const overview = await getRetentionOverview(school);
  expect(overview.cases[0]).toMatchObject({
    cancelled_on: "2024-08-31",
    review_due_on: "2025-02-28",
    state: "review_due",
  });
  expect(overview.events).toHaveLength(1);
  expect(overview.lastCheckedAt).toBeNull();
});
it("no abre revision antes del vencimiento y nunca elimina registros", async () => {
  await record(today);
  expect((await getRetentionOverview(school)).cases[0].state).toBe("scheduled");
  expect(await runRetentionReview()).toMatchObject({ pending: 0, deleted: 0 });
  expect((await db.query("select count(*)::int as total from escuelas")).rows[0]).toEqual({
    total: 2,
  });
});
it("el cron marca vencimientos antiguos sin duplicar casos o eventos", async () => {
  const { caseId } = await record();
  await db.query("update school_retention_cases set state='scheduled' where id=$1", [caseId]);
  expect(await runRetentionReview()).toMatchObject({ due: 1, pending: 1, deleted: 0 });
  expect(await runRetentionReview()).toMatchObject({ due: 0, pending: 1, deleted: 0 });
  expect(
    (await getRetentionOverview(school)).events.filter((event) => event.action === "became_due")
  ).toHaveLength(1);
});
it("rechaza bajas futuras, antiguas sin fecha valida y solicitudes no confirmadas", async () => {
  await expect(record(tomorrow)).rejects.toMatchObject({ status: 400 });
  await expect(record("1900-01-01")).rejects.toMatchObject({ status: 400 });
  for (const date of ["2026-02-30", "2026-13-01", "hoy"])
    expect(
      retentionCommandSchema.safeParse({
        action: "record",
        schoolId: school,
        cancelledOn: date,
        evidenceRef: "ticket-demo",
        confirmed: true,
      }).success
    ).toBe(false);
  expect(
    retentionCommandSchema.safeParse({
      action: "record",
      schoolId: school,
      cancelledOn: today,
      evidenceRef: "ticket-demo",
      confirmed: false,
    }).success
  ).toBe(false);
});
it("impide duplicar una baja abierta, pero permite otra tras retirar la anterior", async () => {
  const { caseId } = await record();
  await expect(record()).rejects.toMatchObject({ status: 409 });
  await changeRetention(
    { action: "withdraw", schoolId: school, caseId, evidenceRef: "ticket-correccion" },
    actor
  );
  await record(today);
  expect((await getRetentionOverview(school)).cases).toHaveLength(2);
});
it("conserva los datos protegidos y exige razon y revision futura para una prorroga", async () => {
  const { caseId } = await record();
  await expect(
    changeRetention(
      { action: "hold", schoolId: school, caseId, reason: "Soporte fiscal", nextReviewOn: today },
      actor
    )
  ).rejects.toMatchObject({ status: 400 });
  await changeRetention(
    { action: "hold", schoolId: school, caseId, reason: "Soporte fiscal", nextReviewOn: tomorrow },
    actor
  );
  expect((await getRetentionOverview(school)).cases[0]).toMatchObject({
    state: "held",
    hold_reason: "Soporte fiscal",
    next_review_on: tomorrow,
  });
  await runRetentionReview();
  expect((await getRetentionOverview(school)).cases[0].state).toBe("held");
});
it("reabre las conservaciones vencidas una sola vez y registra cada transicion", async () => {
  const { caseId } = await record();
  await db.query(
    "update school_retention_cases set state='held',hold_reason='Retencion documentada',next_review_on=current_date-1 where id=$1",
    [caseId]
  );
  await runRetentionReview();
  await runRetentionReview();
  const result = await getRetentionOverview(school);
  expect(result.cases[0].state).toBe("review_due");
  expect(result.events.filter((event) => event.action === "hold_expired")).toHaveLength(1);
  expect(result.lastCheckedAt).not.toBeNull();
});
it("no adelanta la revision de seis meses al vencer una conservacion temprana", async () => {
  const { caseId } = await record(today);
  await db.query(
    "update school_retention_cases set state='held',hold_reason='Revision temprana',next_review_on=current_date-1 where id=$1",
    [caseId]
  );
  await runRetentionReview();
  expect((await getRetentionOverview(school)).cases[0].state).toBe("scheduled");
});
it("la reactivacion retira el plazo y el cron no crea bajas de escuelas suspendidas", async () => {
  await record();
  await db.query("update escuelas set estado='activa' where id=$1", [school]);
  await runRetentionReview();
  expect((await getRetentionOverview(school)).cases[0].state).toBe("withdrawn");
  expect((await getRetentionOverview(other)).cases).toHaveLength(0);
});
it("rechaza modificaciones de casos de otra escuela", async () => {
  const { caseId } = await record();
  await expect(
    changeRetention(
      { action: "withdraw", schoolId: other, caseId, evidenceRef: "ticket-demo" },
      actor
    )
  ).rejects.toMatchObject({ status: 409 });
  expect((await getRetentionOverview(school)).cases[0].state).toBe("review_due");
});
it("no cambia casos ni escribe el latido si otro cron tiene el bloqueo", async () => {
  mock.query
    .mockImplementationOnce(async () => ({ rows: [] }))
    .mockImplementationOnce(async () => ({ rows: [{ locked: false }] }));
  expect(await runRetentionReview()).toEqual({ skipped: true });
  expect(mock.query.mock.calls.some(([sql]) => String(sql).includes("seed_school"))).toBe(false);
});
it("hace rollback del caso si falla su auditoria", async () => {
  const query = mock.query.getMockImplementation()!;
  mock.query.mockImplementation((sql, values) => {
    if (String(sql).startsWith("insert into public.school_retention_events"))
      throw new Error("Audit unavailable");
    return query(sql, values);
  });
  await expect(record()).rejects.toThrow("Audit unavailable");
  expect(
    (await db.query("select count(*)::int as total from school_retention_cases")).rows[0]
  ).toEqual({ total: 0 });
});
it("las tablas nuevas no son accesibles directamente por anon o authenticated", async () => {
  for (const role of ["anon", "authenticated"]) {
    for (const table of [
      "school_retention_cases",
      "school_retention_events",
      "school_retention_job_state",
    ]) {
      await db.exec(`set role ${role}`);
      await expect(db.query(`select * from ${table}`)).rejects.toThrow(/permission denied/);
      await db.exec("reset role");
    }
    await db.exec(`set role ${role}`);
    await expect(db.query("select seed_school_retention_rules()")).rejects.toThrow(
      /permission denied/
    );
    await db.exec("reset role");
  }
});
