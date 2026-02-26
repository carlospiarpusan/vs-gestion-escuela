-- ================================================================
-- Migración 015: Políticas RLS faltantes para alumno
--
-- Problema: el dashboard del alumno consulta las tablas `ingresos`
-- y `clases` por su alumno_id, pero no existía ninguna política
-- SELECT que permitiera al alumno leer esas filas.
-- Resultado: los ingresos y clases aparecían vacíos aunque
-- existieran registros asociados al alumno.
--
-- Solución: añadir políticas FOR SELECT que usan la función helper
-- get_my_alumno_id() para resolver el id del alumno autenticado
-- y compararlo con el alumno_id de cada fila.
-- ================================================================

-- ── INGRESOS: el alumno ve los ingresos asociados a su registro ──
DROP POLICY IF EXISTS "Alumno: ve sus ingresos" ON public.ingresos;
CREATE POLICY "Alumno: ve sus ingresos"
  ON public.ingresos FOR SELECT
  USING (
    public.is_alumno()
    AND alumno_id = public.get_my_alumno_id()
  );

-- ── CLASES: el alumno ve las clases en las que está inscrito ──
DROP POLICY IF EXISTS "Alumno: ve sus clases" ON public.clases;
CREATE POLICY "Alumno: ve sus clases"
  ON public.clases FOR SELECT
  USING (
    public.is_alumno()
    AND alumno_id = public.get_my_alumno_id()
  );
