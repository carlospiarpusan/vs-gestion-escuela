-- Migración 019: corregir el estado actual de RLS para mantenimiento de instructores
-- 017 ya pudo haberse aplicado con políticas duplicadas y demasiado permisivas.

ALTER TABLE public.mantenimiento_vehiculos DROP CONSTRAINT IF EXISTS mantenimiento_vehiculos_tipo_check;
ALTER TABLE public.mantenimiento_vehiculos ADD CONSTRAINT mantenimiento_vehiculos_tipo_check
  CHECK (tipo IN (
    'cambio_aceite', 'gasolina', 'repuesto', 'mano_obra',
    'lavado', 'neumaticos', 'revision_general', 'reparacion', 'otros'
  ));

DROP POLICY IF EXISTS "Instructores pueden crear mantenimiento" ON public.mantenimiento_vehiculos;
DROP POLICY IF EXISTS "Instructores ven su propio mantenimiento" ON public.mantenimiento_vehiculos;

DROP POLICY IF EXISTS "Instructor: ve mantenimiento de sus vehiculos" ON public.mantenimiento_vehiculos;
CREATE POLICY "Instructor: ve mantenimiento de sus vehiculos"
  ON public.mantenimiento_vehiculos FOR SELECT USING (
    public.is_instructor() and (
      instructor_id = public.get_my_instructor_id()
      or vehiculo_id in (
        select vehiculo_id from public.clases
        where instructor_id = public.get_my_instructor_id()
        and vehiculo_id is not null
      )
    )
  );

DROP POLICY IF EXISTS "Instructor: crea mantenimiento" ON public.mantenimiento_vehiculos;
CREATE POLICY "Instructor: crea mantenimiento"
  ON public.mantenimiento_vehiculos FOR INSERT WITH CHECK (
    public.is_instructor()
    and instructor_id = public.get_my_instructor_id()
    and sede_id = public.get_my_sede_id()
    and escuela_id = public.get_my_escuela_id()
    and vehiculo_id in (
      select vehiculo_id from public.clases
      where instructor_id = public.get_my_instructor_id()
      and vehiculo_id is not null
    )
  );

DROP POLICY IF EXISTS "Instructor: actualiza su mantenimiento" ON public.mantenimiento_vehiculos;
CREATE POLICY "Instructor: actualiza su mantenimiento"
  ON public.mantenimiento_vehiculos FOR UPDATE USING (
    public.is_instructor() and instructor_id = public.get_my_instructor_id()
  );
