-- ────────────────────────────────────────────────────────────────────────────
-- 046  Consentimiento de datos personales + Solicitudes ARCO
--      Ley 1581 de 2012 (Habeas Data Colombia)
-- ────────────────────────────────────────────────────────────────────────────

-- 1. Consentimiento en alumnos
alter table public.alumnos
  add column if not exists consentimiento_datos boolean not null default false,
  add column if not exists consentimiento_fecha timestamptz;

-- 2. Consentimiento en instructores
alter table public.instructores
  add column if not exists consentimiento_datos boolean not null default false,
  add column if not exists consentimiento_fecha timestamptz;

-- 3. Consentimiento en administrativos
alter table public.administrativos
  add column if not exists consentimiento_datos boolean not null default false,
  add column if not exists consentimiento_fecha timestamptz;

-- 4. Tabla de solicitudes ARCO (Acceso, Rectificación, Cancelación, Oposición)
create type public.tipo_solicitud_arco as enum (
  'acceso',
  'rectificacion',
  'cancelacion',
  'oposicion'
);

create type public.estado_solicitud_arco as enum (
  'pendiente',
  'en_proceso',
  'completada',
  'rechazada'
);

create table if not exists public.solicitudes_arco (
  id            uuid primary key default gen_random_uuid(),
  escuela_id    uuid references public.escuelas(id) on delete cascade,

  -- Datos del solicitante (no requiere cuenta en la plataforma)
  tipo          public.tipo_solicitud_arco not null,
  nombre        text not null,
  dni           text not null,
  email         text not null,
  telefono      text,
  descripcion   text not null,

  -- Gestión
  estado        public.estado_solicitud_arco not null default 'pendiente',
  respuesta     text,
  responded_at  timestamptz,
  responded_by  uuid references public.perfiles(id),

  created_at    timestamptz not null default now()
);

-- Índices
create index if not exists idx_arco_escuela   on public.solicitudes_arco(escuela_id);
create index if not exists idx_arco_estado    on public.solicitudes_arco(estado);
create index if not exists idx_arco_dni       on public.solicitudes_arco(dni);

-- RLS
alter table public.solicitudes_arco enable row level security;

-- Los admin de escuela pueden ver solicitudes de su escuela
create policy "arco_admin_select" on public.solicitudes_arco
  for select using (
    escuela_id in (
      select escuela_id from public.perfiles
      where id = auth.uid()
        and rol in ('super_admin', 'admin_escuela')
    )
    or exists (
      select 1 from public.perfiles
      where id = auth.uid() and rol = 'super_admin'
    )
  );

-- Los admin pueden actualizar solicitudes de su escuela
create policy "arco_admin_update" on public.solicitudes_arco
  for update using (
    escuela_id in (
      select escuela_id from public.perfiles
      where id = auth.uid()
        and rol in ('super_admin', 'admin_escuela')
    )
    or exists (
      select 1 from public.perfiles
      where id = auth.uid() and rol = 'super_admin'
    )
  );

-- Insertar solicitudes es público (cualquiera puede enviar una)
-- Se maneja via API server-side, no via RLS directo
create policy "arco_insert_via_api" on public.solicitudes_arco
  for insert with check (true);
