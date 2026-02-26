-- Migración 012: Agregar columna cedula a perfiles
-- Permite buscar el email real de un usuario a partir de su cédula,
-- necesario para el login con cédula cuando el usuario tiene email real.

ALTER TABLE public.perfiles
  ADD COLUMN IF NOT EXISTS cedula text;

-- Índice para búsqueda rápida por cédula
CREATE INDEX IF NOT EXISTS perfiles_cedula_idx ON public.perfiles (cedula)
  WHERE cedula IS NOT NULL;

-- Poblar cedula para usuarios con email @*.local (la cédula está en el prefijo del email)
UPDATE public.perfiles
SET cedula = split_part(email, '@', 1)
WHERE email LIKE '%@alumno.local'
   OR email LIKE '%@instructor.local'
   OR email LIKE '%@administrativo.local';
