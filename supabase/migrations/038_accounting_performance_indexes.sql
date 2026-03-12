CREATE EXTENSION IF NOT EXISTS pg_trgm;

CREATE INDEX IF NOT EXISTS ingresos_escuela_fecha_created_idx
  ON public.ingresos (escuela_id, fecha DESC, created_at DESC);

CREATE INDEX IF NOT EXISTS ingresos_escuela_estado_fecha_idx
  ON public.ingresos (escuela_id, estado, fecha DESC);

CREATE INDEX IF NOT EXISTS ingresos_escuela_categoria_fecha_idx
  ON public.ingresos (escuela_id, categoria, fecha DESC);

CREATE INDEX IF NOT EXISTS ingresos_escuela_metodo_fecha_idx
  ON public.ingresos (escuela_id, metodo_pago, fecha DESC);

CREATE INDEX IF NOT EXISTS ingresos_escuela_alumno_fecha_idx
  ON public.ingresos (escuela_id, alumno_id, fecha DESC);

CREATE INDEX IF NOT EXISTS gastos_escuela_fecha_created_idx
  ON public.gastos (escuela_id, fecha DESC, created_at DESC);

CREATE INDEX IF NOT EXISTS gastos_escuela_categoria_fecha_idx
  ON public.gastos (escuela_id, categoria, fecha DESC);

CREATE INDEX IF NOT EXISTS gastos_escuela_metodo_fecha_idx
  ON public.gastos (escuela_id, metodo_pago, fecha DESC);

CREATE INDEX IF NOT EXISTS gastos_escuela_recurrente_fecha_idx
  ON public.gastos (escuela_id, recurrente, fecha DESC);

CREATE INDEX IF NOT EXISTS gastos_escuela_factura_idx
  ON public.gastos (escuela_id, numero_factura)
  WHERE numero_factura IS NOT NULL AND btrim(numero_factura) <> '';

CREATE INDEX IF NOT EXISTS matriculas_alumno_escuela_fecha_idx
  ON public.matriculas_alumno (escuela_id, fecha_inscripcion DESC, created_at DESC);

CREATE INDEX IF NOT EXISTS alumnos_escuela_tipo_created_idx
  ON public.alumnos (escuela_id, tipo_registro, created_at DESC);

CREATE INDEX IF NOT EXISTS alumnos_nombre_apellidos_trgm_idx
  ON public.alumnos
  USING gin ((COALESCE(nombre, '') || ' ' || COALESCE(apellidos, '')) gin_trgm_ops);

CREATE INDEX IF NOT EXISTS alumnos_dni_trgm_idx
  ON public.alumnos
  USING gin (dni gin_trgm_ops);

CREATE INDEX IF NOT EXISTS alumnos_numero_contrato_trgm_idx
  ON public.alumnos
  USING gin ((COALESCE(numero_contrato, '')) gin_trgm_ops);

CREATE INDEX IF NOT EXISTS alumnos_empresa_convenio_trgm_idx
  ON public.alumnos
  USING gin ((COALESCE(empresa_convenio, '')) gin_trgm_ops);

CREATE INDEX IF NOT EXISTS ingresos_concepto_trgm_idx
  ON public.ingresos
  USING gin (concepto gin_trgm_ops);

CREATE INDEX IF NOT EXISTS ingresos_numero_factura_trgm_idx
  ON public.ingresos
  USING gin ((COALESCE(numero_factura, '')) gin_trgm_ops);

CREATE INDEX IF NOT EXISTS ingresos_notas_trgm_idx
  ON public.ingresos
  USING gin ((COALESCE(notas, '')) gin_trgm_ops);

CREATE INDEX IF NOT EXISTS gastos_concepto_trgm_idx
  ON public.gastos
  USING gin (concepto gin_trgm_ops);

CREATE INDEX IF NOT EXISTS gastos_proveedor_trgm_idx
  ON public.gastos
  USING gin ((COALESCE(proveedor, '')) gin_trgm_ops);

CREATE INDEX IF NOT EXISTS gastos_numero_factura_trgm_idx
  ON public.gastos
  USING gin ((COALESCE(numero_factura, '')) gin_trgm_ops);

CREATE INDEX IF NOT EXISTS gastos_notas_trgm_idx
  ON public.gastos
  USING gin ((COALESCE(notas, '')) gin_trgm_ops);
