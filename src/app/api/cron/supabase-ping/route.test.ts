// @vitest-environment node
import { afterEach, expect, it, vi } from "vitest";
import { GET } from "./route";

const mocks = vi.hoisted(() => ({
  ping: vi.fn(),
}));

vi.mock("@/lib/supabase-ping-service", () => ({
  executeSupabaseMaintenancePing: mocks.ping,
}));

afterEach(() => {
  vi.unstubAllEnvs();
  vi.clearAllMocks();
});

const req = (authorization?: string) =>
  new Request("https://condusoft.co/api/cron/supabase-ping", {
    headers: authorization ? { authorization } : {},
  });

it("no ejecuta el cron sin secreto configurado", async () => {
  vi.stubEnv("CRON_SECRET", "");
  const response = await GET(req("Bearer anything"));
  expect(response.status).toBe(401);
  expect(mocks.ping).not.toHaveBeenCalled();
});

it("rechaza cabeceras faltantes y secretos invalidos", async () => {
  vi.stubEnv("CRON_SECRET", "super-secret-cron-token");
  for (const value of [undefined, "Bearer no", "Bearer super-secret-wrong-token"]) {
    const response = await GET(req(value));
    expect(response.status).toBe(401);
  }
  expect(mocks.ping).not.toHaveBeenCalled();
});

it("la peticion autorizada ejecuta el ping y retorna 200 con Cache-Control no-store si todo está ok", async () => {
  vi.stubEnv("CRON_SECRET", "super-secret-cron-token");
  const mockReport = {
    ok: true,
    timestamp: "2026-10-18T17:00:00.000Z",
    services: {
      database: { ok: true, latencyMs: 15, details: { serverTime: "2026-10-18 17:00:00+00" } },
      restApi: { ok: true, latencyMs: 25 },
    },
    totalLatencyMs: 40,
  };
  mocks.ping.mockResolvedValue(mockReport);

  const response = await GET(req("Bearer super-secret-cron-token"));
  expect(response.status).toBe(200);
  expect(await response.json()).toEqual(mockReport);
  expect(mocks.ping).toHaveBeenCalledTimes(1);
  expect(response.headers.get("cache-control")).toBe("no-store");
});

it("retorna 503 Service Unavailable si el reporte indica fallo en alguno de los servicios", async () => {
  vi.stubEnv("CRON_SECRET", "super-secret-cron-token");
  const degradedReport = {
    ok: false,
    timestamp: "2026-10-18T17:00:00.000Z",
    services: {
      database: { ok: false, latencyMs: 50, error: "Connection timeout" },
      restApi: { ok: true, latencyMs: 20 },
    },
    totalLatencyMs: 70,
  };
  mocks.ping.mockResolvedValue(degradedReport);

  const response = await GET(req("Bearer super-secret-cron-token"));
  expect(response.status).toBe(503);
  expect(await response.json()).toEqual(degradedReport);
});

it("captura excepciones imprevistas y responde con status 500 sin exponer detalles sensibles", async () => {
  vi.stubEnv("CRON_SECRET", "super-secret-cron-token");
  mocks.ping.mockRejectedValue(new Error("postgresql://user:secret_password@db.supabase.co"));

  const response = await GET(req("Bearer super-secret-cron-token"));
  expect(response.status).toBe(500);
  const json = await response.json();
  expect(json.error).toBe("No se pudo completar el ping de mantenimiento de Supabase.");
  expect(JSON.stringify(json)).not.toContain("secret_password");
});
