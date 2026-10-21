create table if not exists public.web_payment_operations (
  id uuid primary key,
  actor_id uuid not null references public.perfiles(id) on delete cascade,
  escuela_id uuid not null references public.escuelas(id) on delete cascade,
  request_hash text not null,
  ingreso_id uuid references public.ingresos(id) on delete set null,
  created_at timestamptz not null default now()
);
alter table public.web_payment_operations enable row level security;
revoke all on public.web_payment_operations from public, anon, authenticated;
grant select, insert on public.web_payment_operations to service_role;
notify pgrst, 'reload schema';
