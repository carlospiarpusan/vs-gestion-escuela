import { vi } from "vitest";
import { DatabaseSync } from "node:sqlite";

export const database = new DatabaseSync(":memory:");
export const secureStorage = new Map<string, string>();
export const nativeDb = {
  execAsync: async (sql: string) => {
    database.exec(sql);
  },
  runAsync: async (sql: string, ...args: (string | number | null)[]) =>
    database.prepare(sql).run(...args),
  getAllAsync: async (sql: string, ...args: (string | number | null)[]) =>
    database.prepare(sql).all(...args),
  getFirstAsync: async (sql: string, ...args: (string | number | null)[]) =>
    database.prepare(sql).get(...args) ?? null,
  withTransactionAsync: async (work: () => Promise<void>) => {
    database.exec("begin");
    try {
      await work();
      database.exec("commit");
    } catch (error) {
      database.exec("rollback");
      throw error;
    }
  },
};

vi.mock("expo-sqlite", () => ({ openDatabaseAsync: vi.fn(async () => nativeDb) }));
vi.mock("expo-secure-store", () => ({
  getItemAsync: vi.fn(async (key: string) => secureStorage.get(key) ?? null),
  setItemAsync: vi.fn(async (key: string, value: string) => {
    secureStorage.set(key, value);
  }),
  deleteItemAsync: vi.fn(async (key: string) => {
    secureStorage.delete(key);
  }),
}));
vi.mock("react-native-url-polyfill/auto", () => ({}));
vi.stubEnv("EXPO_PUBLIC_SUPABASE_URL", "https://test.supabase.co");
vi.stubEnv("EXPO_PUBLIC_SUPABASE_ANON_KEY", "test-anon-key");
