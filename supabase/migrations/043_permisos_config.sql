-- =============================================================
-- 043: Tabla de configuración de permisos por rol
-- Permite al super_admin personalizar la matriz de capacidades
-- =============================================================

CREATE TABLE IF NOT EXISTS public.permisos_config (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  rol text NOT NULL,
  module_id text NOT NULL,
  state text NOT NULL CHECK (state IN ('full', 'scoped', 'readonly', 'none')),
  scope text NOT NULL CHECK (scope IN ('platform', 'school', 'branch', 'self', 'none')),
  actions text[] NOT NULL DEFAULT '{}',
  note text,
  updated_by uuid,
  updated_at timestamptz DEFAULT now(),
  UNIQUE(rol, module_id)
);

-- RLS
ALTER TABLE public.permisos_config ENABLE ROW LEVEL SECURITY;

-- Lectura: cualquier rol auditado puede consultar
CREATE POLICY permisos_config_select ON public.permisos_config
  FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.perfiles p
      WHERE p.id = (SELECT auth.uid())
        AND p.activo = true
        AND p.rol IN ('super_admin', 'admin_escuela', 'admin_sede', 'administrativo')
    )
  );

-- Escritura: solo super_admin
CREATE POLICY permisos_config_insert ON public.permisos_config
  FOR INSERT TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.perfiles p
      WHERE p.id = (SELECT auth.uid())
        AND p.activo = true
        AND p.rol = 'super_admin'
    )
  );

CREATE POLICY permisos_config_update ON public.permisos_config
  FOR UPDATE TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.perfiles p
      WHERE p.id = (SELECT auth.uid())
        AND p.activo = true
        AND p.rol = 'super_admin'
    )
  );

CREATE POLICY permisos_config_delete ON public.permisos_config
  FOR DELETE TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.perfiles p
      WHERE p.id = (SELECT auth.uid())
        AND p.activo = true
        AND p.rol = 'super_admin'
    )
  );
