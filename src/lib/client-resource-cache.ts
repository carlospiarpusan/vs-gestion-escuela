type CachedClientEntry<T> = {
  expiresAt: number;
  value: T;
};

export type ClientResourceCachePolicy = "summary" | "catalog" | "list" | "heavy-report";

type ScheduledStorageHandle =
  | { kind: "idle"; id: number }
  | { kind: "timeout"; id: ReturnType<typeof setTimeout> };

const STORAGE_PREFIX = "autoescuela:resource-cache:";
const MAX_MEMORY_ENTRIES = 80;
const MAX_STORAGE_ENTRIES = 24;
const MAX_STORAGE_ENTRY_BYTES = 24 * 1024;
const memoryCache = new Map<string, CachedClientEntry<unknown>>();
const pendingCache = new Map<string, Promise<unknown>>();
const scheduledStorageWrites = new Map<string, ScheduledStorageHandle>();

function shouldPersistPolicyToSession(policy?: ClientResourceCachePolicy) {
  if (!policy) return true;
  return policy === "summary" || policy === "catalog";
}

function getStorageKey(key: string) {
  return `${STORAGE_PREFIX}${key}`;
}

function canUseStorage() {
  return typeof window !== "undefined" && typeof window.sessionStorage !== "undefined";
}

function isLocalDevelopmentRuntime() {
  return typeof process !== "undefined" && process.env.NODE_ENV === "development";
}

function canUsePersistentSessionCache() {
  return canUseStorage() && !isLocalDevelopmentRuntime();
}

function cancelScheduledStorageWrite(key: string) {
  if (typeof window === "undefined") return;

  const handle = scheduledStorageWrites.get(key);
  if (!handle) return;

  if (handle.kind === "idle" && "cancelIdleCallback" in window) {
    window.cancelIdleCallback(handle.id);
  } else {
    clearTimeout(handle.id);
  }

  scheduledStorageWrites.delete(key);
}

function touchMemoryEntry(key: string, entry: CachedClientEntry<unknown>) {
  memoryCache.delete(key);
  memoryCache.set(key, entry);

  while (memoryCache.size > MAX_MEMORY_ENTRIES) {
    const oldestKey = memoryCache.keys().next().value;
    if (!oldestKey) break;
    memoryCache.delete(oldestKey);
  }
}

function pruneExpiredMemoryEntries() {
  const now = Date.now();
  for (const [key, entry] of memoryCache.entries()) {
    if (entry.expiresAt <= now) {
      memoryCache.delete(key);
    }
  }
}

function readStorageEntry<T>(key: string): CachedClientEntry<T> | null {
  if (!canUsePersistentSessionCache()) return null;

  try {
    const raw = window.sessionStorage.getItem(getStorageKey(key));
    if (!raw) return null;
    const parsed = JSON.parse(raw) as CachedClientEntry<T> | null;
    if (!parsed?.expiresAt || parsed.expiresAt <= Date.now()) {
      window.sessionStorage.removeItem(getStorageKey(key));
      return null;
    }
    return parsed;
  } catch {
    return null;
  }
}

function pruneStorageEntries() {
  if (!canUsePersistentSessionCache()) return;

  try {
    const trackedEntries: Array<{ storageKey: string; expiresAt: number }> = [];

    for (let index = 0; index < window.sessionStorage.length; index += 1) {
      const storageKey = window.sessionStorage.key(index);
      if (!storageKey?.startsWith(STORAGE_PREFIX)) continue;

      const raw = window.sessionStorage.getItem(storageKey);
      if (!raw) continue;

      const parsed = JSON.parse(raw) as CachedClientEntry<unknown> | null;
      if (!parsed?.expiresAt || parsed.expiresAt <= Date.now()) {
        window.sessionStorage.removeItem(storageKey);
        continue;
      }

      trackedEntries.push({ storageKey, expiresAt: parsed.expiresAt });
    }

    if (trackedEntries.length <= MAX_STORAGE_ENTRIES) return;

    trackedEntries
      .sort((left, right) => left.expiresAt - right.expiresAt)
      .slice(0, trackedEntries.length - MAX_STORAGE_ENTRIES)
      .forEach(({ storageKey }) => window.sessionStorage.removeItem(storageKey));
  } catch {
    // Ignore storage access issues.
  }
}

function flushStorageEntry<T>(key: string, entry: CachedClientEntry<T>) {
  if (!canUsePersistentSessionCache()) return;

  try {
    const serialized = JSON.stringify(entry);
    if (serialized.length > MAX_STORAGE_ENTRY_BYTES) {
      window.sessionStorage.removeItem(getStorageKey(key));
      return;
    }

    window.sessionStorage.setItem(getStorageKey(key), serialized);
    pruneStorageEntries();
  } catch {
    // Ignore storage quota and serialization failures.
  }
}

function scheduleStorageWrite<T>(key: string, entry: CachedClientEntry<T>) {
  if (!canUsePersistentSessionCache() || typeof window === "undefined") return;

  cancelScheduledStorageWrite(key);

  const flush = () => {
    scheduledStorageWrites.delete(key);
    flushStorageEntry(key, entry);
  };

  if ("requestIdleCallback" in window) {
    const id = window.requestIdleCallback(flush, { timeout: 250 });
    scheduledStorageWrites.set(key, { kind: "idle", id });
    return;
  }

  const id = setTimeout(flush, 0);
  scheduledStorageWrites.set(key, { kind: "timeout", id });
}

export function readClientResourceCache<T>(key: string): T | null {
  pruneExpiredMemoryEntries();

  const memoryEntry = memoryCache.get(key) as CachedClientEntry<T> | undefined;
  if (memoryEntry) {
    if (memoryEntry.expiresAt > Date.now()) {
      touchMemoryEntry(key, memoryEntry as CachedClientEntry<unknown>);
      return memoryEntry.value;
    }
    memoryCache.delete(key);
  }

  const storageEntry = readStorageEntry<T>(key);
  if (!storageEntry) return null;

  touchMemoryEntry(key, storageEntry as CachedClientEntry<unknown>);
  return storageEntry.value;
}

export function writeClientResourceCache<T>(
  key: string,
  value: T,
  ttlMs: number,
  options?: { persistToSession?: boolean }
) {
  const entry: CachedClientEntry<T> = {
    expiresAt: Date.now() + ttlMs,
    value,
  };

  touchMemoryEntry(key, entry as CachedClientEntry<unknown>);

  if ((options?.persistToSession ?? true) && canUsePersistentSessionCache()) {
    scheduleStorageWrite(key, entry);
    return;
  }

  if (canUseStorage()) {
    try {
      cancelScheduledStorageWrite(key);
      window.sessionStorage.removeItem(getStorageKey(key));
    } catch {
      // Ignore storage access issues.
    }
  }
}

export async function getClientResourceCached<T>({
  key,
  ttlMs,
  forceFresh = false,
  persistToSession,
  policy,
  loader,
}: {
  key: string;
  ttlMs: number;
  forceFresh?: boolean;
  persistToSession?: boolean;
  policy?: ClientResourceCachePolicy;
  loader: () => Promise<T>;
}) {
  if (!forceFresh) {
    const cached = readClientResourceCache<T>(key);
    if (cached !== null) {
      return cached;
    }
  }

  const pending = pendingCache.get(key) as Promise<T> | undefined;
  if (pending) return pending;

  const nextPromise = loader()
    .then((value) => {
      writeClientResourceCache(key, value, ttlMs, {
        persistToSession: persistToSession ?? shouldPersistPolicyToSession(policy),
      });
      pendingCache.delete(key);
      return value;
    })
    .catch((error) => {
      pendingCache.delete(key);
      throw error;
    });

  pendingCache.set(key, nextPromise as Promise<unknown>);
  return nextPromise;
}

export function invalidateClientResourceCache(prefixes: string | string[]) {
  const targetPrefixes = Array.isArray(prefixes) ? prefixes : [prefixes];

  for (const key of memoryCache.keys()) {
    if (targetPrefixes.some((prefix) => key.startsWith(prefix))) {
      memoryCache.delete(key);
    }
  }

  for (const key of pendingCache.keys()) {
    if (targetPrefixes.some((prefix) => key.startsWith(prefix))) {
      pendingCache.delete(key);
    }
  }

  if (!canUseStorage()) return;

  try {
    const removals: string[] = [];
    for (let index = 0; index < window.sessionStorage.length; index += 1) {
      const storageKey = window.sessionStorage.key(index);
      if (!storageKey?.startsWith(STORAGE_PREFIX)) continue;
      const cacheKey = storageKey.slice(STORAGE_PREFIX.length);
      if (targetPrefixes.some((prefix) => cacheKey.startsWith(prefix))) {
        removals.push(storageKey);
      }
    }

    for (const key of scheduledStorageWrites.keys()) {
      if (targetPrefixes.some((prefix) => key.startsWith(prefix))) {
        cancelScheduledStorageWrite(key);
      }
    }

    removals.forEach((storageKey) => window.sessionStorage.removeItem(storageKey));
  } catch {
    // Ignore storage access issues.
  }
}
