BEGIN;

-- Existing encrypted token column and school RLS remain in place.
-- Extend the provider allowlist without changing existing connections.
ALTER TABLE public.facturas_correo_integraciones
  DROP CONSTRAINT IF EXISTS facturas_correo_integraciones_provider_check;
ALTER TABLE public.facturas_correo_integraciones
  ADD CONSTRAINT facturas_correo_integraciones_provider_check
  CHECK (provider IN ('imap', 'gmail_google', 'outlook_microsoft'));

-- Separate checkpoints for normal and historical scans. No provider credentials
-- are stored here; refresh tokens remain in the existing encrypted column.
ALTER TABLE public.facturas_correo_integraciones
  ADD COLUMN IF NOT EXISTS oauth_sync_state jsonb NOT NULL DEFAULT '{}'::jsonb,
  ADD COLUMN IF NOT EXISTS sync_locked_until timestamptz;

COMMIT;
