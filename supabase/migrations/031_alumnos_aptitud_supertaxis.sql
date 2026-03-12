-- Soporta registros de aptitud para conductores corporativos como Supertaxis

ALTER TABLE public.alumnos
  ADD COLUMN IF NOT EXISTS tipo_registro text NOT NULL DEFAULT 'regular',
  ADD COLUMN IF NOT EXISTS empresa_convenio text,
  ADD COLUMN IF NOT EXISTS nota_examen_teorico numeric(5,2),
  ADD COLUMN IF NOT EXISTS fecha_examen_teorico date,
  ADD COLUMN IF NOT EXISTS nota_examen_practico numeric(5,2),
  ADD COLUMN IF NOT EXISTS fecha_examen_practico date;

UPDATE public.alumnos
SET tipo_registro = 'regular'
WHERE tipo_registro IS NULL;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'alumnos_tipo_registro_check'
      AND conrelid = 'public.alumnos'::regclass
  ) THEN
    ALTER TABLE public.alumnos
      ADD CONSTRAINT alumnos_tipo_registro_check
      CHECK (tipo_registro IN ('regular', 'aptitud_conductor'));
  END IF;
END
$$;

CREATE INDEX IF NOT EXISTS alumnos_tipo_registro_idx
  ON public.alumnos (escuela_id, tipo_registro);

CREATE INDEX IF NOT EXISTS alumnos_empresa_convenio_idx
  ON public.alumnos (escuela_id, empresa_convenio);

ALTER TABLE public.ingresos
  DROP CONSTRAINT IF EXISTS ingresos_categoria_check;

ALTER TABLE public.ingresos
  ADD CONSTRAINT ingresos_categoria_check
  CHECK (categoria IN (
    'matricula',
    'mensualidad',
    'clase_suelta',
    'examen_teorico',
    'examen_practico',
    'examen_aptitud',
    'material',
    'tasas_dgt',
    'otros'
  ));
