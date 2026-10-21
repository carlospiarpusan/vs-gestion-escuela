-- Internal trigger entry points do not need to be callable through the Data API.
do $$
declare fn record;
begin
  for fn in select p.oid::regprocedure signature from pg_proc p
    join pg_namespace n on n.oid=p.pronamespace
    where n.nspname='public' and p.prorettype='pg_catalog.trigger'::regtype
      and not exists(select 1 from pg_depend d where d.objid=p.oid and d.deptype='e')
  loop
    execute format('revoke all on function %s from public, anon, authenticated',fn.signature);
  end loop;
  -- These authenticated helpers resolve only the caller's own identity/scope.
  for fn in select p.oid::regprocedure signature from pg_proc p join pg_namespace n on n.oid=p.pronamespace
    where n.nspname='public' and p.proname=any(array[
      'get_my_alumno_id','get_my_escuela_id','get_my_instructor_id','get_my_sede_id',
      'is_admin_escuela','is_alumno','is_instructor','is_super_admin','my_school_subscription_access'])
  loop
    execute format('revoke all on function %s from public, anon',fn.signature);
    execute format('grant execute on function %s to authenticated, service_role',fn.signature);
  end loop;
  -- Arbitrary-school billing lookups are internal; clients use my_school_subscription_access().
  for fn in select p.oid::regprocedure signature from pg_proc p join pg_namespace n on n.oid=p.pronamespace
    where n.nspname='public' and p.proname=any(array['school_subscription_access','school_subscription_can_write'])
  loop
    execute format('revoke all on function %s from public, anon, authenticated',fn.signature);
    execute format('grant execute on function %s to service_role',fn.signature);
  end loop;
  for fn in select p.oid::regprocedure signature from pg_proc p join pg_namespace n on n.oid=p.pronamespace
    where n.nspname='public' and p.proname=any(array['set_updated_at','update_nomina_updated_at','map_gasto_categoria_from_mantenimiento'])
  loop
    execute format('alter function %s set search_path = %L',fn.signature,'');
  end loop;
end $$;
notify pgrst, 'reload schema';
