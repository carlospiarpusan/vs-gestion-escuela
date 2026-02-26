-- Migración 006: Campos de tramitador en tabla alumnos
-- El tramitador es el agente que gestiona los trámites de licencia del alumno.
-- Su costo se registra automáticamente en gastos al asignarlo.

ALTER TABLE alumnos
  ADD COLUMN IF NOT EXISTS tiene_tramitador boolean DEFAULT false,
  ADD COLUMN IF NOT EXISTS tramitador_nombre text,
  ADD COLUMN IF NOT EXISTS tramitador_valor numeric;
