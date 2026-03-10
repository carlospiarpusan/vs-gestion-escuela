-- Add audit trail columns to main tables
-- updated_at auto-updates via trigger, updated_by tracks who made the change

-- Helper function to auto-set updated_at
CREATE OR REPLACE FUNCTION public.set_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Add columns to tables that don't already have them
DO $$
BEGIN
  -- alumnos
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'alumnos' AND column_name = 'updated_at') THEN
    ALTER TABLE alumnos ADD COLUMN updated_at timestamptz DEFAULT now();
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'alumnos' AND column_name = 'updated_by') THEN
    ALTER TABLE alumnos ADD COLUMN updated_by uuid REFERENCES auth.users(id);
  END IF;

  -- instructores
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'instructores' AND column_name = 'updated_at') THEN
    ALTER TABLE instructores ADD COLUMN updated_at timestamptz DEFAULT now();
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'instructores' AND column_name = 'updated_by') THEN
    ALTER TABLE instructores ADD COLUMN updated_by uuid REFERENCES auth.users(id);
  END IF;

  -- vehiculos
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'vehiculos' AND column_name = 'updated_at') THEN
    ALTER TABLE vehiculos ADD COLUMN updated_at timestamptz DEFAULT now();
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'vehiculos' AND column_name = 'updated_by') THEN
    ALTER TABLE vehiculos ADD COLUMN updated_by uuid REFERENCES auth.users(id);
  END IF;

  -- ingresos
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'ingresos' AND column_name = 'updated_at') THEN
    ALTER TABLE ingresos ADD COLUMN updated_at timestamptz DEFAULT now();
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'ingresos' AND column_name = 'updated_by') THEN
    ALTER TABLE ingresos ADD COLUMN updated_by uuid REFERENCES auth.users(id);
  END IF;

  -- gastos
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'gastos' AND column_name = 'updated_at') THEN
    ALTER TABLE gastos ADD COLUMN updated_at timestamptz DEFAULT now();
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'gastos' AND column_name = 'updated_by') THEN
    ALTER TABLE gastos ADD COLUMN updated_by uuid REFERENCES auth.users(id);
  END IF;

  -- clases
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'clases' AND column_name = 'updated_at') THEN
    ALTER TABLE clases ADD COLUMN updated_at timestamptz DEFAULT now();
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'clases' AND column_name = 'updated_by') THEN
    ALTER TABLE clases ADD COLUMN updated_by uuid REFERENCES auth.users(id);
  END IF;

  -- matriculas_alumno
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'matriculas_alumno' AND column_name = 'updated_at') THEN
    ALTER TABLE matriculas_alumno ADD COLUMN updated_at timestamptz DEFAULT now();
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'matriculas_alumno' AND column_name = 'updated_by') THEN
    ALTER TABLE matriculas_alumno ADD COLUMN updated_by uuid REFERENCES auth.users(id);
  END IF;
END $$;

-- Create triggers for auto-updating updated_at
DO $$
DECLARE
  tbl TEXT;
BEGIN
  FOR tbl IN SELECT unnest(ARRAY['alumnos', 'instructores', 'vehiculos', 'ingresos', 'gastos', 'clases', 'matriculas_alumno'])
  LOOP
    EXECUTE format(
      'DROP TRIGGER IF EXISTS set_updated_at ON %I; CREATE TRIGGER set_updated_at BEFORE UPDATE ON %I FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();',
      tbl, tbl
    );
  END LOOP;
END $$;
