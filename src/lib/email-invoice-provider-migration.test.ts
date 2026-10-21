// @vitest-environment node
import { PGlite } from "@electric-sql/pglite";
import { readFileSync } from "node:fs";
import { expect, it } from "vitest";
it("extends providers without losing existing connections and keeps the allowlist", async () => {
  const db = new PGlite();
  try {
    await db.exec(
      "create table public.facturas_correo_integraciones (id int, provider text, constraint facturas_correo_integraciones_provider_check check (provider in ('imap','gmail_google'))); insert into public.facturas_correo_integraciones values (1,'imap'),(2,'gmail_google');"
    );
    const sql = readFileSync(
      "supabase/migrations/20261019183852_email_invoice_microsoft_oauth.sql",
      "utf8"
    );
    await db.exec(sql);
    await db.exec(sql);
    await db.exec(
      "insert into public.facturas_correo_integraciones values (3,'outlook_microsoft')"
    );
    expect(
      (await db.query("select provider from public.facturas_correo_integraciones order by id")).rows
    ).toEqual([
      { provider: "imap" },
      { provider: "gmail_google" },
      { provider: "outlook_microsoft" },
    ]);
    await expect(
      db.exec("insert into public.facturas_correo_integraciones values (4,'unknown')")
    ).rejects.toThrow(/check constraint/);
  } finally {
    await db.close();
  }
}, 20_000);

it("only one sync can hold a mailbox lease and an expired lease can be recovered", async () => {
  const db = new PGlite();
  try {
    await db.exec(
      "create table public.facturas_correo_integraciones (id int, provider text, constraint facturas_correo_integraciones_provider_check check (provider in ('imap','gmail_google'))); insert into public.facturas_correo_integraciones values (1,'gmail_google');"
    );
    await db.exec(
      readFileSync("supabase/migrations/20261019183852_email_invoice_microsoft_oauth.sql", "utf8")
    );
    const lock =
      "update public.facturas_correo_integraciones set sync_locked_until = $1 where id=1 and (sync_locked_until is null or sync_locked_until < $2) returning id";
    expect(
      (await db.query(lock, ["2026-10-19T19:06:00Z", "2026-10-19T19:00:00Z"])).rows
    ).toHaveLength(1);
    expect(
      (await db.query(lock, ["2026-10-19T19:07:00Z", "2026-10-19T19:01:00Z"])).rows
    ).toHaveLength(0);
    expect(
      (await db.query(lock, ["2026-10-19T19:13:00Z", "2026-10-19T19:07:00Z"])).rows
    ).toHaveLength(1);
    // A timed-out original worker must not release its replacement's lease.
    expect(
      (
        await db.query(
          "update public.facturas_correo_integraciones set sync_locked_until=null where id=1 and sync_locked_until=$1 returning id",
          ["2026-10-19T19:06:00Z"]
        )
      ).rows
    ).toHaveLength(0);
  } finally {
    await db.close();
  }
}, 20_000);
