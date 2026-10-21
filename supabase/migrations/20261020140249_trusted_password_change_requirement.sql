-- Authorization belongs to app_metadata. Keep a mirror for already deployed clients.
update auth.users
set raw_app_meta_data = coalesce(raw_app_meta_data, '{}'::jsonb) ||
  jsonb_build_object('debe_cambiar_password', coalesce(raw_user_meta_data->'debe_cambiar_password' = 'true'::jsonb, false))
where not coalesce(raw_app_meta_data, '{}'::jsonb) ? 'debe_cambiar_password';

create or replace function public.protect_password_change_requirement()
returns trigger language plpgsql security invoker set search_path = '' as $$
declare required boolean;
begin
  if tg_op = 'INSERT' then
    required := coalesce(new.raw_app_meta_data->'debe_cambiar_password' = 'true'::jsonb, false)
      or coalesce(new.raw_user_meta_data->'debe_cambiar_password' = 'true'::jsonb, false);
  elsif new.raw_app_meta_data->'debe_cambiar_password' is distinct from old.raw_app_meta_data->'debe_cambiar_password' then
    -- Only the Auth admin API may change app_metadata.
    required := coalesce(new.raw_app_meta_data->'debe_cambiar_password' = 'true'::jsonb, false);
  elsif new.encrypted_password is distinct from old.encrypted_password and coalesce(new.encrypted_password, '') <> '' then
    -- A new temporary password may also impose the requirement; an actual user change clears it.
    required := coalesce(new.raw_user_meta_data->'debe_cambiar_password' = 'true'::jsonb, false)
      and not coalesce(old.raw_user_meta_data->'debe_cambiar_password' = 'true'::jsonb, false);
  else
    required := coalesce(old.raw_app_meta_data->'debe_cambiar_password' = 'true'::jsonb, false)
      or coalesce(new.raw_user_meta_data->'debe_cambiar_password' = 'true'::jsonb, false);
  end if;
  new.raw_app_meta_data := coalesce(new.raw_app_meta_data, '{}'::jsonb) || jsonb_build_object('debe_cambiar_password', required);
  new.raw_user_meta_data := coalesce(new.raw_user_meta_data, '{}'::jsonb) || jsonb_build_object('debe_cambiar_password', required);
  return new;
end $$;
revoke all on function public.protect_password_change_requirement() from public, anon, authenticated;
drop trigger if exists protect_password_change_requirement on auth.users;
create trigger protect_password_change_requirement before insert or update on auth.users
for each row execute function public.protect_password_change_requirement();
