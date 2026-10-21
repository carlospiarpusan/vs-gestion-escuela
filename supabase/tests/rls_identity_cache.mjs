// Called only by the disposable PGlite runner; all fixtures and writes roll back.
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";

export async function checkRlsIdentityCache(db) {
  const fixture = await readFile(new URL("./mobile_review_fixes.sql", import.meta.url), "utf8");
  await db.exec(fixture.slice(0, fixture.indexOf("set local role authenticated;")));
  const tables = [
    "perfiles",
    "alumnos",
    "matriculas_alumno",
    "ingresos",
    "gastos",
    "clases",
    "examenes",
    "instructores",
  ];
  const actors = [0, ...Array.from({ length: 17 }, (_, i) => 101 + i)];
  const templates = new Map();
  const insertId = "00000000-0000-4000-8000-000000009001";
  await db.query("insert into auth.users(id,email) values($1,'rls-insert@test.invalid')", [
    insertId,
  ]);
  for (const table of tables) {
    const original = (
      await db.query(`select to_jsonb(t) payload from public.${table} t order by id limit 1`)
    ).rows[0]?.payload;
    if (original) {
      original.id = insertId;
      if ("email" in original) original.email = "rls-insert@test.invalid";
      if ("dni" in original) original.dni = "rls-insert-fixture";
      templates.set(table, JSON.stringify(original));
    }
  }
  const snapshot = async () => {
    const results = [];
    for (const actor of actors) {
      await db.exec("reset role");
      await db.exec(
        actor
          ? `select pg_temp.login(${actor})`
          : "select set_config('request.jwt.claim.sub','',true),set_config('request.jwt.claims','{}',true)"
      );
      await db.exec("set local role authenticated");
      for (const table of tables) {
        for (const operation of ["read", "update", "delete", "insert"]) {
          await db.exec("savepoint rls_operation");
          try {
            const sql =
              operation === "insert"
                ? `insert into public.${table} select (jsonb_populate_record(null::public.${table},$1::jsonb)).* returning id::text`
                : operation === "read"
                  ? `select id::text from public.${table} order by id`
                  : `${operation === "update" ? `update public.${table} set id=id` : `delete from public.${table}`} returning id::text`;
            const result = await db.query(
              sql,
              operation === "insert" ? [templates.get(table)] : []
            );
            results.push({ actor, table, operation, ids: result.rows.map((r) => r.id).sort() });
          } catch (error) {
            results.push({ actor, table, operation, error: error.code });
          } finally {
            await db.exec("rollback to savepoint rls_operation; release savepoint rls_operation");
          }
        }
      }
    }
    await db.exec("reset role");
    return results;
  };
  const before = await snapshot();
  const metadataSql =
    "select schemaname,tablename,policyname,roles,cmd,permissive from pg_policies where schemaname='public' order by tablename,policyname";
  const metadata = (await db.query(metadataSql)).rows;
  const migration = await readFile(
    new URL("../migrations/20261021012459_cache_rls_identity_per_statement.sql", import.meta.url),
    "utf8"
  );
  await db.exec(migration);
  const canonical = (
    await db.query(
      "select * from pg_policies where schemaname='public' order by tablename,policyname"
    )
  ).rows;
  assert.deepEqual(
    (await db.query(metadataSql)).rows,
    metadata,
    "policy roles and commands unchanged"
  );
  const after = await snapshot();
  assert.deepEqual(
    after,
    before,
    "all roles, schools, branches and ownerless/inactive identities retain read/insert/update/delete results"
  );
  await db.exec(migration);
  assert.deepEqual(
    (
      await db.query(
        "select * from pg_policies where schemaname='public' order by tablename,policyname"
      )
    ).rows,
    canonical,
    "migration is idempotent"
  );
  // Same connection, different caller; initPlans must never be shared across statements.
  assert.notDeepEqual(
    after.find((r) => r.actor === 101 && r.table === "alumnos" && r.operation === "read")?.ids,
    after.find((r) => r.actor === 116 && r.table === "alumnos" && r.operation === "read")?.ids
  );
  await db.exec("set local role anon; savepoint anonymous_access");
  await assert.rejects(db.query("select id from public.alumnos"), /permission denied/);
  await db.exec("rollback to savepoint anonymous_access; reset role; rollback");
  console.log(
    `PASS: RLS identity cache ${before.length} role/table/operation equivalence checks, caller isolation, anonymous denial, unchanged policy roles and idempotency`
  );
}
