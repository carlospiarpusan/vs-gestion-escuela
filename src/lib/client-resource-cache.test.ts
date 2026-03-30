// @vitest-environment jsdom

import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import {
  getClientResourceCached,
  invalidateClientResourceCache,
  readClientResourceCache,
} from "@/lib/client-resource-cache";

async function flushClientCacheWrites() {
  await new Promise((resolve) => setTimeout(resolve, 0));
}

describe("client-resource-cache", () => {
  beforeEach(() => {
    window.sessionStorage.clear();
    invalidateClientResourceCache("");
  });

  afterEach(() => {
    vi.unstubAllEnvs();
  });

  it("persiste recursos pequeños en sessionStorage por defecto", async () => {
    const value = await getClientResourceCached({
      key: "summary:test",
      ttlMs: 60_000,
      loader: async () => ({ total: 3 }),
    });

    expect(value).toEqual({ total: 3 });
    expect(readClientResourceCache<{ total: number }>("summary:test")).toEqual({ total: 3 });
    await flushClientCacheWrites();
    expect(window.sessionStorage.length).toBe(1);
  });

  it("permite cachear solo en memoria payloads pesados o efímeros", async () => {
    const value = await getClientResourceCached({
      key: "list:test",
      ttlMs: 60_000,
      policy: "list",
      loader: async () => ({ rows: [1, 2, 3] }),
    });

    expect(value).toEqual({ rows: [1, 2, 3] });
    expect(readClientResourceCache<{ rows: number[] }>("list:test")).toEqual({ rows: [1, 2, 3] });
    await flushClientCacheWrites();
    expect(window.sessionStorage.length).toBe(0);
  });

  it("persiste catalogos pequenos cuando la politica lo permite", async () => {
    const value = await getClientResourceCached({
      key: "catalog:test",
      ttlMs: 60_000,
      policy: "catalog",
      loader: async () => ({ options: ["A1", "A2"] }),
    });

    expect(value).toEqual({ options: ["A1", "A2"] });
    await flushClientCacheWrites();
    expect(window.sessionStorage.length).toBe(1);
  });

  it("mantiene los reportes pesados solo en memoria por defecto", async () => {
    const value = await getClientResourceCached({
      key: "report:test",
      ttlMs: 60_000,
      policy: "heavy-report",
      loader: async () => ({ rows: Array.from({ length: 3 }, (_, index) => index) }),
    });

    expect(value).toEqual({ rows: [0, 1, 2] });
    await flushClientCacheWrites();
    expect(window.sessionStorage.length).toBe(0);
  });

  it("no persiste entradas demasiado grandes en sessionStorage", async () => {
    const largeValue = { blob: "x".repeat(30 * 1024) };

    const value = await getClientResourceCached({
      key: "large:test",
      ttlMs: 60_000,
      loader: async () => largeValue,
    });

    expect(value).toEqual(largeValue);
    expect(readClientResourceCache<typeof largeValue>("large:test")).toEqual(largeValue);
    await flushClientCacheWrites();
    expect(window.sessionStorage.length).toBe(0);
  });

  it("en desarrollo usa solo memoria para reducir trabajo local", async () => {
    vi.stubEnv("NODE_ENV", "development");

    const value = await getClientResourceCached({
      key: "local:test",
      ttlMs: 60_000,
      loader: async () => ({ total: 1 }),
    });

    expect(value).toEqual({ total: 1 });
    expect(readClientResourceCache<{ total: number }>("local:test")).toEqual({ total: 1 });
    await flushClientCacheWrites();
    expect(window.sessionStorage.length).toBe(0);
  });
});
