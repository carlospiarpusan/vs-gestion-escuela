// @vitest-environment node
import { readFileSync } from "node:fs";
import { PGlite } from "@electric-sql/pglite";
import { afterAll, beforeAll, expect, it } from "vitest";

let db: PGlite;
const tables = [
  "configuracion_contratos_escuela",
  "plantillas_contrato_escuela",
  "contratos_emitidos_alumno",
  "_migraciones",
];
const migration = readFileSync(
  new URL(
    "../../supabase/migrations/20261020135550_protect_contract_storage_tables.sql",
    import.meta.url
  ),
  "utf8"
);
beforeAll(async () => {
  db = new PGlite();
  await db.exec("create role anon; create role authenticated; create role service_role bypassrls;");
  for (const name of tables) {
    await db.exec(
      `create table public.${name}(id integer primary key, value text); insert into public.${name} values(1,'preserved'); grant all on public.${name} to public,anon,authenticated;`
    );
  }
  await db.exec(migration);
});
afterAll(async () => {
  await db.close();
});
it.each(tables)("protege %s sin cambiar los registros", async (table) => {
  const result = await db.query<{ relrowsecurity: boolean }>(
    "select relrowsecurity from pg_class where oid=$1::regclass",
    [`public.${table}`]
  );
  expect(result.rows[0].relrowsecurity).toBe(true);
  expect((await db.query(`select * from public.${table}`)).rows).toEqual([
    { id: 1, value: "preserved" },
  ]);
  for (const role of ["anon", "authenticated"]) {
    await db.exec(`set role ${role}`);
    try {
      for (const query of [
        `select * from public.${table}`,
        `insert into public.${table} values(2,'forbidden')`,
        `update public.${table} set value='forbidden'`,
        `delete from public.${table}`,
      ]) {
        await expect(db.exec(query)).rejects.toThrow(/permission denied/);
      }
    } finally {
      await db.exec("reset role");
    }
  }
});
it("mantiene la lectura del servidor y se puede aplicar de nuevo", async () => {
  await db.exec(migration);
  await db.exec("set role service_role");
  try {
    for (const table of tables.slice(0, 3))
      expect((await db.query(`select * from public.${table}`)).rows).toHaveLength(1);
    await expect(db.query("select * from public._migraciones")).rejects.toThrow(
      /permission denied/
    );
  } finally {
    await db.exec("reset role");
  }
});
