-- Rename año column to anio to avoid encoding issues with PostgREST.
-- Make it idempotent because some databases already have the renamed column.
DO $$
BEGIN
  IF EXISTS (
    SELECT 1
    FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name = 'vehiculos'
      AND column_name = 'año'
  ) AND NOT EXISTS (
    SELECT 1
    FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name = 'vehiculos'
      AND column_name = 'anio'
  ) THEN
    EXECUTE 'ALTER TABLE public.vehiculos RENAME COLUMN "año" TO anio';
  END IF;
END
$$;
