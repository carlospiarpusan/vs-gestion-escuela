// @vitest-environment node
import { readFileSync } from "node:fs";
import { PGlite } from "@electric-sql/pglite";
import { expect, it } from "vitest";
it("completa una preinscripción solo después de crear su matrícula y preserva registros históricos", async () => {
  const db = new PGlite();
  try {
    await db.exec(`create role anon;create role authenticated;
      create table alumnos(id int primary key,estado text,nombre text);
      create table matriculas_alumno(alumno_id int references alumnos(id));
      insert into alumnos values(1,'pre_registrado','Demo'),(2,'activo','Histórico');`);
    await db.exec(
      readFileSync(
        new URL(
          "../../supabase/migrations/20261020141352_protect_mobile_preregistration.sql",
          import.meta.url
        ),
        "utf8"
      )
    );
    await db.exec("update alumnos set nombre='Ficha completa' where id=1");
    await expect(db.exec("update alumnos set estado='activo' where id=1")).rejects.toThrow(
      /Completa la matrícula/
    );
    await db.exec(
      "insert into matriculas_alumno values(1); update alumnos set estado='activo' where id=1"
    );
    expect((await db.query("select estado from alumnos order by id")).rows).toEqual([
      { estado: "activo" },
      { estado: "activo" },
    ]);
  } finally {
    await db.close();
  }
});
