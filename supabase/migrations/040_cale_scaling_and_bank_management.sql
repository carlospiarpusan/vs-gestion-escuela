CREATE EXTENSION IF NOT EXISTS pg_trgm;

ALTER TABLE public.examenes
  ADD COLUMN IF NOT EXISTS modulo_origen text,
  ADD COLUMN IF NOT EXISTS fuente_banco text,
  ADD COLUMN IF NOT EXISTS total_preguntas integer,
  ADD COLUMN IF NOT EXISTS respuestas_correctas integer,
  ADD COLUMN IF NOT EXISTS porcentaje integer,
  ADD COLUMN IF NOT EXISTS tiempo_segundos integer;

UPDATE public.examenes
SET
  modulo_origen = COALESCE(modulo_origen, 'cale_practica'),
  fuente_banco = COALESCE(
    fuente_banco,
    NULLIF((substring(notas from char_length('CALEJSON:') + 1)::jsonb ->> 'source'), '')
  ),
  total_preguntas = COALESCE(
    total_preguntas,
    NULLIF((substring(notas from char_length('CALEJSON:') + 1)::jsonb ->> 'questionCount'), '')::integer
  ),
  respuestas_correctas = COALESCE(
    respuestas_correctas,
    NULLIF((substring(notas from char_length('CALEJSON:') + 1)::jsonb ->> 'correctCount'), '')::integer
  ),
  porcentaje = COALESCE(
    porcentaje,
    NULLIF((substring(notas from char_length('CALEJSON:') + 1)::jsonb ->> 'percentage'), '')::integer
  ),
  tiempo_segundos = COALESCE(
    tiempo_segundos,
    NULLIF((substring(notas from char_length('CALEJSON:') + 1)::jsonb ->> 'elapsedSeconds'), '')::integer
  )
WHERE notas LIKE 'CALEJSON:%';

CREATE TABLE IF NOT EXISTS public.examenes_cale_preguntas (
  id bigint generated always as identity primary key,
  escuela_id uuid references public.escuelas(id) on delete cascade not null,
  sede_id uuid references public.sedes(id) on delete cascade not null,
  alumno_id uuid references public.alumnos(id) on delete cascade not null,
  examen_id uuid references public.examenes(id) on delete cascade not null,
  pregunta_id uuid references public.preguntas_examen(id) on delete set null,
  categoria_id uuid references public.categorias_examen(id) on delete set null,
  categoria_nombre text,
  codigo_externo text,
  pregunta_texto text not null,
  orden_pregunta integer not null check (orden_pregunta > 0),
  created_at timestamptz not null default now(),
  constraint examenes_cale_preguntas_examen_orden_unique unique (examen_id, orden_pregunta)
);

ALTER TABLE public.preguntas_examen
  ADD COLUMN IF NOT EXISTS created_by uuid references public.perfiles(id) on delete set null,
  ADD COLUMN IF NOT EXISTS updated_by uuid references public.perfiles(id) on delete set null,
  ADD COLUMN IF NOT EXISTS updated_at timestamptz not null default now();

UPDATE public.preguntas_examen
SET updated_at = COALESCE(updated_at, created_at, now())
WHERE updated_at IS NULL;

DROP TRIGGER IF EXISTS set_updated_at_preguntas_examen ON public.preguntas_examen;
CREATE TRIGGER set_updated_at_preguntas_examen
  BEFORE UPDATE ON public.preguntas_examen
  FOR EACH ROW
  EXECUTE FUNCTION public.set_updated_at();

CREATE INDEX IF NOT EXISTS examenes_cale_modulo_fecha_created_idx
  ON public.examenes (modulo_origen, fecha desc, created_at desc);

CREATE INDEX IF NOT EXISTS examenes_cale_escuela_modulo_fecha_created_idx
  ON public.examenes (escuela_id, modulo_origen, fecha desc, created_at desc);

CREATE INDEX IF NOT EXISTS examenes_cale_escuela_sede_modulo_fecha_created_idx
  ON public.examenes (escuela_id, sede_id, modulo_origen, fecha desc, created_at desc);

CREATE INDEX IF NOT EXISTS examenes_cale_alumno_modulo_fecha_created_idx
  ON public.examenes (alumno_id, modulo_origen, fecha desc, created_at desc);

CREATE INDEX IF NOT EXISTS examenes_cale_escuela_resultado_fecha_created_idx
  ON public.examenes (escuela_id, resultado, fecha desc, created_at desc)
  WHERE modulo_origen = 'cale_practica';

CREATE INDEX IF NOT EXISTS respuestas_examen_examen_created_idx
  ON public.respuestas_examen (examen_id, created_at desc);

CREATE INDEX IF NOT EXISTS respuestas_examen_pregunta_created_idx
  ON public.respuestas_examen (pregunta_id, created_at desc);

CREATE INDEX IF NOT EXISTS respuestas_examen_categoria_created_idx
  ON public.respuestas_examen (categoria_nombre, created_at desc);

CREATE INDEX IF NOT EXISTS examenes_cale_preguntas_escuela_created_idx
  ON public.examenes_cale_preguntas (escuela_id, created_at desc);

CREATE INDEX IF NOT EXISTS examenes_cale_preguntas_sede_created_idx
  ON public.examenes_cale_preguntas (sede_id, created_at desc);

CREATE INDEX IF NOT EXISTS examenes_cale_preguntas_examen_orden_idx
  ON public.examenes_cale_preguntas (examen_id, orden_pregunta asc);

CREATE INDEX IF NOT EXISTS examenes_cale_preguntas_pregunta_created_idx
  ON public.examenes_cale_preguntas (pregunta_id, created_at desc);

CREATE INDEX IF NOT EXISTS examenes_cale_preguntas_categoria_created_idx
  ON public.examenes_cale_preguntas (categoria_nombre, created_at desc);

CREATE INDEX IF NOT EXISTS preguntas_examen_fuente_activa_dificultad_idx
  ON public.preguntas_examen (fuente, activa, dificultad, categoria_id);

CREATE INDEX IF NOT EXISTS preguntas_examen_codigo_externo_idx
  ON public.preguntas_examen (codigo_externo);

CREATE INDEX IF NOT EXISTS preguntas_examen_pregunta_trgm_idx
  ON public.preguntas_examen using gin (pregunta gin_trgm_ops);

CREATE INDEX IF NOT EXISTS preguntas_examen_explicacion_trgm_idx
  ON public.preguntas_examen using gin ((coalesce(explicacion, '')) gin_trgm_ops);

CREATE INDEX IF NOT EXISTS preguntas_examen_fundamento_trgm_idx
  ON public.preguntas_examen using gin ((coalesce(fundamento_legal, '')) gin_trgm_ops);

ALTER TABLE public.examenes_cale_preguntas ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Super admin: ve todas las preguntas usadas en CALE" ON public.examenes_cale_preguntas;
CREATE POLICY "Super admin: ve todas las preguntas usadas en CALE"
  ON public.examenes_cale_preguntas FOR SELECT
  USING (public.is_super_admin());

DROP POLICY IF EXISTS "Super admin: gestiona detalle de preguntas CALE" ON public.examenes_cale_preguntas;
CREATE POLICY "Super admin: gestiona detalle de preguntas CALE"
  ON public.examenes_cale_preguntas FOR ALL
  USING (public.is_super_admin());

DROP POLICY IF EXISTS "Admin escuela: ve detalle de preguntas CALE de su escuela" ON public.examenes_cale_preguntas;
CREATE POLICY "Admin escuela: ve detalle de preguntas CALE de su escuela"
  ON public.examenes_cale_preguntas FOR SELECT
  USING (escuela_id = public.get_my_escuela_id() and public.is_admin_escuela());

DROP POLICY IF EXISTS "Usuarios sede: ven detalle de preguntas CALE de su sede" ON public.examenes_cale_preguntas;
CREATE POLICY "Usuarios sede: ven detalle de preguntas CALE de su sede"
  ON public.examenes_cale_preguntas FOR SELECT
  USING (
    sede_id = public.get_my_sede_id()
    and escuela_id = public.get_my_escuela_id()
    and not public.is_alumno()
  );

DROP POLICY IF EXISTS "Alumno: ve solo detalle de sus preguntas CALE" ON public.examenes_cale_preguntas;
CREATE POLICY "Alumno: ve solo detalle de sus preguntas CALE"
  ON public.examenes_cale_preguntas FOR SELECT
  USING (public.is_alumno() and alumno_id = public.get_my_alumno_id());
