-- Integracion de correo IMAP para importar facturas electronicas automaticamente

CREATE TABLE IF NOT EXISTS public.facturas_correo_integraciones (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  escuela_id uuid REFERENCES public.escuelas(id) ON DELETE CASCADE NOT NULL,
  sede_id uuid REFERENCES public.sedes(id) ON DELETE CASCADE NOT NULL,
  created_by uuid REFERENCES public.perfiles(id) ON DELETE SET NULL,
  updated_by uuid REFERENCES public.perfiles(id) ON DELETE SET NULL,
  correo text NOT NULL,
  imap_host text NOT NULL,
  imap_port integer NOT NULL DEFAULT 993 CHECK (imap_port BETWEEN 1 AND 65535),
  imap_secure boolean NOT NULL DEFAULT true,
  imap_user text NOT NULL,
  imap_password_encrypted text NOT NULL,
  mailbox text NOT NULL DEFAULT 'INBOX',
  from_filter text,
  subject_filter text,
  import_only_unseen boolean NOT NULL DEFAULT true,
  auto_sync boolean NOT NULL DEFAULT true,
  activa boolean NOT NULL DEFAULT true,
  last_uid bigint,
  last_synced_at timestamptz,
  last_error text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT facturas_correo_integraciones_escuela_unique UNIQUE (escuela_id)
);

CREATE TABLE IF NOT EXISTS public.facturas_correo_importaciones (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  integracion_id uuid REFERENCES public.facturas_correo_integraciones(id) ON DELETE CASCADE NOT NULL,
  escuela_id uuid REFERENCES public.escuelas(id) ON DELETE CASCADE NOT NULL,
  sede_id uuid REFERENCES public.sedes(id) ON DELETE CASCADE NOT NULL,
  gasto_id uuid REFERENCES public.gastos(id) ON DELETE SET NULL,
  imap_uid bigint,
  message_id text,
  message_date timestamptz,
  remitente text,
  asunto text,
  attachment_name text NOT NULL,
  invoice_number text,
  supplier_name text,
  total numeric(12,2),
  currency text,
  status text NOT NULL DEFAULT 'importada' CHECK (status IN ('importada', 'duplicada', 'omitida', 'error')),
  detail text,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE UNIQUE INDEX IF NOT EXISTS facturas_correo_importaciones_message_attachment_uidx
  ON public.facturas_correo_importaciones (integracion_id, message_id, attachment_name)
  WHERE message_id IS NOT NULL;

CREATE UNIQUE INDEX IF NOT EXISTS facturas_correo_importaciones_uid_attachment_uidx
  ON public.facturas_correo_importaciones (integracion_id, imap_uid, attachment_name)
  WHERE imap_uid IS NOT NULL;

CREATE INDEX IF NOT EXISTS facturas_correo_importaciones_escuela_created_idx
  ON public.facturas_correo_importaciones (escuela_id, created_at DESC);

DROP TRIGGER IF EXISTS set_updated_at_facturas_correo_integraciones ON public.facturas_correo_integraciones;
CREATE TRIGGER set_updated_at_facturas_correo_integraciones
  BEFORE UPDATE ON public.facturas_correo_integraciones
  FOR EACH ROW
  EXECUTE FUNCTION public.set_updated_at();

ALTER TABLE public.facturas_correo_integraciones ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.facturas_correo_importaciones ENABLE ROW LEVEL SECURITY;
