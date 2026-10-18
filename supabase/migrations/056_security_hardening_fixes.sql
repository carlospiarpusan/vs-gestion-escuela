-- Migración 056: Endurecimiento de seguridad defensivo (Privilege Escalation & RLS Policies)
-- Corrige VULN-01 (Escalamiento de privilegios en perfiles) y VULN-02 (Autorización insuficiente en inserciones RLS).

-- 1. Función y trigger para proteger columnas críticas en public.perfiles
CREATE OR REPLACE FUNCTION public.protect_perfiles_privileged_columns()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  current_role text;
  current_school uuid;
  is_super boolean;
  is_school_admin boolean;
BEGIN
  -- Si no hay cambios en columnas privilegiadas, permitir la actualización inmediatamente
  IF (OLD.rol IS NOT DISTINCT FROM NEW.rol AND
      OLD.escuela_id IS NOT DISTINCT FROM NEW.escuela_id AND
      OLD.sede_id IS NOT DISTINCT FROM NEW.sede_id AND
      OLD.activo IS NOT DISTINCT FROM NEW.activo) THEN
    RETURN NEW;
  END IF;

  -- Si se ejecuta en contexto de servicio interno (service_role o sin auth.uid()), permitir
  IF auth.uid() IS NULL THEN
    RETURN NEW;
  END IF;

  SELECT p.rol, p.escuela_id, (p.rol = 'super_admin' AND p.activo = true), (p.rol = 'admin_escuela' AND p.activo = true)
  INTO current_role, current_school, is_super, is_school_admin
  FROM public.perfiles p
  WHERE p.id = auth.uid();

  -- Super admin activo puede modificar libremente
  IF coalesce(is_super, false) THEN
    RETURN NEW;
  END IF;

  -- Admin escuela activo puede gestionar sedes o perfiles de su escuela,
  -- pero NO puede auto-ascenderse ni ascender a nadie a super_admin, ni cambiar escuela_id
  IF coalesce(is_school_admin, false) THEN
    IF NEW.rol = 'super_admin' THEN
      RAISE EXCEPTION 'No tienes autorización para asignar el rol super_admin.';
    END IF;

    IF OLD.escuela_id IS DISTINCT FROM current_school OR NEW.escuela_id IS DISTINCT FROM current_school THEN
      RAISE EXCEPTION 'No tienes autorización para mover usuarios a otra escuela.';
    END IF;

    IF OLD.rol = 'super_admin' THEN
      RAISE EXCEPTION 'No tienes autorización para modificar usuarios super_admin.';
    END IF;

    RETURN NEW;
  END IF;

  -- Cualquier otro rol (alumno, instructor, administrativo, recepcion, etc.)
  -- tiene estrictamente denegado alterar sus privilegios, rol, escuela o estado activo
  RAISE EXCEPTION 'No tienes autorización para modificar columnas de privilegios en tu perfil.';
END;
$$;

DROP TRIGGER IF EXISTS trg_protect_perfiles_privileged_columns ON public.perfiles;
CREATE TRIGGER trg_protect_perfiles_privileged_columns
  BEFORE UPDATE ON public.perfiles
  FOR EACH ROW
  EXECUTE FUNCTION public.protect_perfiles_privileged_columns();


-- 2. Restringir políticas RLS de inserción directa a roles autorizados

-- GASTOS
DROP POLICY IF EXISTS "Usuarios sede: crean gastos en su sede" ON public.gastos;
DROP POLICY IF EXISTS "Staff sede: crean gastos en su sede" ON public.gastos;
CREATE POLICY "Staff sede: crean gastos en su sede"
  ON public.gastos FOR INSERT
  WITH CHECK (
    sede_id = public.get_my_sede_id()
    AND escuela_id = public.get_my_escuela_id()
    AND (SELECT auth.uid()) = user_id
    AND EXISTS (
      SELECT 1 FROM public.perfiles p
      WHERE p.id = (SELECT auth.uid())
        AND p.rol IN ('super_admin', 'admin_escuela', 'admin_sede', 'administrativo')
        AND p.activo = true
    )
  );

-- INGRESOS
DROP POLICY IF EXISTS "Usuarios sede: crean ingresos en su sede" ON public.ingresos;
DROP POLICY IF EXISTS "Staff sede: crean ingresos en su sede" ON public.ingresos;
CREATE POLICY "Staff sede: crean ingresos en su sede"
  ON public.ingresos FOR INSERT
  WITH CHECK (
    sede_id = public.get_my_sede_id()
    AND escuela_id = public.get_my_escuela_id()
    AND (SELECT auth.uid()) = user_id
    AND EXISTS (
      SELECT 1 FROM public.perfiles p
      WHERE p.id = (SELECT auth.uid())
        AND p.rol IN ('super_admin', 'admin_escuela', 'admin_sede', 'administrativo')
        AND p.activo = true
    )
  );

-- VEHÍCULOS
DROP POLICY IF EXISTS "Usuarios sede: crean vehiculos en su sede" ON public.vehiculos;
DROP POLICY IF EXISTS "Staff sede: crean vehiculos en su sede" ON public.vehiculos;
CREATE POLICY "Staff sede: crean vehiculos en su sede"
  ON public.vehiculos FOR INSERT
  WITH CHECK (
    sede_id = public.get_my_sede_id()
    AND escuela_id = public.get_my_escuela_id()
    AND (SELECT auth.uid()) = user_id
    AND EXISTS (
      SELECT 1 FROM public.perfiles p
      WHERE p.id = (SELECT auth.uid())
        AND p.rol IN ('super_admin', 'admin_escuela', 'admin_sede', 'administrativo')
        AND p.activo = true
    )
  );

-- ALUMNOS
DROP POLICY IF EXISTS "Usuarios sede: crean alumnos en su sede" ON public.alumnos;
DROP POLICY IF EXISTS "Staff sede: crean alumnos en su sede" ON public.alumnos;
CREATE POLICY "Staff sede: crean alumnos en su sede"
  ON public.alumnos FOR INSERT
  WITH CHECK (
    sede_id = public.get_my_sede_id()
    AND escuela_id = public.get_my_escuela_id()
    AND (SELECT auth.uid()) = user_id
    AND EXISTS (
      SELECT 1 FROM public.perfiles p
      WHERE p.id = (SELECT auth.uid())
        AND p.rol IN ('super_admin', 'admin_escuela', 'admin_sede', 'administrativo', 'recepcion')
        AND p.activo = true
    )
  );

-- INSTRUCTORES
DROP POLICY IF EXISTS "Usuarios sede: crean instructores en su sede" ON public.instructores;
DROP POLICY IF EXISTS "Staff sede: crean instructores en su sede" ON public.instructores;
CREATE POLICY "Staff sede: crean instructores en su sede"
  ON public.instructores FOR INSERT
  WITH CHECK (
    sede_id = public.get_my_sede_id()
    AND escuela_id = public.get_my_escuela_id()
    AND (SELECT auth.uid()) = user_id
    AND EXISTS (
      SELECT 1 FROM public.perfiles p
      WHERE p.id = (SELECT auth.uid())
        AND p.rol IN ('super_admin', 'admin_escuela', 'admin_sede', 'administrativo')
        AND p.activo = true
    )
  );

-- CLASES
DROP POLICY IF EXISTS "Usuarios sede: crean clases en su sede" ON public.clases;
DROP POLICY IF EXISTS "Staff e instructores sede: crean clases en su sede" ON public.clases;
CREATE POLICY "Staff e instructores sede: crean clases en su sede"
  ON public.clases FOR INSERT
  WITH CHECK (
    sede_id = public.get_my_sede_id()
    AND escuela_id = public.get_my_escuela_id()
    AND (SELECT auth.uid()) = user_id
    AND EXISTS (
      SELECT 1 FROM public.perfiles p
      WHERE p.id = (SELECT auth.uid())
        AND p.rol IN ('super_admin', 'admin_escuela', 'admin_sede', 'administrativo', 'instructor')
        AND p.activo = true
    )
  );

-- EXÁMENES
DROP POLICY IF EXISTS "Usuarios sede: crean examenes en su sede" ON public.examenes;
DROP POLICY IF EXISTS "Staff e instructores sede: crean examenes en su sede" ON public.examenes;
CREATE POLICY "Staff e instructores sede: crean examenes en su sede"
  ON public.examenes FOR INSERT
  WITH CHECK (
    sede_id = public.get_my_sede_id()
    AND escuela_id = public.get_my_escuela_id()
    AND (SELECT auth.uid()) = user_id
    AND EXISTS (
      SELECT 1 FROM public.perfiles p
      WHERE p.id = (SELECT auth.uid())
        AND p.rol IN ('super_admin', 'admin_escuela', 'admin_sede', 'administrativo', 'instructor')
        AND p.activo = true
    )
  );
