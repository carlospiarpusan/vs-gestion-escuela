// @vitest-environment node
import { readFileSync } from "node:fs";
import { PGlite } from "@electric-sql/pglite";
import { expect, it } from "vitest";

it("la migración conserva alumnos anteriores y las restricciones de acceso existentes", async () => {
  const db = new PGlite();
  try {
    await db.exec(`create role anon; create role authenticated;
      create table alumnos(id int primary key, email text);
      insert into alumnos values(1,null),(2,'anterior@example.com');
      alter table alumnos enable row level security;
      grant select,update on alumnos to authenticated;
      create policy own_student on alumnos to authenticated using(id=1) with check(id=1);`);
    await db.exec(
      readFileSync(
        new URL(
          "../../supabase/migrations/20261013211423_student_billing_contact.sql",
          import.meta.url
        ),
        "utf8"
      )
    );
    expect((await db.query("select * from alumnos order by id")).rows).toEqual([
      { id: 1, email: null, datos_facturacion: null },
      { id: 2, email: "anterior@example.com", datos_facturacion: null },
    ]);
    await expect(
      db.query("update alumnos set datos_facturacion='[]'::jsonb where id=1")
    ).rejects.toThrow();
    await db.exec("set role authenticated");
    expect((await db.query("select id from alumnos")).rows).toEqual([{ id: 1 }]);
    await db.exec("reset role;set role anon");
    await expect(db.query("select datos_facturacion from alumnos")).rejects.toThrow();
  } finally {
    await db.close();
  }
});
