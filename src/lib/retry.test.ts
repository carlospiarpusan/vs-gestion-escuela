// @vitest-environment node
import { afterEach, expect, it, vi } from "vitest";
import { fetchJsonWithRetry, runSupabaseMutationWithRetry } from "./retry";
afterEach(() => vi.unstubAllGlobals());

it("reintenta las lecturas cuando hay un fallo temporal", async () => {
  const fetch = vi
    .fn()
    .mockResolvedValueOnce(Response.json({ error: "Temporal" }, { status: 503 }))
    .mockResolvedValue(Response.json({ rows: [1] }));
  vi.stubGlobal("fetch", fetch);
  expect(await fetchJsonWithRetry("https://example.com", undefined, { baseDelayMs: 0 })).toEqual({
    rows: [1],
  });
  expect(fetch).toHaveBeenCalledTimes(2);
});

it.each(["POST", "PUT", "PATCH", "DELETE"])(
  "no repite %s después de una respuesta perdida",
  async (method) => {
    const fetch = vi.fn().mockRejectedValue(new TypeError("Failed to fetch"));
    vi.stubGlobal("fetch", fetch);
    await expect(
      fetchJsonWithRetry("https://example.com", { method }, { baseDelayMs: 0 })
    ).rejects.toThrow();
    expect(fetch).toHaveBeenCalledTimes(1);
  }
);

it("respeta el método de Request sin init", async () => {
  const fetch = vi.fn().mockResolvedValue(Response.json({ error: "Temporal" }, { status: 503 }));
  vi.stubGlobal("fetch", fetch);
  await expect(
    fetchJsonWithRetry(new Request("https://example.com", { method: "POST" }), undefined, {
      baseDelayMs: 0,
    })
  ).rejects.toThrow();
  expect(fetch).toHaveBeenCalledTimes(1);
});

it("no devuelve un éxito vacío para HTML o JSON malformado", async () => {
  vi.stubGlobal("fetch", vi.fn().mockResolvedValue(new Response("<html>Error</html>")));
  await expect(
    fetchJsonWithRetry("https://example.com", undefined, { attempts: 1 })
  ).rejects.toThrow("JSON válido");
});

it("acepta una respuesta 204 sin intentar leer JSON", async () => {
  vi.stubGlobal("fetch", vi.fn().mockResolvedValue(new Response(null, { status: 204 })));
  expect(await fetchJsonWithRetry("https://example.com")).toBeNull();
});

it("no reintenta escrituras Supabase por defecto", async () => {
  const operation = vi.fn().mockResolvedValue({ error: { message: "connection timed out" } });
  await expect(runSupabaseMutationWithRetry(operation, { baseDelayMs: 0 })).rejects.toThrow();
  expect(operation).toHaveBeenCalledTimes(1);
});

it("mantiene la posibilidad explícita de reintentar operaciones idempotentes", async () => {
  const operation = vi
    .fn()
    .mockResolvedValueOnce({ error: { message: "connection timed out" } })
    .mockResolvedValue({ error: null });
  await expect(
    runSupabaseMutationWithRetry(operation, { attempts: 2, baseDelayMs: 0 })
  ).resolves.toEqual({ error: null });
  expect(operation).toHaveBeenCalledTimes(2);
});
