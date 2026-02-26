-- Migración 009: Renombrar rol 'secretaria' a 'administrativo' en la tabla perfiles

-- 1. Eliminar constraint existente
ALTER TABLE perfiles DROP CONSTRAINT IF EXISTS perfiles_rol_check;

-- 2. Actualizar registros existentes con rol secretaria
UPDATE perfiles SET rol = 'administrativo' WHERE rol = 'secretaria';

-- 3. Recrear constraint incluyendo 'administrativo'
ALTER TABLE perfiles ADD CONSTRAINT perfiles_rol_check
  CHECK (rol IN (
    'super_admin', 'admin_escuela', 'admin_sede',
    'administrativo', 'instructor', 'recepcion', 'alumno'
  ));
