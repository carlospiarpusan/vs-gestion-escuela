-- ================================================================
-- Migración 014: Tabla horas_trabajo
--
-- Registra las horas trabajadas por cada instructor en cada día.
-- Una fila por combinación única (instructor_id, fecha).
-- Las páginas leen/escriben con upsert; al poner 0 horas se borra.
-- ================================================================

CREATE TABLE IF NOT EXISTS public.horas_trabajo (
  id            uuid        DEFAULT gen_random_uuid() PRIMARY KEY,
  escuela_id    uuid        NOT NULL REFERENCES public.escuelas(id)     ON DELETE CASCADE,
  sede_id       uuid        NOT NULL REFERENCES public.sedes(id)        ON DELETE CASCADE,
  instructor_id uuid        NOT NULL REFERENCES public.instructores(id) ON DELETE CASCADE,
  fecha         date        NOT NULL,
  horas         numeric(4,1) NOT NULL DEFAULT 0 CHECK (horas > 0 AND horas <= 24),
  created_at    timestamptz DEFAULT now(),

  UNIQUE (instructor_id, fecha)
);

-- Índices para consultas por mes / escuela / instructor
CREATE INDEX IF NOT EXISTS horas_trabajo_escuela_idx
  ON public.horas_trabajo (escuela_id);

CREATE INDEX IF NOT EXISTS horas_trabajo_instructor_idx
  ON public.horas_trabajo (instructor_id);

CREATE INDEX IF NOT EXISTS horas_trabajo_fecha_idx
  ON public.horas_trabajo (fecha);

-- Activar RLS
ALTER TABLE public.horas_trabajo ENABLE ROW LEVEL SECURITY;

-- ── Políticas RLS ──────────────────────────────────────────────

-- Super admin: acceso total
CREATE POLICY "Super admin: gestiona horas_trabajo"
  ON public.horas_trabajo FOR ALL
  USING  (public.is_super_admin())
  WITH CHECK (public.is_super_admin());

-- Admin escuela: gestiona las de su escuela
CREATE POLICY "Admin escuela: gestiona horas_trabajo de su escuela"
  ON public.horas_trabajo FOR ALL
  USING  (escuela_id = public.get_my_escuela_id() AND public.is_admin_escuela())
  WITH CHECK (escuela_id = public.get_my_escuela_id() AND public.is_admin_escuela());

-- Usuarios de sede (admin_sede, administrativo): gestionan las de su sede
CREATE POLICY "Usuarios sede: gestionan horas_trabajo de su sede"
  ON public.horas_trabajo FOR ALL
  USING (
    sede_id       = public.get_my_sede_id()
    AND escuela_id = public.get_my_escuela_id()
    AND NOT public.is_alumno()
    AND NOT public.is_instructor()
  )
  WITH CHECK (
    sede_id       = public.get_my_sede_id()
    AND escuela_id = public.get_my_escuela_id()
    AND NOT public.is_alumno()
    AND NOT public.is_instructor()
  );

-- Instructor: solo puede leer sus propias horas
CREATE POLICY "Instructor: lee sus propias horas"
  ON public.horas_trabajo FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.instructores
      WHERE  id      = instructor_id
        AND  user_id = (SELECT auth.uid())
    )
  );
