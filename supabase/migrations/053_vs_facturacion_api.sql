-- Integracion de solo lectura para Sin Fronteras. No emite facturas ni altera cartera.
BEGIN;

CREATE TABLE public.vs_facturacion_api_keys (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  escuela_id uuid NOT NULL REFERENCES public.escuelas(id) ON DELETE CASCADE,
  nombre text NOT NULL CHECK (length(nombre) BETWEEN 1 AND 80),
  token_hash text NOT NULL UNIQUE CHECK (token_hash ~ '^[0-9a-f]{64}$'),
  identificador text NOT NULL,
  created_by uuid REFERENCES public.perfiles(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  expires_at timestamptz NOT NULL DEFAULT (now() + interval '90 days'),
  last_used_at timestamptz,
  revoked_at timestamptz,
  CHECK (escuela_id = 'a5320c4a-3bf6-4da5-b365-da17d7001d4f'::uuid),
  CHECK (expires_at > created_at AND expires_at <= created_at + interval '90 days')
);
CREATE UNIQUE INDEX vs_facturacion_una_clave_activa
  ON public.vs_facturacion_api_keys (escuela_id) WHERE revoked_at IS NULL;

CREATE TABLE public.vs_facturacion_api_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  escuela_id uuid NOT NULL REFERENCES public.escuelas(id) ON DELETE CASCADE,
  key_id uuid NOT NULL REFERENCES public.vs_facturacion_api_keys(id) ON DELETE CASCADE,
  actor_id uuid REFERENCES public.perfiles(id) ON DELETE SET NULL,
  accion text NOT NULL CHECK (accion IN ('clave_creada', 'clave_revocada')),
  created_at timestamptz NOT NULL DEFAULT now(),
  CHECK (escuela_id = 'a5320c4a-3bf6-4da5-b365-da17d7001d4f'::uuid)
);

ALTER TABLE public.vs_facturacion_api_keys ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.vs_facturacion_api_events ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.vs_facturacion_api_keys, public.vs_facturacion_api_events
  FROM PUBLIC, anon, authenticated;
COMMIT;
