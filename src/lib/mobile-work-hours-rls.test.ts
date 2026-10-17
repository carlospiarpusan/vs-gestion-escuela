import { PGlite } from "@electric-sql/pglite";
import { readFileSync } from "node:fs";
import { expect, it } from "vitest";

it("Android puede leer las horas reales del instructor sin ver ni editar las de otro", async () => {
  const db = new PGlite();
  const school = "10000000-0000-4000-8000-000000000001";
  const branch = "20000000-0000-4000-8000-000000000001";
  const user = "30000000-0000-4000-8000-000000000001";
  const instructor = "40000000-0000-4000-8000-000000000001";
  try {
    await db.exec(`
      create role authenticated;
      create schema auth;
      create function auth.uid() returns uuid language sql stable as $$ select nullif(current_setting('request.jwt.claim.sub',true),'')::uuid $$;
      create table public.escuelas(id uuid primary key);
      create table public.sedes(id uuid primary key);
      create table public.instructores(id uuid primary key,user_id uuid);
      create function public.is_super_admin() returns boolean language sql stable as $$ select false $$;
      create function public.is_admin_escuela() returns boolean language sql stable as $$ select false $$;
      create function public.is_alumno() returns boolean language sql stable as $$ select false $$;
      create function public.is_instructor() returns boolean language sql stable as $$ select true $$;
      create function public.get_my_escuela_id() returns uuid language sql stable as $$ select '${school}'::uuid $$;
      create function public.get_my_sede_id() returns uuid language sql stable as $$ select '${branch}'::uuid $$;
      insert into public.escuelas values('${school}');
      insert into public.sedes values('${branch}');
      insert into public.instructores values('${instructor}','${user}'),('40000000-0000-4000-8000-000000000002','30000000-0000-4000-8000-000000000002');
    `);
    await db.exec(readFileSync("supabase/migrations/014_horas_trabajo.sql", "utf8"));
    await db.exec(`
      insert into public.horas_trabajo(escuela_id,sede_id,instructor_id,fecha,horas) values
        ('${school}','${branch}','${instructor}','2026-10-02',7.5),
        ('${school}','${branch}','40000000-0000-4000-8000-000000000002','2026-10-02',12);
      alter table public.instructores enable row level security;
      create policy own_instructor on public.instructores for select to authenticated using(user_id=(select auth.uid()));
      grant usage on schema public,auth to authenticated;
      grant select on public.instructores to authenticated;
      grant select,update,insert,delete on public.horas_trabajo to authenticated;
      select set_config('request.jwt.claim.sub','${user}',false);
      set role authenticated;
    `);
    expect(
      (await db.query("select fecha::text,horas from public.horas_trabajo order by fecha")).rows
    ).toEqual([{ fecha: "2026-10-02", horas: "7.5" }]);
    expect((await db.query("update public.horas_trabajo set horas=0 returning id")).rows).toEqual(
      []
    );
    await db.exec("reset role");
    expect(
      (await db.query("select sum(horas)::text as total from public.horas_trabajo")).rows
    ).toEqual([{ total: "19.5" }]);
  } finally {
    await db.close();
  }
}, 15000);
