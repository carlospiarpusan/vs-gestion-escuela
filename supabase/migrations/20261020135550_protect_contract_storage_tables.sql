-- Contract configuration, templates and historical representations are served
-- only after authorization in the web API/print route. They are not a Data API.
do $$
declare
  table_name text;
begin
  foreach table_name in array array[
    'configuracion_contratos_escuela', 'plantillas_contrato_escuela',
    'contratos_emitidos_alumno', '_migraciones'
  ] loop
    if to_regclass(format('public.%I', table_name)) is not null then
      execute format('alter table public.%I enable row level security', table_name);
      execute format('revoke all on table public.%I from public, anon, authenticated', table_name);
      if table_name <> '_migraciones' then
        execute format('grant select, insert, update, delete on table public.%I to service_role', table_name);
      end if;
    end if;
  end loop;
end
$$;

notify pgrst, 'reload schema';
