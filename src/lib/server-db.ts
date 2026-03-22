import { Pool } from "pg";

declare global {
  var __autoescuelaServerDbPool: Pool | undefined;
}

export function getServerDbPool() {
  const databaseUrl = process.env.DATABASE_URL;

  if (!databaseUrl) {
    throw new Error("DATABASE_URL no está configurada.");
  }

  if (!global.__autoescuelaServerDbPool) {
    const hostname = (() => {
      try {
        return new URL(databaseUrl).hostname;
      } catch {
        return "";
      }
    })();

    const isSupabasePooler = hostname.includes("pooler.supabase.com");

    global.__autoescuelaServerDbPool = new Pool({
      connectionString: databaseUrl,
      // Las pantallas financieras lanzan ~10 queries en paralelo.
      // 6 mantiene el costo bajo sin generar colas excesivas.
      max: isSupabasePooler ? 6 : 8,
      idleTimeoutMillis: 5_000,
      connectionTimeoutMillis: 15_000,
      maxUses: 50,
      allowExitOnIdle: true,
    });
  }

  return global.__autoescuelaServerDbPool;
}
