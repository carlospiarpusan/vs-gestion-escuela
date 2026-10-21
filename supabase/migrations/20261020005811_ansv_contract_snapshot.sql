-- Nullable for existing students/contracts: no inferred sex or historical backfill.
alter table public.alumnos add column if not exists sexo text
  constraint alumnos_sexo_check check (sexo in ('M', 'F'));
alter table public.matriculas_alumno add column if not exists ansv jsonb
  constraint matriculas_ansv_object_check check (ansv is null or jsonb_typeof(ansv) = 'object');
comment on column public.matriculas_alumno.ansv is
  'ANSV snapshot at enrollment: birth date, sex, age, chosen category, annual UVB, coefficient and COP amount. Not the course price or proof of transfer.';
