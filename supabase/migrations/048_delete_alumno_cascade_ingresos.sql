-- Al eliminar un alumno, sus ingresos y matrículas asociadas deben desaparecer.
-- Las matrículas ya caen por cascade; aquí alineamos ingresos para evitar filas huérfanas.

alter table public.ingresos
  drop constraint if exists ingresos_alumno_id_fkey,
  drop constraint if exists ingresos_matricula_id_fkey;

alter table public.ingresos
  add constraint ingresos_alumno_id_fkey
    foreign key (alumno_id) references public.alumnos(id) on delete cascade,
  add constraint ingresos_matricula_id_fkey
    foreign key (matricula_id) references public.matriculas_alumno(id) on delete cascade;
