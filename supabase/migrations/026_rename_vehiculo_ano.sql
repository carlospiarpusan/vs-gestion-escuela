-- Rename año column to anio to avoid encoding issues with PostgREST
ALTER TABLE vehiculos RENAME COLUMN "año" TO anio;
