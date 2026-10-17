import { afterEach, beforeAll, beforeEach, describe, expect, it, vi } from "vitest";
import { database, nativeDb } from "./setup";
import { login } from "./fixtures";
import {
  countPendingMutations,
  enqueueMutation,
  getSyncState,
  initOfflineDb,
  listPendingMutations,
  readCaleQuestions,
  readEntityRows,
  removeEntityRow,
  replaceEntityRows,
  setSyncState,
  updateMutationStatus,
  upsertCaleQuestions,
  upsertEntityRow,
} from "../src/lib/offline";
import { setActiveSession } from "../src/lib/session-scope";

beforeAll(initOfflineDb);
afterEach(() => vi.restoreAllMocks());
beforeEach(() => {
  for (const table of [
    "entity_cache_v2",
    "pending_mutations_v2",
    "sync_state_v2",
    "cale_bank_cache_v2",
  ])
    database.exec(`delete from ${table}`);
  setActiveSession(null);
});

const command = {
  id: "same-id",
  entityId: "entity",
  type: "income.create",
  payload: { monto: 20 },
  status: "pending" as const,
  error: null,
};

describe("account-owned SQLite storage", () => {
  it("stores 1000 entities with 10 bound insert batches instead of 1000 statements", async () => {
    login();
    const calls = vi.spyOn(nativeDb, "runAsync");
    const rows = Array.from({ length: 1000 }, (_, index) => ({
      id: `row-${index}`,
      nombre: "O'Connor ?; --",
      amount: index,
    }));
    await replaceEntityRows("students", rows);
    expect(calls).toHaveBeenCalledTimes(11);
    expect(calls.mock.calls.every(([, ...params]) => params.length <= 500)).toBe(true);
    const stored = await readEntityRows<(typeof rows)[number]>("students");
    expect(stored).toHaveLength(1000);
    expect(stored.map((row) => row.payload).sort((a, b) => a.amount - b.amount)).toEqual(rows);
  });

  it("stores CALE in bounded batches, preserves other questions and upserts duplicates", async () => {
    login();
    await upsertCaleQuestions([{ id: "keep" }]);
    const calls = vi.spyOn(nativeDb, "runAsync");
    const rows = Array.from({ length: 250 }, (_, index) => ({
      id: `q-${index}`,
      text: `Pregunta ${index}`,
    }));
    await upsertCaleQuestions(rows);
    expect(calls).toHaveBeenCalledTimes(3);
    expect(calls.mock.calls.every(([, ...params]) => params.length <= 400)).toBe(true);
    await upsertCaleQuestions([{ ...rows[0], text: "Updated" }]);
    const stored = await readCaleQuestions();
    expect(stored).toHaveLength(251);
    expect(stored.find((row) => row.id === "q-0")?.payload).toEqual({ id: "q-0", text: "Updated" });
  });

  it("rolls back the deletion and all earlier batches if a later write fails", async () => {
    login();
    await replaceEntityRows("students", [{ id: "keep", nombre: "Original" }]);
    const run = nativeDb.runAsync;
    let batches = 0;
    vi.spyOn(nativeDb, "runAsync").mockImplementation(async (sql, ...args) => {
      if (sql.startsWith("insert or replace into entity_cache_v2") && ++batches === 2)
        throw new Error("Disk full");
      return run(sql, ...args);
    });
    await expect(
      replaceEntityRows(
        "students",
        Array.from({ length: 150 }, (_, index) => ({ id: String(index) }))
      )
    ).rejects.toThrow("Disk full");
    expect((await readEntityRows("students")).map((row) => row.payload)).toEqual([
      { id: "keep", nombre: "Original" },
    ]);
  });

  it("rolls back a batch if the account changes before commit", async () => {
    login();
    await replaceEntityRows("students", [{ id: "keep" }]);
    const run = nativeDb.runAsync;
    vi.spyOn(nativeDb, "runAsync").mockImplementation(async (sql, ...args) => {
      const result = await run(sql, ...args);
      if (sql.startsWith("insert or replace into entity_cache_v2")) login("b");
      return result;
    });
    await expect(replaceEntityRows("students", [{ id: "new" }])).rejects.toThrow(/sesion/);
    expect(await readEntityRows("students")).toEqual([]);
    login();
    expect((await readEntityRows("students"))[0].entityId).toBe("keep");
  });
  it("isolates every cache, pending status/count and CALE checkpoint, and restores the owner's data", async () => {
    const a = login();
    await upsertEntityRow("students", { id: "same", nombre: "A" });
    await enqueueMutation(command);
    await upsertCaleQuestions([{ id: "question-a" }]);
    await setSyncState("cale", "timestamp-a");
    login("b");
    expect(await readEntityRows("students")).toEqual([]);
    expect(await readCaleQuestions()).toEqual([]);
    expect(await getSyncState("cale")).toBeNull();
    expect(await listPendingMutations()).toEqual([]);
    expect(await countPendingMutations()).toBe(0);
    await enqueueMutation({ ...command, payload: { monto: 99 } });
    await updateMutationStatus(command.id, "applied");
    await replaceEntityRows("students", [{ id: "same", nombre: "B" }]);
    await removeEntityRow("students", "same");
    expect(() => readEntityRows("students", a)).toThrow(/sesion/);
    setActiveSession(null);
    expect(() => readEntityRows("students")).toThrow(/sesion/);
    login();
    expect((await readEntityRows("students"))[0].payload.nombre).toBe("A");
    expect(await countPendingMutations()).toBe(1);
    expect((await listPendingMutations())[0]).toMatchObject({
      status: "pending",
      payload: { monto: 20 },
    });
    expect((await readCaleQuestions())[0].payload.id).toBe("question-a");
    expect(await getSyncState("cale")).toBe("timestamp-a");
  });

  it.each([{ escuela_id: "school-b" }, { sede_id: "branch-b" }, { rol: "alumno" as const }])(
    "quarantines prior scope on same-user access change: %j",
    async (change) => {
      login();
      await enqueueMutation(command);
      await upsertEntityRow("income", { id: "old" });
      login("a", change);
      expect(await countPendingMutations()).toBe(0);
      expect(await readEntityRows("income")).toEqual([]);
      login();
      expect(await countPendingMutations()).toBe(1);
      expect((await readEntityRows("income"))[0].entityId).toBe("old");
    }
  );

  it("does not reassign, overwrite or erase a duplicate pending command", async () => {
    login();
    await enqueueMutation(command);
    await expect(enqueueMutation({ ...command, payload: { monto: 0 } })).rejects.toThrow();
    expect((await listPendingMutations())[0].payload).toEqual({ monto: 20 });
  });

  it("snapshots a command payload before waiting for SQLite", async () => {
    login();
    const payload = { answers: { q: "a" } };
    const write = enqueueMutation({ ...command, payload });
    payload.answers.q = "b";
    await write;
    expect((await listPendingMutations())[0].payload).toEqual({ answers: { q: "a" } });
  });

  it("never imports unowned legacy data, while preserving its raw pending payload", async () => {
    database.exec(`
      create table if not exists entity_cache (cache_key text, payload text);
      create table if not exists pending_mutations (id text, payload text);
      create table if not exists sync_state (key text, value text);
      create table if not exists cale_bank_cache (id text, payload text);
      delete from pending_mutations;
      insert into entity_cache values ('my-profile:legacy', '{"id":"legacy"}');
      insert into pending_mutations values ('legacy-command', '{"private":"keep"}');
      insert into sync_state values ('cale_bank_updated_at', 'legacy');
      insert into cale_bank_cache values ('legacy-question', '{}');
    `);
    await initOfflineDb();
    login();
    expect(await readEntityRows("my-profile")).toEqual([]);
    expect(await listPendingMutations()).toEqual([]);
    expect(await readCaleQuestions()).toEqual([]);
    expect(await getSyncState("cale_bank_updated_at")).toBeNull();
    expect(database.prepare("select payload from pending_mutations").get()).toEqual({
      payload: '{"private":"keep"}',
    });
  });

  it("rejects SQLite work queued before an account switch", async () => {
    login();
    const write = upsertEntityRow("students", { id: "stale" });
    login("b");
    await expect(write).rejects.toThrow(/sesion/);
    expect(await readEntityRows("students")).toEqual([]);
    login();
    expect(await readEntityRows("students")).toEqual([]);
  });

  it("serializes concurrent replacements as complete transactions", async () => {
    login();
    await Promise.all([
      replaceEntityRows("students", [{ id: "a" }, { id: "b" }]),
      replaceEntityRows("students", [{ id: "c" }]),
    ]);
    expect((await readEntityRows("students")).map((r) => r.entityId)).toEqual(["c"]);
  });
});
