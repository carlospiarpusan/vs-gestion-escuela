CREATE EXTENSION IF NOT EXISTS pg_trgm;

CREATE INDEX IF NOT EXISTS perfiles_escuela_rol_created_idx
  ON public.perfiles (escuela_id, rol, created_at DESC);

CREATE INDEX IF NOT EXISTS perfiles_escuela_sede_rol_created_idx
  ON public.perfiles (escuela_id, sede_id, rol, created_at DESC);

CREATE INDEX IF NOT EXISTS perfiles_nombre_trgm_idx
  ON public.perfiles USING gin (nombre gin_trgm_ops);

CREATE INDEX IF NOT EXISTS perfiles_email_trgm_idx
  ON public.perfiles USING gin (email gin_trgm_ops);

CREATE INDEX IF NOT EXISTS sedes_escuela_estado_principal_idx
  ON public.sedes (escuela_id, estado, es_principal DESC);

CREATE INDEX IF NOT EXISTS instructores_escuela_created_idx
  ON public.instructores (escuela_id, created_at DESC);

CREATE INDEX IF NOT EXISTS instructores_escuela_sede_created_idx
  ON public.instructores (escuela_id, sede_id, created_at DESC);

CREATE INDEX IF NOT EXISTS instructores_nombre_trgm_idx
  ON public.instructores USING gin (nombre gin_trgm_ops);

CREATE INDEX IF NOT EXISTS instructores_apellidos_trgm_idx
  ON public.instructores USING gin (apellidos gin_trgm_ops);

CREATE INDEX IF NOT EXISTS instructores_dni_trgm_idx
  ON public.instructores USING gin (dni gin_trgm_ops);

CREATE INDEX IF NOT EXISTS alumnos_categorias_gin_idx
  ON public.alumnos USING gin (categorias);

CREATE INDEX IF NOT EXISTS matriculas_alumno_categorias_gin_idx
  ON public.matriculas_alumno USING gin (categorias);
