-- Migración 013: Corregir políticas RLS de INSERT para alumnos e instructores
--
-- Problema: La política "Usuarios sede: crean alumnos/instructores en su sede"
-- exigía (auth.uid() = user_id), lo que impedía a admin_sede y administrativo
-- crear alumnos/instructores porque:
--   · auth.uid()  = ID del admin/administrativo que hace la petición
--   · user_id     = ID del nuevo alumno/instructor recién creado (distinto)
--
-- En las tablas alumnos e instructores, user_id NO es el creador del registro
-- sino el propio usuario al que pertenece el registro (se usa en las políticas
-- "Alumno: ve solo su registro" / "Instructor: ve solo su registro").
-- Por eso eliminar la condición auth.uid() = user_id es correcto:
-- la restricción de sede + escuela ya garantiza el scope del admin.
--
-- Las tablas vehiculos, clases, examenes, gastos e ingresos NO se tocan:
-- en esas tablas user_id SÍ es el creador del registro, por lo que
-- auth.uid() = user_id es una restricción válida y deseable.

-- ========== ALUMNOS ==========
DROP POLICY IF EXISTS "Usuarios sede: crean alumnos en su sede" ON public.alumnos;
CREATE POLICY "Usuarios sede: crean alumnos en su sede"
  ON public.alumnos FOR INSERT
  WITH CHECK (
    sede_id    = public.get_my_sede_id()
    AND escuela_id = public.get_my_escuela_id()
    AND NOT public.is_alumno()
  );

-- ========== INSTRUCTORES ==========
DROP POLICY IF EXISTS "Usuarios sede: crean instructores en su sede" ON public.instructores;
CREATE POLICY "Usuarios sede: crean instructores en su sede"
  ON public.instructores FOR INSERT
  WITH CHECK (
    sede_id    = public.get_my_sede_id()
    AND escuela_id = public.get_my_escuela_id()
    AND NOT public.is_alumno()
    AND NOT public.is_instructor()
  );
