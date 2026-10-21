create or replace function public.protect_student_preregistration()
returns trigger language plpgsql security invoker set search_path = '' as $$
begin
  if old.estado = 'pre_registrado' and new.estado in ('activo', 'graduado') and
    not exists(select 1 from public.matriculas_alumno where alumno_id = new.id) then
    raise exception 'Completa la matrícula desde Alumnos antes de activar el curso.';
  end if;
  return new;
end $$;
revoke all on function public.protect_student_preregistration() from public, anon, authenticated;
drop trigger if exists protect_student_preregistration on public.alumnos;
create trigger protect_student_preregistration before update on public.alumnos
for each row execute function public.protect_student_preregistration();
