// Local-only PostgreSQL/WASM regression runner. No network or project credentials.
// npm install --prefix /tmp/mobile-review-pglite --no-package-lock @electric-sql/pglite
// PGLITE_MODULE_PATH=/tmp/mobile-review-pglite/node_modules/@electric-sql/pglite \
//   node supabase/tests/mobile_review_fixes.mjs
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { pathToFileURL } from "node:url";

const moduleRoot = process.env.PGLITE_MODULE_PATH;
const moduleUrl = (entry) => moduleRoot
  ? pathToFileURL(`${moduleRoot}/dist/${entry}.js`).href
  : `@electric-sql/pglite${entry === "index" ? "" : `/${entry}`}`;
const { PGlite } = await import(moduleUrl("index"));
const { pg_trgm } = await import(moduleUrl("contrib/pg_trgm"));
const db = new PGlite({ extensions: { pg_trgm } });
const read = (name) => readFile(new URL(`../${name}`, import.meta.url), "utf8");
const apply = async (name) => db.exec(await read(`migrations/${name}.sql`));

try {
  await db.exec(`
    create role anon;
    create role authenticated;
    create schema auth;
    create table auth.users (id uuid primary key, email text, raw_user_meta_data jsonb);
    create function auth.uid() returns uuid language sql stable as $$
      select nullif(current_setting('request.jwt.claim.sub', true), '')::uuid
    $$;
    grant usage on schema public, auth to authenticated, anon;
  `);

  // The snapshot has indexes on columns introduced by later migrations.
  // Install its real tables first, then prerequisites, then its indexes/triggers/RLS.
  const schema = await read("schema.sql");
  const indexStart = schema.indexOf("create extension if not exists pg_trgm;");
  assert(indexStart > 0, "Schema index boundary must exist");
  await db.exec(schema.slice(0, indexStart));
  for (const name of [
    "009_rename_secretaria_to_administrativo", "010_fix_jerarquia_constraint",
    "012_cedula_en_perfiles", "025_audit_trail", "028_cale_bank_upgrade",
    "034_respuestas_examen_snapshot", "039_accounting_due_dates_and_payables",
    "040_cale_scaling_and_bank_management",
  ]) await apply(name);
  // 040 and the consolidated snapshot both define these policies.
  await db.exec(`do $$ declare p record; begin
    for p in select policyname from pg_policies
      where schemaname = 'public' and tablename = 'examenes_cale_preguntas'
    loop execute format('drop policy %I on public.examenes_cale_preguntas', p.policyname); end loop;
  end $$;`);
  await db.exec(schema.slice(indexStart));
  await apply("015_rls_alumno_ingresos_clases");
  await apply("029_fix_handle_new_user_scope");
  await db.exec("grant all on all tables in schema public to authenticated;");
  await apply("049_mobile_app_rpc");

  const functions = () => db.query(`select oid, proname, pg_get_function_identity_arguments(oid) as args,
    pg_get_function_result(oid) as result from pg_proc
    where pronamespace = 'public'::regnamespace and proname like 'mobile_%' order by proname`);
  const before = (await functions()).rows;
  await apply("052_mobile_review_fixes");
  assert.deepEqual((await functions()).rows, before, "RPC signatures and OIDs are preserved");
  await apply("052_mobile_review_fixes");
  assert.deepEqual((await functions()).rows, before, "Migration can be reapplied without new overloads");

  const sql = await read("tests/mobile_review_fixes.sql");
  await db.exec(sql);
  console.log("PASS: signatures, repeat migration, SQL regression assertions (rolled back)");

  // Prove these assertions detect the two observed runtime regressions in 049.
  await apply("049_mobile_app_rpc");
  await assert.rejects(db.exec(sql), /column reference "alumno_id" is ambiguous/);
  await db.exec("rollback;");
  const dashboard = (await read("migrations/052_mobile_review_fixes.sql"))
    .match(/create or replace function public\.mobile_dashboard_summary\(\)[\s\S]*?\n\$\$;/)?.[0];
  assert(dashboard);
  await db.exec(dashboard);
  // Skip earlier security assertions to reach the CALE regression on the original implementation.
  const caleOnly = sql.slice(0, sql.indexOf("-- BEGIN DASHBOARD TESTS"))
    + sql.slice(sql.indexOf("-- BEGIN CALE TESTS"), sql.indexOf("-- END CALE RUNTIME TEST"))
    + "\nrollback;";
  await assert.rejects(db.exec(caleOnly), /operator does not exist: record ->> unknown/);
  await db.exec("rollback;");
  console.log("PASS: original 049 reproduces ambiguous alumno_id and CALE record ->> failures");
} finally {
  await db.close();
}
