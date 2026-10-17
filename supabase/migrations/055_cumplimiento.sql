-- ────────────────────────────────────────────────────────────────────────────
-- 055  Tablas para módulo de cumplimiento interno y evidencia documental
--      Ley 1581 de 2012, RNBD (SIC), copias de seguridad e incidentes
-- ────────────────────────────────────────────────────────────────────────────

-- 1. Tabla de estado general de cumplimiento por escuela
create table if not exists public.cumplimiento_escuelas (
  id                          uuid primary key default gen_random_uuid(),
  escuela_id                  uuid not null references public.escuelas(id) on delete cascade,

  politica_privacidad_vigente boolean not null default false,
  politica_version            text,
  politica_revisada_at        timestamptz,

  responsable_nombre          text,
  responsable_cargo           text,
  responsable_email           text,
  responsable_telefono        text,
  canal_contacto              text,

  consentimientos_revisados_at timestamptz,

  rnbd_estado                 text not null default 'no_aplica'
    check (rnbd_estado in ('no_aplica', 'pendiente', 'radicado', 'actualizado')),
  rnbd_revisado_at            timestamptz,
  rnbd_evidencia_ref          text,

  notas                       text,

  created_by                  uuid references public.perfiles(id) on delete set null,
  updated_by                  uuid references public.perfiles(id) on delete set null,
  created_at                  timestamptz not null default now(),
  updated_at                  timestamptz not null default now()
);

-- 2. Tabla de respaldos y copias de seguridad
create table if not exists public.cumplimiento_respaldos (
  id              uuid primary key default gen_random_uuid(),
  escuela_id      uuid not null references public.escuelas(id) on delete cascade,

  fecha_respaldo  date not null default current_date,
  tipo            text not null
    check (tipo in ('base_datos', 'archivos', 'documental', 'seguridad')),
  resultado       text not null default 'exitoso'
    check (resultado in ('exitoso', 'parcial', 'fallido')),
  responsable     text not null,
  evidencia_ref   text,
  detalle         text,

  created_by      uuid references public.perfiles(id) on delete set null,
  updated_by      uuid references public.perfiles(id) on delete set null,
  created_at      timestamptz not null default now(),
  updated_at      timestamptz not null default now()
);

-- 3. Tabla de incidentes de seguridad y privacidad
create table if not exists public.cumplimiento_incidentes (
  id                uuid primary key default gen_random_uuid(),
  escuela_id        uuid not null references public.escuelas(id) on delete cascade,

  clasificacion     text not null
    check (clasificacion in ('acceso_no_autorizado', 'fuga_informacion', 'perdida_datos', 'falla_disponibilidad', 'suplantacion', 'otro')),
  impacto           text not null default 'medio'
    check (impacto in ('bajo', 'medio', 'alto', 'critico')),
  estado            text not null default 'abierto'
    check (estado in ('abierto', 'en_investigacion', 'contenido', 'cerrado')),

  titulo            text not null,
  descripcion       text not null,
  acciones_tomadas  text,
  responsable       text,
  fecha_deteccion   timestamptz not null default now(),
  fecha_cierre      timestamptz,

  created_by        uuid references public.perfiles(id) on delete set null,
  updated_by        uuid references public.perfiles(id) on delete set null,
  created_at        timestamptz not null default now(),
  updated_at        timestamptz not null default now()
);

-- 4. Tabla de políticas de retención y conservación de datos
create table if not exists public.cumplimiento_retencion (
  id                uuid primary key default gen_random_uuid(),
  escuela_id        uuid not null references public.escuelas(id) on delete cascade,

  tipo_dato         text not null
    check (tipo_dato in ('alumnos', 'contratos', 'examenes', 'financiero_contable', 'nominas_personal', 'biometria_asistencia', 'solicitudes_arco')),
  meses_retencion   integer not null default 60 check (meses_retencion > 0),
  criterio_legal    text,
  estado_revision   text not null default 'vigente'
    check (estado_revision in ('vigente', 'pendiente', 'en_revision')),
  revisado_at       timestamptz,
  evidencia_ref     text,
  notas             text,

  created_by        uuid references public.perfiles(id) on delete set null,
  updated_by        uuid references public.perfiles(id) on delete set null,
  created_at        timestamptz not null default now(),
  updated_at        timestamptz not null default now()
);

-- Índices
create index if not exists idx_cumplimiento_escuelas_escuela on public.cumplimiento_escuelas(escuela_id);
create index if not exists idx_cumplimiento_respaldos_escuela on public.cumplimiento_respaldos(escuela_id, fecha_respaldo desc);
create index if not exists idx_cumplimiento_incidentes_escuela on public.cumplimiento_incidentes(escuela_id, estado, fecha_deteccion desc);
create index if not exists idx_cumplimiento_retencion_escuela on public.cumplimiento_retencion(escuela_id, tipo_dato);

-- RLS
alter table public.cumplimiento_escuelas enable row level security;
alter table public.cumplimiento_respaldos enable row level security;
alter table public.cumplimiento_incidentes enable row level security;
alter table public.cumplimiento_retencion enable row level security;

-- Políticas de lectura
create policy "cumplimiento_escuelas_select" on public.cumplimiento_escuelas
  for select using (
    escuela_id in (
      select escuela_id from public.perfiles
      where id = auth.uid() and rol in ('super_admin', 'admin_escuela')
    )
    or exists (
      select 1 from public.perfiles
      where id = auth.uid() and rol = 'super_admin'
    )
  );

create policy "cumplimiento_respaldos_select" on public.cumplimiento_respaldos
  for select using (
    escuela_id in (
      select escuela_id from public.perfiles
      where id = auth.uid() and rol in ('super_admin', 'admin_escuela')
    )
    or exists (
      select 1 from public.perfiles
      where id = auth.uid() and rol = 'super_admin'
    )
  );

create policy "cumplimiento_incidentes_select" on public.cumplimiento_incidentes
  for select using (
    escuela_id in (
      select escuela_id from public.perfiles
      where id = auth.uid() and rol in ('super_admin', 'admin_escuela')
    )
    or exists (
      select 1 from public.perfiles
      where id = auth.uid() and rol = 'super_admin'
    )
  );

create policy "cumplimiento_retencion_select" on public.cumplimiento_retencion
  for select using (
    escuela_id in (
      select escuela_id from public.perfiles
      where id = auth.uid() and rol in ('super_admin', 'admin_escuela')
    )
    or exists (
      select 1 from public.perfiles
      where id = auth.uid() and rol = 'super_admin'
    )
  );

-- Políticas de escritura (insert/update/delete)
create policy "cumplimiento_escuelas_modify" on public.cumplimiento_escuelas
  for all using (
    escuela_id in (
      select escuela_id from public.perfiles
      where id = auth.uid() and rol in ('super_admin', 'admin_escuela')
    )
    or exists (
      select 1 from public.perfiles
      where id = auth.uid() and rol = 'super_admin'
    )
  );

create policy "cumplimiento_respaldos_modify" on public.cumplimiento_respaldos
  for all using (
    escuela_id in (
      select escuela_id from public.perfiles
      where id = auth.uid() and rol in ('super_admin', 'admin_escuela')
    )
    or exists (
      select 1 from public.perfiles
      where id = auth.uid() and rol = 'super_admin'
    )
  );

create policy "cumplimiento_incidentes_modify" on public.cumplimiento_incidentes
  for all using (
    escuela_id in (
      select escuela_id from public.perfiles
      where id = auth.uid() and rol in ('super_admin', 'admin_escuela')
    )
    or exists (
      select 1 from public.perfiles
      where id = auth.uid() and rol = 'super_admin'
    )
  );

create policy "cumplimiento_retencion_modify" on public.cumplimiento_retencion
  for all using (
    escuela_id in (
      select escuela_id from public.perfiles
      where id = auth.uid() and rol in ('super_admin', 'admin_escuela')
    )
    or exists (
      select 1 from public.perfiles
      where id = auth.uid() and rol = 'super_admin'
    )
  );
