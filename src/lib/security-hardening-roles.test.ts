// @vitest-environment node
import { readFileSync } from "node:fs";
import { PGlite } from "@electric-sql/pglite";
import { afterAll, beforeAll, expect, it } from "vitest";

const school = "10000000-0000-4000-8000-000000000001";
const student = "20000000-0000-4000-8000-000000000001";
const schoolAdmin = "20000000-0000-4000-8000-000000000002";
const superAdmin = "20000000-0000-4000-8000-000000000003";
const newUser = "20000000-0000-4000-8000-000000000004";
let db: PGlite;

beforeAll(async () => {
  db = new PGlite();
  await db.exec(`
    create role authenticated;
    create role service_role bypassrls;
    create role supabase_auth_admin;
    create schema auth;
    create table auth.users(id uuid primary key, email text, raw_user_meta_data jsonb);
    create function auth.uid() returns uuid language sql stable as
      $$select nullif(current_setting('request.jwt.claim.sub', true),'')::uuid$$;
    grant usage on schema auth to authenticated, supabase_auth_admin;
    grant insert on auth.users to supabase_auth_admin;

    create table escuelas(
      id uuid primary key default gen_random_uuid(), nombre text, email text, plan text default 'gratuito',
      max_alumnos int default 25, max_sedes int default 1, estado text default 'activa', fecha_alta date
    );
    create table sedes(
      id uuid primary key default gen_random_uuid(), escuela_id uuid, nombre text, es_principal bool, email text
    );
    create table perfiles(id uuid primary key, escuela_id uuid, sede_id uuid, nombre text, email text, rol text, activo bool default true);
    insert into escuelas(id,nombre) values('${school}','Escuela de prueba');
    insert into perfiles (id,escuela_id,nombre,rol) values
      ('${student}','${school}','Alumno de prueba','alumno'),
      ('${schoolAdmin}','${school}','Admin de prueba','admin_escuela'),
      ('${superAdmin}',null,'Super admin de prueba','super_admin');

    grant select,update on perfiles,escuelas to authenticated,service_role;
    alter table perfiles enable row level security;
    alter table escuelas enable row level security;
    create policy read_self on perfiles for select to authenticated using (id = auth.uid());
  `);
  const migration = readFileSync(
    new URL(
      "../../supabase/migrations/20261115120000_security_hardening_audit_fixes.sql",
      import.meta.url
    ),
    "utf8"
  );
  const operationalTables = migration.indexOf("-- 5. Fix cross-tenant triggers");
  expect(operationalTables).toBeGreaterThan(0);
  await db.exec(migration.slice(0, operationalTables));
  await db.exec(`
    create policy read_own_school on escuelas for select to authenticated
      using (id = public.get_my_escuela_id());
    create policy super_admin_schools on escuelas for all to authenticated
      using (public.is_super_admin());
  `);

  await db.exec(
    readFileSync(
      new URL("../../supabase/migrations/029_fix_handle_new_user_scope.sql", import.meta.url),
      "utf8"
    )
  );
  await db.exec(`
    create trigger on_auth_user_created after insert on auth.users
    for each row execute function public.handle_new_user();
  `);
}, 20_000);

afterAll(async () => {
  await db?.close();
});

async function asRole(
  role: "authenticated" | "service_role" | "supabase_auth_admin",
  user: string,
  work: () => Promise<void>
) {
  await db.query("select set_config('request.jwt.claim.sub', $1, false)", [user]);
  await db.exec(`set role ${role}`);
  try {
    await work();
  } finally {
    await db.exec("reset role");
    await db.query("select set_config('request.jwt.claim.sub', '', false)");
  }
}

it("permite actualizar el nombre propio y conserva la protección de los campos de perfil", async () => {
  await asRole("authenticated", student, async () => {
    const profile = await db.query(
      "update perfiles set nombre = 'Nombre editado' where id=$1 returning nombre",
      [student]
    );
    expect(profile.rows).toEqual([{ nombre: "Nombre editado" }]);
    await expect(
      db.query("update perfiles set activo=false where id=$1", [student])
    ).rejects.toThrow("No tienes permisos para modificar rol, escuela, sede o estado activo");
  });
});

it("permite editar la información general de la escuela y protege sus cupos", async () => {
  await asRole("authenticated", schoolAdmin, async () => {
    const updated = await db.query(
      "update escuelas set nombre='Sede piloto' where id=$1 returning nombre",
      [school]
    );
    expect(updated.rows).toEqual([{ nombre: "Sede piloto" }]);
    await expect(
      db.query("update escuelas set max_alumnos=50 where id=$1", [school])
    ).rejects.toThrow(
      "Solo el super administrador o facturación puede modificar plan, cupos o estado de la escuela"
    );
  });
});

it("conserva el acceso de superadministración, servicio y conexión directa de facturación", async () => {
  await asRole("authenticated", superAdmin, async () => {
    expect(
      (
        await db.query("update escuelas set max_alumnos=50 where id=$1 returning max_alumnos", [
          school,
        ])
      ).rows
    ).toEqual([{ max_alumnos: 50 }]);
  });
  await asRole("service_role", "", async () => {
    expect(
      (await db.query("update escuelas set max_sedes=3 where id=$1 returning max_sedes", [school]))
        .rows
    ).toEqual([{ max_sedes: 3 }]);
    expect(
      (await db.query("update perfiles set activo=false where id=$1 returning activo", [student]))
        .rows
    ).toEqual([{ activo: false }]);
  });
  expect(
    (await db.query("update escuelas set plan='basico' where id=$1 returning plan", [school])).rows
  ).toEqual([{ plan: "basico" }]);
});

it("conserva la creación de un perfil tras el alta desde Supabase Auth", async () => {
  await asRole("supabase_auth_admin", "", async () => {
    await db.query("insert into auth.users(id,email,raw_user_meta_data) values($1,$2,$3)", [
      newUser,
      "registro@example.invalid",
      { nombre: "Registro de prueba" },
    ]);
  });

  expect((await db.query("select rol from perfiles where id=$1", [newUser])).rows).toEqual([
    { rol: "admin_escuela" },
  ]);
});
