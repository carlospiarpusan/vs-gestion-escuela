-- Eliminar el check constraint de especialidad para permitir cualquier categoría
ALTER TABLE instructores DROP CONSTRAINT IF EXISTS instructores_especialidad_check;

-- Cambiar el tipo de la columna a text para aceptar cualquier valor
ALTER TABLE instructores ALTER COLUMN especialidad TYPE text;
