-- Catálogo de tramitadores por escuela.
-- 1. Un solo registro por nombre (sin distinguir mayúsculas, tildes ni espacios).
-- 2. Tipo de tramitador: comisión fija por alumno o descuento en el valor del curso.
-- 3. Rol de acceso `tramitador` que solo consulta sus alumnos a través de la API.
--    El perfil del tramitador NO lleva escuela ni sede, para que ninguna política RLS
--    basada en get_my_escuela_id()/get_my_sede_id() le dé acceso a datos de la escuela.

CREATE OR REPLACE FUNCTION public.normalize_tramitador_nombre(value text)
RETURNS text
LANGUAGE sql
IMMUTABLE
PARALLEL SAFE
SET search_path = pg_catalog
AS $$
  SELECT NULLIF(
    regexp_replace(
      lower(translate(btrim(coalesce(value, '')), 'ÁÀÄÂÉÈËÊÍÌÏÎÓÒÖÔÚÙÜÛÑáàäâéèëêíìïîóòöôúùüûñ', 'AAAAEEEEIIIIOOOOUUUUNaaaaeeeeiiiioooouuuun')),
      '\s+', ' ', 'g'
    ),
    ''
  );
$$;

CREATE TABLE IF NOT EXISTS public.tramitadores (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  escuela_id uuid NOT NULL REFERENCES public.escuelas(id) ON DELETE CASCADE,
  nombre text NOT NULL CHECK (length(btrim(nombre)) BETWEEN 2 AND 120),
  nombre_normalizado text GENERATED ALWAYS AS (public.normalize_tramitador_nombre(nombre)) STORED,
  tipo text NOT NULL DEFAULT 'comision' CHECK (tipo IN ('comision', 'descuento')),
  comision_valor numeric(14, 2) CHECK (comision_valor IS NULL OR comision_valor >= 0),
  documento text,
  telefono text,
  notas text,
  activo boolean NOT NULL DEFAULT true,
  perfil_id uuid UNIQUE REFERENCES public.perfiles(id) ON DELETE SET NULL,
  created_by uuid REFERENCES public.perfiles(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT tramitadores_nombre_unico UNIQUE (escuela_id, nombre_normalizado)
);

CREATE INDEX IF NOT EXISTS tramitadores_escuela_idx ON public.tramitadores (escuela_id, activo);

-- Solo el servidor (conexión directa) lee o escribe el catálogo.
ALTER TABLE public.tramitadores ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON TABLE public.tramitadores FROM PUBLIC, anon, authenticated;

DROP TRIGGER IF EXISTS set_updated_at ON public.tramitadores;
CREATE TRIGGER set_updated_at
  BEFORE UPDATE ON public.tramitadores
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

ALTER TABLE public.matriculas_alumno
  ADD COLUMN IF NOT EXISTS tramitador_id uuid REFERENCES public.tramitadores(id) ON DELETE RESTRICT;

CREATE INDEX IF NOT EXISTS matriculas_alumno_tramitador_idx
  ON public.matriculas_alumno (tramitador_id)
  WHERE tramitador_id IS NOT NULL;

-- Rol nuevo.
ALTER TABLE public.perfiles DROP CONSTRAINT IF EXISTS perfiles_rol_check;
ALTER TABLE public.perfiles DROP CONSTRAINT IF EXISTS perfiles_jerarquia;
ALTER TABLE public.perfiles ADD CONSTRAINT perfiles_rol_check
  CHECK (rol IN (
    'super_admin', 'admin_escuela', 'admin_sede',
    'administrativo', 'instructor', 'recepcion', 'alumno', 'tramitador'
  ));
-- El tramitador nunca pertenece a una escuela o sede en su perfil.
ALTER TABLE public.perfiles DROP CONSTRAINT IF EXISTS perfiles_tramitador_sin_escuela;
ALTER TABLE public.perfiles ADD CONSTRAINT perfiles_tramitador_sin_escuela
  CHECK (rol <> 'tramitador' OR (escuela_id IS NULL AND sede_id IS NULL));

-- ── Unificación de nombres existentes ─────────────────────────────────────
-- Se elige como nombre visible la variante más usada; si está toda en minúsculas
-- se capitaliza ("iles" → "Iles").
WITH fuentes AS (
  SELECT escuela_id, tramitador_nombre AS nombre, tramitador_valor AS valor
  FROM public.matriculas_alumno
  WHERE tramitador_nombre IS NOT NULL
  UNION ALL
  SELECT escuela_id, tramitador_nombre, NULL
  FROM public.alumnos
  WHERE tramitador_nombre IS NOT NULL AND position(',' IN tramitador_nombre) = 0
  UNION ALL
  SELECT escuela_id, proveedor, NULL
  FROM public.gastos
  WHERE categoria = 'tramitador' AND proveedor IS NOT NULL
),
variantes AS (
  SELECT
    escuela_id,
    public.normalize_tramitador_nombre(nombre) AS clave,
    regexp_replace(btrim(nombre), '\s+', ' ', 'g') AS nombre,
    count(*) AS usos
  FROM fuentes
  WHERE public.normalize_tramitador_nombre(nombre) IS NOT NULL
  GROUP BY 1, 2, 3
),
elegidos AS (
  SELECT DISTINCT ON (escuela_id, clave)
    escuela_id,
    clave,
    CASE WHEN nombre = lower(nombre) OR nombre = upper(nombre) THEN initcap(nombre) ELSE nombre END AS nombre
  FROM variantes
  ORDER BY escuela_id, clave, usos DESC, (nombre = initcap(nombre)) DESC, nombre
),
comisiones AS (
  SELECT
    escuela_id,
    public.normalize_tramitador_nombre(nombre) AS clave,
    mode() WITHIN GROUP (ORDER BY valor) FILTER (WHERE valor > 0) AS comision
  FROM fuentes
  GROUP BY 1, 2
)
INSERT INTO public.tramitadores (escuela_id, nombre, tipo, comision_valor)
SELECT e.escuela_id, e.nombre, 'comision', c.comision
FROM elegidos e
LEFT JOIN comisiones c ON c.escuela_id = e.escuela_id AND c.clave = e.clave
ON CONFLICT (escuela_id, nombre_normalizado) DO NOTHING;

UPDATE public.matriculas_alumno m
SET tramitador_id = t.id,
    tramitador_nombre = t.nombre
FROM public.tramitadores t
WHERE m.tramitador_nombre IS NOT NULL
  AND t.escuela_id = m.escuela_id
  AND t.nombre_normalizado = public.normalize_tramitador_nombre(m.tramitador_nombre)
  AND (m.tramitador_id IS DISTINCT FROM t.id OR m.tramitador_nombre IS DISTINCT FROM t.nombre);

UPDATE public.alumnos a
SET tramitador_nombre = t.nombre
FROM public.tramitadores t
WHERE a.tramitador_nombre IS NOT NULL
  AND t.escuela_id = a.escuela_id
  AND t.nombre_normalizado = public.normalize_tramitador_nombre(a.tramitador_nombre)
  AND a.tramitador_nombre IS DISTINCT FROM t.nombre;

UPDATE public.gastos g
SET proveedor = t.nombre
FROM public.tramitadores t
WHERE g.categoria = 'tramitador'
  AND g.proveedor IS NOT NULL
  AND t.escuela_id = g.escuela_id
  AND t.nombre_normalizado = public.normalize_tramitador_nombre(g.proveedor)
  AND g.proveedor IS DISTINCT FROM t.nombre;

-- ── Garantía permanente: toda matrícula con tramitador queda en el catálogo ──
CREATE OR REPLACE FUNCTION public.link_matricula_tramitador()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  catalogo public.tramitadores%ROWTYPE;
BEGIN
  IF NOT COALESCE(NEW.tiene_tramitador, false) THEN
    NEW.tramitador_id := NULL;
    NEW.tramitador_nombre := NULL;
    RETURN NEW;
  END IF;

  IF NEW.tramitador_id IS NOT NULL THEN
    SELECT * INTO catalogo FROM public.tramitadores WHERE id = NEW.tramitador_id;
    IF NOT FOUND OR catalogo.escuela_id <> NEW.escuela_id THEN
      RAISE EXCEPTION 'El tramitador no pertenece a la escuela de la matrícula.';
    END IF;
  ELSIF public.normalize_tramitador_nombre(NEW.tramitador_nombre) IS NOT NULL THEN
    SELECT * INTO catalogo
    FROM public.tramitadores
    WHERE escuela_id = NEW.escuela_id
      AND nombre_normalizado = public.normalize_tramitador_nombre(NEW.tramitador_nombre);

    IF NOT FOUND THEN
      INSERT INTO public.tramitadores (escuela_id, nombre)
      VALUES (NEW.escuela_id, regexp_replace(btrim(NEW.tramitador_nombre), '\s+', ' ', 'g'))
      ON CONFLICT (escuela_id, nombre_normalizado) DO NOTHING;

      SELECT * INTO catalogo
      FROM public.tramitadores
      WHERE escuela_id = NEW.escuela_id
        AND nombre_normalizado = public.normalize_tramitador_nombre(NEW.tramitador_nombre);
    END IF;
  ELSE
    RETURN NEW;
  END IF;

  NEW.tramitador_id := catalogo.id;
  NEW.tramitador_nombre := catalogo.nombre;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS link_matricula_tramitador_trigger ON public.matriculas_alumno;
CREATE TRIGGER link_matricula_tramitador_trigger
  BEFORE INSERT OR UPDATE OF tiene_tramitador, tramitador_nombre, tramitador_id, escuela_id
  ON public.matriculas_alumno
  FOR EACH ROW EXECUTE FUNCTION public.link_matricula_tramitador();

-- Los gastos de tramitador usan siempre el nombre del catálogo.
CREATE OR REPLACE FUNCTION public.canonicalize_gasto_tramitador()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  canonical text;
BEGIN
  IF NEW.categoria = 'tramitador' AND NEW.proveedor IS NOT NULL THEN
    SELECT nombre INTO canonical
    FROM public.tramitadores
    WHERE escuela_id = NEW.escuela_id
      AND nombre_normalizado = public.normalize_tramitador_nombre(NEW.proveedor);
    IF canonical IS NOT NULL THEN
      NEW.proveedor := canonical;
    END IF;
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS canonicalize_gasto_tramitador_trigger ON public.gastos;
CREATE TRIGGER canonicalize_gasto_tramitador_trigger
  BEFORE INSERT OR UPDATE OF proveedor, categoria
  ON public.gastos
  FOR EACH ROW EXECUTE FUNCTION public.canonicalize_gasto_tramitador();

REVOKE EXECUTE ON FUNCTION public.link_matricula_tramitador() FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.canonicalize_gasto_tramitador() FROM PUBLIC, anon, authenticated;
