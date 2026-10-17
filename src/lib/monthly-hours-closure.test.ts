// @vitest-environment node
import { readFileSync } from "node:fs";
import { PGlite } from "@electric-sql/pglite";
import { afterAll, beforeAll, beforeEach, describe, expect, it } from "vitest";

const id = (n: number) => `20000000-0000-4000-8000-${String(n).padStart(12, "0")}`;
const school = id(1);
const sede = id(11);
const otherSede = id(12);
const instructor = id(201);
const otherInstructor = id(202);
const actors = {
  admin_escuela: id(101),
  admin_sede: id(102),
  administrativo: id(103),
  alumno: id(104),
  instructor: id(105),
  recepcion: id(106),
  missingBranch: id(107),
  inactive: id(108),
};
let db: PGlite;
const migration = readFileSync(
  new URL(
    "../../supabase/migrations/20261014053354_scope_monthly_hours_closure.sql",
    import.meta.url
  ),
  "utf8"
);
const readMigration = (file: string) =>
  readFileSync(new URL(`../../supabase/migrations/${file}`, import.meta.url), "utf8");
async function actor(key: keyof typeof actors) {
  await db.query("select set_config('request.jwt.claim.sub',$1,false)", [actors[key]]);
}
async function close(key: keyof typeof actors) {
  await actor(key);
  return (
    await db.query<{ instructor_id: string }>("select * from generar_gastos_horas_mes(2026,9)")
  ).rows;
}
beforeAll(async () => {
  db = new PGlite();
  await db.exec(`
    create role anon;
    create role authenticated;
    create schema auth;
    create function auth.uid() returns uuid language sql as $$select nullif(current_setting('request.jwt.claim.sub',true),'')::uuid$$;
    create table escuelas(id uuid primary key);
    create table sedes(id uuid primary key,escuela_id uuid);
    create table perfiles(id uuid primary key,escuela_id uuid,sede_id uuid,rol text,activo boolean default true);
    create function get_my_escuela_id() returns uuid language sql security definer as $$select escuela_id from perfiles where id=auth.uid()$$;
    create function get_my_sede_id() returns uuid language sql security definer as $$select sede_id from perfiles where id=auth.uid()$$;
    create function is_super_admin() returns boolean language sql security definer as $$select exists(select 1 from perfiles where id=auth.uid() and rol='super_admin')$$;
    create function is_admin_escuela() returns boolean language sql security definer as $$select exists(select 1 from perfiles where id=auth.uid() and rol='admin_escuela')$$;
    create function is_alumno() returns boolean language sql security definer as $$select exists(select 1 from perfiles where id=auth.uid() and rol='alumno')$$;
    create function is_instructor() returns boolean language sql security definer as $$select exists(select 1 from perfiles where id=auth.uid() and rol='instructor')$$;
    create table instructores(id uuid primary key,escuela_id uuid,sede_id uuid,user_id uuid,nombre text,apellidos text,valor_hora numeric);
    create table gastos(id uuid default gen_random_uuid() primary key,escuela_id uuid,sede_id uuid,user_id uuid,mantenimiento_id uuid,categoria text,concepto text,monto numeric,metodo_pago text,proveedor text,numero_factura text,fecha date,recurrente boolean,notas text);
    insert into escuelas values('${school}'),('${id(2)}');
    insert into sedes values('${sede}','${school}'),('${otherSede}','${school}'),('${id(13)}','${id(2)}');
  `);
  for (const [role, actorId] of Object.entries(actors)) {
    const rol = ["missingBranch", "inactive"].includes(role) ? "admin_sede" : role;
    await db.query(
      "insert into perfiles(id,escuela_id,sede_id,rol,activo) values($1,$2,$3,$4,$5)",
      [actorId, school, role === "missingBranch" ? null : sede, rol, role !== "inactive"]
    );
  }
  await db.exec(readMigration("014_horas_trabajo.sql"));
  await db.exec(readMigration("033_cierre_horas_a_gastos.sql"));
  await db.exec(readMigration("035_fix_cierre_horas_conflict.sql"));
  await db.exec(migration);
  await db.exec(`grant usage on schema public,auth to authenticated,anon;
    grant select on perfiles to authenticated;
    grant select,insert,update,delete on cierres_horas_instructores to authenticated;`);
  for (let n = 1; n <= 3; n++) {
    const schoolId = n === 3 ? id(2) : school;
    const branchId = id(10 + n);
    await db.query("insert into instructores values($1,$2,$3,$4,$5,'Prueba',100)", [
      id(200 + n),
      schoolId,
      branchId,
      actors.instructor,
      `Instructor ${n}`,
    ]);
  }
});
beforeEach(async () => {
  await db.exec("reset role; truncate cierres_horas_instructores,gastos,horas_trabajo;");
  await db.query("select set_config('request.jwt.claim.sub','',false)");
  await db.query("update instructores set valor_hora=100");
  for (let n = 1; n <= 3; n++) {
    await db.query(
      "insert into horas_trabajo(escuela_id,sede_id,instructor_id,fecha,horas) values($1,$2,$3,'2026-09-01',2)",
      [n === 3 ? id(2) : school, id(10 + n), id(200 + n)]
    );
  }
});
afterAll(async () => db?.close());

describe("monthly hours closure SQL and permissions", () => {
  it("school admin closes their school's branches, never another school", async () => {
    expect((await close("admin_escuela")).map((row) => row.instructor_id)).toEqual([
      instructor,
      otherInstructor,
    ]);
    expect((await db.query("select monto from gastos order by sede_id")).rows).toEqual([
      { monto: "200.00" },
      { monto: "200.00" },
    ]);
  });
  it.each(["admin_sede", "administrativo"] as const)("%s closes only their branch", async (rol) => {
    expect((await close(rol)).map((row) => row.instructor_id)).toEqual([instructor]);
    expect((await db.query("select sede_id from gastos")).rows).toEqual([{ sede_id: sede }]);
  });
  it("repeating the closure updates its expense without duplicating it", async () => {
    await close("admin_sede");
    await db.query("update horas_trabajo set horas=3 where instructor_id=$1", [instructor]);
    await close("admin_sede");
    expect((await db.query("select monto from gastos")).rows).toEqual([{ monto: "300.00" }]);
    expect(
      (await db.query("select count(*)::int as total from cierres_horas_instructores")).rows
    ).toEqual([{ total: 1 }]);
  });
  it("a zero-rate instructor in another branch does not block a branch closure", async () => {
    await db.query("update instructores set valor_hora=0 where id=$1", [otherInstructor]);
    expect(await close("admin_sede")).toHaveLength(1);
    await expect(close("admin_escuela")).rejects.toThrow("valor por hora en 0");
  });
  it("cleanup does not delete closures or expenses from another branch", async () => {
    await close("admin_escuela");
    await db.exec("delete from horas_trabajo");
    expect(await close("admin_sede")).toHaveLength(0);
    expect((await db.query("select sede_id from gastos")).rows).toEqual([{ sede_id: otherSede }]);
    expect((await db.query("select sede_id from cierres_horas_instructores")).rows).toEqual([
      { sede_id: otherSede },
    ]);
  });
  it("a database failure rolls back every expense and closure in the statement", async () => {
    await db.exec(
      `alter table gastos add constraint reject_test_branch check(sede_id<>'${otherSede}'::uuid)`
    );
    try {
      await expect(close("admin_escuela")).rejects.toThrow("reject_test_branch");
      expect((await db.query("select count(*)::int as total from gastos")).rows).toEqual([
        { total: 0 },
      ]);
      expect(
        (await db.query("select count(*)::int as total from cierres_horas_instructores")).rows
      ).toEqual([{ total: 0 }]);
    } finally {
      await db.exec("alter table gastos drop constraint reject_test_branch");
    }
  });
  it("a transferred instructor cannot overwrite another branch's existing closure", async () => {
    await close("admin_sede");
    await db.query("update cierres_horas_instructores set sede_id=$1", [otherSede]);
    await expect(close("admin_sede")).rejects.toThrow("pertenece a otra sede");
    expect((await db.query("select sede_id from cierres_horas_instructores")).rows).toEqual([
      { sede_id: otherSede },
    ]);
  });
  it.each(["alumno", "instructor", "recepcion", "missingBranch", "inactive"] as const)(
    "%s cannot generate expenses",
    async (rol) => {
      await expect(close(rol)).rejects.toThrow();
      expect((await db.query("select count(*)::int as total from gastos")).rows).toEqual([
        { total: 0 },
      ]);
    }
  );
  it("null periods and anonymous requests are rejected", async () => {
    await expect(db.query("select * from generar_gastos_horas_mes(2026,9)")).rejects.toThrow(
      "Sesión inválida"
    );
    await actor("admin_sede");
    await expect(db.query("select * from generar_gastos_horas_mes(null,9)")).rejects.toThrow(
      "Año inválido"
    );
    await expect(db.query("select * from generar_gastos_horas_mes(2026,null)")).rejects.toThrow(
      "Mes inválido"
    );
    await db.exec("set role anon");
    await expect(db.query("select * from generar_gastos_horas_mes(2026,9)")).rejects.toThrow(
      "permission denied"
    );
  });
  it("direct authenticated access to closures is restricted by RLS", async () => {
    await close("admin_escuela");
    await actor("admin_sede");
    await db.exec("set role authenticated");
    expect((await db.query("select sede_id from cierres_horas_instructores")).rows).toEqual([
      { sede_id: sede },
    ]);
    expect(
      (
        await db.query("delete from cierres_horas_instructores where sede_id=$1 returning id", [
          otherSede,
        ])
      ).rows
    ).toEqual([]);
    await expect(
      db.query("update cierres_horas_instructores set sede_id=$1", [otherSede])
    ).rejects.toThrow("row-level security");
  });
  it("keeps the fiscal timezone and transaction-scoped lock in the SQL definition", () => {
    expect(migration).toContain("(now() AT TIME ZONE 'America/Bogota')::date");
    expect(migration).toContain("pg_advisory_xact_lock");
    expect(migration).toContain("hashtextextended");
  });
});
