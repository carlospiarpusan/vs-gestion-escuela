-- Conserva las vigencias actuales y el historial al eliminar conexiones.
BEGIN;

ALTER TABLE public.vs_facturacion_api_keys
  ALTER COLUMN expires_at DROP NOT NULL,
  DROP CONSTRAINT vs_facturacion_api_keys_check,
  ADD COLUMN deleted_at timestamptz,
  ADD CONSTRAINT vs_facturacion_expiry_after_creation
    CHECK (expires_at IS NULL OR (isfinite(expires_at) AND expires_at > created_at)),
  ADD CONSTRAINT vs_facturacion_deleted_is_revoked
    CHECK (deleted_at IS NULL OR revoked_at IS NOT NULL);

ALTER TABLE public.vs_facturacion_api_events
  DROP CONSTRAINT vs_facturacion_api_events_accion_check,
  ADD CONSTRAINT vs_facturacion_api_events_accion_check
    CHECK (accion IN ('clave_creada', 'clave_revocada', 'vigencia_editada', 'conexion_eliminada')),
  ADD COLUMN expires_at_before timestamptz,
  ADD COLUMN expires_at_after timestamptz;

COMMIT;
