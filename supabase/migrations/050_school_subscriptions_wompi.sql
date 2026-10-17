-- ============================================================================
-- 050 · Suscripciones de escuelas + Wompi checkout manual
-- ============================================================================

alter table public.planes_config
  add column if not exists precio_anual numeric(12,2);

update public.planes_config
set precio_anual = case id
  when 'gratuito' then 0
  when 'basico' then 890000
  when 'profesional' then 1790000
  when 'enterprise' then 3490000
  else coalesce(precio_mensual, 0) * 12
end
where precio_anual is null;

alter table public.planes_config
  alter column precio_anual set default 0,
  alter column precio_anual set not null;

create table if not exists public.school_subscription_cycles (
  id uuid primary key default gen_random_uuid(),
  school_id uuid not null references public.escuelas(id) on delete cascade,
  plan_id text not null check (plan_id in ('basico', 'profesional', 'enterprise')),
  billing_interval text not null check (billing_interval in ('trial', 'monthly', 'annual')),
  status text not null check (
    status in ('trialing', 'pending_payment', 'active', 'grace', 'read_only', 'suspended')
  ),
  started_at timestamptz not null default now(),
  current_period_start timestamptz not null,
  current_period_end timestamptz not null,
  trial_ends_at timestamptz,
  grace_ends_at timestamptz,
  scheduled_plan_id text check (
    scheduled_plan_id is null or scheduled_plan_id in ('basico', 'profesional', 'enterprise')
  ),
  scheduled_billing_interval text check (
    scheduled_billing_interval is null or scheduled_billing_interval in ('monthly', 'annual')
  ),
  scheduled_effective_at timestamptz,
  is_current boolean not null default true,
  requires_review boolean not null default false,
  metadata jsonb not null default '{}'::jsonb,
  created_by uuid references public.perfiles(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create unique index if not exists school_subscription_cycles_one_current_idx
  on public.school_subscription_cycles (school_id)
  where is_current;

create index if not exists school_subscription_cycles_status_idx
  on public.school_subscription_cycles (status, current_period_end, grace_ends_at)
  where is_current;

drop trigger if exists set_school_subscription_cycles_updated_at on public.school_subscription_cycles;
create trigger set_school_subscription_cycles_updated_at
  before update on public.school_subscription_cycles
  for each row execute function public.set_updated_at();

create table if not exists public.school_payment_attempts (
  id uuid primary key default gen_random_uuid(),
  school_id uuid not null references public.escuelas(id) on delete cascade,
  subscription_cycle_id uuid references public.school_subscription_cycles(id) on delete set null,
  operation_type text not null check (
    operation_type in ('activation', 'renewal', 'change_immediate')
  ),
  target_plan_id text not null check (target_plan_id in ('basico', 'profesional', 'enterprise')),
  target_billing_interval text not null check (target_billing_interval in ('monthly', 'annual')),
  amount_in_cents bigint not null check (amount_in_cents >= 0),
  currency text not null default 'COP' check (currency = 'COP'),
  reference text not null unique,
  status text not null check (
    status in ('pending', 'approved', 'declined', 'voided', 'error', 'cancelled', 'expired')
  ),
  redirect_url text,
  expires_at timestamptz,
  initiated_by uuid references public.perfiles(id) on delete set null,
  customer_email text,
  customer_name text,
  customer_phone text,
  customer_legal_id text,
  wompi_transaction_id text,
  wompi_status text,
  wompi_payload jsonb not null default '{}'::jsonb,
  failure_reason text,
  processed_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create unique index if not exists school_payment_attempts_wompi_transaction_idx
  on public.school_payment_attempts (wompi_transaction_id)
  where wompi_transaction_id is not null;

create index if not exists school_payment_attempts_school_status_idx
  on public.school_payment_attempts (school_id, status, created_at desc);

drop trigger if exists set_school_payment_attempts_updated_at on public.school_payment_attempts;
create trigger set_school_payment_attempts_updated_at
  before update on public.school_payment_attempts
  for each row execute function public.set_updated_at();

create table if not exists public.school_subscription_events (
  id uuid primary key default gen_random_uuid(),
  school_id uuid not null references public.escuelas(id) on delete cascade,
  subscription_cycle_id uuid references public.school_subscription_cycles(id) on delete set null,
  payment_attempt_id uuid references public.school_payment_attempts(id) on delete set null,
  event_type text not null,
  summary text not null,
  payload jsonb not null default '{}'::jsonb,
  created_by uuid references public.perfiles(id) on delete set null,
  created_at timestamptz not null default now()
);

create index if not exists school_subscription_events_school_created_idx
  on public.school_subscription_events (school_id, created_at desc);

alter table public.school_subscription_cycles enable row level security;
alter table public.school_payment_attempts enable row level security;
alter table public.school_subscription_events enable row level security;

drop policy if exists "Super admin: ve todos los ciclos de suscripcion" on public.school_subscription_cycles;
create policy "Super admin: ve todos los ciclos de suscripcion"
  on public.school_subscription_cycles for select
  using (public.is_super_admin());

drop policy if exists "Usuarios escuela: ven sus ciclos de suscripcion" on public.school_subscription_cycles;
create policy "Usuarios escuela: ven sus ciclos de suscripcion"
  on public.school_subscription_cycles for select
  using (school_id = public.get_my_escuela_id());

drop policy if exists "Super admin: ve todos los intentos de pago" on public.school_payment_attempts;
create policy "Super admin: ve todos los intentos de pago"
  on public.school_payment_attempts for select
  using (public.is_super_admin());

drop policy if exists "Usuarios escuela: ven sus intentos de pago" on public.school_payment_attempts;
create policy "Usuarios escuela: ven sus intentos de pago"
  on public.school_payment_attempts for select
  using (school_id = public.get_my_escuela_id());

drop policy if exists "Super admin: ve todos los eventos de suscripcion" on public.school_subscription_events;
create policy "Super admin: ve todos los eventos de suscripcion"
  on public.school_subscription_events for select
  using (public.is_super_admin());

drop policy if exists "Usuarios escuela: ven sus eventos de suscripcion" on public.school_subscription_events;
create policy "Usuarios escuela: ven sus eventos de suscripcion"
  on public.school_subscription_events for select
  using (school_id = public.get_my_escuela_id());

create or replace function public.school_subscription_access(p_school_id uuid)
returns table (
  school_id uuid,
  cycle_id uuid,
  plan_id text,
  billing_interval text,
  status text,
  actual_status text,
  can_write boolean,
  current_period_start timestamptz,
  current_period_end timestamptz,
  trial_ends_at timestamptz,
  grace_ends_at timestamptz,
  scheduled_plan_id text,
  scheduled_billing_interval text,
  scheduled_effective_at timestamptz,
  requires_review boolean,
  pending_payment_reference text,
  pending_payment_created_at timestamptz
)
language sql
security definer
set search_path = public
stable
as $$
  with school_row as (
    select
      e.id,
      e.plan,
      coalesce(e.fecha_alta::timestamptz, e.created_at) as school_started_at
    from public.escuelas e
    where e.id = p_school_id
    limit 1
  ),
  current_cycle as (
    select *
    from public.school_subscription_cycles
    where school_id = p_school_id
      and is_current = true
    order by created_at desc
    limit 1
  ),
  pending_attempt as (
    select reference, created_at
    from public.school_payment_attempts
    where school_id = p_school_id
      and status = 'pending'
    order by created_at desc
    limit 1
  )
  select
    s.id as school_id,
    c.id as cycle_id,
    coalesce(c.plan_id, case when s.plan = 'gratuito' then 'profesional' else s.plan end) as plan_id,
    coalesce(c.billing_interval, case when s.plan = 'gratuito' then 'trial' else 'monthly' end) as billing_interval,
    case
      when c.id is not null and c.status in ('read_only', 'suspended') and p.reference is not null
        then 'pending_payment'
      when c.id is not null then c.status
      when s.plan = 'gratuito' and s.school_started_at + interval '3 months' > now()
        then 'trialing'
      when s.plan = 'gratuito'
        then 'read_only'
      else 'active'
    end as status,
    coalesce(
      c.status,
      case
        when s.plan = 'gratuito' and s.school_started_at + interval '3 months' > now() then 'trialing'
        when s.plan = 'gratuito' then 'read_only'
        else 'active'
      end
    ) as actual_status,
    coalesce(c.status in ('trialing', 'active', 'grace'), s.plan <> 'gratuito') as can_write,
    coalesce(c.current_period_start, s.school_started_at) as current_period_start,
    coalesce(
      c.current_period_end,
      case
        when s.plan = 'gratuito' then s.school_started_at + interval '3 months'
        else s.school_started_at + interval '1 month'
      end
    ) as current_period_end,
    coalesce(c.trial_ends_at, case when s.plan = 'gratuito' then s.school_started_at + interval '3 months' end) as trial_ends_at,
    c.grace_ends_at,
    c.scheduled_plan_id,
    c.scheduled_billing_interval,
    c.scheduled_effective_at,
    coalesce(c.requires_review, false) as requires_review,
    p.reference as pending_payment_reference,
    p.created_at as pending_payment_created_at
  from school_row s
  left join current_cycle c on true
  left join pending_attempt p on true;
$$;

create or replace function public.school_subscription_can_write(p_school_id uuid)
returns boolean
language sql
security definer
set search_path = public
stable
as $$
  select coalesce(
    (select access.can_write from public.school_subscription_access(p_school_id) access),
    true
  );
$$;

create or replace function public.my_school_subscription_access()
returns jsonb
language plpgsql
security definer
set search_path = public
stable
as $$
declare
  actor public.perfiles;
  payload jsonb;
begin
  select *
  into actor
  from public.perfiles
  where id = auth.uid()
  limit 1;

  if actor.id is null or actor.escuela_id is null then
    return null;
  end if;

  select to_jsonb(access_row)
  into payload
  from public.school_subscription_access(actor.escuela_id) access_row;

  return payload;
end;
$$;

create or replace function public.enforce_school_subscription_write_access()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  target_school_id uuid;
begin
  target_school_id := case
    when tg_op = 'DELETE' then old.escuela_id
    else new.escuela_id
  end;

  if target_school_id is null then
    return coalesce(new, old);
  end if;

  if public.school_subscription_can_write(target_school_id) then
    return coalesce(new, old);
  end if;

  raise exception 'La escuela se encuentra en modo solo lectura o suspendida.';
end;
$$;

drop trigger if exists enforce_school_subscription_write_alumnos on public.alumnos;
create trigger enforce_school_subscription_write_alumnos
  before insert or update or delete on public.alumnos
  for each row execute function public.enforce_school_subscription_write_access();

drop trigger if exists enforce_school_subscription_write_matriculas on public.matriculas_alumno;
create trigger enforce_school_subscription_write_matriculas
  before insert or update or delete on public.matriculas_alumno
  for each row execute function public.enforce_school_subscription_write_access();

drop trigger if exists enforce_school_subscription_write_instructores on public.instructores;
create trigger enforce_school_subscription_write_instructores
  before insert or update or delete on public.instructores
  for each row execute function public.enforce_school_subscription_write_access();

drop trigger if exists enforce_school_subscription_write_vehiculos on public.vehiculos;
create trigger enforce_school_subscription_write_vehiculos
  before insert or update or delete on public.vehiculos
  for each row execute function public.enforce_school_subscription_write_access();

drop trigger if exists enforce_school_subscription_write_clases on public.clases;
create trigger enforce_school_subscription_write_clases
  before insert or update or delete on public.clases
  for each row execute function public.enforce_school_subscription_write_access();

drop trigger if exists enforce_school_subscription_write_examenes on public.examenes;
create trigger enforce_school_subscription_write_examenes
  before insert or update or delete on public.examenes
  for each row execute function public.enforce_school_subscription_write_access();

drop trigger if exists enforce_school_subscription_write_respuestas on public.respuestas_examen;
create trigger enforce_school_subscription_write_respuestas
  before insert or update or delete on public.respuestas_examen
  for each row execute function public.enforce_school_subscription_write_access();

drop trigger if exists enforce_school_subscription_write_examenes_cale_preguntas on public.examenes_cale_preguntas;
create trigger enforce_school_subscription_write_examenes_cale_preguntas
  before insert or update or delete on public.examenes_cale_preguntas
  for each row execute function public.enforce_school_subscription_write_access();

drop trigger if exists enforce_school_subscription_write_ingresos on public.ingresos;
create trigger enforce_school_subscription_write_ingresos
  before insert or update or delete on public.ingresos
  for each row execute function public.enforce_school_subscription_write_access();

drop trigger if exists enforce_school_subscription_write_gastos on public.gastos;
create trigger enforce_school_subscription_write_gastos
  before insert or update or delete on public.gastos
  for each row execute function public.enforce_school_subscription_write_access();

drop trigger if exists enforce_school_subscription_write_facturas_integraciones on public.facturas_correo_integraciones;
create trigger enforce_school_subscription_write_facturas_integraciones
  before insert or update or delete on public.facturas_correo_integraciones
  for each row execute function public.enforce_school_subscription_write_access();

drop trigger if exists enforce_school_subscription_write_facturas_importaciones on public.facturas_correo_importaciones;
create trigger enforce_school_subscription_write_facturas_importaciones
  before insert or update or delete on public.facturas_correo_importaciones
  for each row execute function public.enforce_school_subscription_write_access();

drop trigger if exists enforce_school_subscription_write_mantenimiento on public.mantenimiento_vehiculos;
create trigger enforce_school_subscription_write_mantenimiento
  before insert or update or delete on public.mantenimiento_vehiculos
  for each row execute function public.enforce_school_subscription_write_access();

with inserted_trials as (
  insert into public.school_subscription_cycles (
    school_id,
    plan_id,
    billing_interval,
    status,
    started_at,
    current_period_start,
    current_period_end,
    trial_ends_at,
    is_current,
    requires_review,
    metadata
  )
  select
    e.id,
    'profesional',
    'trial',
    case
      when coalesce(e.fecha_alta::timestamptz, e.created_at) + interval '3 months' > now()
        then 'trialing'
      else 'read_only'
    end,
    coalesce(e.fecha_alta::timestamptz, e.created_at),
    coalesce(e.fecha_alta::timestamptz, e.created_at),
    coalesce(e.fecha_alta::timestamptz, e.created_at) + interval '3 months',
    coalesce(e.fecha_alta::timestamptz, e.created_at) + interval '3 months',
    true,
    false,
    jsonb_build_object('source', 'migration_050', 'legacy_plan', e.plan)
  from public.escuelas e
  where e.plan = 'gratuito'
    and not exists (
      select 1
      from public.school_subscription_cycles c
      where c.school_id = e.id
        and c.is_current = true
    )
  returning id, school_id, status, current_period_end
),
inserted_paid as (
  insert into public.school_subscription_cycles (
    school_id,
    plan_id,
    billing_interval,
    status,
    started_at,
    current_period_start,
    current_period_end,
    is_current,
    requires_review,
    metadata
  )
  select
    e.id,
    e.plan,
    'monthly',
    'active',
    coalesce(e.fecha_alta::timestamptz, e.created_at),
    coalesce(e.fecha_alta::timestamptz, e.created_at),
    coalesce(e.fecha_alta::timestamptz, e.created_at) + interval '1 month',
    true,
    true,
    jsonb_build_object('source', 'migration_050', 'legacy_plan', e.plan)
  from public.escuelas e
  where e.plan in ('basico', 'profesional', 'enterprise')
    and not exists (
      select 1
      from public.school_subscription_cycles c
      where c.school_id = e.id
        and c.is_current = true
    )
  returning id, school_id, status, current_period_end
)
insert into public.school_subscription_events (
  school_id,
  subscription_cycle_id,
  event_type,
  summary,
  payload
)
select
  school_id,
  id,
  'migration',
  'Escuela migrada al nuevo modelo comercial.',
  jsonb_build_object('status', status, 'current_period_end', current_period_end)
from inserted_trials
union all
select
  school_id,
  id,
  'migration',
  'Escuela pagada migrada al nuevo modelo comercial y marcada para revisión.',
  jsonb_build_object('status', status, 'current_period_end', current_period_end, 'requires_review', true)
from inserted_paid;
