create table if not exists public.ingresos_diarios_importados (
  id uuid default gen_random_uuid() primary key,
  escuela_id uuid references public.escuelas(id) on delete cascade not null,
  sede_id uuid references public.sedes(id) on delete cascade not null,
  user_id uuid references public.perfiles(id) on delete set null,
  fuente text not null,
  hoja text not null,
  fecha date not null,
  detalle text not null,
  categoria_sugerida text not null check (categoria_sugerida in (
    'matricula',
    'mensualidad',
    'clase_suelta',
    'examen_teorico',
    'examen_practico',
    'material',
    'tasas_dgt',
    'otros'
  )),
  valor numeric not null,
  forma_pago text,
  metodo_pago_sugerido text not null default 'otro' check (metodo_pago_sugerido in (
    'efectivo',
    'datafono',
    'nequi',
    'sistecredito',
    'otro'
  )),
  entrega text,
  recibe text,
  source_key text not null unique,
  notas text,
  created_at timestamp with time zone default now()
);

create index if not exists ingresos_diarios_importados_escuela_fecha_idx
  on public.ingresos_diarios_importados (escuela_id, fecha desc);

alter table public.ingresos_diarios_importados enable row level security;
