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
    vi.restoreAllMocks();
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

  it("no vuelve a guardar una respuesta vieja que termina despues de invalidar", async () => {
    let finishOld!: (value: string) => void;
    const old = getClientResourceCached({
      key: "race:success",
      ttlMs: 60_000,
      loader: () =>
        new Promise<string>((resolve) => {
          finishOld = resolve;
        }),
    });
    invalidateClientResourceCache("race:");
    await getClientResourceCached({
      key: "race:success",
      ttlMs: 60_000,
      loader: async () => "nuevo",
    });
    finishOld("viejo");
    await old;
    expect(readClientResourceCache("race:success")).toBe("nuevo");
    await flushClientCacheWrites();
    expect(
      JSON.parse(window.sessionStorage.getItem("autoescuela:resource-cache:race:success")!).value
    ).toBe("nuevo");
  });

  it("un error antiguo no elimina la solicitud nueva que sigue en curso", async () => {
    let failOld!: (reason: Error) => void;
    let finishNew!: (value: string) => void;
    const old = getClientResourceCached({
      key: "race:failure",
      ttlMs: 60_000,
      loader: () =>
        new Promise<string>((_, reject) => {
          failOld = reject;
        }),
    });
    const rejected = expect(old).rejects.toThrow("consulta antigua");
    invalidateClientResourceCache("race:");
    const current = getClientResourceCached({
      key: "race:failure",
      ttlMs: 60_000,
      loader: () =>
        new Promise<string>((resolve) => {
          finishNew = resolve;
        }),
    });
    failOld(new Error("consulta antigua"));
    await rejected;
    const redundant = vi.fn(async () => "duplicado");
    const next = getClientResourceCached({ key: "race:failure", ttlMs: 60_000, loader: redundant });
    finishNew("nuevo");
    expect(await current).toBe("nuevo");
    expect(await next).toBe("nuevo");
    expect(redundant).not.toHaveBeenCalled();
  });

  it("funciona en memoria cuando el navegador bloquea el acceso a sessionStorage", async () => {
    const storage = vi.spyOn(window, "sessionStorage", "get").mockImplementation(() => {
      throw new DOMException("Storage blocked", "SecurityError");
    });
    try {
      await expect(
        getClientResourceCached({
          key: "blocked:storage",
          ttlMs: 60_000,
          loader: async () => "datos",
        })
      ).resolves.toBe("datos");
      expect(readClientResourceCache("blocked:storage")).toBe("datos");
      expect(() => invalidateClientResourceCache("blocked:")).not.toThrow();
      expect(readClientResourceCache("blocked:storage")).toBeNull();
    } finally {
      storage.mockRestore();
    }
  });

  it("cancela escrituras pendientes al invalidar incluso con almacenamiento bloqueado", async () => {
    await getClientResourceCached({
      key: "blocked:pending",
      ttlMs: 60_000,
      loader: async () => "viejo",
    });
    const storage = vi.spyOn(window, "sessionStorage", "get").mockImplementation(() => {
      throw new DOMException("Storage blocked", "SecurityError");
    });
    try {
      invalidateClientResourceCache("blocked:");
    } finally {
      storage.mockRestore();
    }
    await flushClientCacheWrites();
    expect(window.sessionStorage.getItem("autoescuela:resource-cache:blocked:pending")).toBeNull();
  });

  it("un refresco forzado inicia una lectura nueva aunque haya una consulta anterior pendiente", async () => {
    let finishOld!: (value: string) => void;
    const old = getClientResourceCached({
      key: "forced:test",
      ttlMs: 60_000,
      loader: () =>
        new Promise<string>((resolve) => {
          finishOld = resolve;
        }),
    });
    const freshLoader = vi.fn(async () => "nuevo");
    const fresh = getClientResourceCached({
      key: "forced:test",
      ttlMs: 60_000,
      forceFresh: true,
      loader: freshLoader,
    });
    finishOld("viejo");
    expect(await fresh).toBe("nuevo");
    await old;
    expect(freshLoader).toHaveBeenCalledTimes(1);
    expect(readClientResourceCache("forced:test")).toBe("nuevo");
  });

  it("comparte un refresco forzado en curso sin duplicar la solicitud", async () => {
    let finish!: (value: string) => void;
    const first = getClientResourceCached({
      key: "forced:shared",
      ttlMs: 60_000,
      forceFresh: true,
      loader: () =>
        new Promise<string>((resolve) => {
          finish = resolve;
        }),
    });
    const duplicate = vi.fn(async () => "duplicado");
    const second = getClientResourceCached({
      key: "forced:shared",
      ttlMs: 60_000,
      forceFresh: true,
      loader: duplicate,
    });
    finish("nuevo");
    expect(await first).toBe("nuevo");
    expect(await second).toBe("nuevo");
    expect(duplicate).not.toHaveBeenCalled();
  });
});
