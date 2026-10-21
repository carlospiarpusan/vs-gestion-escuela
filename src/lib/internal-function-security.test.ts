// @vitest-environment node
import { readFileSync } from "node:fs";
import { PGlite } from "@electric-sql/pglite";
import { expect, it } from "vitest";
it("protege RPC internas y conserva el helper propio y los triggers de escritura", async () => {
  const db = new PGlite();
  try {
    await db.exec(`create role anon;create role authenticated;create role service_role;
    create table records(id int,updated_at timestamptz);
    create function public.set_updated_at() returns trigger language plpgsql as $$begin new.updated_at:=now();return new;end$$;
    create trigger touch before insert on records for each row execute function public.set_updated_at();
    create function public.school_subscription_access(uuid) returns text language sql security definer as $$select 'internal'::text$$;
    create function public.my_school_subscription_access() returns text language sql security definer as $$select public.school_subscription_access(null::uuid)$$;
    grant insert,select on records to authenticated;`);
    const sql = readFileSync(
      new URL(
        "../../supabase/migrations/20261020145133_restrict_internal_database_functions.sql",
        import.meta.url
      ),
      "utf8"
    );
    await db.exec(sql);
    await db.exec(sql);
    await db.exec("set role anon");
    for (const fn of [
      "my_school_subscription_access()",
      "school_subscription_access(null::uuid)",
      "set_updated_at()",
    ])
      await expect(db.query(`select public.${fn}`)).rejects.toThrow(/permission denied/);
    await db.exec("set role authenticated");
    await expect(db.query("select public.school_subscription_access(null::uuid)")).rejects.toThrow(
      /permission denied/
    );
    expect((await db.query("select public.my_school_subscription_access() result")).rows).toEqual([
      { result: "internal" },
    ]);
    await db.exec("insert into records(id) values(1)");
    expect((await db.query("select updated_at is not null ok from records")).rows).toEqual([
      { ok: true },
    ]);
    await db.exec("set role service_role");
    expect(
      (await db.query("select public.school_subscription_access(null::uuid) result")).rows
    ).toEqual([{ result: "internal" }]);
  } finally {
    await db.close();
  }
});
