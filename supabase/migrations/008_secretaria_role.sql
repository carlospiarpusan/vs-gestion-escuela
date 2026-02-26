-- Migración 008: Asegurar que el rol 'secretaria' existe en el constraint de perfiles
-- Si la tabla perfiles tiene un CHECK constraint en la columna rol,
-- lo eliminamos y lo recreamos incluyendo 'secretaria'.

ALTER TABLE perfiles DROP CONSTRAINT IF EXISTS perfiles_rol_check;

ALTER TABLE perfiles ADD CONSTRAINT perfiles_rol_check
  CHECK (rol IN (
    'super_admin', 'admin_escuela', 'admin_sede',
    'secretaria', 'instructor', 'recepcion', 'alumno'
  ));
