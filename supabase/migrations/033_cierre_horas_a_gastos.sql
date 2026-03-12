-- Cierre mensual de horas de instructores a gastos

CREATE TABLE IF NOT EXISTS public.cierres_horas_instructores (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  escuela_id uuid NOT NULL REFERENCES public.escuelas(id) ON DELETE CASCADE,
  sede_id uuid NOT NULL REFERENCES public.sedes(id) ON DELETE CASCADE,
  instructor_id uuid NOT NULL REFERENCES public.instructores(id) ON DELETE CASCADE,
  gasto_id uuid REFERENCES public.gastos(id) ON DELETE SET NULL,
  periodo_anio integer NOT NULL CHECK (periodo_anio BETWEEN 2000 AND 2100),
  periodo_mes integer NOT NULL CHECK (periodo_mes BETWEEN 1 AND 12),
  fecha_cierre date NOT NULL,
  total_horas numeric(10,2) NOT NULL DEFAULT 0 CHECK (total_horas >= 0),
  valor_hora numeric(12,2) NOT NULL DEFAULT 0 CHECK (valor_hora >= 0),
  monto_total numeric(12,2) NOT NULL DEFAULT 0 CHECK (monto_total >= 0),
  generado_por uuid REFERENCES public.perfiles(id) ON DELETE SET NULL,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  UNIQUE (escuela_id, instructor_id, periodo_anio, periodo_mes)
);

CREATE INDEX IF NOT EXISTS cierres_horas_instructores_escuela_periodo_idx
  ON public.cierres_horas_instructores (escuela_id, periodo_anio, periodo_mes);

CREATE INDEX IF NOT EXISTS cierres_horas_instructores_gasto_idx
  ON public.cierres_horas_instructores (gasto_id);

ALTER TABLE public.cierres_horas_instructores ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Super admin: gestiona cierres horas instructores" ON public.cierres_horas_instructores;
CREATE POLICY "Super admin: gestiona cierres horas instructores"
  ON public.cierres_horas_instructores FOR ALL
  USING (public.is_super_admin())
  WITH CHECK (public.is_super_admin());

DROP POLICY IF EXISTS "Admin escuela: gestiona cierres horas instructores" ON public.cierres_horas_instructores;
CREATE POLICY "Admin escuela: gestiona cierres horas instructores"
  ON public.cierres_horas_instructores FOR ALL
  USING (escuela_id = public.get_my_escuela_id() AND public.is_admin_escuela())
  WITH CHECK (escuela_id = public.get_my_escuela_id() AND public.is_admin_escuela());

DROP POLICY IF EXISTS "Usuarios internos: gestionan cierres horas instructores" ON public.cierres_horas_instructores;
CREATE POLICY "Usuarios internos: gestionan cierres horas instructores"
  ON public.cierres_horas_instructores FOR ALL
  USING (
    escuela_id = public.get_my_escuela_id()
    AND NOT public.is_alumno()
    AND NOT public.is_instructor()
  )
  WITH CHECK (
    escuela_id = public.get_my_escuela_id()
    AND NOT public.is_alumno()
    AND NOT public.is_instructor()
  );

CREATE OR REPLACE FUNCTION public.generar_gastos_horas_mes(p_anio integer, p_mes integer)
RETURNS TABLE (
  instructor_id uuid,
  gasto_id uuid,
  instructor_nombre text,
  total_horas numeric,
  valor_hora numeric,
  monto_total numeric,
  accion text
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_actor_id uuid := auth.uid();
  v_escuela_id uuid := public.get_my_escuela_id();
  v_period_start date;
  v_period_end date;
  v_existing_cierre_id uuid;
  v_existing_gasto_id uuid;
  v_gasto_id uuid;
  v_updated_count integer;
  v_accion text;
  rec record;
BEGIN
  IF v_actor_id IS NULL THEN
    RAISE EXCEPTION 'Sesión inválida';
  END IF;

  IF p_anio < 2000 OR p_anio > 2100 THEN
    RAISE EXCEPTION 'Año inválido';
  END IF;

  IF p_mes < 1 OR p_mes > 12 THEN
    RAISE EXCEPTION 'Mes inválido';
  END IF;

  IF public.is_alumno() OR public.is_instructor() THEN
    RAISE EXCEPTION 'No autorizado para generar gastos de horas';
  END IF;

  IF v_escuela_id IS NULL THEN
    RAISE EXCEPTION 'No se encontró una escuela activa para generar el cierre';
  END IF;

  v_period_start := make_date(p_anio, p_mes, 1);
  v_period_end := (v_period_start + interval '1 month - 1 day')::date;

  IF v_period_end >= current_date THEN
    RAISE EXCEPTION 'Solo se pueden generar gastos de meses ya terminados';
  END IF;

  IF EXISTS (
    SELECT 1
    FROM public.horas_trabajo ht
    JOIN public.instructores i ON i.id = ht.instructor_id
    WHERE ht.escuela_id = v_escuela_id
      AND ht.fecha BETWEEN v_period_start AND v_period_end
    GROUP BY ht.instructor_id, i.valor_hora
    HAVING coalesce(sum(ht.horas), 0) > 0
       AND coalesce(i.valor_hora, 0) <= 0
  ) THEN
    RAISE EXCEPTION 'Hay instructores con horas registradas y valor por hora en 0';
  END IF;

  FOR rec IN
    SELECT c.id, c.gasto_id
    FROM public.cierres_horas_instructores c
    WHERE c.escuela_id = v_escuela_id
      AND c.periodo_anio = p_anio
      AND c.periodo_mes = p_mes
      AND NOT EXISTS (
        SELECT 1
        FROM public.horas_trabajo ht
        WHERE ht.instructor_id = c.instructor_id
          AND ht.escuela_id = c.escuela_id
          AND ht.fecha BETWEEN v_period_start AND v_period_end
          AND coalesce(ht.horas, 0) > 0
      )
  LOOP
    IF rec.gasto_id IS NOT NULL THEN
      DELETE FROM public.gastos WHERE id = rec.gasto_id;
    END IF;

    DELETE FROM public.cierres_horas_instructores WHERE id = rec.id;
  END LOOP;

  FOR rec IN
    SELECT
      i.id AS instructor_id,
      i.escuela_id,
      i.sede_id,
      trim(concat_ws(' ', i.nombre, i.apellidos)) AS instructor_nombre,
      round(coalesce(sum(ht.horas), 0)::numeric, 2) AS total_horas,
      round(coalesce(i.valor_hora, 0)::numeric, 2) AS valor_hora,
      round((coalesce(sum(ht.horas), 0) * coalesce(i.valor_hora, 0))::numeric, 2) AS monto_total
    FROM public.instructores i
    JOIN public.horas_trabajo ht ON ht.instructor_id = i.id
    WHERE i.escuela_id = v_escuela_id
      AND ht.escuela_id = v_escuela_id
      AND ht.fecha BETWEEN v_period_start AND v_period_end
    GROUP BY i.id, i.escuela_id, i.sede_id, i.nombre, i.apellidos, i.valor_hora
    HAVING coalesce(sum(ht.horas), 0) > 0
    ORDER BY instructor_nombre
  LOOP
    SELECT c.id, c.gasto_id
    INTO v_existing_cierre_id, v_existing_gasto_id
    FROM public.cierres_horas_instructores c
    WHERE c.escuela_id = v_escuela_id
      AND c.instructor_id = rec.instructor_id
      AND c.periodo_anio = p_anio
      AND c.periodo_mes = p_mes
    FOR UPDATE;

    v_gasto_id := v_existing_gasto_id;
    v_accion := 'actualizado';

    IF v_gasto_id IS NOT NULL THEN
      UPDATE public.gastos
      SET escuela_id = rec.escuela_id,
          sede_id = rec.sede_id,
          user_id = v_actor_id,
          categoria = 'nominas',
          concepto = format(
            'Horas instructor %s-%s - %s',
            p_anio,
            lpad(p_mes::text, 2, '0'),
            rec.instructor_nombre
          ),
          monto = rec.monto_total,
          metodo_pago = 'transferencia',
          proveedor = rec.instructor_nombre,
          numero_factura = NULL,
          fecha = v_period_end,
          recurrente = true,
          notas = format(
            'CIERRE_HORAS_INSTRUCTOR|%s-%s|instructor_id=%s|total_horas=%s|valor_hora=%s',
            p_anio,
            lpad(p_mes::text, 2, '0'),
            rec.instructor_id,
            rec.total_horas,
            rec.valor_hora
          )
      WHERE id = v_gasto_id;

      GET DIAGNOSTICS v_updated_count = ROW_COUNT;

      IF v_updated_count = 0 THEN
        v_gasto_id := NULL;
      END IF;
    END IF;

    IF v_gasto_id IS NULL THEN
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
      VALUES (
        rec.escuela_id,
        rec.sede_id,
        v_actor_id,
        NULL,
        'nominas',
        format(
          'Horas instructor %s-%s - %s',
          p_anio,
          lpad(p_mes::text, 2, '0'),
          rec.instructor_nombre
        ),
        rec.monto_total,
        'transferencia',
        rec.instructor_nombre,
        NULL,
        v_period_end,
        true,
        format(
          'CIERRE_HORAS_INSTRUCTOR|%s-%s|instructor_id=%s|total_horas=%s|valor_hora=%s',
          p_anio,
          lpad(p_mes::text, 2, '0'),
          rec.instructor_id,
          rec.total_horas,
          rec.valor_hora
        )
      )
      RETURNING id INTO v_gasto_id;

      v_accion := 'creado';
    END IF;

    INSERT INTO public.cierres_horas_instructores (
      escuela_id,
      sede_id,
      instructor_id,
      gasto_id,
      periodo_anio,
      periodo_mes,
      fecha_cierre,
      total_horas,
      valor_hora,
      monto_total,
      generado_por,
      updated_at
    )
    VALUES (
      rec.escuela_id,
      rec.sede_id,
      rec.instructor_id,
      v_gasto_id,
      p_anio,
      p_mes,
      v_period_end,
      rec.total_horas,
      rec.valor_hora,
      rec.monto_total,
      v_actor_id,
      now()
    )
    ON CONFLICT ON CONSTRAINT cierres_horas_instructores_escuela_id_instructor_id_periodo_key
    DO UPDATE SET
      sede_id = EXCLUDED.sede_id,
      gasto_id = EXCLUDED.gasto_id,
      fecha_cierre = EXCLUDED.fecha_cierre,
      total_horas = EXCLUDED.total_horas,
      valor_hora = EXCLUDED.valor_hora,
      monto_total = EXCLUDED.monto_total,
      generado_por = EXCLUDED.generado_por,
      updated_at = now();

    instructor_id := rec.instructor_id;
    gasto_id := v_gasto_id;
    instructor_nombre := rec.instructor_nombre;
    total_horas := rec.total_horas;
    valor_hora := rec.valor_hora;
    monto_total := rec.monto_total;
    accion := v_accion;
    RETURN NEXT;
  END LOOP;
END;
$$;

GRANT EXECUTE ON FUNCTION public.generar_gastos_horas_mes(integer, integer) TO authenticated;
