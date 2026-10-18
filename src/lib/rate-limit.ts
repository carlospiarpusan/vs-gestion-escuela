import { getServerDbPool } from "@/lib/server-db";

type RateLimitResult = {
  ok: boolean;
  remaining: number;
};

declare global {
  var __autoescuelaRateLimitStoreReady: Promise<void> | undefined;
  var __autoescuelaRateLimitLastCleanupAt: number | undefined;
}

async function ensureRateLimitStore() {
  if (!global.__autoescuelaRateLimitStoreReady) {
    const pool = getServerDbPool();
    global.__autoescuelaRateLimitStoreReady = (async () => {
      await pool.query(`
        create table if not exists public.api_rate_limits (
          key text primary key,
          count integer not null,
          reset_at timestamptz not null
        )
      `);
      await pool.query(`
        create index if not exists api_rate_limits_reset_at_idx
          on public.api_rate_limits (reset_at)
      `);
      await pool.query("alter table public.api_rate_limits enable row level security");
      await pool.query(`
        do $$ begin
          if exists (select 1 from pg_roles where rolname = 'anon') then
            revoke all on table public.api_rate_limits from anon;
          end if;
          if exists (select 1 from pg_roles where rolname = 'authenticated') then
            revoke all on table public.api_rate_limits from authenticated;
          end if;
        end $$;
      `);
    })().catch((error) => {
      global.__autoescuelaRateLimitStoreReady = undefined;
      throw error;
    });
  }

  return global.__autoescuelaRateLimitStoreReady;
}

async function cleanupExpiredRateLimits() {
  const now = Date.now();
  const lastCleanupAt = global.__autoescuelaRateLimitLastCleanupAt ?? 0;
  if (now - lastCleanupAt < 5 * 60 * 1000) return;

  global.__autoescuelaRateLimitLastCleanupAt = now;
  const pool = getServerDbPool();
  await pool.query("delete from public.api_rate_limits where reset_at < now()");
}

async function executeRateLimitQuery(
  pool: ReturnType<typeof getServerDbPool>,
  key: string,
  intervalText: string
) {
  return pool.query<{ count: number | string | null }>(
    `
      insert into public.api_rate_limits as rl (key, count, reset_at)
      values ($1, 1, now() + $2::interval)
      on conflict (key) do update
      set
        count = case
          when rl.reset_at <= now() then 1
          else rl.count + 1
        end,
        reset_at = case
          when rl.reset_at <= now() then now() + $2::interval
          else rl.reset_at
        end
      returning count
    `,
    [key, intervalText]
  );
}

export async function rateLimit(
  key: string,
  limit: number,
  windowMs: number
): Promise<RateLimitResult> {
  await ensureRateLimitStore();
  void cleanupExpiredRateLimits().catch(() => undefined);

  const pool = getServerDbPool();
  const intervalText = `${windowMs} milliseconds`;

  let rows: { count: number | string | null }[];
  try {
    const res = await executeRateLimitQuery(pool, key, intervalText);
    rows = res.rows;
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err);
    if (
      msg.includes("api_rate_limits") &&
      (msg.includes("does not exist") || msg.includes("no existe"))
    ) {
      global.__autoescuelaRateLimitStoreReady = undefined;
      await ensureRateLimitStore();
      const res = await executeRateLimitQuery(pool, key, intervalText);
      rows = res.rows;
    } else {
      throw err;
    }
  }

  const currentCount = Number(rows[0]?.count || 0);
  return {
    ok: currentCount <= limit,
    remaining: Math.max(limit - currentCount, 0),
  };
}

export function getRateLimitKey(request: Request, scope: string, suffix?: string) {
  const forwardedFor = request.headers.get("x-forwarded-for");
  const ipFromForward = forwardedFor?.split(",")[0]?.trim();
  const ip =
    ipFromForward ||
    request.headers.get("x-real-ip") ||
    request.headers.get("cf-connecting-ip") ||
    "unknown";

  return [scope, ip, suffix].filter(Boolean).join(":");
}
