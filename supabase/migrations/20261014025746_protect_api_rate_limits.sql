-- Rate-limit counters are server-only; public clients must not read or reset them.
alter table public.api_rate_limits enable row level security;
revoke all on table public.api_rate_limits from anon, authenticated;
