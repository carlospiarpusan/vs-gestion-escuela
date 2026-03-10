-- Migración 020: separar contratos/matrículas de la ficha personal del alumno

CREATE TABLE IF NOT EXISTS public.matriculas_alumno (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  escuela_id uuid REFERENCES public.escuelas(id) ON DELETE CASCADE NOT NULL,
  sede_id uuid REFERENCES public.sedes(id) ON DELETE CASCADE NOT NULL,
  alumno_id uuid REFERENCES public.alumnos(id) ON DELETE CASCADE NOT NULL,
  created_by uuid REFERENCES public.perfiles(id) ON DELETE SET NULL,
  numero_contrato text,
  categorias text[] NOT NULL DEFAULT '{}',
  valor_total numeric,
  fecha_inscripcion date DEFAULT current_date,
  estado text NOT NULL DEFAULT 'activo' CHECK (estado IN ('activo', 'cerrado', 'cancelado')),
  notas text,
  tiene_tramitador boolean DEFAULT false,
  tramitador_nombre text,
  tramitador_valor numeric,
  created_at timestamp with time zone DEFAULT now(),
  CONSTRAINT matriculas_alumno_contrato_unique UNIQUE (escuela_id, numero_contrato)
);

ALTER TABLE public.ingresos
ADD COLUMN IF NOT EXISTS matricula_id uuid REFERENCES public.matriculas_alumno(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS matriculas_alumno_escuela_idx ON public.matriculas_alumno (escuela_id);
CREATE INDEX IF NOT EXISTS matriculas_alumno_sede_idx ON public.matriculas_alumno (sede_id);
CREATE INDEX IF NOT EXISTS matriculas_alumno_alumno_idx ON public.matriculas_alumno (alumno_id);
CREATE INDEX IF NOT EXISTS ingresos_matricula_id_idx ON public.ingresos (matricula_id);

CREATE OR REPLACE FUNCTION public.sync_alumno_from_matriculas()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  target_alumno_id uuid := COALESCE(NEW.alumno_id, OLD.alumno_id);
BEGIN
  UPDATE public.alumnos
  SET
    categorias = (
      SELECT array_agg(DISTINCT categoria ORDER BY categoria)
      FROM public.matriculas_alumno m
      CROSS JOIN LATERAL unnest(COALESCE(m.categorias, ARRAY[]::text[])) AS categoria
      WHERE m.alumno_id = target_alumno_id
    ),
    valor_total = (
      SELECT CASE
        WHEN COUNT(*) = 0 THEN NULL
        ELSE COALESCE(SUM(COALESCE(m.valor_total, 0)), 0)
      END
      FROM public.matriculas_alumno m
      WHERE m.alumno_id = target_alumno_id
        AND m.estado <> 'cancelado'
    ),
    numero_contrato = (
      SELECT m.numero_contrato
      FROM public.matriculas_alumno m
      WHERE m.alumno_id = target_alumno_id
        AND m.numero_contrato IS NOT NULL
      ORDER BY COALESCE(m.fecha_inscripcion, DATE '0001-01-01') DESC, m.created_at DESC
      LIMIT 1
    ),
    fecha_inscripcion = (
      SELECT m.fecha_inscripcion
      FROM public.matriculas_alumno m
      WHERE m.alumno_id = target_alumno_id
      ORDER BY COALESCE(m.fecha_inscripcion, DATE '0001-01-01') DESC, m.created_at DESC
      LIMIT 1
    ),
    tiene_tramitador = EXISTS (
      SELECT 1
      FROM public.matriculas_alumno m
      WHERE m.alumno_id = target_alumno_id
        AND m.tiene_tramitador = true
    ),
    tramitador_nombre = (
      SELECT string_agg(DISTINCT m.tramitador_nombre, ', ' ORDER BY m.tramitador_nombre)
      FROM public.matriculas_alumno m
      WHERE m.alumno_id = target_alumno_id
        AND m.tiene_tramitador = true
        AND m.tramitador_nombre IS NOT NULL
    ),
    tramitador_valor = (
      SELECT CASE
        WHEN COUNT(*) = 0 THEN NULL
        ELSE COALESCE(SUM(COALESCE(m.tramitador_valor, 0)), 0)
      END
      FROM public.matriculas_alumno m
      WHERE m.alumno_id = target_alumno_id
        AND m.tiene_tramitador = true
    )
  WHERE id = target_alumno_id;

  RETURN NULL;
END;
$$;

DROP TRIGGER IF EXISTS sync_alumno_from_matriculas_trigger ON public.matriculas_alumno;
CREATE TRIGGER sync_alumno_from_matriculas_trigger
  AFTER INSERT OR UPDATE OR DELETE ON public.matriculas_alumno
  FOR EACH ROW
  EXECUTE FUNCTION public.sync_alumno_from_matriculas();

ALTER TABLE public.matriculas_alumno ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Super admin: ve todas las matriculas alumno" ON public.matriculas_alumno;
CREATE POLICY "Super admin: ve todas las matriculas alumno"
  ON public.matriculas_alumno FOR SELECT USING (public.is_super_admin());

DROP POLICY IF EXISTS "Super admin: gestiona matriculas alumno" ON public.matriculas_alumno;
CREATE POLICY "Super admin: gestiona matriculas alumno"
  ON public.matriculas_alumno FOR ALL USING (public.is_super_admin());

DROP POLICY IF EXISTS "Admin escuela: ve matriculas de toda su escuela" ON public.matriculas_alumno;
CREATE POLICY "Admin escuela: ve matriculas de toda su escuela"
  ON public.matriculas_alumno FOR SELECT USING (
    escuela_id = public.get_my_escuela_id() AND public.is_admin_escuela()
  );

DROP POLICY IF EXISTS "Admin escuela: gestiona matriculas de su escuela" ON public.matriculas_alumno;
CREATE POLICY "Admin escuela: gestiona matriculas de su escuela"
  ON public.matriculas_alumno FOR ALL USING (
    escuela_id = public.get_my_escuela_id() AND public.is_admin_escuela()
  );

DROP POLICY IF EXISTS "Usuarios sede: ven matriculas de su sede" ON public.matriculas_alumno;
CREATE POLICY "Usuarios sede: ven matriculas de su sede"
  ON public.matriculas_alumno FOR SELECT USING (
    sede_id = public.get_my_sede_id()
    AND escuela_id = public.get_my_escuela_id()
    AND NOT public.is_alumno()
    AND NOT public.is_instructor()
  );

DROP POLICY IF EXISTS "Usuarios sede: crean matriculas en su sede" ON public.matriculas_alumno;
CREATE POLICY "Usuarios sede: crean matriculas en su sede"
  ON public.matriculas_alumno FOR INSERT WITH CHECK (
    sede_id = public.get_my_sede_id()
    AND escuela_id = public.get_my_escuela_id()
    AND created_by = (SELECT auth.uid())
    AND NOT public.is_alumno()
    AND NOT public.is_instructor()
  );

DROP POLICY IF EXISTS "Usuarios sede: actualizan matriculas de su sede" ON public.matriculas_alumno;
CREATE POLICY "Usuarios sede: actualizan matriculas de su sede"
  ON public.matriculas_alumno FOR UPDATE USING (
    sede_id = public.get_my_sede_id()
    AND escuela_id = public.get_my_escuela_id()
    AND NOT public.is_alumno()
    AND NOT public.is_instructor()
  );

DROP POLICY IF EXISTS "Usuarios sede: eliminan matriculas de su sede" ON public.matriculas_alumno;
CREATE POLICY "Usuarios sede: eliminan matriculas de su sede"
  ON public.matriculas_alumno FOR DELETE USING (
    sede_id = public.get_my_sede_id()
    AND escuela_id = public.get_my_escuela_id()
    AND NOT public.is_alumno()
    AND NOT public.is_instructor()
  );

DROP POLICY IF EXISTS "Alumno: ve solo sus matriculas" ON public.matriculas_alumno;
CREATE POLICY "Alumno: ve solo sus matriculas"
  ON public.matriculas_alumno FOR SELECT USING (
    public.is_alumno() AND alumno_id = public.get_my_alumno_id()
  );
