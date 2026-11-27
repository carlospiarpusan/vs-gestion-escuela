-- ============================================================================
-- Security Hardening Migration (2026-11-15)
-- Remediates missing 056 hardening + RLS/trigger/function scope & privilege flaws
-- ============================================================================

-- 1. RLS identity helpers: enforce activo = true and empty search_path.
CREATE OR REPLACE FUNCTION public.is_super_admin()
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM public.perfiles
    WHERE id = (SELECT auth.uid()) AND rol = 'super_admin' AND activo = true
  );
END;
$$;

CREATE OR REPLACE FUNCTION public.is_admin_escuela()
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM public.perfiles
    WHERE id = (SELECT auth.uid()) AND rol = 'admin_escuela' AND activo = true
  );
END;
$$;

CREATE OR REPLACE FUNCTION public.is_instructor()
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM public.perfiles
    WHERE id = (SELECT auth.uid()) AND rol = 'instructor' AND activo = true
  );
END;
$$;

CREATE OR REPLACE FUNCTION public.is_alumno()
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM public.perfiles
    WHERE id = (SELECT auth.uid()) AND rol = 'alumno' AND activo = true
  );
END;
$$;

CREATE OR REPLACE FUNCTION public.get_my_escuela_id()
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
BEGIN
  RETURN (
    SELECT escuela_id FROM public.perfiles
    WHERE id = (SELECT auth.uid()) AND activo = true
    LIMIT 1
  );
END;
$$;

CREATE OR REPLACE FUNCTION public.get_my_sede_id()
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
BEGIN
  RETURN (
    SELECT sede_id FROM public.perfiles
    WHERE id = (SELECT auth.uid()) AND activo = true
    LIMIT 1
  );
END;
$$;

CREATE OR REPLACE FUNCTION public.get_my_instructor_id()
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
BEGIN
  RETURN (
    SELECT i.id
    FROM public.instructores i
    JOIN public.perfiles p ON p.id = i.user_id
    WHERE i.user_id = (SELECT auth.uid())
      AND p.activo = true
      AND (p.escuela_id IS NULL OR i.escuela_id = p.escuela_id)
    LIMIT 1
  );
END;
$$;

CREATE OR REPLACE FUNCTION public.get_my_alumno_id()
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
BEGIN
  RETURN (
    SELECT a.id
    FROM public.alumnos a
    JOIN public.perfiles p ON p.id = a.user_id
    WHERE a.user_id = (SELECT auth.uid())
      AND p.activo = true
      AND (p.escuela_id IS NULL OR a.escuela_id = p.escuela_id)
    LIMIT 1
  );
END;
$$;

-- 2. Protect public.perfiles privileged columns and enforce hierarchy (fixes missing 056 + DELETE/INSERT escalation).
CREATE OR REPLACE FUNCTION public.protect_perfiles_privileged_columns()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  caller_id uuid;
  caller_rol text;
  caller_escuela_id uuid;
  caller_activo boolean;
  -- PostgREST selects its request role with SET ROLE. Inside a security
  -- definer, current_user instead identifies the function owner.
  caller_db_role text := COALESCE(NULLIF(current_setting('role', true), 'none'), session_user::text);
BEGIN
  IF caller_db_role IN ('postgres', 'service_role', 'supabase_admin')
     OR (TG_OP = 'INSERT' AND caller_db_role = 'supabase_auth_admin' AND pg_trigger_depth() > 1) THEN
    IF TG_OP = 'DELETE' THEN RETURN OLD; END IF;
    RETURN NEW;
  END IF;

  caller_id := auth.uid();
  IF caller_id IS NULL THEN
    RAISE EXCEPTION 'No autorizado para modificar perfiles';
  END IF;

  SELECT rol, escuela_id, activo
  INTO caller_rol, caller_escuela_id, caller_activo
  FROM public.perfiles
  WHERE id = caller_id;

  IF NOT FOUND OR caller_activo IS NOT TRUE THEN
    RAISE EXCEPTION 'Perfil inactivo o no autorizado';
  END IF;

  IF caller_rol = 'super_admin' THEN
    IF TG_OP = 'DELETE' THEN
      IF OLD.id = caller_id THEN
        RAISE EXCEPTION 'No puedes eliminar tu propio perfil';
      END IF;
      RETURN OLD;
    END IF;
    RETURN NEW;
  END IF;

  IF caller_rol = 'admin_escuela' THEN
    IF TG_OP = 'DELETE' THEN
      IF OLD.rol IN ('super_admin', 'admin_escuela') OR OLD.id = caller_id OR OLD.escuela_id IS DISTINCT FROM caller_escuela_id THEN
        RAISE EXCEPTION 'No tienes permisos para eliminar este perfil';
      END IF;
      RETURN OLD;
    END IF;

    IF NEW.rol = 'super_admin' OR NEW.escuela_id IS DISTINCT FROM caller_escuela_id THEN
      RAISE EXCEPTION 'No tienes permisos para asignar rol super_admin o cambiar de escuela';
    END IF;

    IF TG_OP = 'UPDATE' AND (OLD.rol = 'super_admin' OR OLD.escuela_id IS DISTINCT FROM caller_escuela_id) THEN
      RAISE EXCEPTION 'No tienes permisos para modificar perfiles fuera de tu escuela';
    END IF;

    IF TG_OP = 'UPDATE' AND OLD.id <> caller_id AND OLD.rol = 'admin_escuela' AND (NEW.rol IS DISTINCT FROM OLD.rol OR NEW.activo IS DISTINCT FROM OLD.activo) THEN
      RAISE EXCEPTION 'No tienes permisos para alterar otro administrador de escuela';
    END IF;

    IF TG_OP = 'UPDATE' AND OLD.id = caller_id AND (
      NEW.rol IS DISTINCT FROM OLD.rol
      OR NEW.escuela_id IS DISTINCT FROM OLD.escuela_id
      OR NEW.activo IS DISTINCT FROM OLD.activo
    ) THEN
      RAISE EXCEPTION 'No puedes cambiar tu propio rol, escuela o estado';
    END IF;

    RETURN NEW;
  END IF;

  -- All non-school-admin roles may only update safe self-profile fields.
  IF TG_OP = 'INSERT' OR TG_OP = 'DELETE' THEN
    RAISE EXCEPTION 'No tienes permisos para crear o eliminar perfiles';
  END IF;

  IF OLD.id <> caller_id OR NEW.id IS DISTINCT FROM OLD.id THEN
    RAISE EXCEPTION 'Solo puedes actualizar tu propio perfil';
  END IF;

  IF NEW.rol IS DISTINCT FROM OLD.rol
     OR NEW.escuela_id IS DISTINCT FROM OLD.escuela_id
     OR NEW.sede_id IS DISTINCT FROM OLD.sede_id
     OR NEW.activo IS DISTINCT FROM OLD.activo THEN
    RAISE EXCEPTION 'No tienes permisos para modificar rol, escuela, sede o estado activo';
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_protect_perfiles_privileged_columns ON public.perfiles;
CREATE TRIGGER trg_protect_perfiles_privileged_columns
  BEFORE INSERT OR UPDATE OR DELETE ON public.perfiles
  FOR EACH ROW
  EXECUTE FUNCTION public.protect_perfiles_privileged_columns();

-- 3. Protect public.escuelas billing/plan/capacity columns from tenant admin tampering.
CREATE OR REPLACE FUNCTION public.protect_escuelas_plan_columns()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  -- PostgREST selects its request role with SET ROLE. Inside a security
  -- definer, current_user instead identifies the function owner.
  caller_db_role text := COALESCE(NULLIF(current_setting('role', true), 'none'), session_user::text);
BEGIN
  IF caller_db_role IN ('postgres', 'service_role', 'supabase_admin')
     OR public.is_super_admin() THEN
    RETURN NEW;
  END IF;

  IF NEW.plan IS DISTINCT FROM OLD.plan
     OR NEW.max_alumnos IS DISTINCT FROM OLD.max_alumnos
     OR NEW.max_sedes IS DISTINCT FROM OLD.max_sedes
     OR NEW.estado IS DISTINCT FROM OLD.estado
     OR NEW.fecha_alta IS DISTINCT FROM OLD.fecha_alta THEN
    RAISE EXCEPTION 'Solo el super administrador o facturación puede modificar plan, cupos o estado de la escuela';
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_protect_escuelas_plan_columns ON public.escuelas;
CREATE TRIGGER trg_protect_escuelas_plan_columns
  BEFORE UPDATE ON public.escuelas
  FOR EACH ROW
  EXECUTE FUNCTION public.protect_escuelas_plan_columns();

DROP POLICY IF EXISTS "Admin escuela: actualiza su escuela" ON public.escuelas;
CREATE POLICY "Admin escuela: actualiza su escuela"
  ON public.escuelas FOR UPDATE TO authenticated
  USING ((id = (SELECT public.get_my_escuela_id())) AND (SELECT public.is_admin_escuela()))
  WITH CHECK ((id = (SELECT public.get_my_escuela_id())) AND (SELECT public.is_admin_escuela()));

-- 4. Tighten perfiles and sedes SELECT policies (missing role check allowed cross-role school/sede PII leaks).
DROP POLICY IF EXISTS "Admin escuela: ve perfiles de su escuela" ON public.perfiles;
CREATE POLICY "Admin escuela: ve perfiles de su escuela"
  ON public.perfiles FOR SELECT
  USING ((escuela_id = (SELECT public.get_my_escuela_id())) AND (SELECT public.is_admin_escuela()));

DROP POLICY IF EXISTS "Usuarios sede: ven perfiles de su sede" ON public.perfiles;
CREATE POLICY "Usuarios sede: ven perfiles de su sede"
  ON public.perfiles FOR SELECT
  USING (
    (sede_id = (SELECT public.get_my_sede_id()))
    AND (escuela_id = (SELECT public.get_my_escuela_id()))
    AND NOT (SELECT public.is_alumno())
    AND NOT (SELECT public.is_instructor())
  );

DROP POLICY IF EXISTS "Usuarios: actualizan su propio perfil" ON public.perfiles;
CREATE POLICY "Usuarios: actualizan su propio perfil"
  ON public.perfiles FOR UPDATE
  USING (((SELECT auth.uid()) = id) AND activo = true)
  WITH CHECK (((SELECT auth.uid()) = id) AND activo = true);

DROP POLICY IF EXISTS "Admin escuela: ve todas las sedes de su escuela" ON public.sedes;
CREATE POLICY "Admin escuela: ve todas las sedes de su escuela"
  ON public.sedes FOR SELECT
  USING ((escuela_id = (SELECT public.get_my_escuela_id())) AND (SELECT public.is_admin_escuela()));

-- 5. Fix cross-tenant triggers on mantenimiento_vehiculos & gastos analytics.
CREATE OR REPLACE FUNCTION public.update_vehiculo_kilometraje()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
BEGIN
  IF NEW.kilometraje_actual IS NOT NULL THEN
    UPDATE public.vehiculos
    SET kilometraje = NEW.kilometraje_actual
    WHERE id = NEW.vehiculo_id
      AND escuela_id = NEW.escuela_id
      AND (kilometraje IS NULL OR kilometraje < NEW.kilometraje_actual);
  END IF;
  RETURN NEW;
END;
$$;

CREATE OR REPLACE FUNCTION public.sync_gasto_from_mantenimiento()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM public.vehiculos v
    WHERE v.id = NEW.vehiculo_id AND v.escuela_id = NEW.escuela_id
  ) THEN
    RAISE EXCEPTION 'El vehículo no pertenece a la escuela del mantenimiento.';
  END IF;

  INSERT INTO public.gastos (
    escuela_id, sede_id, user_id, mantenimiento_id, categoria, concepto,
    monto, metodo_pago, proveedor, numero_factura, fecha, recurrente, notas
  ) VALUES (
    NEW.escuela_id, NEW.sede_id, NEW.user_id, NEW.id,
    public.map_gasto_categoria_from_mantenimiento(NEW.tipo), NEW.descripcion,
    NEW.monto, 'transferencia', NEW.proveedor, NEW.numero_factura,
    NEW.fecha, false, NEW.notas
  )
  ON CONFLICT (mantenimiento_id) DO UPDATE
  SET
    escuela_id = EXCLUDED.escuela_id,
    sede_id = EXCLUDED.sede_id,
    user_id = EXCLUDED.user_id,
    categoria = EXCLUDED.categoria,
    concepto = EXCLUDED.concepto,
    monto = EXCLUDED.monto,
    metodo_pago = EXCLUDED.metodo_pago,
    proveedor = EXCLUDED.proveedor,
    numero_factura = EXCLUDED.numero_factura,
    fecha = EXCLUDED.fecha,
    recurrente = EXCLUDED.recurrente,
    notas = EXCLUDED.notas;

  RETURN NEW;
END;
$$;

CREATE OR REPLACE FUNCTION public.insert_gasto_from_mantenimiento()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM public.vehiculos v
    WHERE v.id = NEW.vehiculo_id AND v.escuela_id = NEW.escuela_id
  ) THEN
    RAISE EXCEPTION 'El vehículo no pertenece a la escuela del mantenimiento.';
  END IF;

  INSERT INTO public.gastos (
    escuela_id, sede_id, user_id, categoria, concepto, monto,
    metodo_pago, proveedor, numero_factura, fecha, recurrente, notas
  ) VALUES (
    NEW.escuela_id, NEW.sede_id, NEW.user_id,
    'mantenimiento_vehiculo', NEW.descripcion, NEW.monto,
    'transferencia', NEW.proveedor, NEW.numero_factura,
    NEW.fecha, false, NEW.notas
  );
  RETURN NEW;
END;
$$;

CREATE OR REPLACE FUNCTION public.delete_gasto_from_mantenimiento()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
BEGIN
  DELETE FROM public.gastos
  WHERE mantenimiento_id = OLD.id
    AND escuela_id = OLD.escuela_id;
  RETURN OLD;
END;
$$;

CREATE OR REPLACE FUNCTION public.fn_analitica_enriquecer_gasto()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  v_alumno_id uuid;
  v_matricula_id uuid;
BEGIN
  IF NEW.mantenimiento_id IS NOT NULL AND (NEW.vehiculo_id IS NULL OR NEW.instructor_id IS NULL) THEN
    SELECT coalesce(NEW.vehiculo_id, mv.vehiculo_id),
           coalesce(NEW.instructor_id, mv.instructor_id)
      INTO NEW.vehiculo_id, NEW.instructor_id
      FROM public.mantenimiento_vehiculos mv
     WHERE mv.id = NEW.mantenimiento_id
       AND mv.escuela_id = NEW.escuela_id;
  END IF;

  IF NEW.categoria = 'tramitador' AND NEW.alumno_id IS NULL AND NEW.concepto LIKE 'Tramitador — %' THEN
    SELECT CASE WHEN count(*) = 1 THEN (array_agg(a.id))[1] ELSE NULL END
      INTO v_alumno_id
      FROM public.alumnos a
     WHERE a.escuela_id = NEW.escuela_id
       AND NEW.concepto = 'Tramitador — ' || trim(a.nombre || ' ' || a.apellidos);

    IF v_alumno_id IS NOT NULL THEN
      NEW.alumno_id := v_alumno_id;
      IF NEW.matricula_id IS NULL THEN
        SELECT CASE WHEN count(*) = 1 THEN (array_agg(m.id))[1] ELSE NULL END
          INTO v_matricula_id
          FROM public.matriculas_alumno m
         WHERE m.escuela_id = NEW.escuela_id
           AND m.alumno_id = v_alumno_id
           AND m.estado <> 'cancelado';
        NEW.matricula_id := v_matricula_id;
      END IF;
    END IF;
  END IF;

  RETURN NEW;
END;
$$;

CREATE OR REPLACE FUNCTION public.fn_analitica_registrar_transicion_estado()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  v_entidad text := tg_argv[0];
  v_estado_old text;
  v_estado_new text;
  v_monto numeric(12,2);
  v_actor uuid;
BEGIN
  IF v_entidad = 'gasto' THEN
    v_estado_old := CASE WHEN tg_op = 'UPDATE' THEN OLD.estado_pago ELSE NULL END;
    v_estado_new := NEW.estado_pago;
    v_monto := NEW.monto;
    v_actor := coalesce(NEW.updated_by, NEW.user_id, auth.uid());
  ELSIF v_entidad = 'ingreso' THEN
    v_estado_old := CASE WHEN tg_op = 'UPDATE' THEN OLD.estado ELSE NULL END;
    v_estado_new := NEW.estado;
    v_monto := NEW.monto;
    v_actor := coalesce(NEW.updated_by, NEW.user_id, auth.uid());
  ELSIF v_entidad = 'matricula' THEN
    v_estado_old := CASE WHEN tg_op = 'UPDATE' THEN OLD.estado ELSE NULL END;
    v_estado_new := NEW.estado;
    v_monto := NEW.valor_total;
    v_actor := coalesce(NEW.updated_by, NEW.created_by, auth.uid());
  ELSE
    v_estado_old := CASE WHEN tg_op = 'UPDATE' THEN OLD.estado ELSE NULL END;
    v_estado_new := NEW.estado;
    v_monto := NEW.valor_total;
    v_actor := coalesce(NEW.updated_by, NEW.user_id, auth.uid());
  END IF;

  IF tg_op = 'INSERT' OR v_estado_old IS DISTINCT FROM v_estado_new THEN
    INSERT INTO public.bitacora_estados_analitica (
      escuela_id, sede_id, entidad, entidad_id, estado_anterior, estado_nuevo, monto_referencia, actor_id
    ) VALUES (
      NEW.escuela_id, NEW.sede_id, v_entidad, NEW.id, v_estado_old, coalesce(v_estado_new, 'sin_estado'), v_monto, v_actor
    );
  END IF;

  RETURN NEW;
END;
$$;

REVOKE ALL ON FUNCTION public.protect_perfiles_privileged_columns() FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.protect_escuelas_plan_columns() FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.update_vehiculo_kilometraje() FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.sync_gasto_from_mantenimiento() FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.insert_gasto_from_mantenimiento() FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.delete_gasto_from_mantenimiento() FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.fn_analitica_enriquecer_gasto() FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.fn_analitica_registrar_transicion_estado() FROM PUBLIC, anon, authenticated;

-- 6. Close anonymous / overly broad policies on exam bank, plans, ARCO, subscription billing, and audit logs.
REVOKE SELECT ON public.preguntas_examen FROM anon;
REVOKE SELECT ON public.categorias_examen FROM anon;
REVOKE SELECT ON public.planes_config FROM anon;

DROP POLICY IF EXISTS "Todos pueden ver preguntas activas" ON public.preguntas_examen;
CREATE POLICY "Usuarios activos autenticados: ven preguntas activas"
  ON public.preguntas_examen FOR SELECT TO authenticated
  USING (
    activa = true
    AND EXISTS (
      SELECT 1 FROM public.perfiles p
      WHERE p.id = (SELECT auth.uid()) AND p.activo = true
    )
  );

DROP POLICY IF EXISTS "Todos pueden ver categorias" ON public.categorias_examen;
CREATE POLICY "Usuarios activos autenticados: ven categorias"
  ON public.categorias_examen FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.perfiles p
      WHERE p.id = (SELECT auth.uid()) AND p.activo = true
    )
  );

DROP POLICY IF EXISTS "Lectura pública de planes" ON public.planes_config;
CREATE POLICY "Usuarios activos autenticados: ven planes_config"
  ON public.planes_config FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.perfiles p
      WHERE p.id = (SELECT auth.uid()) AND p.activo = true
    )
  );

DROP POLICY IF EXISTS "Solo super_admin edita planes" ON public.planes_config;
CREATE POLICY "Solo super_admin edita planes"
  ON public.planes_config FOR UPDATE TO authenticated
  USING ((SELECT public.is_super_admin()))
  WITH CHECK ((SELECT public.is_super_admin()));

DROP POLICY IF EXISTS "arco_insert_via_api" ON public.solicitudes_arco;
DROP POLICY IF EXISTS "arco_admin_select" ON public.solicitudes_arco;
CREATE POLICY "arco_admin_select"
  ON public.solicitudes_arco FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.perfiles p
      WHERE p.id = (SELECT auth.uid())
        AND p.activo = true
        AND (
          p.rol = 'super_admin'
          OR (p.rol = 'admin_escuela' AND p.escuela_id = solicitudes_arco.escuela_id)
        )
    )
  );

DROP POLICY IF EXISTS "arco_admin_update" ON public.solicitudes_arco;
CREATE POLICY "arco_admin_update"
  ON public.solicitudes_arco FOR UPDATE TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.perfiles p
      WHERE p.id = (SELECT auth.uid())
        AND p.activo = true
        AND (
          p.rol = 'super_admin'
          OR (p.rol = 'admin_escuela' AND p.escuela_id = solicitudes_arco.escuela_id)
        )
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.perfiles p
      WHERE p.id = (SELECT auth.uid())
        AND p.activo = true
        AND (
          p.rol = 'super_admin'
          OR (p.rol = 'admin_escuela' AND p.escuela_id = solicitudes_arco.escuela_id)
        )
    )
  );

DROP POLICY IF EXISTS "Usuarios escuela: ven sus intentos de pago" ON public.school_payment_attempts;
CREATE POLICY "Usuarios escuela: ven sus intentos de pago"
  ON public.school_payment_attempts FOR SELECT TO authenticated
  USING ((school_id = (SELECT public.get_my_escuela_id())) AND (SELECT public.is_admin_escuela()));

DROP POLICY IF EXISTS "Usuarios escuela: ven sus ciclos de suscripcion" ON public.school_subscription_cycles;
CREATE POLICY "Usuarios escuela: ven sus ciclos de suscripcion"
  ON public.school_subscription_cycles FOR SELECT TO authenticated
  USING ((school_id = (SELECT public.get_my_escuela_id())) AND (SELECT public.is_admin_escuela()));

DROP POLICY IF EXISTS "Usuarios escuela: ven sus eventos de suscripcion" ON public.school_subscription_events;
CREATE POLICY "Usuarios escuela: ven sus eventos de suscripcion"
  ON public.school_subscription_events FOR SELECT TO authenticated
  USING ((school_id = (SELECT public.get_my_escuela_id())) AND (SELECT public.is_admin_escuela()));

DROP POLICY IF EXISTS "Sistema: inserta log" ON public.actividad_log;
CREATE POLICY "Sistema: inserta log"
  ON public.actividad_log FOR INSERT TO authenticated
  WITH CHECK (
    (SELECT auth.uid()) = user_id
    AND EXISTS (
      SELECT 1 FROM public.perfiles p
      WHERE p.id = (SELECT auth.uid())
        AND p.activo = true
        AND (
          p.rol = 'super_admin'
          OR (
            p.escuela_id = actividad_log.escuela_id
            AND (
              p.rol = 'admin_escuela'
              OR (
                p.sede_id = actividad_log.sede_id
                AND p.rol IN ('admin_sede', 'administrativo', 'secretaria', 'recepcion', 'instructor')
              )
            )
          )
        )
    )
  );

-- 7. Payroll tables: keep server-only write revocation AND harden RLS definitions against cross-school & inactive access.
REVOKE INSERT, UPDATE, DELETE ON public.nominas, public.nomina_conceptos FROM PUBLIC, anon, authenticated;

DROP POLICY IF EXISTS "nominas_super_admin" ON public.nominas;
DROP POLICY IF EXISTS "nominas_admin_escuela" ON public.nominas;
DROP POLICY IF EXISTS "nominas_admin_sede" ON public.nominas;
DROP POLICY IF EXISTS "nominas_administrativo" ON public.nominas;

CREATE POLICY "nominas_super_admin" ON public.nominas FOR ALL TO authenticated
  USING ((SELECT public.is_super_admin()))
  WITH CHECK ((SELECT public.is_super_admin()));

CREATE POLICY "nominas_admin_escuela" ON public.nominas FOR ALL TO authenticated
  USING ((escuela_id = (SELECT public.get_my_escuela_id())) AND (SELECT public.is_admin_escuela()))
  WITH CHECK ((escuela_id = (SELECT public.get_my_escuela_id())) AND (SELECT public.is_admin_escuela()));

CREATE POLICY "nominas_staff_sede" ON public.nominas FOR ALL TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.perfiles p
      WHERE p.id = (SELECT auth.uid())
        AND p.activo = true
        AND p.rol IN ('admin_sede', 'administrativo')
        AND p.escuela_id = nominas.escuela_id
        AND p.sede_id IS NOT NULL
        AND p.sede_id = nominas.sede_id
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.perfiles p
      WHERE p.id = (SELECT auth.uid())
        AND p.activo = true
        AND p.rol IN ('admin_sede', 'administrativo')
        AND p.escuela_id = nominas.escuela_id
        AND p.sede_id IS NOT NULL
        AND p.sede_id = nominas.sede_id
    )
  );

DROP POLICY IF EXISTS "nomina_conceptos_super_admin" ON public.nomina_conceptos;
DROP POLICY IF EXISTS "nomina_conceptos_admin_escuela" ON public.nomina_conceptos;
DROP POLICY IF EXISTS "nomina_conceptos_admin_sede" ON public.nomina_conceptos;
DROP POLICY IF EXISTS "nomina_conceptos_administrativo" ON public.nomina_conceptos;

CREATE POLICY "nomina_conceptos_super_admin" ON public.nomina_conceptos FOR ALL TO authenticated
  USING ((SELECT public.is_super_admin()))
  WITH CHECK ((SELECT public.is_super_admin()));

CREATE POLICY "nomina_conceptos_admin_escuela" ON public.nomina_conceptos FOR ALL TO authenticated
  USING (
    (SELECT public.is_admin_escuela())
    AND EXISTS (
      SELECT 1 FROM public.nominas n
      WHERE n.id = nomina_conceptos.nomina_id
        AND n.escuela_id = (SELECT public.get_my_escuela_id())
    )
  )
  WITH CHECK (
    (SELECT public.is_admin_escuela())
    AND EXISTS (
      SELECT 1 FROM public.nominas n
      WHERE n.id = nomina_conceptos.nomina_id
        AND n.escuela_id = (SELECT public.get_my_escuela_id())
    )
  );

CREATE POLICY "nomina_conceptos_staff_sede" ON public.nomina_conceptos FOR ALL TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.perfiles p
      JOIN public.nominas n ON n.id = nomina_conceptos.nomina_id
      WHERE p.id = (SELECT auth.uid())
        AND p.activo = true
        AND p.rol IN ('admin_sede', 'administrativo')
        AND p.escuela_id = n.escuela_id
        AND p.sede_id IS NOT NULL
        AND p.sede_id = n.sede_id
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.perfiles p
      JOIN public.nominas n ON n.id = nomina_conceptos.nomina_id
      WHERE p.id = (SELECT auth.uid())
        AND p.activo = true
        AND p.rol IN ('admin_sede', 'administrativo')
        AND p.escuela_id = n.escuela_id
        AND p.sede_id IS NOT NULL
        AND p.sede_id = n.sede_id
    )
  );

-- 8. Role-based INSERT/UPDATE/DELETE hardening across operational tables (aligns with role-capabilities & preserves admin creation).

-- GASTOS
DROP POLICY IF EXISTS "Usuarios sede: crean gastos en su sede" ON public.gastos;
DROP POLICY IF EXISTS "Staff sede: crean gastos en su sede" ON public.gastos;
CREATE POLICY "Staff sede: crean gastos en su sede"
  ON public.gastos FOR INSERT TO authenticated
  WITH CHECK (
    sede_id = public.get_my_sede_id()
    AND escuela_id = public.get_my_escuela_id()
    AND (SELECT auth.uid()) = user_id
    AND EXISTS (
      SELECT 1 FROM public.perfiles p
      WHERE p.id = (SELECT auth.uid())
        AND p.activo = true
        AND p.rol IN ('admin_sede', 'administrativo')
    )
  );

DROP POLICY IF EXISTS "Usuarios sede: actualizan gastos de su sede" ON public.gastos;
CREATE POLICY "Staff sede: actualizan gastos de su sede"
  ON public.gastos FOR UPDATE TO authenticated
  USING (
    sede_id = public.get_my_sede_id()
    AND escuela_id = public.get_my_escuela_id()
    AND EXISTS (
      SELECT 1 FROM public.perfiles p
      WHERE p.id = (SELECT auth.uid())
        AND p.activo = true
        AND p.rol IN ('admin_sede', 'administrativo')
    )
  )
  WITH CHECK (
    sede_id = public.get_my_sede_id()
    AND escuela_id = public.get_my_escuela_id()
    AND EXISTS (
      SELECT 1 FROM public.perfiles p
      WHERE p.id = (SELECT auth.uid())
        AND p.activo = true
        AND p.rol IN ('admin_sede', 'administrativo')
    )
  );

DROP POLICY IF EXISTS "Usuarios sede: eliminan gastos de su sede" ON public.gastos;
CREATE POLICY "Admin sede: eliminan gastos de su sede"
  ON public.gastos FOR DELETE TO authenticated
  USING (
    sede_id = public.get_my_sede_id()
    AND escuela_id = public.get_my_escuela_id()
    AND EXISTS (
      SELECT 1 FROM public.perfiles p
      WHERE p.id = (SELECT auth.uid())
        AND p.activo = true
        AND p.rol = 'admin_sede'
    )
  );

-- INGRESOS
DROP POLICY IF EXISTS "Usuarios sede: crean ingresos en su sede" ON public.ingresos;
DROP POLICY IF EXISTS "Staff sede: crean ingresos en su sede" ON public.ingresos;
CREATE POLICY "Staff sede: crean ingresos en su sede"
  ON public.ingresos FOR INSERT TO authenticated
  WITH CHECK (
    sede_id = public.get_my_sede_id()
    AND escuela_id = public.get_my_escuela_id()
    AND (SELECT auth.uid()) = user_id
    AND EXISTS (
      SELECT 1 FROM public.perfiles p
      WHERE p.id = (SELECT auth.uid())
        AND p.activo = true
        AND p.rol IN ('admin_sede', 'administrativo', 'recepcion')
    )
  );

DROP POLICY IF EXISTS "Usuarios sede: actualizan ingresos de su sede" ON public.ingresos;
CREATE POLICY "Staff sede: actualizan ingresos de su sede"
  ON public.ingresos FOR UPDATE TO authenticated
  USING (
    sede_id = public.get_my_sede_id()
    AND escuela_id = public.get_my_escuela_id()
    AND EXISTS (
      SELECT 1 FROM public.perfiles p
      WHERE p.id = (SELECT auth.uid())
        AND p.activo = true
        AND p.rol IN ('admin_sede', 'administrativo', 'recepcion')
    )
  )
  WITH CHECK (
    sede_id = public.get_my_sede_id()
    AND escuela_id = public.get_my_escuela_id()
    AND EXISTS (
      SELECT 1 FROM public.perfiles p
      WHERE p.id = (SELECT auth.uid())
        AND p.activo = true
        AND p.rol IN ('admin_sede', 'administrativo', 'recepcion')
    )
  );

DROP POLICY IF EXISTS "Usuarios sede: eliminan ingresos de su sede" ON public.ingresos;
CREATE POLICY "Admin sede: eliminan ingresos de su sede"
  ON public.ingresos FOR DELETE TO authenticated
  USING (
    sede_id = public.get_my_sede_id()
    AND escuela_id = public.get_my_escuela_id()
    AND EXISTS (
      SELECT 1 FROM public.perfiles p
      WHERE p.id = (SELECT auth.uid())
        AND p.activo = true
        AND p.rol = 'admin_sede'
    )
  );

-- VEHICULOS
DROP POLICY IF EXISTS "Usuarios sede: crean vehiculos en su sede" ON public.vehiculos;
DROP POLICY IF EXISTS "Staff sede: crean vehiculos en su sede" ON public.vehiculos;
CREATE POLICY "Admin sede: crean vehiculos en su sede"
  ON public.vehiculos FOR INSERT TO authenticated
  WITH CHECK (
    sede_id = public.get_my_sede_id()
    AND escuela_id = public.get_my_escuela_id()
    AND (SELECT auth.uid()) = user_id
    AND EXISTS (
      SELECT 1 FROM public.perfiles p
      WHERE p.id = (SELECT auth.uid())
        AND p.activo = true
        AND p.rol = 'admin_sede'
    )
  );

DROP POLICY IF EXISTS "Usuarios sede: actualizan vehiculos de su sede" ON public.vehiculos;
DROP POLICY IF EXISTS "Instructor: actualiza vehiculo asignado" ON public.vehiculos;
CREATE POLICY "Admin sede: actualizan vehiculos de su sede"
  ON public.vehiculos FOR UPDATE TO authenticated
  USING (
    sede_id = public.get_my_sede_id()
    AND escuela_id = public.get_my_escuela_id()
    AND EXISTS (
      SELECT 1 FROM public.perfiles p
      WHERE p.id = (SELECT auth.uid())
        AND p.activo = true
        AND p.rol = 'admin_sede'
    )
  )
  WITH CHECK (
    sede_id = public.get_my_sede_id()
    AND escuela_id = public.get_my_escuela_id()
    AND EXISTS (
      SELECT 1 FROM public.perfiles p
      WHERE p.id = (SELECT auth.uid())
        AND p.activo = true
        AND p.rol = 'admin_sede'
    )
  );

DROP POLICY IF EXISTS "Usuarios sede: eliminan vehiculos de su sede" ON public.vehiculos;
CREATE POLICY "Admin sede: eliminan vehiculos de su sede"
  ON public.vehiculos FOR DELETE TO authenticated
  USING (
    sede_id = public.get_my_sede_id()
    AND escuela_id = public.get_my_escuela_id()
    AND EXISTS (
      SELECT 1 FROM public.perfiles p
      WHERE p.id = (SELECT auth.uid())
        AND p.activo = true
        AND p.rol = 'admin_sede'
    )
  );

DROP POLICY IF EXISTS "Instructores ven vehiculos de su escuela" ON public.vehiculos;
CREATE POLICY "Instructores ven vehiculos de su escuela"
  ON public.vehiculos FOR SELECT TO authenticated
  USING ((SELECT public.is_instructor()) AND (escuela_id = (SELECT public.get_my_escuela_id())));

-- INSTRUCTORES (admins create instructor rows for the new instructor's user_id, so never enforce auth.uid() = user_id)
DROP POLICY IF EXISTS "Usuarios sede: crean instructores en su sede" ON public.instructores;
DROP POLICY IF EXISTS "Staff sede: crean instructores en su sede" ON public.instructores;
CREATE POLICY "Admin sede: crean instructores en su sede"
  ON public.instructores FOR INSERT TO authenticated
  WITH CHECK (
    sede_id = public.get_my_sede_id()
    AND escuela_id = public.get_my_escuela_id()
    AND EXISTS (
      SELECT 1 FROM public.perfiles p
      WHERE p.id = (SELECT auth.uid())
        AND p.activo = true
        AND p.rol = 'admin_sede'
    )
  );

DROP POLICY IF EXISTS "Usuarios sede: actualizan instructores de su sede" ON public.instructores;
CREATE POLICY "Admin sede: actualizan instructores de su sede"
  ON public.instructores FOR UPDATE TO authenticated
  USING (
    sede_id = public.get_my_sede_id()
    AND escuela_id = public.get_my_escuela_id()
    AND EXISTS (
      SELECT 1 FROM public.perfiles p
      WHERE p.id = (SELECT auth.uid())
        AND p.activo = true
        AND p.rol = 'admin_sede'
    )
  )
  WITH CHECK (
    sede_id = public.get_my_sede_id()
    AND escuela_id = public.get_my_escuela_id()
    AND EXISTS (
      SELECT 1 FROM public.perfiles p
      WHERE p.id = (SELECT auth.uid())
        AND p.activo = true
        AND p.rol = 'admin_sede'
    )
  );

DROP POLICY IF EXISTS "Usuarios sede: eliminan instructores de su sede" ON public.instructores;
CREATE POLICY "Admin sede: eliminan instructores de su sede"
  ON public.instructores FOR DELETE TO authenticated
  USING (
    sede_id = public.get_my_sede_id()
    AND escuela_id = public.get_my_escuela_id()
    AND EXISTS (
      SELECT 1 FROM public.perfiles p
      WHERE p.id = (SELECT auth.uid())
        AND p.activo = true
        AND p.rol = 'admin_sede'
    )
  );

-- ALUMNOS (staff creates alumno rows with student's user_id)
DROP POLICY IF EXISTS "Usuarios sede: crean alumnos en su sede" ON public.alumnos;
DROP POLICY IF EXISTS "Staff sede: crean alumnos en su sede" ON public.alumnos;
CREATE POLICY "Staff sede: crean alumnos en su sede"
  ON public.alumnos FOR INSERT TO authenticated
  WITH CHECK (
    sede_id = public.get_my_sede_id()
    AND escuela_id = public.get_my_escuela_id()
    AND EXISTS (
      SELECT 1 FROM public.perfiles p
      WHERE p.id = (SELECT auth.uid())
        AND p.activo = true
        AND p.rol IN ('admin_sede', 'administrativo', 'recepcion')
    )
  );

DROP POLICY IF EXISTS "Usuarios sede: actualizan alumnos de su sede" ON public.alumnos;
CREATE POLICY "Staff sede: actualizan alumnos de su sede"
  ON public.alumnos FOR UPDATE TO authenticated
  USING (
    sede_id = public.get_my_sede_id()
    AND escuela_id = public.get_my_escuela_id()
    AND EXISTS (
      SELECT 1 FROM public.perfiles p
      WHERE p.id = (SELECT auth.uid())
        AND p.activo = true
        AND p.rol IN ('admin_sede', 'administrativo', 'recepcion')
    )
  )
  WITH CHECK (
    sede_id = public.get_my_sede_id()
    AND escuela_id = public.get_my_escuela_id()
    AND EXISTS (
      SELECT 1 FROM public.perfiles p
      WHERE p.id = (SELECT auth.uid())
        AND p.activo = true
        AND p.rol IN ('admin_sede', 'administrativo', 'recepcion')
    )
  );

DROP POLICY IF EXISTS "Usuarios sede: eliminan alumnos de su sede" ON public.alumnos;
CREATE POLICY "Admin sede: eliminan alumnos de su sede"
  ON public.alumnos FOR DELETE TO authenticated
  USING (
    sede_id = public.get_my_sede_id()
    AND escuela_id = public.get_my_escuela_id()
    AND EXISTS (
      SELECT 1 FROM public.perfiles p
      WHERE p.id = (SELECT auth.uid())
        AND p.activo = true
        AND p.rol = 'admin_sede'
    )
  );

-- MATRICULAS_ALUMNO
DROP POLICY IF EXISTS "Usuarios sede: crean matriculas en su sede" ON public.matriculas_alumno;
CREATE POLICY "Staff sede: crean matriculas en su sede"
  ON public.matriculas_alumno FOR INSERT TO authenticated
  WITH CHECK (
    sede_id = public.get_my_sede_id()
    AND escuela_id = public.get_my_escuela_id()
    AND created_by = (SELECT auth.uid())
    AND EXISTS (
      SELECT 1 FROM public.perfiles p
      WHERE p.id = (SELECT auth.uid())
        AND p.activo = true
        AND p.rol IN ('admin_sede', 'administrativo', 'recepcion')
    )
  );

DROP POLICY IF EXISTS "Usuarios sede: actualizan matriculas de su sede" ON public.matriculas_alumno;
CREATE POLICY "Staff sede: actualizan matriculas de su sede"
  ON public.matriculas_alumno FOR UPDATE TO authenticated
  USING (
    sede_id = public.get_my_sede_id()
    AND escuela_id = public.get_my_escuela_id()
    AND EXISTS (
      SELECT 1 FROM public.perfiles p
      WHERE p.id = (SELECT auth.uid())
        AND p.activo = true
        AND p.rol IN ('admin_sede', 'administrativo', 'recepcion')
    )
  )
  WITH CHECK (
    sede_id = public.get_my_sede_id()
    AND escuela_id = public.get_my_escuela_id()
    AND EXISTS (
      SELECT 1 FROM public.perfiles p
      WHERE p.id = (SELECT auth.uid())
        AND p.activo = true
        AND p.rol IN ('admin_sede', 'administrativo', 'recepcion')
    )
  );

DROP POLICY IF EXISTS "Usuarios sede: eliminan matriculas de su sede" ON public.matriculas_alumno;
CREATE POLICY "Admin sede: eliminan matriculas de su sede"
  ON public.matriculas_alumno FOR DELETE TO authenticated
  USING (
    sede_id = public.get_my_sede_id()
    AND escuela_id = public.get_my_escuela_id()
    AND EXISTS (
      SELECT 1 FROM public.perfiles p
      WHERE p.id = (SELECT auth.uid())
        AND p.activo = true
        AND p.rol = 'admin_sede'
    )
  );

-- CLASES
DROP POLICY IF EXISTS "Usuarios sede: crean clases en su sede" ON public.clases;
DROP POLICY IF EXISTS "Staff e instructores sede: crean clases en su sede" ON public.clases;
CREATE POLICY "Staff e instructores sede: crean clases en su sede"
  ON public.clases FOR INSERT TO authenticated
  WITH CHECK (
    sede_id = public.get_my_sede_id()
    AND escuela_id = public.get_my_escuela_id()
    AND (SELECT auth.uid()) = user_id
    AND EXISTS (
      SELECT 1 FROM public.perfiles p
      WHERE p.id = (SELECT auth.uid())
        AND p.activo = true
        AND (
          p.rol IN ('admin_sede', 'administrativo', 'recepcion')
          OR (p.rol = 'instructor' AND instructor_id = public.get_my_instructor_id())
        )
    )
  );

DROP POLICY IF EXISTS "Usuarios sede: actualizan clases de su sede" ON public.clases;
CREATE POLICY "Staff e instructores sede: actualizan clases de su sede"
  ON public.clases FOR UPDATE TO authenticated
  USING (
    sede_id = public.get_my_sede_id()
    AND escuela_id = public.get_my_escuela_id()
    AND EXISTS (
      SELECT 1 FROM public.perfiles p
      WHERE p.id = (SELECT auth.uid())
        AND p.activo = true
        AND (
          p.rol IN ('admin_sede', 'administrativo', 'recepcion')
          OR (p.rol = 'instructor' AND instructor_id = public.get_my_instructor_id())
        )
    )
  )
  WITH CHECK (
    sede_id = public.get_my_sede_id()
    AND escuela_id = public.get_my_escuela_id()
    AND EXISTS (
      SELECT 1 FROM public.perfiles p
      WHERE p.id = (SELECT auth.uid())
        AND p.activo = true
        AND (
          p.rol IN ('admin_sede', 'administrativo', 'recepcion')
          OR (p.rol = 'instructor' AND instructor_id = public.get_my_instructor_id())
        )
    )
  );

DROP POLICY IF EXISTS "Usuarios sede: eliminan clases de su sede" ON public.clases;
CREATE POLICY "Staff sede: eliminan clases de su sede"
  ON public.clases FOR DELETE TO authenticated
  USING (
    sede_id = public.get_my_sede_id()
    AND escuela_id = public.get_my_escuela_id()
    AND EXISTS (
      SELECT 1 FROM public.perfiles p
      WHERE p.id = (SELECT auth.uid())
        AND p.activo = true
        AND p.rol IN ('admin_sede', 'administrativo')
    )
  );

-- EXAMENES & RESPUESTAS_EXAMEN
DROP POLICY IF EXISTS "Usuarios sede: crean examenes en su sede" ON public.examenes;
DROP POLICY IF EXISTS "Staff e instructores sede: crean examenes en su sede" ON public.examenes;
CREATE POLICY "Staff e instructores sede: crean examenes en su sede"
  ON public.examenes FOR INSERT TO authenticated
  WITH CHECK (
    sede_id = public.get_my_sede_id()
    AND escuela_id = public.get_my_escuela_id()
    AND (SELECT auth.uid()) = user_id
    AND EXISTS (
      SELECT 1 FROM public.perfiles p
      WHERE p.id = (SELECT auth.uid())
        AND p.activo = true
        AND p.rol IN ('admin_sede', 'administrativo', 'instructor')
    )
  );

DROP POLICY IF EXISTS "Usuarios sede: actualizan examenes de su sede" ON public.examenes;
CREATE POLICY "Staff e instructores sede: actualizan examenes de su sede"
  ON public.examenes FOR UPDATE TO authenticated
  USING (
    sede_id = public.get_my_sede_id()
    AND escuela_id = public.get_my_escuela_id()
    AND EXISTS (
      SELECT 1 FROM public.perfiles p
      WHERE p.id = (SELECT auth.uid())
        AND p.activo = true
        AND p.rol IN ('admin_sede', 'administrativo', 'instructor')
    )
  )
  WITH CHECK (
    sede_id = public.get_my_sede_id()
    AND escuela_id = public.get_my_escuela_id()
    AND EXISTS (
      SELECT 1 FROM public.perfiles p
      WHERE p.id = (SELECT auth.uid())
        AND p.activo = true
        AND p.rol IN ('admin_sede', 'administrativo', 'instructor')
    )
  );

DROP POLICY IF EXISTS "Usuarios sede: eliminan examenes de su sede" ON public.examenes;
CREATE POLICY "Admin sede: eliminan examenes de su sede"
  ON public.examenes FOR DELETE TO authenticated
  USING (
    sede_id = public.get_my_sede_id()
    AND escuela_id = public.get_my_escuela_id()
    AND EXISTS (
      SELECT 1 FROM public.perfiles p
      WHERE p.id = (SELECT auth.uid())
        AND p.activo = true
        AND p.rol = 'admin_sede'
    )
  );

DROP POLICY IF EXISTS "Usuarios sede: crean respuestas en su sede" ON public.respuestas_examen;
CREATE POLICY "Staff e instructores sede: crean respuestas en su sede"
  ON public.respuestas_examen FOR INSERT TO authenticated
  WITH CHECK (
    sede_id = public.get_my_sede_id()
    AND escuela_id = public.get_my_escuela_id()
    AND EXISTS (
      SELECT 1 FROM public.perfiles p
      WHERE p.id = (SELECT auth.uid())
        AND p.activo = true
        AND p.rol IN ('admin_sede', 'administrativo', 'instructor')
    )
  );

-- HORAS_TRABAJO
DROP POLICY IF EXISTS "Usuarios sede: gestionan horas_trabajo de su sede" ON public.horas_trabajo;
CREATE POLICY "Staff sede: gestionan horas_trabajo de su sede"
  ON public.horas_trabajo FOR ALL TO authenticated
  USING (
    sede_id = public.get_my_sede_id()
    AND escuela_id = public.get_my_escuela_id()
    AND EXISTS (
      SELECT 1 FROM public.perfiles p
      WHERE p.id = (SELECT auth.uid())
        AND p.activo = true
        AND p.rol IN ('admin_sede', 'administrativo')
    )
  )
  WITH CHECK (
    sede_id = public.get_my_sede_id()
    AND escuela_id = public.get_my_escuela_id()
    AND EXISTS (
      SELECT 1 FROM public.perfiles p
      WHERE p.id = (SELECT auth.uid())
        AND p.activo = true
        AND p.rol IN ('admin_sede', 'administrativo')
    )
  );

DROP POLICY IF EXISTS "Instructor: lee sus propias horas" ON public.horas_trabajo;
CREATE POLICY "Instructor: lee sus propias horas"
  ON public.horas_trabajo FOR SELECT TO authenticated
  USING (
    (SELECT public.is_instructor())
    AND instructor_id = (SELECT public.get_my_instructor_id())
  );

-- MANTENIMIENTO_VEHICULOS (scoped by vehiculo.escuela_id to eliminate cross-tenant link)
DROP POLICY IF EXISTS "Admin escuela: gestiona mantenimiento de su escuela" ON public.mantenimiento_vehiculos;
CREATE POLICY "Admin escuela: gestiona mantenimiento de su escuela"
  ON public.mantenimiento_vehiculos FOR ALL TO authenticated
  USING (
    escuela_id = public.get_my_escuela_id()
    AND public.is_admin_escuela()
  )
  WITH CHECK (
    escuela_id = public.get_my_escuela_id()
    AND public.is_admin_escuela()
    AND EXISTS (
      SELECT 1 FROM public.vehiculos v
      WHERE v.id = vehiculo_id AND v.escuela_id = escuela_id
    )
  );

DROP POLICY IF EXISTS "Usuarios sede: crean mantenimiento en su sede" ON public.mantenimiento_vehiculos;
CREATE POLICY "Staff sede: crean mantenimiento en su sede"
  ON public.mantenimiento_vehiculos FOR INSERT TO authenticated
  WITH CHECK (
    sede_id = public.get_my_sede_id()
    AND escuela_id = public.get_my_escuela_id()
    AND (SELECT auth.uid()) = user_id
    AND EXISTS (
      SELECT 1 FROM public.perfiles p
      WHERE p.id = (SELECT auth.uid())
        AND p.activo = true
        AND p.rol IN ('admin_sede', 'administrativo')
    )
    AND EXISTS (
      SELECT 1 FROM public.vehiculos v
      WHERE v.id = vehiculo_id AND v.escuela_id = escuela_id
    )
  );

DROP POLICY IF EXISTS "Usuarios sede: actualizan mantenimiento de su sede" ON public.mantenimiento_vehiculos;
CREATE POLICY "Staff sede: actualizan mantenimiento de su sede"
  ON public.mantenimiento_vehiculos FOR UPDATE TO authenticated
  USING (
    sede_id = public.get_my_sede_id()
    AND escuela_id = public.get_my_escuela_id()
    AND EXISTS (
      SELECT 1 FROM public.perfiles p
      WHERE p.id = (SELECT auth.uid())
        AND p.activo = true
        AND p.rol IN ('admin_sede', 'administrativo')
    )
  )
  WITH CHECK (
    sede_id = public.get_my_sede_id()
    AND escuela_id = public.get_my_escuela_id()
    AND EXISTS (
      SELECT 1 FROM public.perfiles p
      WHERE p.id = (SELECT auth.uid())
        AND p.activo = true
        AND p.rol IN ('admin_sede', 'administrativo')
    )
    AND EXISTS (
      SELECT 1 FROM public.vehiculos v
      WHERE v.id = vehiculo_id AND v.escuela_id = escuela_id
    )
  );

DROP POLICY IF EXISTS "Usuarios sede: eliminan mantenimiento de su sede" ON public.mantenimiento_vehiculos;
CREATE POLICY "Admin sede: eliminan mantenimiento de su sede"
  ON public.mantenimiento_vehiculos FOR DELETE TO authenticated
  USING (
    sede_id = public.get_my_sede_id()
    AND escuela_id = public.get_my_escuela_id()
    AND EXISTS (
      SELECT 1 FROM public.perfiles p
      WHERE p.id = (SELECT auth.uid())
        AND p.activo = true
        AND p.rol = 'admin_sede'
    )
  );

DROP POLICY IF EXISTS "Instructor: crea mantenimiento" ON public.mantenimiento_vehiculos;
CREATE POLICY "Instructor: crea mantenimiento"
  ON public.mantenimiento_vehiculos FOR INSERT TO authenticated
  WITH CHECK (
    public.is_instructor()
    AND instructor_id = public.get_my_instructor_id()
    AND escuela_id = public.get_my_escuela_id()
    AND sede_id = public.get_my_sede_id()
    AND (SELECT auth.uid()) = user_id
    AND EXISTS (
      SELECT 1 FROM public.vehiculos v
      WHERE v.id = vehiculo_id AND v.escuela_id = escuela_id
    )
  );

DROP POLICY IF EXISTS "Instructor: actualiza su mantenimiento" ON public.mantenimiento_vehiculos;
CREATE POLICY "Instructor: actualiza su mantenimiento"
  ON public.mantenimiento_vehiculos FOR UPDATE TO authenticated
  USING (
    public.is_instructor()
    AND instructor_id = public.get_my_instructor_id()
    AND escuela_id = public.get_my_escuela_id()
    AND sede_id = public.get_my_sede_id()
  )
  WITH CHECK (
    public.is_instructor()
    AND instructor_id = public.get_my_instructor_id()
    AND escuela_id = public.get_my_escuela_id()
    AND sede_id = public.get_my_sede_id()
    AND EXISTS (
      SELECT 1 FROM public.vehiculos v
      WHERE v.id = vehiculo_id AND v.escuela_id = escuela_id
    )
  );

NOTIFY pgrst, 'reload schema';
