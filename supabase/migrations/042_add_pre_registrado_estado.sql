-- Allow 'pre_registrado' as a valid estado for alumnos
-- Pre-registered students reserved a spot but haven't completed enrollment yet.
-- When they activate (estado -> 'activo'), the auth user gets created automatically.

alter table public.alumnos
  drop constraint if exists alumnos_estado_check;

alter table public.alumnos
  add constraint alumnos_estado_check
  check (estado in ('activo', 'inactivo', 'graduado', 'pre_registrado'));
