-- Agregar columna valor_hora a la tabla instructores
ALTER TABLE public.instructores
ADD COLUMN IF NOT EXISTS valor_hora NUMERIC(10,2) DEFAULT 0;
