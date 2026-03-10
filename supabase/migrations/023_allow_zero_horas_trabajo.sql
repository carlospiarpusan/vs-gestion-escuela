-- Permitir 0 horas para registrar descansos en la bitácora mensual

DO $$
BEGIN
  IF EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'horas_trabajo_horas_check'
      AND conrelid = 'public.horas_trabajo'::regclass
  ) THEN
    ALTER TABLE public.horas_trabajo
      DROP CONSTRAINT horas_trabajo_horas_check;
  END IF;
END $$;

ALTER TABLE public.horas_trabajo
  ADD CONSTRAINT horas_trabajo_horas_check
  CHECK (horas >= 0 AND horas <= 24);
