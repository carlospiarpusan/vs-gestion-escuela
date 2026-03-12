ALTER TABLE public.alumnos
  DROP CONSTRAINT IF EXISTS alumnos_tipo_registro_check;

ALTER TABLE public.alumnos
  ADD CONSTRAINT alumnos_tipo_registro_check
  CHECK (tipo_registro IN ('regular', 'aptitud_conductor', 'practica_adicional'));
