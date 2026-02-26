-- Migración 010: Actualizar constraint perfiles_jerarquia para incluir 'administrativo'

ALTER TABLE perfiles DROP CONSTRAINT IF EXISTS perfiles_jerarquia;

ALTER TABLE perfiles ADD CONSTRAINT perfiles_jerarquia
  CHECK (rol IN (
    'super_admin', 'admin_escuela', 'admin_sede',
    'administrativo', 'instructor', 'recepcion', 'alumno'
  ));
