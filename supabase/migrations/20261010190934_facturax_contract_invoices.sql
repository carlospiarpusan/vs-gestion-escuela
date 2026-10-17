-- Private server-side association. Financial amounts remain in FacturaX.
CREATE TABLE public.facturax_contract_invoices (
 contrato_id uuid PRIMARY KEY REFERENCES public.matriculas_alumno(id) ON DELETE RESTRICT,
 escuela_id uuid NOT NULL REFERENCES public.escuelas(id) ON DELETE RESTRICT,
 alumno_id uuid NOT NULL REFERENCES public.alumnos(id) ON DELETE RESTRICT,
 request_id uuid NOT NULL UNIQUE,
 created_by uuid REFERENCES public.perfiles(id) ON DELETE SET NULL,
 created_at timestamptz NOT NULL DEFAULT now(),
 updated_at timestamptz NOT NULL DEFAULT now(),
 last_status jsonb,
 CHECK (escuela_id='a5320c4a-3bf6-4da5-b365-da17d7001d4f'::uuid)
);
CREATE INDEX facturax_contract_invoices_student ON public.facturax_contract_invoices(escuela_id,alumno_id);
ALTER TABLE public.facturax_contract_invoices ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.facturax_contract_invoices FROM PUBLIC,anon,authenticated;
