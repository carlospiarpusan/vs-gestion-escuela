-- Narrow analytics access and correct event dates without rewriting historical rows.
revoke all on public.bitacora_estados_analitica from public, anon, authenticated;
grant select on public.bitacora_estados_analitica to authenticated;

drop policy if exists "Lectura de bitacora analitica por escuela" on public.bitacora_estados_analitica;
create policy "Lectura de bitacora analitica por escuela"
  on public.bitacora_estados_analitica for select to authenticated
  using (exists (
    select 1 from public.perfiles p
    where p.id = (select auth.uid()) and p.activo = true
      and (
        p.rol = 'super_admin'
        or (p.escuela_id = bitacora_estados_analitica.escuela_id and (
          p.rol = 'admin_escuela'
          or (p.rol in ('admin_sede', 'administrativo')
            and p.sede_id is not null and p.sede_id = bitacora_estados_analitica.sede_id)
        ))
      )
  ));

create or replace function public.fn_analitica_enriquecer_clase()
returns trigger language plpgsql security definer set search_path = '' as $$
declare
  v_single_matricula uuid;
  v_hours numeric(5,2);
begin
  if new.duracion_horas is null and new.hora_inicio is not null and new.hora_fin is not null then
    v_hours := round((extract(epoch from (new.hora_fin - new.hora_inicio)) / 3600.0)::numeric, 2);
    if v_hours > 0 then new.duracion_horas := v_hours; end if;
  end if;
  if new.matricula_id is null and new.alumno_id is not null then
    select case when count(*) = 1 then (array_agg(m.id))[1] else null end
      into v_single_matricula from public.matriculas_alumno m
      where m.escuela_id = new.escuela_id and m.alumno_id = new.alumno_id
        and m.sede_id is not distinct from new.sede_id and m.estado <> 'cancelado';
    new.matricula_id := v_single_matricula;
  end if;
  if new.matricula_id is not null and not exists (
    select 1 from public.matriculas_alumno m
    where m.id = new.matricula_id and m.escuela_id = new.escuela_id
      and m.alumno_id = new.alumno_id and m.sede_id is not distinct from new.sede_id
  ) then
    raise exception 'La matricula no pertenece al alumno, escuela y sede de la clase.' using errcode = '23514';
  end if;
  return new;
end;
$$;

create or replace function public.fn_analitica_sync_fechas_practica()
returns trigger language plpgsql security definer set search_path = '' as $$
declare
  v_contract uuid;
  v_school uuid;
  v_old_contract uuid;
  v_old_school uuid;
  v_new_contract uuid;
  v_new_school uuid;
begin
  if tg_op <> 'INSERT' then
    v_old_contract := old.matricula_id;
    v_old_school := old.escuela_id;
  end if;
  if tg_op <> 'DELETE' then
    v_new_contract := new.matricula_id;
    v_new_school := new.escuela_id;
  end if;
  -- Serialize milestone recomputation; stable ordering also covers reassignment.
  perform m.id from public.matriculas_alumno m
    where (m.id = v_old_contract and m.escuela_id = v_old_school)
      or (m.id = v_new_contract and m.escuela_id = v_new_school)
    order by m.id for update;
  -- Recompute both sides on reassignment; cancellations/deletions must remove stale milestones.
  if tg_op <> 'INSERT' and old.matricula_id is not null then
    v_contract := old.matricula_id;
    v_school := old.escuela_id;
    update public.matriculas_alumno m
      set fecha_primera_practica = p.first_date, fecha_ultima_practica = p.last_date
      from (select min(c.fecha) as first_date, max(c.fecha) as last_date
        from public.clases c where c.matricula_id = v_contract and c.escuela_id = v_school
          and c.alumno_id = old.alumno_id and c.sede_id is not distinct from old.sede_id
          and c.tipo = 'practica' and c.estado = 'completada') p
      where m.id = v_contract and m.escuela_id = v_school and m.alumno_id = old.alumno_id
        and m.sede_id is not distinct from old.sede_id;
  end if;
  if tg_op <> 'DELETE' and new.matricula_id is not null and (
    tg_op = 'INSERT' or new.matricula_id is distinct from old.matricula_id
    or new.escuela_id is distinct from old.escuela_id or new.alumno_id is distinct from old.alumno_id
    or new.sede_id is distinct from old.sede_id
  ) then
    v_contract := new.matricula_id;
    v_school := new.escuela_id;
    update public.matriculas_alumno m
      set fecha_primera_practica = p.first_date, fecha_ultima_practica = p.last_date
      from (select min(c.fecha) as first_date, max(c.fecha) as last_date
        from public.clases c where c.matricula_id = v_contract and c.escuela_id = v_school
          and c.alumno_id = new.alumno_id and c.sede_id is not distinct from new.sede_id
          and c.tipo = 'practica' and c.estado = 'completada') p
      where m.id = v_contract and m.escuela_id = v_school and m.alumno_id = new.alumno_id
        and m.sede_id is not distinct from new.sede_id;
  end if;
  if tg_op = 'DELETE' then return old; end if;
  return new;
end;
$$;

drop trigger if exists trg_analitica_sync_fechas_practica on public.clases;
create trigger trg_analitica_sync_fechas_practica after insert or update or delete on public.clases
  for each row execute function public.fn_analitica_sync_fechas_practica();

create or replace function public.fn_analitica_enriquecer_matricula()
returns trigger language plpgsql security definer set search_path = '' as $$
begin
  if new.estado in ('graduado', 'certificado', 'finalizado') and new.fecha_graduacion is null then
    new.fecha_graduacion := (now() at time zone 'America/Bogota')::date;
  elsif new.estado = 'cancelado' and new.fecha_cancelacion is null then
    new.fecha_cancelacion := (now() at time zone 'America/Bogota')::date;
  end if;
  return new;
end;
$$;

create or replace function public.fn_analitica_enriquecer_ingreso()
returns trigger language plpgsql security definer set search_path = '' as $$
declare v_single_matricula uuid;
begin
  if new.matricula_id is null and new.alumno_id is not null and new.categoria = 'matricula' then
    select case when count(*) = 1 then (array_agg(m.id))[1] else null end
      into v_single_matricula from public.matriculas_alumno m
      where m.escuela_id = new.escuela_id and m.alumno_id = new.alumno_id
        and m.sede_id is not distinct from new.sede_id and m.estado <> 'cancelado';
    if v_single_matricula is not null then new.matricula_id := v_single_matricula; end if;
  end if;
  if new.estado = 'cobrado' then
    if tg_op = 'INSERT' then
      new.fecha_cobro := coalesce(new.fecha_cobro, new.fecha, (now() at time zone 'America/Bogota')::date);
      new.cobrado_at := coalesce(new.cobrado_at, new.created_at, now());
    elsif old.estado is distinct from 'cobrado' then
      new.fecha_cobro := coalesce(new.fecha_cobro, (now() at time zone 'America/Bogota')::date);
      new.cobrado_at := coalesce(new.cobrado_at, now());
    else
      new.fecha_cobro := coalesce(new.fecha_cobro, old.fecha_cobro, new.fecha);
      new.cobrado_at := coalesce(new.cobrado_at, old.cobrado_at, new.created_at, now());
    end if;
  end if;
  return new;
end;
$$;

revoke execute on function public.fn_analitica_enriquecer_clase() from public, anon, authenticated;
revoke execute on function public.fn_analitica_sync_fechas_practica() from public, anon, authenticated;
revoke execute on function public.fn_analitica_enriquecer_matricula() from public, anon, authenticated;
revoke execute on function public.fn_analitica_enriquecer_ingreso() from public, anon, authenticated;

create or replace view public.v_analitica_ciclo_matriculas
with (security_invoker = true) as
select
  m.id as matricula_id, m.escuela_id, m.sede_id, m.alumno_id, m.numero_contrato,
  m.categorias, m.estado, m.canal_origen, m.fecha_inscripcion,
  m.fecha_primera_practica, m.fecha_ultima_practica, m.fecha_graduacion, m.fecha_cancelacion,
  coalesce(m.valor_total, 0)::numeric(12,2) as valor_contrato,
  coalesce(ing.total_cobrado, 0)::numeric(12,2) as total_cobrado,
  greatest(coalesce(m.valor_total, 0) - coalesce(ing.total_cobrado, 0), 0)::numeric(12,2) as saldo_pendiente,
  least(greatest(coalesce(ing.cuotas_vencidas, 0), 0),
    greatest(coalesce(m.valor_total, 0) - coalesce(ing.total_cobrado, 0), 0))::numeric(12,2) as monto_vencido,
  ing.fecha_primer_pago, ing.fecha_ultimo_pago,
  coalesce(m.tramitador_valor, gas.gasto_tramitador, 0)::numeric(12,2) as costo_tramitador,
  (coalesce(ing.total_cobrado, 0) - coalesce(m.tramitador_valor, gas.gasto_tramitador, 0))::numeric(12,2) as recaudo_neto_directo,
  case when m.fecha_graduacion is not null and m.fecha_inscripcion is not null
    then (m.fecha_graduacion - m.fecha_inscripcion) else null end as dias_hasta_graduacion
from public.matriculas_alumno m
left join lateral (
  select
    sum(i.monto) filter (where i.estado = 'cobrado') as total_cobrado,
    sum(i.monto) filter (where i.estado = 'pendiente'
      and i.fecha_vencimiento < (now() at time zone 'America/Bogota')::date) as cuotas_vencidas,
    min(coalesce(i.fecha_cobro, i.fecha)) filter (where i.estado = 'cobrado') as fecha_primer_pago,
    max(coalesce(i.fecha_cobro, i.fecha)) filter (where i.estado = 'cobrado') as fecha_ultimo_pago
  from public.ingresos i where i.escuela_id = m.escuela_id and i.matricula_id = m.id
) ing on true
left join lateral (
  select sum(g.monto) filter (where g.estado_pago = 'pagado') as gasto_tramitador
  from public.gastos g where g.escuela_id = m.escuela_id and g.matricula_id = m.id and g.categoria = 'tramitador'
) gas on true;
