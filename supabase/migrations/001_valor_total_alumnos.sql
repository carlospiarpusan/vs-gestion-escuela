-- Agrega columna valor_total a la tabla alumnos
ALTER TABLE alumnos ADD COLUMN IF NOT EXISTS valor_total numeric DEFAULT NULL;
