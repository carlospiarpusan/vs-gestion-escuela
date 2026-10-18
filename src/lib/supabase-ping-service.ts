import { getServerDbPool } from "@/lib/server-db";
import { buildSupabaseAdminClient } from "@/lib/api-auth";

export interface SupabaseServicePingStatus {
  ok: boolean;
  latencyMs: number;
  error?: string;
  details?: Record<string, unknown>;
}

export interface SupabaseMaintenancePingReport {
  ok: boolean;
  timestamp: string;
  services: {
    database: SupabaseServicePingStatus;
    restApi: SupabaseServicePingStatus;
  };
  totalLatencyMs: number;
}

export type PingDbPool = {
  query: <T = Record<string, unknown>>(
    queryText: string,
    values?: unknown[]
  ) => Promise<{ rows: T[] }>;
};

export type PingSupabaseClient = {
  from: (table: string) => {
    select: (columns: string) => {
      limit: (count: number) => Promise<{
        data: unknown[] | null;
        error: { message: string } | null;
      }>;
    };
  };
};

export interface SupabasePingDependencies {
  getPool?: () => PingDbPool;
  getAdminClient?: () => PingSupabaseClient;
}

export async function executeSupabaseMaintenancePing(
  deps: SupabasePingDependencies = {}
): Promise<SupabaseMaintenancePingReport> {
  const getPool = (deps.getPool ?? getServerDbPool) as () => PingDbPool;
  const getAdminClient = (deps.getAdminClient ??
    buildSupabaseAdminClient) as () => PingSupabaseClient;

  const startTotal = Date.now();
  const timestamp = new Date().toISOString();

  // 1. Direct PostgreSQL / Pooler Ping
  let dbStatus: SupabaseServicePingStatus;
  const startDb = Date.now();
  try {
    const pool = getPool();
    const result = await pool.query<{ ping: number; db_time: string }>(
      "SELECT 1 as ping, now()::text as db_time"
    );
    const latencyMs = Math.max(0, Date.now() - startDb);
    const row = result?.rows?.[0];
    dbStatus = {
      ok: row?.ping === 1,
      latencyMs,
      details: {
        serverTime: row?.db_time,
      },
    };
  } catch (err) {
    const latencyMs = Math.max(0, Date.now() - startDb);
    dbStatus = {
      ok: false,
      latencyMs,
      error: err instanceof Error ? err.message : "Error de conexión a PostgreSQL",
    };
  }

  // 2. Supabase PostgREST Gateway Ping
  let restStatus: SupabaseServicePingStatus;
  const startRest = Date.now();
  try {
    const supabase = getAdminClient();
    const { error } = await supabase.from("escuelas").select("id").limit(1);
    const latencyMs = Math.max(0, Date.now() - startRest);
    if (error) {
      restStatus = {
        ok: false,
        latencyMs,
        error: error.message,
      };
    } else {
      restStatus = {
        ok: true,
        latencyMs,
      };
    }
  } catch (err) {
    const latencyMs = Math.max(0, Date.now() - startRest);
    restStatus = {
      ok: false,
      latencyMs,
      error: err instanceof Error ? err.message : "Error al conectar con PostgREST",
    };
  }

  const totalLatencyMs = Math.max(0, Date.now() - startTotal);
  const overallOk = dbStatus.ok && restStatus.ok;

  return {
    ok: overallOk,
    timestamp,
    services: {
      database: dbStatus,
      restApi: restStatus,
    },
    totalLatencyMs,
  };
}
