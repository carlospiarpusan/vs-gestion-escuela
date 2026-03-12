ALTER TABLE public.categorias_examen
  ADD COLUMN IF NOT EXISTS fuente text;

UPDATE public.categorias_examen
SET fuente = 'manual'
WHERE fuente IS NULL;

ALTER TABLE public.categorias_examen
  ALTER COLUMN fuente SET DEFAULT 'manual',
  ALTER COLUMN fuente SET NOT NULL;

ALTER TABLE public.preguntas_examen
  ADD COLUMN IF NOT EXISTS codigo_externo text,
  ADD COLUMN IF NOT EXISTS opcion_d text,
  ADD COLUMN IF NOT EXISTS fundamento_legal text,
  ADD COLUMN IF NOT EXISTS fuente text;

UPDATE public.preguntas_examen
SET fuente = 'manual'
WHERE fuente IS NULL;

ALTER TABLE public.preguntas_examen
  ALTER COLUMN fuente SET DEFAULT 'manual',
  ALTER COLUMN fuente SET NOT NULL;

ALTER TABLE public.preguntas_examen
  DROP CONSTRAINT IF EXISTS preguntas_examen_respuesta_correcta_check;

ALTER TABLE public.preguntas_examen
  ADD CONSTRAINT preguntas_examen_respuesta_correcta_check
  CHECK (respuesta_correcta IN ('a', 'b', 'c', 'd'));

ALTER TABLE public.respuestas_examen
  DROP CONSTRAINT IF EXISTS respuestas_examen_respuesta_alumno_check;

ALTER TABLE public.respuestas_examen
  ADD CONSTRAINT respuestas_examen_respuesta_alumno_check
  CHECK (respuesta_alumno IN ('a', 'b', 'c', 'd'));

CREATE INDEX IF NOT EXISTS categorias_examen_fuente_orden_idx
  ON public.categorias_examen (fuente, orden);

CREATE INDEX IF NOT EXISTS preguntas_examen_fuente_codigo_idx
  ON public.preguntas_examen (fuente, codigo_externo);

CREATE INDEX IF NOT EXISTS preguntas_examen_fuente_activa_categoria_idx
  ON public.preguntas_examen (fuente, activa, categoria_id);
