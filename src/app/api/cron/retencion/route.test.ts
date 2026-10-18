// @vitest-environment node
import { afterEach, expect, it, vi } from "vitest";
import { GET } from "./route";
const mocks = vi.hoisted(() => ({ run: vi.fn() }));
vi.mock("@/lib/data-retention-service", () => ({ runRetentionReview: mocks.run }));
afterEach(() => {
  vi.unstubAllEnvs();
  vi.clearAllMocks();
});
const req = (authorization?: string) =>
  new Request("https://condusoft.co/api/cron/retencion", {
    headers: authorization ? { authorization } : {},
  });
it("no ejecuta el cron sin secreto configurado", async () => {
  vi.stubEnv("CRON_SECRET", "");
  expect((await GET(req("Bearer anything"))).status).toBe(401);
  expect(mocks.run).not.toHaveBeenCalled();
});
it("rechaza cabeceras faltantes y secretos invalidos", async () => {
  vi.stubEnv("CRON_SECRET", "test-only-secret");
  for (const value of [undefined, "Bearer no", "Bearer wrong-only-key"])
    expect((await GET(req(value))).status).toBe(401);
  expect(mocks.run).not.toHaveBeenCalled();
});
it("la peticion autorizada llama al servicio real de revision una sola vez", async () => {
  vi.stubEnv("CRON_SECRET", "test-only-secret");
  mocks.run.mockResolvedValue({ skipped: false, due: 1, deleted: 0 });
  const response = await GET(req("Bearer test-only-secret"));
  expect(response.status).toBe(200);
  expect(await response.json()).toMatchObject({ due: 1, deleted: 0 });
  expect(mocks.run).toHaveBeenCalledTimes(1);
  expect(response.headers.get("cache-control")).toBe("no-store");
});
it("un fallo no se presenta como ejecucion exitosa ni filtra detalles", async () => {
  vi.stubEnv("CRON_SECRET", "test-only-secret");
  mocks.run.mockRejectedValue(new Error("private table"));
  const response = await GET(req("Bearer test-only-secret"));
  expect(response.status).toBe(500);
  expect(JSON.stringify(await response.json())).not.toContain("private");
});
