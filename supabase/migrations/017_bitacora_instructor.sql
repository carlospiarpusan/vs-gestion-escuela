-- Agregar tipo 'reparacion' al check constraint de mantenimiento_vehiculos
ALTER TABLE public.mantenimiento_vehiculos DROP CONSTRAINT IF EXISTS mantenimiento_vehiculos_tipo_check;
ALTER TABLE public.mantenimiento_vehiculos ADD CONSTRAINT mantenimiento_vehiculos_tipo_check
  CHECK (tipo IN (
    'cambio_aceite', 'gasolina', 'repuesto', 'mano_obra',
    'lavado', 'neumaticos', 'revision_general', 'reparacion', 'otros'
  ));

-- Permitir que instructores creen registros de mantenimiento (RLS)
CREATE POLICY IF NOT EXISTS "Instructores pueden crear mantenimiento"
  ON public.mantenimiento_vehiculos
  FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.perfiles
      WHERE id = auth.uid() AND rol = 'instructor'
      AND escuela_id = mantenimiento_vehiculos.escuela_id
    )
  );

-- Permitir que instructores vean sus propios registros
CREATE POLICY IF NOT EXISTS "Instructores ven su propio mantenimiento"
  ON public.mantenimiento_vehiculos
  FOR SELECT
  TO authenticated
  USING (
    instructor_id IN (
      SELECT i.id FROM public.instructores i
      WHERE i.user_id = auth.uid()
    )
  );
