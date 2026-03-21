// @vitest-environment jsdom

import { beforeEach, describe, expect, it } from "vitest";
import {
  getClientResourceCached,
  invalidateClientResourceCache,
  readClientResourceCache,
} from "@/lib/client-resource-cache";

describe("client-resource-cache", () => {
  beforeEach(() => {
    window.sessionStorage.clear();
    invalidateClientResourceCache("");
  });

  it("persiste recursos pequeños en sessionStorage por defecto", async () => {
    const value = await getClientResourceCached({
      key: "summary:test",
      ttlMs: 60_000,
      loader: async () => ({ total: 3 }),
    });

    expect(value).toEqual({ total: 3 });
    expect(readClientResourceCache<{ total: number }>("summary:test")).toEqual({ total: 3 });
    expect(window.sessionStorage.length).toBe(1);
  });

  it("permite cachear solo en memoria payloads pesados o efímeros", async () => {
    const value = await getClientResourceCached({
      key: "list:test",
      ttlMs: 60_000,
      persistToSession: false,
      loader: async () => ({ rows: [1, 2, 3] }),
    });

    expect(value).toEqual({ rows: [1, 2, 3] });
    expect(readClientResourceCache<{ rows: number[] }>("list:test")).toEqual({ rows: [1, 2, 3] });
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
    expect(window.sessionStorage.length).toBe(0);
  });
});
