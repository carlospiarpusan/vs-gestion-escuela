import { openDatabaseAsync, type SQLiteDatabase } from "expo-sqlite";
import { assertOfflineScope, captureOfflineScope, type OfflineScope } from "./session-scope";
import type { CachedRow, PendingMutation, PendingMutationStatus } from "./types";

let dbPromise: Promise<SQLiteDatabase> | null = null;
let operations: Promise<unknown> = Promise.resolve();
const nowIso = () => new Date().toISOString();
// Keep each statement below SQLite's conservative 999-parameter limit.
const CACHE_WRITE_BATCH_SIZE = 100;

async function getDb() {
  if (!dbPromise) {
    dbPromise = (async () => {
      const db = await openDatabaseAsync("condusoft-mobile.db");
      // Unowned legacy tables stay intact for recovery, but are never read,
      // replayed or automatically assigned to the next account on this device.
      await db.execAsync(`
        pragma journal_mode = wal;
        create table if not exists entity_cache_v2 (
          scope_key text not null, entity_type text not null, entity_id text not null,
          payload text not null, updated_at text not null,
          primary key (scope_key, entity_type, entity_id)
        );
        create table if not exists pending_mutations_v2 (
          scope_key text not null, owner_user_id text not null, id text not null,
          entity_id text not null, type text not null, payload text not null,
          status text not null default 'pending', error text,
          created_at text not null, updated_at text not null,
          primary key (scope_key, id)
        );
        create table if not exists sync_state_v2 (
          scope_key text not null, key text not null, value text not null,
          updated_at text not null, primary key (scope_key, key)
        );
        create table if not exists cale_bank_cache_v2 (
          scope_key text not null, id text not null, payload text not null,
          updated_at text not null, primary key (scope_key, id)
        );
      `);
      return db;
    })().catch((error) => {
      dbPromise = null;
      throw error;
    });
  }
  return dbPromise;
}

export async function initOfflineDb() {
  await getDb();
}

// Expo transactions also include interleaved work on the same connection.
// Serialize all access, not just writes, to avoid cross-account transactions.
function withDb<T>(scope: OfflineScope, work: (db: SQLiteDatabase) => Promise<T>): Promise<T> {
  assertOfflineScope(scope);
  const operation = operations.then(async () => {
    const db = await getDb();
    assertOfflineScope(scope);
    const result = await work(db);
    assertOfflineScope(scope);
    return result;
  });
  operations = operation.catch(() => undefined);
  return operation;
}

function parsePayload<T>(payload: string) {
  try {
    return JSON.parse(payload) as T;
  } catch {
    return null;
  }
}

export function replaceEntityRows<T extends { id?: string | null }>(
  entityType: string,
  rows: T[],
  scope = captureOfflineScope()
) {
  return withDb(scope, async (db) => {
    await db.withTransactionAsync(async () => {
      await db.runAsync(
        "delete from entity_cache_v2 where scope_key = ? and entity_type = ?",
        scope.key,
        entityType
      );
      for (let offset = 0; offset < rows.length; offset += CACHE_WRITE_BATCH_SIZE) {
        assertOfflineScope(scope);
        const batch = rows.slice(offset, offset + CACHE_WRITE_BATCH_SIZE);
        const timestamp = nowIso();
        await db.runAsync(
          `insert or replace into entity_cache_v2 (scope_key, entity_type, entity_id, payload, updated_at) values ${batch.map(() => "(?, ?, ?, ?, ?)").join(", ")}`,
          ...batch.flatMap((row) => [
            scope.key,
            entityType,
            String(row.id ?? Math.random().toString(36).slice(2)),
            JSON.stringify(row),
            timestamp,
          ])
        );
      }
      assertOfflineScope(scope);
    });
  });
}

async function writeEntity(
  db: SQLiteDatabase,
  scope: OfflineScope,
  entityType: string,
  row: unknown,
  id: string
) {
  await db.runAsync(
    "insert or replace into entity_cache_v2 (scope_key, entity_type, entity_id, payload, updated_at) values (?, ?, ?, ?, ?)",
    scope.key,
    entityType,
    id,
    JSON.stringify(row),
    nowIso()
  );
}

export function upsertEntityRow<T extends { id?: string | null }>(
  entityType: string,
  row: T,
  entityIdOverride?: string,
  scope = captureOfflineScope()
) {
  return withDb(scope, (db) =>
    writeEntity(
      db,
      scope,
      entityType,
      row,
      String(entityIdOverride ?? row.id ?? Math.random().toString(36).slice(2))
    )
  );
}

export function readEntityRows<T = Record<string, unknown>>(
  entityType: string,
  scope = captureOfflineScope()
) {
  return withDb(scope, async (db) => {
    const rows = await db.getAllAsync<CachedRow<string>>(
      `select entity_type as entityType, entity_id as entityId, payload, updated_at as updatedAt
       from entity_cache_v2 where scope_key = ? and entity_type = ? order by updated_at desc`,
      scope.key,
      entityType
    );
    return rows.flatMap((row) => {
      const payload = parsePayload<T>(row.payload);
      return payload ? [{ ...row, payload }] : [];
    });
  });
}

export function removeEntityRow(
  entityType: string,
  entityId: string,
  scope = captureOfflineScope()
) {
  return withDb(scope, async (db) => {
    await db.runAsync(
      "delete from entity_cache_v2 where scope_key = ? and entity_type = ? and entity_id = ?",
      scope.key,
      entityType,
      entityId
    );
  });
}

export function enqueueMutation(
  input: Omit<PendingMutation, "createdAt" | "updatedAt">,
  scope = captureOfflineScope()
) {
  const command = { ...input, payload: JSON.stringify(input.payload) };
  return withDb(scope, async (db) => {
    const timestamp = nowIso();
    // Do not overwrite an existing command's payload, owner or application state.
    await db.runAsync(
      `insert into pending_mutations_v2
       (scope_key, owner_user_id, id, entity_id, type, payload, status, error, created_at, updated_at)
       values (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      scope.key,
      scope.auth.userId,
      command.id,
      command.entityId,
      command.type,
      command.payload,
      command.status,
      command.error,
      timestamp,
      timestamp
    );
  });
}

export function listPendingMutations(
  statuses?: PendingMutationStatus[],
  scope = captureOfflineScope()
) {
  return withDb(scope, async (db) => {
    const rows = await db.getAllAsync<{
      id: string;
      entity_id: string;
      type: string;
      payload: string;
      status: PendingMutationStatus;
      error: string | null;
      created_at: string;
      updated_at: string;
    }>(
      `select * from pending_mutations_v2 where scope_key = ? and owner_user_id = ?
       ${statuses?.length ? `and status in (${statuses.map(() => "?").join(",")})` : ""}
       order by created_at asc, rowid asc`,
      scope.key,
      scope.auth.userId,
      ...(statuses ?? [])
    );
    return rows.flatMap((row) => {
      const payload = parsePayload<Record<string, unknown>>(row.payload);
      return payload
        ? [
            {
              id: row.id,
              entityId: row.entity_id,
              type: row.type,
              payload,
              status: row.status,
              error: row.error,
              createdAt: row.created_at,
              updatedAt: row.updated_at,
            },
          ]
        : [];
    });
  });
}

export function updateMutationStatus(
  id: string,
  status: PendingMutationStatus,
  error: string | null = null,
  scope = captureOfflineScope()
) {
  return withDb(scope, async (db) => {
    await db.runAsync(
      "update pending_mutations_v2 set status = ?, error = ?, updated_at = ? where scope_key = ? and owner_user_id = ? and id = ?",
      status,
      error,
      nowIso(),
      scope.key,
      scope.auth.userId,
      id
    );
  });
}

export function countPendingMutations(scope = captureOfflineScope()) {
  return withDb(scope, async (db) => {
    const row = await db.getFirstAsync<{ total: number }>(
      "select count(*) as total from pending_mutations_v2 where scope_key = ? and owner_user_id = ? and status in ('pending', 'failed', 'syncing')",
      scope.key,
      scope.auth.userId
    );
    return Number(row?.total ?? 0);
  });
}

export function setSyncState(key: string, value: string, scope = captureOfflineScope()) {
  return withDb(scope, async (db) => {
    await db.runAsync(
      "insert or replace into sync_state_v2 (scope_key, key, value, updated_at) values (?, ?, ?, ?)",
      scope.key,
      key,
      value,
      nowIso()
    );
  });
}

export function getSyncState(key: string, scope = captureOfflineScope()) {
  return withDb(scope, async (db) => {
    const row = await db.getFirstAsync<{ value: string }>(
      "select value from sync_state_v2 where scope_key = ? and key = ?",
      scope.key,
      key
    );
    return row?.value ?? null;
  });
}

export function upsertCaleQuestions<T extends { id?: string | null }>(
  rows: T[],
  scope = captureOfflineScope()
) {
  return withDb(scope, async (db) => {
    await db.withTransactionAsync(async () => {
      for (let offset = 0; offset < rows.length; offset += CACHE_WRITE_BATCH_SIZE) {
        assertOfflineScope(scope);
        const batch = rows.slice(offset, offset + CACHE_WRITE_BATCH_SIZE);
        const timestamp = nowIso();
        await db.runAsync(
          `insert or replace into cale_bank_cache_v2 (scope_key, id, payload, updated_at) values ${batch.map(() => "(?, ?, ?, ?)").join(", ")}`,
          ...batch.flatMap((row) => [
            scope.key,
            String(row.id ?? Math.random().toString(36).slice(2)),
            JSON.stringify(row),
            timestamp,
          ])
        );
      }
      assertOfflineScope(scope);
    });
  });
}

export function readCaleQuestions<T = Record<string, unknown>>(scope = captureOfflineScope()) {
  return withDb(scope, async (db) => {
    const rows = await db.getAllAsync<{ id: string; payload: string; updated_at: string }>(
      "select id, payload, updated_at from cale_bank_cache_v2 where scope_key = ? order by updated_at desc",
      scope.key
    );
    return rows.flatMap((row) => {
      const payload = parsePayload<T>(row.payload);
      return payload ? [{ id: row.id, payload, updatedAt: row.updated_at }] : [];
    });
  });
}
