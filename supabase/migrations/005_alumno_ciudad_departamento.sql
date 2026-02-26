-- Agrega columnas ciudad y departamento a la tabla alumnos
ALTER TABLE alumnos ADD COLUMN IF NOT EXISTS ciudad text DEFAULT NULL;
ALTER TABLE alumnos ADD COLUMN IF NOT EXISTS departamento text DEFAULT NULL;
