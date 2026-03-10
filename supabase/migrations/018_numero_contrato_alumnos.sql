-- Migración 018: guardar número de contrato de alumnos importados/manuales
ALTER TABLE public.alumnos
ADD COLUMN IF NOT EXISTS numero_contrato text;
