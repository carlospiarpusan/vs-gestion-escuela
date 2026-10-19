-- Six months is a review deadline after an explicitly recorded cancellation,
-- not permission to destroy fiscal, employment or academic evidence.
BEGIN;

ALTER TABLE public.cumplimiento_retencion
  ALTER COLUMN meses_retencion DROP NOT NULL,
  ALTER COLUMN meses_retencion DROP DEFAULT;

CREATE TABLE public.school_retention_cases (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  school_id uuid NOT NULL REFERENCES public.escuelas(id) ON DELETE CASCADE,
  cancelled_on date NOT NULL CHECK (cancelled_on >= DATE '2000-01-01'),
  review_due_on date GENERATED ALWAYS AS ((cancelled_on + INTERVAL '6 months')::date) STORED,
  state text NOT NULL CHECK (state IN ('scheduled','review_due','held','withdrawn')),
  evidence_ref text NOT NULL CHECK (length(evidence_ref) BETWEEN 5 AND 500),
  hold_reason text,
  next_review_on date,
  created_by uuid REFERENCES public.perfiles(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CHECK ((state = 'held') = (hold_reason IS NOT NULL AND next_review_on IS NOT NULL))
);
CREATE UNIQUE INDEX school_retention_one_open_case
  ON public.school_retention_cases(school_id) WHERE state <> 'withdrawn';
CREATE INDEX school_retention_due
  ON public.school_retention_cases(review_due_on) WHERE state = 'scheduled';

CREATE TABLE public.school_retention_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  case_id uuid NOT NULL REFERENCES public.school_retention_cases(id) ON DELETE CASCADE,
  action text NOT NULL CHECK (action IN ('recorded','became_due','held','hold_expired','withdrawn','reactivated')),
  actor_id uuid REFERENCES public.perfiles(id) ON DELETE SET NULL,
  evidence_ref text,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX school_retention_events_case ON public.school_retention_events(case_id,created_at DESC);

CREATE TABLE public.school_retention_job_state (
  id boolean PRIMARY KEY DEFAULT true CHECK (id),
  last_checked_at timestamptz NOT NULL,
  due_count integer NOT NULL CHECK (due_count >= 0)
);

ALTER TABLE public.school_retention_cases ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.school_retention_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.school_retention_job_state ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.school_retention_cases, public.school_retention_events,
  public.school_retention_job_state FROM PUBLIC, anon, authenticated;

CREATE FUNCTION public.seed_school_retention_rules() RETURNS void
LANGUAGE sql SECURITY INVOKER SET search_path = '' AS $$
  -- Historical installs use a text/check layout; production uses enum categories.
  WITH rules AS MATERIALIZED (
    SELECT r.tipo,r.months,r.criterion,r.state
    FROM (VALUES
      ('alumnos',6,'Revision a los seis meses de la baja definitiva documentada. No autoriza borrado por antiguedad del alumno ni elimina soportes protegidos.','vigente','all'),
      ('contratos',NULL,'Conservacion protegida. Revisar obligaciones y soporte antes de autorizar eliminacion.','en_revision','all'),
      ('examenes',NULL,'Conservacion protegida de evidencias academicas; requiere revision documentada.','en_revision','all'),
      ('solicitudes_arco',NULL,'Conservar evidencia de atencion y revisar la supresion segun cada solicitud.','en_revision','all'),
      ('finanzas',NULL,'Conservacion protegida de facturas, pagos y soportes; no se aplica la ventana operativa de seis meses.','en_revision','enum'),
      ('instructores',NULL,'Conservacion protegida de datos laborales, nominas y soportes; requiere revision documentada.','en_revision','enum'),
      ('administrativos',NULL,'Conservacion protegida de datos laborales, nominas y soportes; requiere revision documentada.','en_revision','enum'),
      ('financiero_contable',NULL,'Conservacion protegida de facturas, pagos y soportes; no se aplica la ventana operativa de seis meses.','en_revision','text'),
      ('nominas_personal',NULL,'Conservacion protegida laboral; requiere revision documentada.','en_revision','text'),
      ('biometria_asistencia',NULL,'No fijar un plazo sin revisar finalidad y obligaciones aplicables.','pendiente','text')
    ) AS r(tipo,months,criterion,state,layout)
    WHERE r.layout='all' OR r.layout=(
      SELECT CASE WHEN t.typtype='e' THEN 'enum' ELSE 'text' END
      FROM pg_catalog.pg_attribute a JOIN pg_catalog.pg_type t ON t.oid=a.atttypid
      WHERE a.attrelid='public.cumplimiento_retencion'::regclass AND a.attname='tipo_dato'
    )
  )
  INSERT INTO public.cumplimiento_retencion
    (escuela_id,tipo_dato,meses_retencion,criterio_legal,estado_revision)
  SELECT e.id, v.tipo_dato, r.months, r.criterion, v.estado_revision
  FROM public.escuelas e CROSS JOIN rules r
  -- Production uses enums; older installations use text for these columns.
  CROSS JOIN LATERAL jsonb_populate_record(NULL::public.cumplimiento_retencion,
    jsonb_build_object('tipo_dato',r.tipo,'estado_revision',r.state)) AS v
  WHERE NOT EXISTS (SELECT 1 FROM public.cumplimiento_retencion p
    WHERE p.escuela_id=e.id AND p.tipo_dato=v.tipo_dato);
$$;
REVOKE ALL ON FUNCTION public.seed_school_retention_rules() FROM PUBLIC, anon, authenticated;
SELECT public.seed_school_retention_rules();
COMMIT;
