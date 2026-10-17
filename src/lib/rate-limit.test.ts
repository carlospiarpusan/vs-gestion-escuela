// @vitest-environment node
import { readFileSync } from "node:fs";
import { PGlite } from "@electric-sql/pglite";
import { afterEach, beforeEach, expect, it, vi } from "vitest";
import { rateLimit } from "./rate-limit";
const mock = vi.hoisted(() => ({ query: vi.fn() }));
vi.mock("@/lib/server-db", () => ({ getServerDbPool: () => ({ query: mock.query }) }));
let db: PGlite;
beforeEach(async () => {
  vi.resetAllMocks();
  global.__autoescuelaRateLimitStoreReady = undefined;
  global.__autoescuelaRateLimitLastCleanupAt = Date.now();
  db = new PGlite();
  await db.exec("create role anon;create role authenticated;create role service_role bypassrls");
  mock.query.mockImplementation((sql: string, values?: unknown[]) => db.query(sql, values));
});
afterEach(async () => {
  global.__autoescuelaRateLimitStoreReady = undefined;
  global.__autoescuelaRateLimitLastCleanupAt = undefined;
  await db?.close();
});
it("el servidor conserva límites y bloquea intentos que exceden la cuota", async () => {
  expect((await rateLimit("synthetic", 2, 60_000)).ok).toBe(true);
  expect((await rateLimit("synthetic", 2, 60_000)).ok).toBe(true);
  expect((await rateLimit("synthetic", 2, 60_000)).ok).toBe(false);
  await db.exec("set role anon");
  await expect(db.query("select * from api_rate_limits")).rejects.toThrow();
});
it("recupera la inicialización después de un fallo temporal", async () => {
  mock.query.mockRejectedValueOnce(new Error("temporary database failure"));
  await expect(rateLimit("synthetic", 2, 60_000)).rejects.toThrow();
  expect((await rateLimit("synthetic", 2, 60_000)).ok).toBe(true);
});
it("la migración protege contadores existentes sin alterarlos ni bloquear al servidor", async () => {
  await db.exec(`create table api_rate_limits(key text primary key,count int,reset_at timestamptz);
    insert into api_rate_limits values('synthetic',1,'2099-01-01T00:00:00Z');
    grant all on api_rate_limits to anon,authenticated,service_role;`);
  await db.exec(
    readFileSync(
      new URL(
        "../../supabase/migrations/20261014025746_protect_api_rate_limits.sql",
        import.meta.url
      ),
      "utf8"
    )
  );
  for (const role of ["anon", "authenticated"]) {
    await db.exec(`set role ${role}`);
    await expect(db.query("select * from api_rate_limits")).rejects.toThrow();
    await expect(db.query("delete from api_rate_limits")).rejects.toThrow();
    await db.exec("reset role");
  }
  await db.exec("set role service_role");
  expect((await db.query("select count from api_rate_limits")).rows).toEqual([{ count: 1 }]);
  await db.query("update api_rate_limits set count=2");
  expect((await db.query("select count from api_rate_limits")).rows).toEqual([{ count: 2 }]);
});
