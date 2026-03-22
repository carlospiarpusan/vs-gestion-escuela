-- ============================================================================
-- 045 · Tabla de configuración editable de planes
-- ============================================================================

create table public.planes_config (
  id            text        primary key check (id in ('gratuito','basico','profesional','enterprise')),
  nombre        text        not null,
  descripcion   text,
  precio_mensual numeric(12,2) not null default 0,
  max_alumnos_default integer not null default 50,
  max_sedes_default   integer not null default 1,
  caracteristicas     jsonb   not null default '[]'::jsonb,
  activo        boolean     not null default true,
  updated_by    uuid        references auth.users(id),
  updated_at    timestamptz default now(),
  created_at    timestamptz default now()
);

-- Seed con valores por defecto (COP)
insert into public.planes_config
  (id, nombre, descripcion, precio_mensual, max_alumnos_default, max_sedes_default, caracteristicas)
values
  ('gratuito', 'Gratuito',
   'Plan de entrada para escuelas nuevas que quieren ordenar su operación.',
   0, 30, 1,
   '["Alumnos y matrículas","Agenda de clases","Exámenes básicos","Recaudo inicial"]'::jsonb),

  ('basico', 'Básico',
   'Para escuelas con operación diaria constante en crecimiento.',
   89000, 100, 2,
   '["Todo lo del plan Gratuito","Ingresos y cartera","Caja diaria","Horas de instructores","Informes básicos"]'::jsonb),

  ('profesional', 'Profesional',
   'Para escuelas en expansión con múltiples sedes.',
   179000, 500, 5,
   '["Todo lo del plan Básico","Multi-sede completo","Gastos y proveedores","Nóminas","Automatización de facturas","Informes avanzados"]'::jsonb),

  ('enterprise', 'Enterprise',
   'Control central para redes amplias y estructuras complejas.',
   349000, 2000, 20,
   '["Todo lo del plan Profesional","Gobierno central","Capacidad amplia","Soporte prioritario","API personalizada"]'::jsonb);

-- RLS
alter table public.planes_config enable row level security;

create policy "Lectura pública de planes"
  on public.planes_config for select
  using (true);

create policy "Solo super_admin edita planes"
  on public.planes_config for update
  using (
    exists (
      select 1 from public.perfiles
      where id = auth.uid() and rol = 'super_admin'
    )
  );

-- Trigger updated_at
create trigger set_planes_config_updated_at
  before update on public.planes_config
  for each row execute function public.set_updated_at();
