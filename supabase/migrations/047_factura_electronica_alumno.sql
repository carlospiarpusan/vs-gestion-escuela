-- Agregar campos de factura electronica a alumnos
ALTER TABLE public.alumnos
  ADD COLUMN IF NOT EXISTS facturado boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS numero_factura_electronica text,
  ADD COLUMN IF NOT EXISTS fecha_factura timestamp with time zone;

-- Indice para filtrar rapido los no facturados
CREATE INDEX IF NOT EXISTS idx_alumnos_facturado ON public.alumnos (escuela_id, facturado) WHERE facturado = false;
