ALTER TABLE public.ingresos
  ADD COLUMN IF NOT EXISTS fecha_vencimiento date;

UPDATE public.ingresos
SET fecha_vencimiento = COALESCE(fecha_vencimiento, fecha);

ALTER TABLE public.ingresos
  ALTER COLUMN fecha_vencimiento SET DEFAULT current_date;

ALTER TABLE public.gastos
  ADD COLUMN IF NOT EXISTS fecha_vencimiento date,
  ADD COLUMN IF NOT EXISTS estado_pago text;

UPDATE public.gastos
SET
  fecha_vencimiento = COALESCE(fecha_vencimiento, fecha),
  estado_pago = COALESCE(NULLIF(estado_pago, ''), 'pagado');

ALTER TABLE public.gastos
  ALTER COLUMN fecha_vencimiento SET DEFAULT current_date,
  ALTER COLUMN estado_pago SET DEFAULT 'pagado',
  ALTER COLUMN estado_pago SET NOT NULL;

ALTER TABLE public.gastos
  DROP CONSTRAINT IF EXISTS gastos_estado_pago_check;

ALTER TABLE public.gastos
  ADD CONSTRAINT gastos_estado_pago_check
  CHECK (estado_pago IN ('pendiente', 'pagado', 'anulado'));

CREATE INDEX IF NOT EXISTS ingresos_escuela_vencimiento_estado_idx
  ON public.ingresos (escuela_id, estado, fecha_vencimiento ASC);

CREATE INDEX IF NOT EXISTS gastos_escuela_vencimiento_estado_pago_idx
  ON public.gastos (escuela_id, estado_pago, fecha_vencimiento ASC);
