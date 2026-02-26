-- Agrega columna especialidades (array) a la tabla instructores
ALTER TABLE instructores ADD COLUMN IF NOT EXISTS especialidades text[] DEFAULT '{}';
