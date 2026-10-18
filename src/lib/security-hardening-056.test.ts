// @vitest-environment node
import { readFileSync } from "node:fs";
import { PGlite } from "@electric-sql/pglite";
import { beforeAll, describe, expect, it } from "vitest";

const id = (n: number) => `20000000-0000-4000-8000-${String(n).padStart(12, "0")}`;
const schoolA = id(1);
const schoolB = id(2);
const branchA = id(11);
const studentUser = id(101);
const schoolAdminUser = id(102);
const superAdminUser = id(103);

describe("Migration 056: protect_perfiles_privileged_columns trigger", () => {
  let db: PGlite;

  beforeAll(async () => {
    db = new PGlite();

    // Create auth schema and auth.uid() function mock for PGlite
    await db.exec(`
      create schema if not exists auth;
      create table if not exists auth.current_session (uid uuid);
      create or replace function auth.uid() returns uuid language sql as $$
        select uid from auth.current_session limit 1;
      $$;

      create table escuelas (
        id uuid primary key,
        nombre text
      );

      create table perfiles (
        id uuid primary key,
        escuela_id uuid,
        sede_id uuid,
        nombre text,
        email text,
        telefono text,
        rol text,
        activo boolean default true
      );

      insert into escuelas values ('${schoolA}', 'Escuela A'), ('${schoolB}', 'Escuela B');

      insert into perfiles values
        ('${studentUser}', '${schoolA}', '${branchA}', 'Alumno 1', 'alumno@example.com', '3001234567', 'alumno', true),
        ('${schoolAdminUser}', '${schoolA}', '${branchA}', 'Admin Escuela', 'admin@example.com', '3007654321', 'admin_escuela', true),
        ('${superAdminUser}', null, null, 'Super Admin', 'super@example.com', '3009999999', 'super_admin', true);
    `);

    // Load migration 056
    const migrationSql = readFileSync(
      new URL("../../supabase/migrations/056_security_hardening_fixes.sql", import.meta.url),
      "utf8"
    );

    // Isolate function and trigger definition (RLS policies are skipped in PGlite mock environment)
    const triggerIndex = migrationSql.indexOf(
      "CREATE TRIGGER trg_protect_perfiles_privileged_columns"
    );
    const triggerCode = migrationSql.slice(0, migrationSql.indexOf(";", triggerIndex) + 1);

    await db.exec(triggerCode);
  });

  async function asUser(userId: string | null, fn: () => Promise<void>) {
    await db.exec("delete from auth.current_session;");
    if (userId) {
      await db.exec(`insert into auth.current_session (uid) values ('${userId}');`);
    }
    try {
      await fn();
    } finally {
      await db.exec("delete from auth.current_session;");
    }
  }

  it("permits regular users to update non-privileged fields (nombre, telefono)", async () => {
    await asUser(studentUser, async () => {
      await db.exec(`
        update perfiles
        set nombre = 'Alumno Nombre Modificado', telefono = '3119876543'
        where id = '${studentUser}';
      `);

      const res = await db.query<{ nombre: string; telefono: string }>(
        `select nombre, telefono from perfiles where id = '${studentUser}'`
      );
      expect(res.rows[0].nombre).toBe("Alumno Nombre Modificado");
      expect(res.rows[0].telefono).toBe("3119876543");
    });
  });

  it("blocks regular student from escalating their role to super_admin", async () => {
    await asUser(studentUser, async () => {
      await expect(
        db.exec(`
          update perfiles
          set rol = 'super_admin'
          where id = '${studentUser}';
        `)
      ).rejects.toThrow(/No tienes autorización para modificar columnas de privilegios/);
    });
  });

  it("blocks regular student from changing their escuela_id or activo status", async () => {
    await asUser(studentUser, async () => {
      await expect(
        db.exec(`
          update perfiles
          set escuela_id = '${schoolB}'
          where id = '${studentUser}';
        `)
      ).rejects.toThrow(/No tienes autorización para modificar columnas de privilegios/);

      await expect(
        db.exec(`
          update perfiles
          set activo = false
          where id = '${studentUser}';
        `)
      ).rejects.toThrow(/No tienes autorización para modificar columnas de privilegios/);
    });
  });

  it("blocks admin_escuela from assigning super_admin role", async () => {
    await asUser(schoolAdminUser, async () => {
      await expect(
        db.exec(`
          update perfiles
          set rol = 'super_admin'
          where id = '${studentUser}';
        `)
      ).rejects.toThrow(/No tienes autorización para asignar el rol super_admin/);
    });
  });

  it("permits super_admin to update roles freely", async () => {
    await asUser(superAdminUser, async () => {
      await db.exec(`
        update perfiles
        set rol = 'instructor'
        where id = '${studentUser}';
      `);

      const res = await db.query<{ rol: string }>(
        `select rol from perfiles where id = '${studentUser}'`
      );
      expect(res.rows[0].rol).toBe("instructor");
    });
  });

  it("permits service_role (auth.uid() is null) to execute system administrative updates", async () => {
    await asUser(null, async () => {
      await db.exec(`
        update perfiles
        set rol = 'alumno', activo = true
        where id = '${studentUser}';
      `);

      const res = await db.query<{ rol: string }>(
        `select rol from perfiles where id = '${studentUser}'`
      );
      expect(res.rows[0].rol).toBe("alumno");
    });
  });
});
