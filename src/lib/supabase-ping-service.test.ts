// @vitest-environment node
import { describe, expect, it, vi } from "vitest";
import {
  executeSupabaseMaintenancePing,
  type PingDbPool,
  type PingSupabaseClient,
} from "./supabase-ping-service";

describe("executeSupabaseMaintenancePing", () => {
  it("retorna ok: true cuando tanto la base de datos como PostgREST responden correctamente", async () => {
    const mockQuery = vi.fn().mockResolvedValue({
      rows: [{ ping: 1, db_time: "2026-10-18 17:00:00+00" }],
    });
    const mockFrom = vi.fn().mockReturnValue({
      select: vi.fn().mockReturnValue({
        limit: vi.fn().mockResolvedValue({ data: [{ id: "escuela-1" }], error: null }),
      }),
    });

    const mockPool: PingDbPool = { query: mockQuery };
    const mockClient: PingSupabaseClient = { from: mockFrom };

    const report = await executeSupabaseMaintenancePing({
      getPool: () => mockPool,
      getAdminClient: () => mockClient,
    });

    expect(report.ok).toBe(true);
    expect(report.services.database.ok).toBe(true);
    expect(report.services.database.details?.serverTime).toBe("2026-10-18 17:00:00+00");
    expect(report.services.restApi.ok).toBe(true);
    expect(report.totalLatencyMs).toBeGreaterThanOrEqual(0);
    expect(mockQuery).toHaveBeenCalledWith("SELECT 1 as ping, now()::text as db_time");
    expect(mockFrom).toHaveBeenCalledWith("escuelas");
  });

  it("retorna ok: false si la consulta a la base de datos falla", async () => {
    const mockQuery = vi.fn().mockRejectedValue(new Error("Connection terminated unexpectedly"));
    const mockFrom = vi.fn().mockReturnValue({
      select: vi.fn().mockReturnValue({
        limit: vi.fn().mockResolvedValue({ data: [], error: null }),
      }),
    });

    const mockPool: PingDbPool = { query: mockQuery };
    const mockClient: PingSupabaseClient = { from: mockFrom };

    const report = await executeSupabaseMaintenancePing({
      getPool: () => mockPool,
      getAdminClient: () => mockClient,
    });

    expect(report.ok).toBe(false);
    expect(report.services.database.ok).toBe(false);
    expect(report.services.database.error).toBe("Connection terminated unexpectedly");
    expect(report.services.restApi.ok).toBe(true);
  });

  it("retorna ok: false si la API PostgREST devuelve error", async () => {
    const mockQuery = vi.fn().mockResolvedValue({
      rows: [{ ping: 1, db_time: "2026-10-18 17:00:00+00" }],
    });
    const mockFrom = vi.fn().mockReturnValue({
      select: vi.fn().mockReturnValue({
        limit: vi.fn().mockResolvedValue({
          data: null,
          error: { message: "PGRST301 JWT expired" },
        }),
      }),
    });

    const mockPool: PingDbPool = { query: mockQuery };
    const mockClient: PingSupabaseClient = { from: mockFrom };

    const report = await executeSupabaseMaintenancePing({
      getPool: () => mockPool,
      getAdminClient: () => mockClient,
    });

    expect(report.ok).toBe(false);
    expect(report.services.database.ok).toBe(true);
    expect(report.services.restApi.ok).toBe(false);
    expect(report.services.restApi.error).toBe("PGRST301 JWT expired");
  });

  it("retorna ok: false si la API PostgREST lanza una excepción no controlada", async () => {
    const mockQuery = vi.fn().mockResolvedValue({
      rows: [{ ping: 1, db_time: "2026-10-18 17:00:00+00" }],
    });
    const mockFrom = vi.fn().mockImplementation(() => {
      throw new Error("Network unreachable");
    });

    const mockPool: PingDbPool = { query: mockQuery };
    const mockClient: PingSupabaseClient = { from: mockFrom };

    const report = await executeSupabaseMaintenancePing({
      getPool: () => mockPool,
      getAdminClient: () => mockClient,
    });

    expect(report.ok).toBe(false);
    expect(report.services.database.ok).toBe(true);
    expect(report.services.restApi.ok).toBe(false);
    expect(report.services.restApi.error).toBe("Network unreachable");
  });
});
