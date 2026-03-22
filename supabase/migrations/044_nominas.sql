-- ============================================================
-- 044_nominas.sql
-- Módulo de nómina independiente para instructores y administrativos
-- Instructores: prestación de servicios + seguridad social
-- Administrativos: nómina laboral regular
-- ============================================================

-- Tipo de empleado en nómina
create type tipo_empleado_nomina as enum ('instructor', 'administrativo');

-- Tipo de contrato
create type tipo_contrato_nomina as enum ('prestacion_servicios', 'contrato_laboral');

-- Estado de la nómina
create type estado_nomina as enum ('borrador', 'aprobada', 'pagada', 'anulada');

-- Tipo de concepto dentro de una nómina
create type tipo_concepto_nomina as enum ('devengo', 'deduccion');

-- ============================================================
-- Tabla principal de nóminas
-- ============================================================
create table if not exists nominas (
  id            uuid primary key default gen_random_uuid(),
  escuela_id    uuid not null references escuelas(id) on delete cascade,
  sede_id       uuid not null references sedes(id) on delete cascade,
  empleado_tipo tipo_empleado_nomina not null,
  empleado_id   uuid not null,
  empleado_nombre text not null,
  periodo_anio  int not null check (periodo_anio >= 2020 and periodo_anio <= 2100),
  periodo_mes   int not null check (periodo_mes >= 1 and periodo_mes <= 12),
  tipo_contrato tipo_contrato_nomina not null,
  salario_base  numeric(12,2) not null default 0,
  total_devengado numeric(12,2) not null default 0,
  total_deducciones numeric(12,2) not null default 0,
  neto_pagar    numeric(12,2) not null default 0,
  estado        estado_nomina not null default 'borrador',
  fecha_pago    date,
  notas         text,
  created_by    uuid references auth.users(id),
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now(),

  -- Un empleado no puede tener dos nóminas del mismo mes
  unique (escuela_id, empleado_tipo, empleado_id, periodo_anio, periodo_mes)
);

-- Índices para queries comunes
create index if not exists idx_nominas_escuela_periodo
  on nominas (escuela_id, periodo_anio desc, periodo_mes desc);
create index if not exists idx_nominas_empleado
  on nominas (empleado_id, periodo_anio desc, periodo_mes desc);
create index if not exists idx_nominas_sede
  on nominas (sede_id);
create index if not exists idx_nominas_estado
  on nominas (estado);

-- ============================================================
-- Tabla de conceptos (líneas de detalle) de cada nómina
-- ============================================================
create table if not exists nomina_conceptos (
  id          uuid primary key default gen_random_uuid(),
  nomina_id   uuid not null references nominas(id) on delete cascade,
  tipo        tipo_concepto_nomina not null,
  concepto    text not null,
  descripcion text,
  valor       numeric(12,2) not null default 0,
  created_at  timestamptz not null default now()
);

create index if not exists idx_nomina_conceptos_nomina
  on nomina_conceptos (nomina_id);

-- ============================================================
-- RLS — Row Level Security
-- ============================================================
alter table nominas enable row level security;
alter table nomina_conceptos enable row level security;

-- Super admin: acceso total
create policy "nominas_super_admin" on nominas
  for all using (
    exists (select 1 from perfiles where id = auth.uid() and rol = 'super_admin')
  );

create policy "nomina_conceptos_super_admin" on nomina_conceptos
  for all using (
    exists (select 1 from perfiles where id = auth.uid() and rol = 'super_admin')
  );

-- Admin escuela: todas las nóminas de su escuela
create policy "nominas_admin_escuela" on nominas
  for all using (
    exists (
      select 1 from perfiles
      where id = auth.uid()
        and rol = 'admin_escuela'
        and escuela_id = nominas.escuela_id
    )
  );

create policy "nomina_conceptos_admin_escuela" on nomina_conceptos
  for all using (
    exists (
      select 1 from perfiles p
      join nominas n on n.id = nomina_conceptos.nomina_id
      where p.id = auth.uid()
        and p.rol = 'admin_escuela'
        and p.escuela_id = n.escuela_id
    )
  );

-- Admin sede: solo nóminas de su sede
create policy "nominas_admin_sede" on nominas
  for all using (
    exists (
      select 1 from perfiles
      where id = auth.uid()
        and rol = 'admin_sede'
        and sede_id = nominas.sede_id
    )
  );

create policy "nomina_conceptos_admin_sede" on nomina_conceptos
  for all using (
    exists (
      select 1 from perfiles p
      join nominas n on n.id = nomina_conceptos.nomina_id
      where p.id = auth.uid()
        and p.rol = 'admin_sede'
        and p.sede_id = n.sede_id
    )
  );

-- Administrativo: solo nóminas de su sede
create policy "nominas_administrativo" on nominas
  for all using (
    exists (
      select 1 from perfiles
      where id = auth.uid()
        and rol = 'administrativo'
        and sede_id = nominas.sede_id
    )
  );

create policy "nomina_conceptos_administrativo" on nomina_conceptos
  for all using (
    exists (
      select 1 from perfiles p
      join nominas n on n.id = nomina_conceptos.nomina_id
      where p.id = auth.uid()
        and p.rol = 'administrativo'
        and p.sede_id = n.sede_id
    )
  );

-- Trigger para updated_at
create or replace function update_nomina_updated_at()
returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language plpgsql;

create trigger trg_nominas_updated_at
  before update on nominas
  for each row execute function update_nomina_updated_at();

-- ============================================================
-- Conceptos predeterminados (templates)
-- Para referencia del frontend
-- ============================================================
comment on table nominas is 'Registro mensual de nómina por empleado (instructor o administrativo)';
comment on table nomina_conceptos is 'Líneas de detalle de cada nómina: devengos y deducciones';
comment on column nominas.empleado_tipo is 'instructor = prestación de servicios; administrativo = contrato laboral';
comment on column nominas.tipo_contrato is 'prestacion_servicios para instructores, contrato_laboral para administrativos';
