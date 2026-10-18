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
  INSERT INTO public.cumplimiento_retencion
    (escuela_id,tipo_dato,meses_retencion,criterio_legal,estado_revision)
  SELECT e.id, r.tipo, r.months, r.criterion, r.state
  FROM public.escuelas e CROSS JOIN (VALUES
    ('alumnos',6,'Revision a los seis meses de la baja definitiva documentada. No autoriza borrado por antiguedad del alumno ni elimina soportes protegidos.','vigente'),
    ('contratos',NULL,'Conservacion protegida. Revisar obligaciones y soporte antes de autorizar eliminacion.','en_revision'),
    ('examenes',NULL,'Conservacion protegida de evidencias academicas; requiere revision documentada.','en_revision'),
    ('financiero_contable',NULL,'Conservacion protegida de facturas, pagos y soportes; no se aplica la ventana operativa de seis meses.','en_revision'),
    ('nominas_personal',NULL,'Conservacion protegida laboral; requiere revision documentada.','en_revision'),
    ('biometria_asistencia',NULL,'No fijar un plazo sin revisar finalidad y obligaciones aplicables.','pendiente'),
    ('solicitudes_arco',NULL,'Conservar evidencia de atencion y revisar la supresion segun cada solicitud.','en_revision')
  ) AS r(tipo,months,criterion,state)
  WHERE NOT EXISTS (SELECT 1 FROM public.cumplimiento_retencion p
    WHERE p.escuela_id=e.id AND p.tipo_dato=r.tipo);
$$;
REVOKE ALL ON FUNCTION public.seed_school_retention_rules() FROM PUBLIC, anon, authenticated;
SELECT public.seed_school_retention_rules();
COMMIT;
