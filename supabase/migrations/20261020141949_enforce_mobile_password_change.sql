-- Keep the RPC signature and caller's identity, checking current Auth data instead of stale JWT metadata.
create or replace function public.mobile_current_profile()
returns public.perfiles language plpgsql security definer set search_path = '' as $$
declare actor public.perfiles; actor_id uuid := auth.uid();
begin
  if actor_id is null then raise exception 'No autorizado.'; end if;
  select * into actor from public.perfiles where id = actor_id limit 1;
  if actor.id is null or coalesce(actor.activo, false) = false then
    raise exception 'No autorizado.';
  end if;
  if exists(select 1 from auth.users where id = actor_id and raw_app_meta_data->'debe_cambiar_password' = 'true'::jsonb) then
    raise exception 'Cambia tu contraseña en ConduSoft web antes de continuar.';
  end if;
  return actor;
end $$;
revoke all on function public.mobile_current_profile() from public, anon;
grant execute on function public.mobile_current_profile() to authenticated;
