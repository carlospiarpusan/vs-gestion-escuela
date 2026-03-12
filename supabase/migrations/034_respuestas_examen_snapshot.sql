-- Snapshot completo de respuestas de examen para revisión histórica

ALTER TABLE public.respuestas_examen
  ADD COLUMN IF NOT EXISTS orden_pregunta integer,
  ADD COLUMN IF NOT EXISTS respuesta_omitida boolean DEFAULT false,
  ADD COLUMN IF NOT EXISTS categoria_nombre text,
  ADD COLUMN IF NOT EXISTS pregunta_texto text,
  ADD COLUMN IF NOT EXISTS imagen_url text,
  ADD COLUMN IF NOT EXISTS opcion_a text,
  ADD COLUMN IF NOT EXISTS opcion_b text,
  ADD COLUMN IF NOT EXISTS opcion_c text,
  ADD COLUMN IF NOT EXISTS opcion_d text,
  ADD COLUMN IF NOT EXISTS respuesta_correcta text,
  ADD COLUMN IF NOT EXISTS explicacion text,
  ADD COLUMN IF NOT EXISTS fundamento_legal text;

ALTER TABLE public.respuestas_examen
  ALTER COLUMN respuesta_alumno DROP NOT NULL;

ALTER TABLE public.respuestas_examen
  ALTER COLUMN respuesta_omitida SET DEFAULT false;

UPDATE public.respuestas_examen
SET respuesta_omitida = COALESCE(respuesta_omitida, false)
WHERE respuesta_omitida IS NULL;

ALTER TABLE public.respuestas_examen
  ALTER COLUMN respuesta_omitida SET NOT NULL;

ALTER TABLE public.respuestas_examen
  DROP CONSTRAINT IF EXISTS respuestas_examen_respuesta_alumno_check;

ALTER TABLE public.respuestas_examen
  ADD CONSTRAINT respuestas_examen_respuesta_alumno_check
  CHECK (
    respuesta_alumno IS NULL
    OR respuesta_alumno IN ('a', 'b', 'c', 'd')
  );

ALTER TABLE public.respuestas_examen
  DROP CONSTRAINT IF EXISTS respuestas_examen_respuesta_correcta_check;

ALTER TABLE public.respuestas_examen
  ADD CONSTRAINT respuestas_examen_respuesta_correcta_check
  CHECK (
    respuesta_correcta IS NULL
    OR respuesta_correcta IN ('a', 'b', 'c', 'd')
  );

CREATE INDEX IF NOT EXISTS respuestas_examen_examen_idx
  ON public.respuestas_examen (examen_id, created_at);

CREATE INDEX IF NOT EXISTS respuestas_examen_examen_orden_idx
  ON public.respuestas_examen (examen_id, orden_pregunta);

UPDATE public.respuestas_examen AS re
SET
  pregunta_texto = COALESCE(re.pregunta_texto, pe.pregunta),
  imagen_url = COALESCE(re.imagen_url, pe.imagen_url),
  opcion_a = COALESCE(re.opcion_a, pe.opcion_a),
  opcion_b = COALESCE(re.opcion_b, pe.opcion_b),
  opcion_c = COALESCE(re.opcion_c, pe.opcion_c),
  opcion_d = COALESCE(re.opcion_d, pe.opcion_d),
  respuesta_correcta = COALESCE(re.respuesta_correcta, pe.respuesta_correcta),
  explicacion = COALESCE(re.explicacion, pe.explicacion),
  fundamento_legal = COALESCE(re.fundamento_legal, pe.fundamento_legal),
  categoria_nombre = COALESCE(re.categoria_nombre, ce.nombre),
  respuesta_omitida = COALESCE(re.respuesta_omitida, re.respuesta_alumno IS NULL)
FROM public.preguntas_examen AS pe
LEFT JOIN public.categorias_examen AS ce ON ce.id = pe.categoria_id
WHERE re.pregunta_id = pe.id;
