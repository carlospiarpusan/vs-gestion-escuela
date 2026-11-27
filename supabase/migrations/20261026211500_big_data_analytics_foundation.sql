-- ============================================================
-- MIGRACIÓN: Cimientos de Datos para Analítica Avanzada y Big Data
-- Objetivo:
--   1. Agregar llaves de atribución directa (vehiculo_id, instructor_id,
--      alumno_id, matricula_id) en gastos y clases para Unit Economics.
--   2. Separar fecha de compromiso/vencimiento vs fecha real de cobro en
--      ingresos y registrar hitos del ciclo de vida en matriculas_alumno.
--   3. Crear bitácora inmutable de transiciones de estado
--      (public.bitacora_estados_analitica) con RLS por escuela.
--   4. Automatizar mediante triggers el enriquecimiento y registro de
--      transiciones sin romper flujos existentes.
--   5. Backfill determinístico del historial existente y vistas analíticas.
-- ============================================================

-- 1. Columnas de atribución en public.gastos
alter table public.gastos
  add column if not exists vehiculo_id uuid references public.vehiculos(id) on delete set null,
  add column if not exists instructor_id uuid references public.instructores(id) on delete set null,
  add column if not exists alumno_id uuid references public.alumnos(id) on delete set null,
  add column if not exists matricula_id uuid references public.matriculas_alumno(id) on delete set null;

create index if not exists idx_gastos_escuela_vehiculo_fecha
  on public.gastos(escuela_id, vehiculo_id, fecha desc)
  where vehiculo_id is not null;

create index if not exists idx_gastos_escuela_instructor_fecha
  on public.gastos(escuela_id, instructor_id, fecha desc)
  where instructor_id is not null;

create index if not exists idx_gastos_escuela_matricula
  on public.gastos(escuela_id, matricula_id)
  where matricula_id is not null;

-- 2. Columnas de atribución y duración en public.clases y public.horas_trabajo
alter table public.clases
  add column if not exists matricula_id uuid references public.matriculas_alumno(id) on delete set null,
  add column if not exists duracion_horas numeric(5,2);

create index if not exists idx_clases_escuela_matricula_fecha
  on public.clases(escuela_id, matricula_id, fecha desc)
  where matricula_id is not null;

alter table public.horas_trabajo
  add column if not exists vehiculo_id uuid references public.vehiculos(id) on delete set null;

-- 3. Columnas de trazabilidad de recaudo en public.ingresos
alter table public.ingresos
  add column if not exists fecha_cobro date,
  add column if not exists cobrado_at timestamptz,
  add column if not exists canal_recaudo text;

create index if not exists idx_ingresos_escuela_fecha_cobro
  on public.ingresos(escuela_id, fecha_cobro desc)
  where estado = 'cobrado';

-- 4. Columnas de ciclo de vida y atribución comercial en public.matriculas_alumno
alter table public.matriculas_alumno
  add column if not exists canal_origen text,
  add column if not exists fecha_inicio_teoria date,
  add column if not exists fecha_fin_teoria date,
  add column if not exists fecha_primera_practica date,
  add column if not exists fecha_ultima_practica date,
  add column if not exists fecha_graduacion date,
  add column if not exists fecha_cancelacion date;

create index if not exists idx_matriculas_escuela_graduacion
  on public.matriculas_alumno(escuela_id, fecha_graduacion desc)
  where fecha_graduacion is not null;

-- 5. Bitácora inmutable de transiciones de estado para Big Data (CDC ligero)
create table if not exists public.bitacora_estados_analitica (
  id uuid default gen_random_uuid() primary key,
  escuela_id uuid not null references public.escuelas(id) on delete cascade,
  sede_id uuid references public.sedes(id) on delete set null,
  entidad text not null check (entidad in ('alumno', 'matricula', 'ingreso', 'gasto')),
  entidad_id uuid not null,
  estado_anterior text,
  estado_nuevo text not null,
  monto_referencia numeric(12,2),
  actor_id uuid references public.perfiles(id) on delete set null,
  metadata jsonb not null default '{}'::jsonb,
  ocurrido_en timestamptz not null default now()
);

create index if not exists idx_bitacora_estados_escuela_fecha
  on public.bitacora_estados_analitica(escuela_id, ocurrido_en desc);

create index if not exists idx_bitacora_estados_entidad
  on public.bitacora_estados_analitica(escuela_id, entidad, entidad_id, ocurrido_en desc);

alter table public.bitacora_estados_analitica enable row level security;

drop policy if exists "Lectura de bitacora analitica por escuela" on public.bitacora_estados_analitica;
create policy "Lectura de bitacora analitica por escuela"
  on public.bitacora_estados_analitica
  for select
  to authenticated
  using (
    escuela_id in (
      select p.escuela_id from public.perfiles p
      where p.id = auth.uid()
        and p.activo = true
        and p.rol in ('super_admin', 'admin_escuela', 'admin_sede', 'administrativo')
    )
    or exists (
      select 1 from public.perfiles p
      where p.id = auth.uid() and p.activo = true and p.rol = 'super_admin'
    )
  );

-- 6. Funciones y Triggers de enriquecimiento automático

-- 6.1 Enriquecimiento de public.ingresos
create or replace function public.fn_analitica_enriquecer_ingreso()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_single_matricula uuid;
begin
  -- Si es un ingreso de categoría matricula sin matricula_id y el alumno tiene exactamente 1 matrícula no cancelada, vincularla
  if new.matricula_id is null and new.alumno_id is not null and new.categoria = 'matricula' then
    select case when count(*) = 1 then (array_agg(m.id))[1] else null end
      into v_single_matricula
      from public.matriculas_alumno m
     where m.escuela_id = new.escuela_id
       and m.alumno_id = new.alumno_id
       and m.estado <> 'cancelado';

    if v_single_matricula is not null then
      new.matricula_id := v_single_matricula;
    end if;
  end if;

  -- Preservar fecha_cobro y cobrado_at cuando el ingreso está cobrado
  if new.estado = 'cobrado' then
    if tg_op = 'INSERT' then
      new.fecha_cobro := coalesce(new.fecha_cobro, new.fecha, current_date);
      new.cobrado_at := coalesce(new.cobrado_at, new.created_at, now());
    elsif tg_op = 'UPDATE' and coalesce(old.estado, '') <> 'cobrado' then
      new.fecha_cobro := coalesce(new.fecha_cobro, current_date);
      new.cobrado_at := coalesce(new.cobrado_at, now());
    else
      new.fecha_cobro := coalesce(new.fecha_cobro, old.fecha_cobro, new.fecha);
      new.cobrado_at := coalesce(new.cobrado_at, old.cobrado_at, new.created_at, now());
    end if;
  end if;

  return new;
end;
$$;

drop trigger if exists trg_analitica_enriquecer_ingreso on public.ingresos;
create trigger trg_analitica_enriquecer_ingreso
  before insert or update on public.ingresos
  for each row execute function public.fn_analitica_enriquecer_ingreso();

-- 6.2 Enriquecimiento de public.gastos
create or replace function public.fn_analitica_enriquecer_gasto()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_alumno_id uuid;
  v_matricula_id uuid;
begin
  -- Si tiene mantenimiento_id, heredar vehiculo_id e instructor_id
  if new.mantenimiento_id is not null and (new.vehiculo_id is null or new.instructor_id is null) then
    select coalesce(new.vehiculo_id, mv.vehiculo_id),
           coalesce(new.instructor_id, mv.instructor_id)
      into new.vehiculo_id, new.instructor_id
      from public.mantenimiento_vehiculos mv
     where mv.id = new.mantenimiento_id;
  end if;

  -- Si es gasto de tramitador sin alumno_id y el concepto sigue el patrón 'Tramitador — Nombre Apellidos'
  if new.categoria = 'tramitador' and new.alumno_id is null and new.concepto like 'Tramitador — %' then
    select case when count(*) = 1 then (array_agg(a.id))[1] else null end
      into v_alumno_id
      from public.alumnos a
     where a.escuela_id = new.escuela_id
       and new.concepto = 'Tramitador — ' || trim(a.nombre || ' ' || a.apellidos);

    if v_alumno_id is not null then
      new.alumno_id := v_alumno_id;
      if new.matricula_id is null then
        select case when count(*) = 1 then (array_agg(m.id))[1] else null end
          into v_matricula_id
          from public.matriculas_alumno m
         where m.escuela_id = new.escuela_id
           and m.alumno_id = v_alumno_id
           and m.estado <> 'cancelado';
        new.matricula_id := v_matricula_id;
      end if;
    end if;
  end if;

  return new;
end;
$$;

drop trigger if exists trg_analitica_enriquecer_gasto on public.gastos;
create trigger trg_analitica_enriquecer_gasto
  before insert or update on public.gastos
  for each row execute function public.fn_analitica_enriquecer_gasto();

-- 6.3 Enriquecimiento de public.clases y sincronización con matriculas_alumno
create or replace function public.fn_analitica_enriquecer_clase()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_single_matricula uuid;
  v_hours numeric(5,2);
begin
  if new.duracion_horas is null and new.hora_inicio is not null and new.hora_fin is not null then
    v_hours := round((extract(epoch from (new.hora_fin - new.hora_inicio)) / 3600.0)::numeric, 2);
    if v_hours > 0 then
      new.duracion_horas := v_hours;
    end if;
  end if;

  if new.matricula_id is null and new.alumno_id is not null then
    select case when count(*) = 1 then (array_agg(m.id))[1] else null end
      into v_single_matricula
      from public.matriculas_alumno m
     where m.escuela_id = new.escuela_id
       and m.alumno_id = new.alumno_id
       and m.estado <> 'cancelado';
    new.matricula_id := v_single_matricula;
  end if;

  return new;
end;
$$;

drop trigger if exists trg_analitica_enriquecer_clase on public.clases;
create trigger trg_analitica_enriquecer_clase
  before insert or update on public.clases
  for each row execute function public.fn_analitica_enriquecer_clase();

create or replace function public.fn_analitica_sync_fechas_practica()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if new.matricula_id is not null and new.tipo = 'practica' and new.estado <> 'cancelada' then
    update public.matriculas_alumno m
       set fecha_primera_practica = least(coalesce(m.fecha_primera_practica, new.fecha), new.fecha),
           fecha_ultima_practica = greatest(coalesce(m.fecha_ultima_practica, new.fecha), new.fecha)
     where m.id = new.matricula_id;
  end if;
  return new;
end;
$$;

drop trigger if exists trg_analitica_sync_fechas_practica on public.clases;
create trigger trg_analitica_sync_fechas_practica
  after insert or update on public.clases
  for each row execute function public.fn_analitica_sync_fechas_practica();

-- 6.4 Enriquecimiento de hitos en public.matriculas_alumno
create or replace function public.fn_analitica_enriquecer_matricula()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if new.estado in ('graduado', 'certificado', 'finalizado') and new.fecha_graduacion is null then
    new.fecha_graduacion := current_date;
  elsif new.estado = 'cancelado' and new.fecha_cancelacion is null then
    new.fecha_cancelacion := current_date;
  end if;
  return new;
end;
$$;

drop trigger if exists trg_analitica_enriquecer_matricula on public.matriculas_alumno;
create trigger trg_analitica_enriquecer_matricula
  before insert or update on public.matriculas_alumno
  for each row execute function public.fn_analitica_enriquecer_matricula();

-- 6.5 Bitácora automática de transiciones de estado
create or replace function public.fn_analitica_registrar_transicion_estado()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_entidad text := tg_argv[0];
  v_estado_old text;
  v_estado_new text;
  v_monto numeric(12,2);
  v_actor uuid;
begin
  if v_entidad = 'gasto' then
    v_estado_old := case when tg_op = 'UPDATE' then old.estado_pago else null end;
    v_estado_new := new.estado_pago;
    v_monto := new.monto;
    v_actor := coalesce(new.updated_by, new.user_id, auth.uid());
  elsif v_entidad = 'ingreso' then
    v_estado_old := case when tg_op = 'UPDATE' then old.estado else null end;
    v_estado_new := new.estado;
    v_monto := new.monto;
    v_actor := coalesce(new.updated_by, new.user_id, auth.uid());
  elsif v_entidad = 'matricula' then
    v_estado_old := case when tg_op = 'UPDATE' then old.estado else null end;
    v_estado_new := new.estado;
    v_monto := new.valor_total;
    v_actor := coalesce(new.updated_by, new.created_by, auth.uid());
  else
    v_estado_old := case when tg_op = 'UPDATE' then old.estado else null end;
    v_estado_new := new.estado;
    v_monto := new.valor_total;
    v_actor := coalesce(new.updated_by, new.user_id, auth.uid());
  end if;

  if tg_op = 'INSERT' or v_estado_old is distinct from v_estado_new then
    insert into public.bitacora_estados_analitica (
      escuela_id, sede_id, entidad, entidad_id, estado_anterior, estado_nuevo, monto_referencia, actor_id
    ) values (
      new.escuela_id, new.sede_id, v_entidad, new.id, v_estado_old, coalesce(v_estado_new, 'sin_estado'), v_monto, v_actor
    );
  end if;

  return new;
end;
$$;

drop trigger if exists trg_bitacora_estado_matricula on public.matriculas_alumno;
create trigger trg_bitacora_estado_matricula
  after insert or update of estado on public.matriculas_alumno
  for each row execute function public.fn_analitica_registrar_transicion_estado('matricula');

drop trigger if exists trg_bitacora_estado_ingreso on public.ingresos;
create trigger trg_bitacora_estado_ingreso
  after insert or update of estado on public.ingresos
  for each row execute function public.fn_analitica_registrar_transicion_estado('ingreso');

drop trigger if exists trg_bitacora_estado_gasto on public.gastos;
create trigger trg_bitacora_estado_gasto
  after insert or update of estado_pago on public.gastos
  for each row execute function public.fn_analitica_registrar_transicion_estado('gasto');

-- 7. Backfill Histórico Determinístico
-- 7.1 Backfill fecha_cobro en ingresos cobrados
update public.ingresos
   set fecha_cobro = fecha,
       cobrado_at = coalesce(created_at, now())
 where estado = 'cobrado'
   and fecha_cobro is null;

-- 7.2 Backfill instructor_id en gastos desde cierres_horas_instructores
update public.gastos g
   set instructor_id = c.instructor_id
  from public.cierres_horas_instructores c
 where c.gasto_id = g.id
   and g.instructor_id is null;

-- 7.3 Backfill vehiculo_id e instructor_id en gastos desde mantenimiento_vehiculos
update public.gastos g
   set vehiculo_id = coalesce(g.vehiculo_id, mv.vehiculo_id),
       instructor_id = coalesce(g.instructor_id, mv.instructor_id)
  from public.mantenimiento_vehiculos mv
 where g.mantenimiento_id = mv.id
   and (g.vehiculo_id is null or g.instructor_id is null);

-- 7.4 Backfill vehiculo_id en gastos cuando el concepto o notas mencionan exactamente una placa de la misma escuela
with matches as (
  select g.id as gasto_id,
         (array_agg(v.id))[1] as vehiculo_id,
         count(*) as cnt
    from public.gastos g
    join public.vehiculos v
      on v.escuela_id = g.escuela_id
     and length(trim(v.matricula)) >= 5
     and (g.concepto ilike '%' || trim(v.matricula) || '%' or coalesce(g.notas, '') ilike '%' || trim(v.matricula) || '%')
   where g.vehiculo_id is null
   group by g.id
)
update public.gastos g
   set vehiculo_id = m.vehiculo_id
  from matches m
 where g.id = m.gasto_id
   and m.cnt = 1;

-- 7.5 Backfill alumno_id y matricula_id en gastos de tramitador con coincidencia única
with matched_alumnos as (
  select g.id as gasto_id,
         (array_agg(a.id))[1] as alumno_id,
         count(*) as cnt
    from public.gastos g
    join public.alumnos a
      on a.escuela_id = g.escuela_id
     and g.concepto = 'Tramitador — ' || trim(a.nombre || ' ' || a.apellidos)
   where g.categoria = 'tramitador'
     and g.alumno_id is null
   group by g.id
),
matched_matriculas as (
  select ma.gasto_id,
         ma.alumno_id,
         (select case when count(*) = 1 then (array_agg(m.id))[1] else null end
            from public.matriculas_alumno m
           where m.alumno_id = ma.alumno_id
             and m.estado <> 'cancelado') as matricula_id
    from matched_alumnos ma
   where ma.cnt = 1
)
update public.gastos g
   set alumno_id = mm.alumno_id,
       matricula_id = coalesce(g.matricula_id, mm.matricula_id)
  from matched_matriculas mm
 where g.id = mm.gasto_id;

-- 7.6 Corregir tipo_registro a 'practica_adicional' en alumnos sin contrato cuyo único historial son clases sueltas
update public.alumnos a
   set tipo_registro = 'practica_adicional'
 where a.tipo_registro = 'regular'
   and coalesce(cardinality(a.categorias), 0) = 0
   and a.numero_contrato is null
   and not exists (select 1 from public.matriculas_alumno m where m.alumno_id = a.id)
   and exists (select 1 from public.ingresos i where i.alumno_id = a.id and i.categoria = 'clase_suelta')
   and not exists (select 1 from public.ingresos i where i.alumno_id = a.id and i.categoria <> 'clase_suelta');

-- 7.7 Sincronizar valor_total en matrículas únicas activas donde quedó NULL pero el alumno tiene valor_total > 0
update public.matriculas_alumno m
   set valor_total = a.valor_total
  from public.alumnos a
 where a.id = m.alumno_id
   and m.estado <> 'cancelado'
   and (m.valor_total is null or m.valor_total <= 0)
   and a.valor_total > 0
   and (select count(*) from public.matriculas_alumno m2 where m2.alumno_id = a.id and m2.estado <> 'cancelado') = 1;

-- 8. Vistas Analíticas (Star Schema / Data Mart ligero con security_invoker = true)
create or replace view public.v_analitica_ciclo_matriculas
with (security_invoker = true) as
select
  m.id as matricula_id,
  m.escuela_id,
  m.sede_id,
  m.alumno_id,
  m.numero_contrato,
  m.categorias,
  m.estado,
  m.canal_origen,
  m.fecha_inscripcion,
  m.fecha_primera_practica,
  m.fecha_ultima_practica,
  m.fecha_graduacion,
  m.fecha_cancelacion,
  coalesce(m.valor_total, 0)::numeric(12,2) as valor_contrato,
  coalesce(ing.total_cobrado, 0)::numeric(12,2) as total_cobrado,
  greatest(coalesce(m.valor_total, 0) - coalesce(ing.total_cobrado, 0), 0)::numeric(12,2) as saldo_pendiente,
  coalesce(ing.cuotas_vencidas, 0)::numeric(12,2) as monto_vencido,
  ing.fecha_primer_pago,
  ing.fecha_ultimo_pago,
  coalesce(m.tramitador_valor, gas.gasto_tramitador, 0)::numeric(12,2) as costo_tramitador,
  (coalesce(ing.total_cobrado, 0) - coalesce(m.tramitador_valor, gas.gasto_tramitador, 0))::numeric(12,2) as recaudo_neto_directo,
  case
    when m.fecha_graduacion is not null and m.fecha_inscripcion is not null
      then (m.fecha_graduacion - m.fecha_inscripcion)
    else null
  end as dias_hasta_graduacion
from public.matriculas_alumno m
left join lateral (
  select
    sum(i.monto) filter (where i.estado = 'cobrado') as total_cobrado,
    sum(i.monto) filter (where i.estado = 'pendiente' and i.fecha_vencimiento < current_date) as cuotas_vencidas,
    min(coalesce(i.fecha_cobro, i.fecha)) filter (where i.estado = 'cobrado') as fecha_primer_pago,
    max(coalesce(i.fecha_cobro, i.fecha)) filter (where i.estado = 'cobrado') as fecha_ultimo_pago
  from public.ingresos i
  where i.escuela_id = m.escuela_id
    and i.matricula_id = m.id
) ing on true
left join lateral (
  select sum(g.monto) filter (where g.estado_pago = 'pagado') as gasto_tramitador
  from public.gastos g
  where g.escuela_id = m.escuela_id
    and g.matricula_id = m.id
    and g.categoria = 'tramitador'
) gas on true;

create or replace view public.v_analitica_productividad_instructores
with (security_invoker = true) as
select
  ht.escuela_id,
  coalesce(ht.sede_id, ins.sede_id) as sede_id,
  ht.instructor_id,
  trim(ins.nombre || ' ' || ins.apellidos) as instructor_nombre,
  to_char(ht.fecha, 'YYYY-MM') as periodo_mes,
  count(distinct ht.fecha)::int as dias_trabajados,
  coalesce(sum(ht.horas), 0)::numeric(10,2) as horas_registradas,
  coalesce(max(ch.total_horas), 0)::numeric(10,2) as horas_cerradas,
  coalesce(max(ch.monto_total), 0)::numeric(12,2) as monto_cierre_horas,
  coalesce(max(nom.neto_pagar), 0)::numeric(12,2) as neto_nomina
from public.horas_trabajo ht
join public.instructores ins
  on ins.id = ht.instructor_id
 and ins.escuela_id = ht.escuela_id
left join public.cierres_horas_instructores ch
  on ch.escuela_id = ht.escuela_id
 and ch.instructor_id = ht.instructor_id
 and ch.periodo_anio = extract(year from ht.fecha)::int
 and ch.periodo_mes = extract(month from ht.fecha)::int
left join public.nominas nom
  on nom.escuela_id = ht.escuela_id
 and nom.empleado_tipo = 'instructor'
 and nom.empleado_id = ht.instructor_id
 and nom.periodo_anio = extract(year from ht.fecha)::int
 and nom.periodo_mes = extract(month from ht.fecha)::int
group by
  ht.escuela_id,
  coalesce(ht.sede_id, ins.sede_id),
  ht.instructor_id,
  trim(ins.nombre || ' ' || ins.apellidos),
  to_char(ht.fecha, 'YYYY-MM');

create or replace view public.v_analitica_costos_flota
with (security_invoker = true) as
select
  v.escuela_id,
  v.sede_id,
  v.id as vehiculo_id,
  v.matricula as placa,
  trim(v.marca || ' ' || v.modelo) as vehiculo_nombre,
  v.tipo,
  v.kilometraje as kilometraje_actual,
  coalesce(g.total_combustible, 0)::numeric(12,2) as gasto_combustible,
  coalesce(g.total_mantenimiento_gasto, 0)::numeric(12,2) as gasto_mantenimiento,
  coalesce(g.total_seguros_impuestos, 0)::numeric(12,2) as gasto_seguros_impuestos,
  coalesce(mv.total_bitacora_mantenimiento, 0)::numeric(12,2) as bitacora_mantenimiento_monto,
  coalesce(mv.registros_mantenimiento, 0)::int as registros_mantenimiento
from public.vehiculos v
left join lateral (
  select
    sum(ga.monto) filter (where ga.categoria = 'combustible' and ga.estado_pago = 'pagado') as total_combustible,
    sum(ga.monto) filter (where ga.categoria in ('mantenimiento_vehiculo', 'reparaciones') and ga.estado_pago = 'pagado') as total_mantenimiento_gasto,
    sum(ga.monto) filter (where ga.categoria in ('seguros', 'impuestos') and ga.estado_pago = 'pagado') as total_seguros_impuestos
  from public.gastos ga
  where ga.escuela_id = v.escuela_id
    and ga.vehiculo_id = v.id
) g on true
left join lateral (
  select
    sum(m.monto) as total_bitacora_mantenimiento,
    count(*) as registros_mantenimiento
  from public.mantenimiento_vehiculos m
  where m.escuela_id = v.escuela_id
    and m.vehiculo_id = v.id
) mv on true;
