-- ============================================================
-- Migración 011: Hardening de seguridad
-- ============================================================
--
-- Cambios aplicados:
--
-- 1. FUNCIONES HELPER
--    · auth.uid() → (SELECT auth.uid()) en todas las funciones
--    · Añadir SET search_path = public para evitar search-path injection
--
-- 2. REVOKE EXECUTE en funciones sensibles
--    · Funciones helper (is_super_admin, get_my_*, etc.): REVOKE FROM anon
--      (authenticated las sigue usando internamente via RLS)
--    · Funciones de trigger (handle_new_user, etc.): REVOKE FROM anon, authenticated
--      (nunca deben ser llamadas directamente por la API)
--
-- 3. POLÍTICAS FOR ALL: agregar WITH CHECK explícito
--    (sin WITH CHECK, PostgreSQL usa USING como fallback pero no lo declara)
--
-- 4. POLÍTICAS con auth.uid() directo → (SELECT auth.uid())
--    (evita evaluaciones múltiples y mejora rendimiento del planificador)
--
-- 5. TRIGGER: EXECUTE PROCEDURE → EXECUTE FUNCTION (sintaxis moderna PG 11+)
--
-- NOTA: La columna "año" en vehiculos contiene el carácter 'ñ' que causa
--       un Parser error en el generador de tipos TypeScript de Supabase.
--       Para renombrarla (requiere actualizar código TypeScript):
--         ALTER TABLE public.vehiculos RENAME COLUMN "año" TO anio;
--       No se aplica aquí para no romper código existente.
-- ============================================================


-- ============================================================
-- 1. RECREAR FUNCIONES HELPER
--    · (SELECT auth.uid()) en lugar de auth.uid()
--    · SET search_path = public
-- ============================================================

CREATE OR REPLACE FUNCTION public.is_super_admin()
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM public.perfiles
    WHERE id = (SELECT auth.uid()) AND rol = 'super_admin'
  );
END;
$$;

CREATE OR REPLACE FUNCTION public.get_my_escuela_id()
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RETURN (
    SELECT escuela_id FROM public.perfiles
    WHERE id = (SELECT auth.uid())
  );
END;
$$;

CREATE OR REPLACE FUNCTION public.get_my_sede_id()
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RETURN (
    SELECT sede_id FROM public.perfiles
    WHERE id = (SELECT auth.uid())
  );
END;
$$;

CREATE OR REPLACE FUNCTION public.is_admin_escuela()
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM public.perfiles
    WHERE id = (SELECT auth.uid()) AND rol = 'admin_escuela'
  );
END;
$$;

CREATE OR REPLACE FUNCTION public.is_instructor()
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM public.perfiles
    WHERE id = (SELECT auth.uid()) AND rol = 'instructor'
  );
END;
$$;

CREATE OR REPLACE FUNCTION public.get_my_instructor_id()
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RETURN (
    SELECT id FROM public.instructores
    WHERE user_id = (SELECT auth.uid())
    LIMIT 1
  );
END;
$$;

CREATE OR REPLACE FUNCTION public.is_alumno()
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM public.perfiles
    WHERE id = (SELECT auth.uid()) AND rol = 'alumno'
  );
END;
$$;

CREATE OR REPLACE FUNCTION public.get_my_alumno_id()
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RETURN (
    SELECT id FROM public.alumnos
    WHERE user_id = (SELECT auth.uid())
    LIMIT 1
  );
END;
$$;

-- Funciones trigger: también añadir SET search_path

CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  nueva_escuela_id uuid;
  nueva_sede_id    uuid;
BEGIN
  -- 1. Crear la escuela
  INSERT INTO public.escuelas (nombre, email)
  VALUES (
    COALESCE(new.raw_user_meta_data->>'escuela', 'Mi Autoescuela'),
    new.email
  )
  RETURNING id INTO nueva_escuela_id;

  -- 2. Crear sede principal automáticamente
  INSERT INTO public.sedes (escuela_id, nombre, es_principal, email)
  VALUES (
    nueva_escuela_id,
    'Sede Principal',
    true,
    new.email
  )
  RETURNING id INTO nueva_sede_id;

  -- 3. Crear perfil como admin_escuela vinculado a escuela y sede
  INSERT INTO public.perfiles (id, escuela_id, sede_id, nombre, email, rol)
  VALUES (
    new.id,
    nueva_escuela_id,
    nueva_sede_id,
    COALESCE(new.raw_user_meta_data->>'nombre', ''),
    new.email,
    'admin_escuela'
  );

  RETURN new;
END;
$$;

CREATE OR REPLACE FUNCTION public.insert_gasto_from_mantenimiento()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
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

CREATE OR REPLACE FUNCTION public.update_vehiculo_kilometraje()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NEW.kilometraje_actual IS NOT NULL THEN
    UPDATE public.vehiculos
    SET kilometraje = NEW.kilometraje_actual
    WHERE id = NEW.vehiculo_id
      AND (kilometraje IS NULL OR kilometraje < NEW.kilometraje_actual);
  END IF;
  RETURN NEW;
END;
$$;


-- ============================================================
-- 2. REVOKE EXECUTE EN FUNCIONES SENSIBLES
-- ============================================================

-- Funciones helper: los usuarios anónimos no deben llamarlas via RPC.
-- Los usuarios authenticated las usan de forma implícita via RLS.
REVOKE EXECUTE ON FUNCTION public.is_super_admin()        FROM anon;
REVOKE EXECUTE ON FUNCTION public.get_my_escuela_id()     FROM anon;
REVOKE EXECUTE ON FUNCTION public.get_my_sede_id()        FROM anon;
REVOKE EXECUTE ON FUNCTION public.is_admin_escuela()      FROM anon;
REVOKE EXECUTE ON FUNCTION public.is_instructor()         FROM anon;
REVOKE EXECUTE ON FUNCTION public.get_my_instructor_id()  FROM anon;
REVOKE EXECUTE ON FUNCTION public.is_alumno()             FROM anon;
REVOKE EXECUTE ON FUNCTION public.get_my_alumno_id()      FROM anon;

-- Funciones de trigger: NUNCA deben ser llamadas directamente via API.
REVOKE EXECUTE ON FUNCTION public.handle_new_user()                    FROM anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.insert_gasto_from_mantenimiento()    FROM anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.update_vehiculo_kilometraje()        FROM anon, authenticated;


-- ============================================================
-- 3. POLÍTICAS FOR ALL: WITH CHECK EXPLÍCITO
-- ============================================================

-- ========== ESCUELAS ==========
DROP POLICY IF EXISTS "Super admin: gestiona escuelas" ON public.escuelas;
CREATE POLICY "Super admin: gestiona escuelas"
  ON public.escuelas FOR ALL
  USING     (public.is_super_admin())
  WITH CHECK (public.is_super_admin());

-- ========== SEDES ==========
DROP POLICY IF EXISTS "Super admin: gestiona sedes" ON public.sedes;
CREATE POLICY "Super admin: gestiona sedes"
  ON public.sedes FOR ALL
  USING     (public.is_super_admin())
  WITH CHECK (public.is_super_admin());

DROP POLICY IF EXISTS "Admin escuela: gestiona sedes de su escuela" ON public.sedes;
CREATE POLICY "Admin escuela: gestiona sedes de su escuela"
  ON public.sedes FOR ALL
  USING     (escuela_id = public.get_my_escuela_id() AND public.is_admin_escuela())
  WITH CHECK (escuela_id = public.get_my_escuela_id() AND public.is_admin_escuela());

-- ========== PERFILES ==========
DROP POLICY IF EXISTS "Super admin: gestiona perfiles" ON public.perfiles;
CREATE POLICY "Super admin: gestiona perfiles"
  ON public.perfiles FOR ALL
  USING     (public.is_super_admin())
  WITH CHECK (public.is_super_admin());

DROP POLICY IF EXISTS "Admin escuela: gestiona perfiles de su escuela" ON public.perfiles;
CREATE POLICY "Admin escuela: gestiona perfiles de su escuela"
  ON public.perfiles FOR ALL
  USING     (escuela_id = public.get_my_escuela_id() AND public.is_admin_escuela())
  WITH CHECK (escuela_id = public.get_my_escuela_id() AND public.is_admin_escuela());

-- ========== ALUMNOS ==========
DROP POLICY IF EXISTS "Super admin: gestiona alumnos" ON public.alumnos;
CREATE POLICY "Super admin: gestiona alumnos"
  ON public.alumnos FOR ALL
  USING     (public.is_super_admin())
  WITH CHECK (public.is_super_admin());

DROP POLICY IF EXISTS "Admin escuela: gestiona alumnos de su escuela" ON public.alumnos;
CREATE POLICY "Admin escuela: gestiona alumnos de su escuela"
  ON public.alumnos FOR ALL
  USING     (escuela_id = public.get_my_escuela_id() AND public.is_admin_escuela())
  WITH CHECK (escuela_id = public.get_my_escuela_id() AND public.is_admin_escuela());

-- ========== INSTRUCTORES ==========
DROP POLICY IF EXISTS "Super admin: gestiona instructores" ON public.instructores;
CREATE POLICY "Super admin: gestiona instructores"
  ON public.instructores FOR ALL
  USING     (public.is_super_admin())
  WITH CHECK (public.is_super_admin());

DROP POLICY IF EXISTS "Admin escuela: gestiona instructores de su escuela" ON public.instructores;
CREATE POLICY "Admin escuela: gestiona instructores de su escuela"
  ON public.instructores FOR ALL
  USING     (escuela_id = public.get_my_escuela_id() AND public.is_admin_escuela())
  WITH CHECK (escuela_id = public.get_my_escuela_id() AND public.is_admin_escuela());

-- ========== VEHÍCULOS ==========
DROP POLICY IF EXISTS "Super admin: gestiona vehiculos" ON public.vehiculos;
CREATE POLICY "Super admin: gestiona vehiculos"
  ON public.vehiculos FOR ALL
  USING     (public.is_super_admin())
  WITH CHECK (public.is_super_admin());

DROP POLICY IF EXISTS "Admin escuela: gestiona vehiculos de su escuela" ON public.vehiculos;
CREATE POLICY "Admin escuela: gestiona vehiculos de su escuela"
  ON public.vehiculos FOR ALL
  USING     (escuela_id = public.get_my_escuela_id() AND public.is_admin_escuela())
  WITH CHECK (escuela_id = public.get_my_escuela_id() AND public.is_admin_escuela());

-- ========== CLASES ==========
DROP POLICY IF EXISTS "Super admin: gestiona clases" ON public.clases;
CREATE POLICY "Super admin: gestiona clases"
  ON public.clases FOR ALL
  USING     (public.is_super_admin())
  WITH CHECK (public.is_super_admin());

DROP POLICY IF EXISTS "Admin escuela: gestiona clases de su escuela" ON public.clases;
CREATE POLICY "Admin escuela: gestiona clases de su escuela"
  ON public.clases FOR ALL
  USING     (escuela_id = public.get_my_escuela_id() AND public.is_admin_escuela())
  WITH CHECK (escuela_id = public.get_my_escuela_id() AND public.is_admin_escuela());

-- ========== EXÁMENES ==========
DROP POLICY IF EXISTS "Super admin: gestiona examenes" ON public.examenes;
CREATE POLICY "Super admin: gestiona examenes"
  ON public.examenes FOR ALL
  USING     (public.is_super_admin())
  WITH CHECK (public.is_super_admin());

DROP POLICY IF EXISTS "Admin escuela: gestiona examenes de su escuela" ON public.examenes;
CREATE POLICY "Admin escuela: gestiona examenes de su escuela"
  ON public.examenes FOR ALL
  USING     (escuela_id = public.get_my_escuela_id() AND public.is_admin_escuela())
  WITH CHECK (escuela_id = public.get_my_escuela_id() AND public.is_admin_escuela());

-- ========== GASTOS ==========
DROP POLICY IF EXISTS "Super admin: gestiona gastos" ON public.gastos;
CREATE POLICY "Super admin: gestiona gastos"
  ON public.gastos FOR ALL
  USING     (public.is_super_admin())
  WITH CHECK (public.is_super_admin());

DROP POLICY IF EXISTS "Admin escuela: gestiona gastos de su escuela" ON public.gastos;
CREATE POLICY "Admin escuela: gestiona gastos de su escuela"
  ON public.gastos FOR ALL
  USING     (escuela_id = public.get_my_escuela_id() AND public.is_admin_escuela())
  WITH CHECK (escuela_id = public.get_my_escuela_id() AND public.is_admin_escuela());

-- ========== INGRESOS ==========
DROP POLICY IF EXISTS "Super admin: gestiona ingresos" ON public.ingresos;
CREATE POLICY "Super admin: gestiona ingresos"
  ON public.ingresos FOR ALL
  USING     (public.is_super_admin())
  WITH CHECK (public.is_super_admin());

DROP POLICY IF EXISTS "Admin escuela: gestiona ingresos de su escuela" ON public.ingresos;
CREATE POLICY "Admin escuela: gestiona ingresos de su escuela"
  ON public.ingresos FOR ALL
  USING     (escuela_id = public.get_my_escuela_id() AND public.is_admin_escuela())
  WITH CHECK (escuela_id = public.get_my_escuela_id() AND public.is_admin_escuela());

-- ========== CATEGORÍAS EXAMEN ==========
DROP POLICY IF EXISTS "Solo super admin gestiona categorias" ON public.categorias_examen;
CREATE POLICY "Solo super admin gestiona categorias"
  ON public.categorias_examen FOR ALL
  USING     (public.is_super_admin())
  WITH CHECK (public.is_super_admin());

-- ========== PREGUNTAS EXAMEN ==========
DROP POLICY IF EXISTS "Solo super admin gestiona preguntas" ON public.preguntas_examen;
CREATE POLICY "Solo super admin gestiona preguntas"
  ON public.preguntas_examen FOR ALL
  USING     (public.is_super_admin())
  WITH CHECK (public.is_super_admin());

-- ========== RESPUESTAS EXAMEN ==========
DROP POLICY IF EXISTS "Super admin: gestiona respuestas" ON public.respuestas_examen;
CREATE POLICY "Super admin: gestiona respuestas"
  ON public.respuestas_examen FOR ALL
  USING     (public.is_super_admin())
  WITH CHECK (public.is_super_admin());

-- ========== MANTENIMIENTO VEHÍCULOS ==========
DROP POLICY IF EXISTS "Super admin: gestiona mantenimiento" ON public.mantenimiento_vehiculos;
CREATE POLICY "Super admin: gestiona mantenimiento"
  ON public.mantenimiento_vehiculos FOR ALL
  USING     (public.is_super_admin())
  WITH CHECK (public.is_super_admin());

DROP POLICY IF EXISTS "Admin escuela: gestiona mantenimiento de su escuela" ON public.mantenimiento_vehiculos;
CREATE POLICY "Admin escuela: gestiona mantenimiento de su escuela"
  ON public.mantenimiento_vehiculos FOR ALL
  USING     (escuela_id = public.get_my_escuela_id() AND public.is_admin_escuela())
  WITH CHECK (escuela_id = public.get_my_escuela_id() AND public.is_admin_escuela());

-- ========== ACTIVIDAD LOG ==========
DROP POLICY IF EXISTS "Super admin: gestiona log" ON public.actividad_log;
CREATE POLICY "Super admin: gestiona log"
  ON public.actividad_log FOR ALL
  USING     (public.is_super_admin())
  WITH CHECK (public.is_super_admin());


-- ============================================================
-- 4. POLÍTICAS CON auth.uid() DIRECTO → (SELECT auth.uid())
-- ============================================================

-- ── PERFILES ──
DROP POLICY IF EXISTS "Alumno: ve solo su perfil" ON public.perfiles;
CREATE POLICY "Alumno: ve solo su perfil"
  ON public.perfiles FOR SELECT
  USING (public.is_alumno() AND id = (SELECT auth.uid()));

DROP POLICY IF EXISTS "Usuarios: actualizan su propio perfil" ON public.perfiles;
CREATE POLICY "Usuarios: actualizan su propio perfil"
  ON public.perfiles FOR UPDATE
  USING     ((SELECT auth.uid()) = id)
  WITH CHECK ((SELECT auth.uid()) = id);

-- ── ALUMNOS ──
DROP POLICY IF EXISTS "Alumno: ve solo su registro" ON public.alumnos;
CREATE POLICY "Alumno: ve solo su registro"
  ON public.alumnos FOR SELECT
  USING (public.is_alumno() AND user_id = (SELECT auth.uid()));

DROP POLICY IF EXISTS "Usuarios sede: crean alumnos en su sede" ON public.alumnos;
CREATE POLICY "Usuarios sede: crean alumnos en su sede"
  ON public.alumnos FOR INSERT
  WITH CHECK (
    sede_id    = public.get_my_sede_id()
    AND escuela_id = public.get_my_escuela_id()
    AND (SELECT auth.uid()) = user_id
  );

-- ── INSTRUCTORES ──
DROP POLICY IF EXISTS "Usuarios sede: crean instructores en su sede" ON public.instructores;
CREATE POLICY "Usuarios sede: crean instructores en su sede"
  ON public.instructores FOR INSERT
  WITH CHECK (
    sede_id    = public.get_my_sede_id()
    AND escuela_id = public.get_my_escuela_id()
    AND (SELECT auth.uid()) = user_id
  );

-- ── VEHÍCULOS ──
DROP POLICY IF EXISTS "Usuarios sede: crean vehiculos en su sede" ON public.vehiculos;
CREATE POLICY "Usuarios sede: crean vehiculos en su sede"
  ON public.vehiculos FOR INSERT
  WITH CHECK (
    sede_id    = public.get_my_sede_id()
    AND escuela_id = public.get_my_escuela_id()
    AND (SELECT auth.uid()) = user_id
  );

-- ── CLASES ──
DROP POLICY IF EXISTS "Usuarios sede: crean clases en su sede" ON public.clases;
CREATE POLICY "Usuarios sede: crean clases en su sede"
  ON public.clases FOR INSERT
  WITH CHECK (
    sede_id    = public.get_my_sede_id()
    AND escuela_id = public.get_my_escuela_id()
    AND (SELECT auth.uid()) = user_id
  );

-- ── EXÁMENES ──
DROP POLICY IF EXISTS "Usuarios sede: crean examenes en su sede" ON public.examenes;
CREATE POLICY "Usuarios sede: crean examenes en su sede"
  ON public.examenes FOR INSERT
  WITH CHECK (
    sede_id    = public.get_my_sede_id()
    AND escuela_id = public.get_my_escuela_id()
    AND (SELECT auth.uid()) = user_id
  );

-- ── GASTOS ──
DROP POLICY IF EXISTS "Usuarios sede: crean gastos en su sede" ON public.gastos;
CREATE POLICY "Usuarios sede: crean gastos en su sede"
  ON public.gastos FOR INSERT
  WITH CHECK (
    sede_id    = public.get_my_sede_id()
    AND escuela_id = public.get_my_escuela_id()
    AND (SELECT auth.uid()) = user_id
  );

-- ── INGRESOS ──
DROP POLICY IF EXISTS "Usuarios sede: crean ingresos en su sede" ON public.ingresos;
CREATE POLICY "Usuarios sede: crean ingresos en su sede"
  ON public.ingresos FOR INSERT
  WITH CHECK (
    sede_id    = public.get_my_sede_id()
    AND escuela_id = public.get_my_escuela_id()
    AND (SELECT auth.uid()) = user_id
  );

-- ── ACTIVIDAD LOG ──
DROP POLICY IF EXISTS "Sistema: inserta log" ON public.actividad_log;
CREATE POLICY "Sistema: inserta log"
  ON public.actividad_log FOR INSERT
  WITH CHECK ((SELECT auth.uid()) = user_id);


-- ============================================================
-- 5. TRIGGER: EXECUTE PROCEDURE → EXECUTE FUNCTION
-- ============================================================
-- El trigger on_auth_user_created usaba la sintaxis deprecada "EXECUTE PROCEDURE"
-- (válida hasta PG 10, reemplazada por "EXECUTE FUNCTION" en PG 11+).
-- Los triggers mantenimiento_to_gasto y mantenimiento_actualiza_km
-- ya usan EXECUTE FUNCTION — no requieren cambio.

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();
