// @vitest-environment node
import { readFileSync } from "node:fs";
import { PGlite } from "@electric-sql/pglite";
import { expect, it } from "vitest";
it("el RPC móvil rechaza la obligación vigente y solo devuelve el perfil de la sesión", async () => {
  const db = new PGlite();
  try {
    await db.exec(`create role anon;create role authenticated;create schema auth;
   create table auth.users(id uuid primary key,raw_app_meta_data jsonb);
   create function auth.uid() returns uuid language sql stable as $$select nullif(current_setting('request.jwt.claim.sub',true),'')::uuid$$;
   create table perfiles(id uuid primary key,activo boolean);
   insert into perfiles values('00000000-0000-4000-8000-000000000001',true),('00000000-0000-4000-8000-000000000002',true);
   insert into auth.users values('00000000-0000-4000-8000-000000000001','{"debe_cambiar_password":true}'),('00000000-0000-4000-8000-000000000002','{"debe_cambiar_password":false}');`);
    await db.exec(
      readFileSync(
        new URL(
          "../../supabase/migrations/20261020141949_enforce_mobile_password_change.sql",
          import.meta.url
        ),
        "utf8"
      )
    );
    await db.exec(
      "set role authenticated; set request.jwt.claim.sub='00000000-0000-4000-8000-000000000001'"
    );
    await expect(db.query("select (public.mobile_current_profile()).id")).rejects.toThrow(
      /Cambia tu contraseña/
    );
    await db.exec("set request.jwt.claim.sub='00000000-0000-4000-8000-000000000002'");
    expect((await db.query("select (public.mobile_current_profile()).id")).rows).toEqual([
      { id: "00000000-0000-4000-8000-000000000002" },
    ]);
    await db.exec("set request.jwt.claim.sub=''");
    await expect(db.query("select public.mobile_current_profile()")).rejects.toThrow(
      /No autorizado/
    );
    await db.exec("set role anon");
    await expect(db.query("select public.mobile_current_profile()")).rejects.toThrow(
      /permission denied/
    );
  } finally {
    await db.close();
  }
});
