// @vitest-environment node
import { readFileSync } from "node:fs";
import { PGlite } from "@electric-sql/pglite";
import { afterAll, beforeAll, expect, it } from "vitest";
let db: PGlite;
const migration = readFileSync(
  new URL(
    "../../supabase/migrations/20261020140249_trusted_password_change_requirement.sql",
    import.meta.url
  ),
  "utf8"
);
beforeAll(async () => {
  db = new PGlite();
  await db.exec(`create role anon; create role authenticated; create schema auth;
    create table auth.users(id text primary key, encrypted_password text, raw_user_meta_data jsonb, raw_app_meta_data jsonb);
    insert into auth.users values('legacy','hash-a','{"debe_cambiar_password":true,"nombre":"Demo"}','{"provider":"email"}');`);
  await db.exec(migration);
});
afterAll(async () => {
  await db.close();
});
const get = async (id: string) =>
  (
    await db.query<{
      raw_user_meta_data: Record<string, unknown>;
      raw_app_meta_data: Record<string, unknown>;
    }>("select raw_user_meta_data,raw_app_meta_data from auth.users where id=$1", [id])
  ).rows[0];
it("migra la obligación sin cambiar otros metadatos", async () => {
  expect(await get("legacy")).toEqual({
    raw_user_meta_data: { debe_cambiar_password: true, nombre: "Demo" },
    raw_app_meta_data: { debe_cambiar_password: true, provider: "email" },
  });
});
it("ignora la eliminación de la bandera sin cambiar la contraseña", async () => {
  await db.exec(
    `update auth.users set raw_user_meta_data='{"debe_cambiar_password":false}' where id='legacy'`
  );
  expect((await get("legacy")).raw_app_meta_data.debe_cambiar_password).toBe(true);
  expect((await get("legacy")).raw_user_meta_data.debe_cambiar_password).toBe(true);
});
it("levanta la obligación después del cambio real y admite un nuevo restablecimiento", async () => {
  await db.exec(
    `update auth.users set encrypted_password='hash-b', raw_user_meta_data='{"debe_cambiar_password":false}' where id='legacy'`
  );
  expect((await get("legacy")).raw_app_meta_data.debe_cambiar_password).toBe(false);
  await db.exec(
    `update auth.users set encrypted_password='hash-c', raw_user_meta_data='{"debe_cambiar_password":true}' where id='legacy'`
  );
  expect((await get("legacy")).raw_app_meta_data.debe_cambiar_password).toBe(true);
});
it("admite cuentas nuevas con o sin obligación y no expone una RPC pública", async () => {
  await db.exec(
    `insert into auth.users values('normal','hash',null,'{}'),('temporary','hash','{"debe_cambiar_password":true}','{}')`
  );
  expect((await get("normal")).raw_app_meta_data.debe_cambiar_password).toBe(false);
  expect((await get("temporary")).raw_app_meta_data.debe_cambiar_password).toBe(true);
  expect(
    (
      await db.query<{ allowed: boolean }>(
        "select has_function_privilege('anon','public.protect_password_change_requirement()','EXECUTE') allowed"
      )
    ).rows[0].allowed
  ).toBe(false);
  await db.exec(migration);
});
