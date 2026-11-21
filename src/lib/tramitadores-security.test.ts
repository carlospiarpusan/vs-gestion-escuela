// @vitest-environment node
import { readFileSync } from "node:fs";
import { PGlite } from "@electric-sql/pglite";
import { afterAll, beforeAll, describe, expect, it, vi } from "vitest";

const holder = vi.hoisted(() => ({ db: null as unknown as PGlite }));
vi.mock("@/lib/server-db", () => ({
  getServerDbPool: () => ({
    query: (sql: string, values?: unknown[]) => holder.db.query(sql, values),
  }),
}));

import { getTramitadorPortal, resolveEnrollmentTramitador } from "@/lib/tramitadores-server";
import { normalizeTramitadorNombre } from "@/lib/tramitadores";

const migration = readFileSync(
  new URL("../../supabase/migrations/20261120120000_tramitadores_catalogo.sql", import.meta.url),
  "utf8"
);

const school = "00000000-0000-4000-8000-000000000001";
const otherSchool = "00000000-0000-4000-8000-000000000002";
const sede = "00000000-0000-4000-8000-000000000011";
const otherSede = "00000000-0000-4000-8000-000000000012";
const uid = (n: number) => `00000000-0000-4000-8000-${String(n).padStart(12, "0")}`;

let db: PGlite;
const queryable = () => db as unknown as Parameters<typeof resolveEnrollmentTramitador>[0];

async function enroll(
  n: number,
  nombre: string | null,
  escuela = school,
  valor = 100000,
  comision: number | null = 70000
) {
  const sedeId = escuela === school ? sede : otherSede;
  await db.query(
    `insert into alumnos(id,escuela_id,sede_id,nombre,apellidos,dni,telefono,email) values($1,$2,$3,$4,'Prueba',$5,'300','a@x.co')`,
    [uid(500 + n), escuela, sedeId, `Alumno ${n}`, `DOC${n}`]
  );
  await db.query(
    `insert into matriculas_alumno(id,escuela_id,sede_id,alumno_id,categorias,valor_total,tiene_tramitador,tramitador_nombre,tramitador_valor)
     values($1,$2,$3,$4,'{B1}',$5,$6,$7,$8)`,
    [uid(600 + n), escuela, sedeId, uid(500 + n), valor, nombre !== null, nombre, comision]
  );
}

beforeAll(async () => {
  db = new PGlite();
  holder.db = db;
  await db.exec(`
    create role anon; create role authenticated;
    create function public.set_updated_at() returns trigger language plpgsql as $$ begin new.updated_at = now(); return new; end $$;
    create table escuelas(id uuid primary key);
    create table sedes(id uuid primary key, escuela_id uuid);
    create table perfiles(id uuid primary key, escuela_id uuid, sede_id uuid, rol text, activo boolean default true,
      constraint perfiles_rol_check check (rol in ('admin_escuela','alumno')));
    create table alumnos(id uuid primary key, escuela_id uuid, sede_id uuid, nombre text, apellidos text, dni text,
      telefono text, email text, tramitador_nombre text);
    create table matriculas_alumno(id uuid primary key, escuela_id uuid, sede_id uuid, alumno_id uuid, categorias text[],
      valor_total numeric, fecha_inscripcion date default current_date, estado text default 'activo', numero_contrato text,
      tiene_tramitador boolean default false, tramitador_nombre text, tramitador_valor numeric,
      created_at timestamptz default now(), updated_at timestamptz default now());
    create table gastos(id uuid primary key default gen_random_uuid(), escuela_id uuid, categoria text, proveedor text);
    create table ingresos(id uuid primary key default gen_random_uuid(), matricula_id uuid, monto numeric, estado text);
    grant all on all tables in schema public to anon, authenticated;
    insert into escuelas values('${school}'),('${otherSchool}');
    insert into sedes values('${sede}','${school}'),('${otherSede}','${otherSchool}');
  `);

  // Datos históricos con variantes del mismo tramitador.
  let n = 0;
  for (const nombre of [
    "iles",
    "Iles",
    "Iles",
    "ILES ",
    "iLES",
    "Ana Maria",
    "Ana maria",
    "Ana  María",
  ]) {
    await enroll(++n, nombre);
  }
  await enroll(++n, "Iles", otherSchool);
  await db.exec(`
    insert into gastos(escuela_id,categoria,proveedor) values
      ('${school}','tramitador','ILES'),('${school}','tramitador','ana maria'),('${school}','combustible','iles');
  `);
  await db.exec(migration);
});

afterAll(async () => {
  await db.close();
});

describe("migración de tramitadores", () => {
  it("deja un solo tramitador por nombre y escuela con la variante más usada", async () => {
    const rows = (
      await db.query<{ escuela_id: string; nombre: string; comision_valor: string }>(
        "select escuela_id, nombre, comision_valor from tramitadores order by escuela_id, nombre"
      )
    ).rows;
    expect(rows).toEqual([
      { escuela_id: school, nombre: "Ana Maria", comision_valor: "70000.00" },
      { escuela_id: school, nombre: "Iles", comision_valor: "70000.00" },
      { escuela_id: otherSchool, nombre: "Iles", comision_valor: "70000.00" },
    ]);
  });

  it("enlaza todas las matrículas y unifica nombres en matrículas y gastos", async () => {
    const unlinked = await db.query(
      "select 1 from matriculas_alumno where tiene_tramitador and tramitador_id is null"
    );
    expect(unlinked.rows).toHaveLength(0);
    const names = await db.query<{ tramitador_nombre: string }>(
      "select distinct tramitador_nombre from matriculas_alumno where escuela_id=$1 order by 1",
      [school]
    );
    expect(names.rows.map((r) => r.tramitador_nombre)).toEqual(["Ana Maria", "Iles"]);
    const gastos = await db.query<{ categoria: string; proveedor: string }>(
      "select categoria, proveedor from gastos order by categoria, proveedor"
    );
    expect(gastos.rows).toEqual([
      { categoria: "combustible", proveedor: "iles" },
      { categoria: "tramitador", proveedor: "Ana Maria" },
      { categoria: "tramitador", proveedor: "Iles" },
    ]);
  });

  it("nunca vuelve a crear variantes: el trigger usa el nombre del catálogo", async () => {
    await enroll(50, "  ILES  ");
    const row = (
      await db.query<{ tramitador_nombre: string; nombre: string }>(
        `select m.tramitador_nombre, t.nombre from matriculas_alumno m join tramitadores t on t.id=m.tramitador_id where m.id=$1`,
        [uid(650)]
      )
    ).rows[0];
    expect(row).toEqual({ tramitador_nombre: "Iles", nombre: "Iles" });
    await expect(
      db.query("insert into tramitadores(escuela_id,nombre) values($1,'ÍLES')", [school])
    ).rejects.toThrow(/tramitadores_nombre_unico/);
  });

  it("rechaza enlazar un tramitador de otra escuela", async () => {
    const foreign = (
      await db.query<{ id: string }>("select id from tramitadores where escuela_id=$1", [
        otherSchool,
      ])
    ).rows[0].id;
    await expect(
      db.query("update matriculas_alumno set tramitador_id=$1 where id=$2", [foreign, uid(601)])
    ).rejects.toThrow(/no pertenece/);
  });

  it("el perfil tramitador no puede tener escuela ni sede", async () => {
    await expect(
      db.query("insert into perfiles(id,escuela_id,sede_id,rol) values($1,$2,$3,'tramitador')", [
        uid(900),
        school,
        sede,
      ])
    ).rejects.toThrow(/perfiles_tramitador_sin_escuela/);
    await db.query("insert into perfiles(id,rol) values($1,'tramitador')", [uid(901)]);
  });

  it("los clientes de Supabase no pueden leer ni escribir el catálogo", async () => {
    for (const role of ["anon", "authenticated"]) {
      await db.exec(`set role ${role}`);
      try {
        await expect(db.exec("select * from public.tramitadores")).rejects.toThrow(
          /permission denied/
        );
      } finally {
        await db.exec("reset role");
      }
    }
  });

  it("se puede aplicar de nuevo sin duplicar", async () => {
    await db.exec(migration);
    const count = await db.query<{ n: number }>("select count(*)::int as n from tramitadores");
    expect(count.rows[0].n).toBe(3);
  });
});

describe("portal del tramitador", () => {
  it("solo devuelve las matrículas de su propio tramitador, con abonos y comisión", async () => {
    const perfil = uid(902);
    await db.query("insert into perfiles(id,rol) values($1,'tramitador')", [perfil]);
    await db.query(
      "update tramitadores set perfil_id=$1 where escuela_id=$2 and nombre='Ana Maria'",
      [perfil, school]
    );
    await db.query(
      "insert into ingresos(matricula_id,monto,estado) values($1,30000,'cobrado'),($1,5000,'anulado'),($2,99000,'cobrado')",
      [uid(606), uid(601)]
    );

    const portal = await getTramitadorPortal(perfil);
    expect(portal.tramitador).toEqual({ nombre: "Ana Maria", tipo: "comision" });
    expect(portal.rows.map((r) => r.matricula_id).sort()).toEqual([uid(606), uid(607), uid(608)]);
    expect(portal.rows.every((r) => r.alumno_nombre.startsWith("Alumno "))).toBe(true);
    const row = portal.rows.find((r) => r.matricula_id === uid(606))!;
    expect(row).toMatchObject({
      valor_curso: 100000,
      abonado: 30000,
      saldo: 70000,
      comision: 70000,
    });
    expect(portal.totales).toEqual({
      valor_curso: 300000,
      abonado: 30000,
      saldo: 270000,
      comision: 210000,
    });
  });

  it("oculta la comisión a un tramitador de tipo descuento", async () => {
    await db.query("update tramitadores set tipo='descuento' where perfil_id=$1", [uid(902)]);
    const portal = await getTramitadorPortal(uid(902));
    expect(portal.rows.every((r) => r.comision === null)).toBe(true);
    expect(portal.totales.comision).toBe(0);
  });

  it("niega el acceso a un perfil sin tramitador o con tramitador inactivo", async () => {
    await expect(getTramitadorPortal(uid(901))).rejects.toThrow(/no está activo/);
    await db.query("update tramitadores set activo=false where perfil_id=$1", [uid(902)]);
    await expect(getTramitadorPortal(uid(902))).rejects.toThrow(/no está activo/);
  });
});

describe("selección en la matrícula", () => {
  it("acepta el nombre sin importar mayúsculas y rechaza nombres fuera del catálogo", async () => {
    const found = await resolveEnrollmentTramitador(queryable(), school, {
      tramitador_nombre: "ILES",
    });
    expect(found.nombre).toBe("Iles");
    await expect(
      resolveEnrollmentTramitador(queryable(), school, { tramitador_nombre: "Desconocido" })
    ).rejects.toThrow(/Selecciona un tramitador/);
    await expect(
      resolveEnrollmentTramitador(queryable(), otherSchool, { tramitador_nombre: "Ana Maria" })
    ).rejects.toThrow(/Selecciona un tramitador/);
  });

  it("normaliza igual en el navegador que en la base", () => {
    expect(normalizeTramitadorNombre("  Ána   MARÍA ")).toBe("ana maria");
  });
});
