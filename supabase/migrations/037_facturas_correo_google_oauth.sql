ALTER TABLE public.facturas_correo_integraciones
  ADD COLUMN IF NOT EXISTS provider text NOT NULL DEFAULT 'imap';

ALTER TABLE public.facturas_correo_integraciones
  ADD COLUMN IF NOT EXISTS oauth_refresh_token_encrypted text;

ALTER TABLE public.facturas_correo_integraciones
  ALTER COLUMN imap_password_encrypted DROP NOT NULL;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'facturas_correo_integraciones_provider_check'
  ) THEN
    ALTER TABLE public.facturas_correo_integraciones
      ADD CONSTRAINT facturas_correo_integraciones_provider_check
      CHECK (provider IN ('imap', 'gmail_google'));
  END IF;
END $$;

UPDATE public.facturas_correo_integraciones
SET provider = 'imap'
WHERE provider IS NULL OR provider = '';
