ALTER TABLE public.gastos
ADD COLUMN IF NOT EXISTS mantenimiento_id uuid;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'gastos_mantenimiento_id_fkey'
  ) THEN
    ALTER TABLE public.gastos
    ADD CONSTRAINT gastos_mantenimiento_id_fkey
    FOREIGN KEY (mantenimiento_id)
    REFERENCES public.mantenimiento_vehiculos(id)
    ON DELETE CASCADE;
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'gastos_mantenimiento_id_key'
  ) THEN
    ALTER TABLE public.gastos
    ADD CONSTRAINT gastos_mantenimiento_id_key UNIQUE (mantenimiento_id);
  END IF;
END $$;

CREATE OR REPLACE FUNCTION public.map_gasto_categoria_from_mantenimiento(p_tipo text)
RETURNS text
LANGUAGE sql
IMMUTABLE
AS $$
  SELECT CASE
    WHEN p_tipo = 'gasolina' THEN 'combustible'
    WHEN p_tipo IN ('reparacion', 'repuesto', 'mano_obra', 'neumaticos') THEN 'reparaciones'
    ELSE 'mantenimiento_vehiculo'
  END;
$$;

CREATE OR REPLACE FUNCTION public.sync_gasto_from_mantenimiento()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.gastos (
    escuela_id,
    sede_id,
    user_id,
    mantenimiento_id,
    categoria,
    concepto,
    monto,
    metodo_pago,
    proveedor,
    numero_factura,
    fecha,
    recurrente,
    notas
  ) VALUES (
    NEW.escuela_id,
    NEW.sede_id,
    NEW.user_id,
    NEW.id,
    public.map_gasto_categoria_from_mantenimiento(NEW.tipo),
    NEW.descripcion,
    NEW.monto,
    'transferencia',
    NEW.proveedor,
    NEW.numero_factura,
    NEW.fecha,
    false,
    NEW.notas
  )
  ON CONFLICT (mantenimiento_id) DO UPDATE
  SET
    escuela_id = EXCLUDED.escuela_id,
    sede_id = EXCLUDED.sede_id,
    user_id = EXCLUDED.user_id,
    categoria = EXCLUDED.categoria,
    concepto = EXCLUDED.concepto,
    monto = EXCLUDED.monto,
    metodo_pago = EXCLUDED.metodo_pago,
    proveedor = EXCLUDED.proveedor,
    numero_factura = EXCLUDED.numero_factura,
    fecha = EXCLUDED.fecha,
    recurrente = EXCLUDED.recurrente,
    notas = EXCLUDED.notas;

  RETURN NEW;
END;
$$;

CREATE OR REPLACE FUNCTION public.delete_gasto_from_mantenimiento()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  DELETE FROM public.gastos
  WHERE mantenimiento_id = OLD.id;

  RETURN OLD;
END;
$$;

WITH mantenimiento_sin_link AS (
  SELECT
    m.id,
    m.escuela_id,
    m.sede_id,
    m.user_id,
    m.tipo,
    m.descripcion,
    m.monto,
    m.fecha,
    COALESCE(m.proveedor, '') AS proveedor,
    COALESCE(m.numero_factura, '') AS numero_factura,
    COALESCE(m.notas, '') AS notas,
    ROW_NUMBER() OVER (
      PARTITION BY
        m.escuela_id,
        m.sede_id,
        m.user_id,
        m.descripcion,
        m.monto,
        m.fecha,
        COALESCE(m.proveedor, ''),
        COALESCE(m.numero_factura, ''),
        COALESCE(m.notas, '')
      ORDER BY m.created_at, m.id
    ) AS rn
  FROM public.mantenimiento_vehiculos m
  LEFT JOIN public.gastos g_linked
    ON g_linked.mantenimiento_id = m.id
  WHERE g_linked.id IS NULL
),
gastos_generados AS (
  SELECT
    g.id,
    g.escuela_id,
    g.sede_id,
    g.user_id,
    g.concepto,
    g.monto,
    g.fecha,
    COALESCE(g.proveedor, '') AS proveedor,
    COALESCE(g.numero_factura, '') AS numero_factura,
    COALESCE(g.notas, '') AS notas,
    ROW_NUMBER() OVER (
      PARTITION BY
        g.escuela_id,
        g.sede_id,
        g.user_id,
        g.concepto,
        g.monto,
        g.fecha,
        COALESCE(g.proveedor, ''),
        COALESCE(g.numero_factura, ''),
        COALESCE(g.notas, '')
      ORDER BY g.created_at, g.id
    ) AS rn
  FROM public.gastos g
  WHERE g.mantenimiento_id IS NULL
    AND g.categoria = 'mantenimiento_vehiculo'
    AND g.metodo_pago = 'transferencia'
    AND g.recurrente = false
),
parejas AS (
  SELECT
    g.id AS gasto_id,
    m.id AS mantenimiento_id,
    m.tipo
  FROM mantenimiento_sin_link m
  INNER JOIN gastos_generados g
    ON g.escuela_id = m.escuela_id
   AND g.sede_id = m.sede_id
   AND g.user_id = m.user_id
   AND g.concepto = m.descripcion
   AND g.monto = m.monto
   AND g.fecha = m.fecha
   AND g.proveedor = m.proveedor
   AND g.numero_factura = m.numero_factura
   AND g.notas = m.notas
   AND g.rn = m.rn
)
UPDATE public.gastos g
SET
  mantenimiento_id = p.mantenimiento_id,
  categoria = public.map_gasto_categoria_from_mantenimiento(p.tipo)
FROM parejas p
WHERE g.id = p.gasto_id;

INSERT INTO public.gastos (
  escuela_id,
  sede_id,
  user_id,
  mantenimiento_id,
  categoria,
  concepto,
  monto,
  metodo_pago,
  proveedor,
  numero_factura,
  fecha,
  recurrente,
  notas
)
SELECT
  m.escuela_id,
  m.sede_id,
  m.user_id,
  m.id,
  public.map_gasto_categoria_from_mantenimiento(m.tipo),
  m.descripcion,
  m.monto,
  'transferencia',
  m.proveedor,
  m.numero_factura,
  m.fecha,
  false,
  m.notas
FROM public.mantenimiento_vehiculos m
WHERE NOT EXISTS (
  SELECT 1
  FROM public.gastos g
  WHERE g.mantenimiento_id = m.id
);

DROP TRIGGER IF EXISTS mantenimiento_to_gasto ON public.mantenimiento_vehiculos;
CREATE TRIGGER mantenimiento_to_gasto
  AFTER INSERT OR UPDATE OF escuela_id, sede_id, user_id, tipo, descripcion, monto, proveedor, numero_factura, fecha, notas
  ON public.mantenimiento_vehiculos
  FOR EACH ROW EXECUTE FUNCTION public.sync_gasto_from_mantenimiento();

DROP TRIGGER IF EXISTS mantenimiento_delete_gasto ON public.mantenimiento_vehiculos;
CREATE TRIGGER mantenimiento_delete_gasto
  AFTER DELETE ON public.mantenimiento_vehiculos
  FOR EACH ROW EXECUTE FUNCTION public.delete_gasto_from_mantenimiento();
