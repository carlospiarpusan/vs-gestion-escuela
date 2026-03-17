-- ============================================================
-- AGENTIC SCHOOL MANAGEMENT SYSTEM - DATABASE SCHEMA
-- ============================================================
--
-- This schema defines the structure for a multi-tenant driving school management system.
-- It uses Supabase Auth for user management and Row Level Security (RLS) for access control.
--
-- ROLES & HIERARCHY:
-- 1. super_admin: Platform owner, full access to all schools.
-- 2. admin_escuela: School owner, full access to their school and all its branches (sedes).
-- 3. admin_sede: Branch manager, access only to their specific branch.
-- 4. secretaria: Similar to admin_sede but focused on administrative tasks.
-- 5. instructor: Access to assigned classes, students, and vehicles.
-- 6. alumno: Access only to their own data (classes, exams, payments).
--
-- KEY ENTITIES:
-- - Escuelas (Schools): Top-level tenant.
-- - Sedes (Branches): Physical locations belonging to a school.
-- - Perfiles (Profiles): User profiles linked to auth.users.
--
-- ============================================
-- FUNCIONES AUXILIARES
-- ============================================

-- Verificar si es super_admin
create or replace function public.is_super_admin()
returns boolean
language plpgsql security definer set search_path = public
as $$
begin
  return exists (
    select 1 from public.perfiles
    where id = (select auth.uid()) and rol = 'super_admin'
  );
end;
$$;

-- Obtener escuela_id del usuario actual
create or replace function public.get_my_escuela_id()
returns uuid
language plpgsql security definer set search_path = public
as $$
begin
  return (
    select escuela_id from public.perfiles
    where id = (select auth.uid())
  );
end;
$$;

-- Obtener sede_id del usuario actual
create or replace function public.get_my_sede_id()
returns uuid
language plpgsql security definer set search_path = public
as $$
begin
  return (
    select sede_id from public.perfiles
    where id = (select auth.uid())
  );
end;
$$;

-- Verificar si es admin de escuela (ve todas las sedes)
create or replace function public.is_admin_escuela()
returns boolean
language plpgsql security definer set search_path = public
as $$
begin
  return exists (
    select 1 from public.perfiles
    where id = (select auth.uid()) and rol = 'admin_escuela'
  );
end;
$$;

-- Verificar si es instructor
create or replace function public.is_instructor()
returns boolean
language plpgsql security definer set search_path = public
as $$
begin
  return exists (
    select 1 from public.perfiles
    where id = (select auth.uid()) and rol = 'instructor'
  );
end;
$$;

-- Obtener instructor_id del usuario actual
create or replace function public.get_my_instructor_id()
returns uuid
language plpgsql security definer set search_path = public
as $$
begin
  return (
    select id from public.instructores
    where user_id = (select auth.uid()) limit 1
  );
end;
$$;

-- Verificar si es alumno
create or replace function public.is_alumno()
returns boolean
language plpgsql security definer set search_path = public
as $$
begin
  return exists (
    select 1 from public.perfiles
    where id = (select auth.uid()) and rol = 'alumno'
  );
end;
$$;

-- Obtener alumno_id del usuario actual (busca en tabla alumnos por user_id)
create or replace function public.get_my_alumno_id()
returns uuid
language plpgsql security definer set search_path = public
as $$
begin
  return (
    select id from public.alumnos
    where user_id = (select auth.uid()) limit 1
  );
end;
$$;

-- REVOKE: las funciones helper no son llamables directamente via API por anon.
-- Las funciones trigger no son llamables directamente via API por nadie.
-- (aplicar tras crear las funciones en un entorno limpio)
-- revoke execute on function public.is_super_admin()       from anon;
-- revoke execute on function public.get_my_escuela_id()    from anon;
-- revoke execute on function public.get_my_sede_id()       from anon;
-- revoke execute on function public.is_admin_escuela()     from anon;
-- revoke execute on function public.is_instructor()        from anon;
-- revoke execute on function public.get_my_instructor_id() from anon;
-- revoke execute on function public.is_alumno()            from anon;
-- revoke execute on function public.get_my_alumno_id()     from anon;

-- ============================================
-- TABLAS
-- ============================================

-- 1. ESCUELAS
create table public.escuelas (
  id uuid default gen_random_uuid() primary key,
  nombre text not null,
  cif text,
  telefono text,
  email text,
  web text,
  logo_url text,
  numero_licencia text,
  plan text not null default 'gratuito' check (plan in ('gratuito', 'basico', 'profesional', 'enterprise')),
  max_alumnos integer default 50,
  max_sedes integer default 1,
  estado text not null default 'activa' check (estado in ('activa', 'inactiva', 'suspendida')),
  fecha_alta date default current_date,
  created_at timestamp with time zone default now()
);

-- 2. SEDES (cada escuela tiene mínimo 1 sede)
create table public.sedes (
  id uuid default gen_random_uuid() primary key,
  escuela_id uuid references public.escuelas(id) on delete cascade not null,
  nombre text not null default 'Sede Principal',
  direccion text,
  ciudad text,
  codigo_postal text,
  provincia text,
  telefono text,
  email text,
  horario_apertura time default '08:00',
  horario_cierre time default '21:00',
  es_principal boolean default false,
  estado text not null default 'activa' check (estado in ('activa', 'inactiva')),
  created_at timestamp with time zone default now()
);

-- 3. PERFILES DE USUARIO
create table public.perfiles (
  id uuid references auth.users on delete cascade primary key,
  escuela_id uuid references public.escuelas(id) on delete set null,
  sede_id uuid references public.sedes(id) on delete set null,
  nombre text not null,
  email text not null,
  rol text not null default 'admin_escuela' check (rol in (
    'super_admin',     -- Ve TODAS las escuelas y sedes
    'admin_escuela',   -- Ve TODA su escuela (todas las sedes)
    'admin_sede',      -- Ve solo SU sede
    'secretaria',      -- Ve solo SU sede (gestiona finanzas, alumnos, agenda)
    'instructor',      -- Ve solo SU sede (clases y alumnos)
    'recepcion',       -- Ve solo SU sede (atención al público)
    'alumno'           -- Solo ve SUS datos: pagos, exámenes, resultados
  )),
  telefono text,
  avatar_url text,
  activo boolean default true,
  ultimo_acceso timestamp with time zone,
  created_at timestamp with time zone default now(),
  -- super_admin: no necesita escuela ni sede
  -- admin_escuela: necesita escuela, sede opcional (ve todas)
  -- admin_sede/instructor/recepcion: necesitan escuela Y sede
  constraint perfiles_jerarquia check (
    (rol = 'super_admin')
    or (rol = 'admin_escuela' and escuela_id is not null)
    or (rol in ('admin_sede', 'secretaria', 'instructor', 'recepcion', 'alumno') and escuela_id is not null and sede_id is not null)
  )
);

-- 4. ALUMNOS
create table public.alumnos (
  id uuid default gen_random_uuid() primary key,
  escuela_id uuid references public.escuelas(id) on delete cascade not null,
  sede_id uuid references public.sedes(id) on delete cascade not null,
  user_id uuid references public.perfiles(id) on delete cascade not null,
  tipo_registro text not null default 'regular' check (tipo_registro in ('regular', 'aptitud_conductor', 'practica_adicional')),
  numero_contrato text,
  nombre text not null,
  apellidos text not null,
  dni text not null,
  email text,
  telefono text not null,
  fecha_nacimiento date,
  direccion text,
  tipo_permiso text not null default 'B' check (tipo_permiso in ('AM', 'A1', 'A2', 'A', 'B', 'C', 'D')),
  categorias text[] not null default '{}',
  estado text not null default 'activo' check (estado in ('activo', 'inactivo', 'graduado', 'pre_registrado')),
  fecha_inscripcion date default current_date,
  notas text,
  valor_total numeric,
  ciudad text,
  departamento text,
  empresa_convenio text,
  nota_examen_teorico numeric(5,2),
  fecha_examen_teorico date,
  nota_examen_practico numeric(5,2),
  fecha_examen_practico date,
  tiene_tramitador boolean default false,
  tramitador_nombre text,
  tramitador_valor numeric,
  created_at timestamp with time zone default now()
);

-- 5. MATRÍCULAS / CONTRATOS DE ALUMNOS
create table public.matriculas_alumno (
  id uuid default gen_random_uuid() primary key,
  escuela_id uuid references public.escuelas(id) on delete cascade not null,
  sede_id uuid references public.sedes(id) on delete cascade not null,
  alumno_id uuid references public.alumnos(id) on delete cascade not null,
  created_by uuid references public.perfiles(id) on delete set null,
  numero_contrato text,
  categorias text[] not null default '{}',
  valor_total numeric,
  fecha_inscripcion date default current_date,
  estado text not null default 'activo' check (estado in ('activo', 'cerrado', 'cancelado')),
  notas text,
  tiene_tramitador boolean default false,
  tramitador_nombre text,
  tramitador_valor numeric,
  created_at timestamp with time zone default now(),
  constraint matriculas_alumno_contrato_unique unique (escuela_id, numero_contrato)
);

-- 6. INSTRUCTORES
create table public.instructores (
  id uuid default gen_random_uuid() primary key,
  escuela_id uuid references public.escuelas(id) on delete cascade not null,
  sede_id uuid references public.sedes(id) on delete cascade not null,
  user_id uuid references public.perfiles(id) on delete cascade not null,
  nombre text not null,
  apellidos text not null,
  dni text not null,
  email text,
  telefono text not null,
  licencia text not null,
  especialidad text not null default 'B' check (especialidad in ('AM', 'A1', 'A2', 'A', 'B', 'C', 'D')),
  estado text not null default 'activo' check (estado in ('activo', 'inactivo')),
  color text default '#0071e3',
  created_at timestamp with time zone default now()
);

-- 7. VEHÍCULOS
create table public.vehiculos (
  id uuid default gen_random_uuid() primary key,
  escuela_id uuid references public.escuelas(id) on delete cascade not null,
  sede_id uuid references public.sedes(id) on delete cascade not null,
  user_id uuid references public.perfiles(id) on delete cascade not null,
  marca text not null,
  modelo text not null,
  matricula text not null,
  tipo text not null default 'coche' check (tipo in ('coche', 'moto', 'camion', 'autobus')),
  anio integer,
  fecha_itv date,
  seguro_vencimiento date,
  estado text not null default 'disponible' check (estado in ('disponible', 'en_uso', 'mantenimiento', 'baja')),
  kilometraje integer default 0,
  notas text,
  created_at timestamp with time zone default now()
);

-- 8. CLASES
create table public.clases (
  id uuid default gen_random_uuid() primary key,
  escuela_id uuid references public.escuelas(id) on delete cascade not null,
  sede_id uuid references public.sedes(id) on delete cascade not null,
  user_id uuid references public.perfiles(id) on delete cascade not null,
  alumno_id uuid references public.alumnos(id) on delete cascade not null,
  instructor_id uuid references public.instructores(id) on delete set null,
  vehiculo_id uuid references public.vehiculos(id) on delete set null,
  tipo text not null default 'practica' check (tipo in ('practica', 'teorica')),
  fecha date not null,
  hora_inicio time not null,
  hora_fin time not null,
  estado text not null default 'programada' check (estado in ('programada', 'completada', 'cancelada', 'no_asistio')),
  notas text,
  created_at timestamp with time zone default now()
);

-- 9. EXÁMENES
create table public.examenes (
  id uuid default gen_random_uuid() primary key,
  escuela_id uuid references public.escuelas(id) on delete cascade not null,
  sede_id uuid references public.sedes(id) on delete cascade not null,
  user_id uuid references public.perfiles(id) on delete cascade not null,
  alumno_id uuid references public.alumnos(id) on delete cascade not null,
  tipo text not null check (tipo in ('teorico', 'practico')),
  fecha date not null,
  hora time,
  resultado text default 'pendiente' check (resultado in ('pendiente', 'aprobado', 'suspendido')),
  intentos integer default 1,
  notas text,
  created_at timestamp with time zone default now()
);

-- 10. PAGOS
-- Tabla pagos eliminada. Todos los abonos de alumnos se registran en ingresos.

-- 11. GASTOS (por sede)
create table public.gastos (
  id uuid default gen_random_uuid() primary key,
  escuela_id uuid references public.escuelas(id) on delete cascade not null,
  sede_id uuid references public.sedes(id) on delete cascade not null,
  user_id uuid references public.perfiles(id) on delete cascade not null,
  categoria text not null check (categoria in (
    'combustible', 'mantenimiento_vehiculo', 'alquiler', 'servicios',
    'nominas', 'seguros', 'material_didactico', 'marketing',
    'impuestos', 'suministros', 'reparaciones', 'otros'
  )),
  concepto text not null,
  monto decimal(10,2) not null,
  metodo_pago text default 'transferencia' check (metodo_pago in ('efectivo', 'tarjeta', 'transferencia', 'domiciliacion')),
  proveedor text,
  numero_factura text,
  fecha date default current_date,
  fecha_vencimiento date default current_date,
  estado_pago text not null default 'pagado' check (estado_pago in ('pendiente', 'pagado', 'anulado')),
  recurrente boolean default false,
  notas text,
  created_at timestamp with time zone default now()
);

-- 12. INTEGRACION DE CORREO PARA FACTURAS ELECTRONICAS
create table public.facturas_correo_integraciones (
  id uuid default gen_random_uuid() primary key,
  escuela_id uuid references public.escuelas(id) on delete cascade not null,
  sede_id uuid references public.sedes(id) on delete cascade not null,
  created_by uuid references public.perfiles(id) on delete set null,
  updated_by uuid references public.perfiles(id) on delete set null,
  provider text not null default 'imap' check (provider in ('imap', 'gmail_google')),
  correo text not null,
  imap_host text not null,
  imap_port integer not null default 993 check (imap_port between 1 and 65535),
  imap_secure boolean not null default true,
  imap_user text not null,
  imap_password_encrypted text,
  oauth_refresh_token_encrypted text,
  mailbox text not null default 'INBOX',
  from_filter text,
  subject_filter text,
  import_only_unseen boolean not null default true,
  auto_sync boolean not null default true,
  activa boolean not null default true,
  last_uid bigint,
  last_synced_at timestamp with time zone,
  last_error text,
  created_at timestamp with time zone not null default now(),
  updated_at timestamp with time zone not null default now(),
  constraint facturas_correo_integraciones_escuela_unique unique (escuela_id)
);

create table public.facturas_correo_importaciones (
  id uuid default gen_random_uuid() primary key,
  integracion_id uuid references public.facturas_correo_integraciones(id) on delete cascade not null,
  escuela_id uuid references public.escuelas(id) on delete cascade not null,
  sede_id uuid references public.sedes(id) on delete cascade not null,
  gasto_id uuid references public.gastos(id) on delete set null,
  imap_uid bigint,
  message_id text,
  message_date timestamp with time zone,
  remitente text,
  asunto text,
  attachment_name text not null,
  invoice_number text,
  supplier_name text,
  total numeric(12,2),
  currency text,
  status text not null default 'importada' check (status in ('importada', 'duplicada', 'omitida', 'error')),
  detail text,
  created_at timestamp with time zone not null default now()
);

create unique index facturas_correo_importaciones_message_attachment_uidx
  on public.facturas_correo_importaciones (integracion_id, message_id, attachment_name)
  where message_id is not null;

create unique index facturas_correo_importaciones_uid_attachment_uidx
  on public.facturas_correo_importaciones (integracion_id, imap_uid, attachment_name)
  where imap_uid is not null;

create index facturas_correo_importaciones_escuela_created_idx
  on public.facturas_correo_importaciones (escuela_id, created_at desc);

-- 13. INGRESOS (por sede)
create table public.ingresos (
  id uuid default gen_random_uuid() primary key,
  escuela_id uuid references public.escuelas(id) on delete cascade not null,
  sede_id uuid references public.sedes(id) on delete cascade not null,
  user_id uuid references public.perfiles(id) on delete cascade not null,
  alumno_id uuid references public.alumnos(id) on delete set null,
  matricula_id uuid references public.matriculas_alumno(id) on delete set null,
  categoria text not null check (categoria in (
    'matricula', 'mensualidad', 'clase_suelta', 'examen_teorico',
    'examen_practico', 'examen_aptitud', 'material', 'tasas_dgt', 'otros'
  )),
  concepto text not null,
  monto decimal(10,2) not null,
  metodo_pago text not null default 'efectivo' check (metodo_pago in ('efectivo', 'datafono', 'nequi', 'sistecredito', 'otro')),
  medio_especifico text,
  numero_factura text,
  fecha date default current_date,
  fecha_vencimiento date default current_date,
  estado text not null default 'cobrado' check (estado in ('cobrado', 'pendiente', 'anulado')),
  notas text,
  created_at timestamp with time zone default now()
);

-- 14. CATEGORÍAS DE PREGUNTAS DE EXAMEN (globales, solo super_admin)
create table public.categorias_examen (
  id uuid default gen_random_uuid() primary key,
  nombre text not null,
  descripcion text,
  tipo_permiso text not null default 'B' check (tipo_permiso in ('AM', 'A1', 'A2', 'A', 'B', 'C', 'D', 'comun')),
  orden integer default 0,
  created_at timestamp with time zone default now()
);

-- 15. PREGUNTAS DE EXAMEN (globales, solo super_admin)
create table public.preguntas_examen (
  id uuid default gen_random_uuid() primary key,
  categoria_id uuid references public.categorias_examen(id) on delete set null,
  pregunta text not null,
  imagen_url text,
  opcion_a text not null,
  opcion_b text not null,
  opcion_c text not null,
  respuesta_correcta text not null check (respuesta_correcta in ('a', 'b', 'c')),
  explicacion text,
  tipo_permiso text not null default 'B' check (tipo_permiso in ('AM', 'A1', 'A2', 'A', 'B', 'C', 'D', 'comun')),
  dificultad text not null default 'media' check (dificultad in ('facil', 'media', 'dificil')),
  activa boolean default true,
  created_at timestamp with time zone default now()
);

-- 16. RESPUESTAS DE ALUMNOS (por escuela y sede)
create table public.respuestas_examen (
  id uuid default gen_random_uuid() primary key,
  escuela_id uuid references public.escuelas(id) on delete cascade not null,
  sede_id uuid references public.sedes(id) on delete cascade not null,
  alumno_id uuid references public.alumnos(id) on delete cascade not null,
  examen_id uuid references public.examenes(id) on delete cascade,
  pregunta_id uuid references public.preguntas_examen(id) on delete cascade not null,
  respuesta_alumno text not null check (respuesta_alumno in ('a', 'b', 'c')),
  es_correcta boolean not null,
  tiempo_segundos integer,
  created_at timestamp with time zone default now()
);

alter table public.examenes
  add column if not exists modulo_origen text,
  add column if not exists fuente_banco text,
  add column if not exists total_preguntas integer,
  add column if not exists respuestas_correctas integer,
  add column if not exists porcentaje integer,
  add column if not exists tiempo_segundos integer;

alter table public.preguntas_examen
  add column if not exists created_by uuid references public.perfiles(id) on delete set null,
  add column if not exists updated_by uuid references public.perfiles(id) on delete set null,
  add column if not exists updated_at timestamp with time zone not null default now();

create table if not exists public.examenes_cale_preguntas (
  id bigint generated always as identity primary key,
  escuela_id uuid references public.escuelas(id) on delete cascade not null,
  sede_id uuid references public.sedes(id) on delete cascade not null,
  alumno_id uuid references public.alumnos(id) on delete cascade not null,
  examen_id uuid references public.examenes(id) on delete cascade not null,
  pregunta_id uuid references public.preguntas_examen(id) on delete set null,
  categoria_id uuid references public.categorias_examen(id) on delete set null,
  categoria_nombre text,
  codigo_externo text,
  pregunta_texto text not null,
  orden_pregunta integer not null check (orden_pregunta > 0),
  created_at timestamp with time zone not null default now(),
  constraint examenes_cale_preguntas_examen_orden_unique unique (examen_id, orden_pregunta)
);

-- 17. LOG DE ACTIVIDAD
create table public.actividad_log (
  id uuid default gen_random_uuid() primary key,
  escuela_id uuid references public.escuelas(id) on delete cascade,
  sede_id uuid references public.sedes(id) on delete cascade,
  user_id uuid references public.perfiles(id) on delete set null,
  accion text not null,
  tabla text not null,
  registro_id uuid,
  detalles jsonb,
  created_at timestamp with time zone default now()
);

create table if not exists public.api_rate_limits (
  key text primary key,
  count integer not null,
  reset_at timestamptz not null
);

-- 17. MANTENIMIENTO DE VEHÍCULOS (registro por instructor)
create table public.mantenimiento_vehiculos (
  id uuid default gen_random_uuid() primary key,
  escuela_id uuid references public.escuelas(id) on delete cascade not null,
  sede_id uuid references public.sedes(id) on delete cascade not null,
  vehiculo_id uuid references public.vehiculos(id) on delete cascade not null,
  instructor_id uuid references public.instructores(id) on delete set null,
  user_id uuid references public.perfiles(id) on delete cascade not null,
  tipo text not null check (tipo in (
    'cambio_aceite',    -- Cambio de aceite
    'gasolina',         -- Tanqueo de gasolina
    'repuesto',         -- Repuestos instalados
    'mano_obra',        -- Mano de obra mecánica
    'lavado',           -- Lavado del vehículo
    'neumaticos',       -- Cambio/reparación de neumáticos
    'reparacion',       -- Reparaciones generales
    'revision_general', -- Revisión general
    'otros'             -- Otros mantenimientos
  )),
  descripcion text not null,
  monto decimal(10,2) not null default 0,
  kilometraje_actual integer,
  litros decimal(8,2),           -- Para gasolina: litros tanqueados
  precio_por_litro decimal(6,2), -- Para gasolina: precio por litro
  proveedor text,                -- Taller, gasolinera, etc.
  numero_factura text,
  foto_url text,                 -- Foto del recibo/factura
  fecha date default current_date,
  notas text,
  created_at timestamp with time zone default now()
);

alter table public.gastos
  add column mantenimiento_id uuid unique;

alter table public.gastos
  add constraint gastos_mantenimiento_id_fkey
  foreign key (mantenimiento_id)
  references public.mantenimiento_vehiculos(id)
  on delete cascade;

-- -- 17. CURSOS (catálogo global)
-- create table public.cursos (
--   id serial primary key,
--   codigo text not null unique,
--   nombre text not null,
--   descripcion text
-- );
--
-- -- 18. CURSOS POR SEDE (con precio)
-- create table public.sede_cursos (
--   id serial primary key,
--   sede_id uuid references public.sedes(id) on delete cascade not null,
--   curso_id integer references public.cursos(id) on delete cascade not null,
--   precio decimal(10,2) not null default 0,
--   activo boolean default true
-- );

-- Índices operativos
create extension if not exists pg_trgm;
create index if not exists matriculas_alumno_escuela_idx on public.matriculas_alumno (escuela_id);
create index if not exists matriculas_alumno_sede_idx on public.matriculas_alumno (sede_id);
create index if not exists matriculas_alumno_alumno_idx on public.matriculas_alumno (alumno_id);
create index if not exists matriculas_alumno_escuela_fecha_idx on public.matriculas_alumno (escuela_id, fecha_inscripcion desc, created_at desc);
create index if not exists ingresos_matricula_id_idx on public.ingresos (matricula_id);
create index if not exists ingresos_escuela_fecha_created_idx on public.ingresos (escuela_id, fecha desc, created_at desc);
create index if not exists ingresos_escuela_estado_fecha_idx on public.ingresos (escuela_id, estado, fecha desc);
create index if not exists ingresos_escuela_vencimiento_estado_idx on public.ingresos (escuela_id, estado, fecha_vencimiento asc);
create index if not exists ingresos_escuela_categoria_fecha_idx on public.ingresos (escuela_id, categoria, fecha desc);
create index if not exists ingresos_escuela_metodo_fecha_idx on public.ingresos (escuela_id, metodo_pago, fecha desc);
create index if not exists ingresos_escuela_alumno_fecha_idx on public.ingresos (escuela_id, alumno_id, fecha desc);
create index if not exists gastos_escuela_fecha_created_idx on public.gastos (escuela_id, fecha desc, created_at desc);
create index if not exists gastos_escuela_categoria_fecha_idx on public.gastos (escuela_id, categoria, fecha desc);
create index if not exists gastos_escuela_metodo_fecha_idx on public.gastos (escuela_id, metodo_pago, fecha desc);
create index if not exists gastos_escuela_vencimiento_estado_pago_idx on public.gastos (escuela_id, estado_pago, fecha_vencimiento asc);
create index if not exists gastos_escuela_recurrente_fecha_idx on public.gastos (escuela_id, recurrente, fecha desc);
create index if not exists gastos_escuela_factura_idx on public.gastos (escuela_id, numero_factura)
  where numero_factura is not null and btrim(numero_factura) <> '';
create index if not exists alumnos_escuela_tipo_created_idx on public.alumnos (escuela_id, tipo_registro, created_at desc);
create index if not exists alumnos_nombre_apellidos_trgm_idx
  on public.alumnos using gin ((coalesce(nombre, '') || ' ' || coalesce(apellidos, '')) gin_trgm_ops);
create index if not exists alumnos_dni_trgm_idx on public.alumnos using gin (dni gin_trgm_ops);
create index if not exists alumnos_numero_contrato_trgm_idx
  on public.alumnos using gin ((coalesce(numero_contrato, '')) gin_trgm_ops);
create index if not exists alumnos_empresa_convenio_trgm_idx
  on public.alumnos using gin ((coalesce(empresa_convenio, '')) gin_trgm_ops);
create index if not exists alumnos_categorias_gin_idx on public.alumnos using gin (categorias);
create index if not exists matriculas_alumno_categorias_gin_idx on public.matriculas_alumno using gin (categorias);
create index if not exists perfiles_escuela_rol_created_idx on public.perfiles (escuela_id, rol, created_at desc);
create index if not exists perfiles_escuela_sede_rol_created_idx on public.perfiles (escuela_id, sede_id, rol, created_at desc);
create index if not exists perfiles_nombre_trgm_idx on public.perfiles using gin (nombre gin_trgm_ops);
create index if not exists perfiles_email_trgm_idx on public.perfiles using gin (email gin_trgm_ops);
create index if not exists sedes_escuela_estado_principal_idx on public.sedes (escuela_id, estado, es_principal desc);
create unique index if not exists sedes_escuela_principal_unique_idx
  on public.sedes (escuela_id)
  where es_principal = true;
create index if not exists instructores_escuela_created_idx on public.instructores (escuela_id, created_at desc);
create index if not exists instructores_escuela_sede_created_idx on public.instructores (escuela_id, sede_id, created_at desc);
create index if not exists instructores_nombre_trgm_idx on public.instructores using gin (nombre gin_trgm_ops);
create index if not exists instructores_apellidos_trgm_idx on public.instructores using gin (apellidos gin_trgm_ops);
create index if not exists instructores_dni_trgm_idx on public.instructores using gin (dni gin_trgm_ops);
create index if not exists ingresos_concepto_trgm_idx on public.ingresos using gin (concepto gin_trgm_ops);
create index if not exists ingresos_numero_factura_trgm_idx
  on public.ingresos using gin ((coalesce(numero_factura, '')) gin_trgm_ops);
create index if not exists ingresos_notas_trgm_idx
  on public.ingresos using gin ((coalesce(notas, '')) gin_trgm_ops);
create index if not exists examenes_cale_modulo_fecha_created_idx on public.examenes (modulo_origen, fecha desc, created_at desc);
create index if not exists examenes_cale_escuela_modulo_fecha_created_idx on public.examenes (escuela_id, modulo_origen, fecha desc, created_at desc);
create index if not exists examenes_cale_escuela_sede_modulo_fecha_created_idx on public.examenes (escuela_id, sede_id, modulo_origen, fecha desc, created_at desc);
create index if not exists examenes_cale_alumno_modulo_fecha_created_idx on public.examenes (alumno_id, modulo_origen, fecha desc, created_at desc);
create index if not exists examenes_cale_escuela_resultado_fecha_created_idx
  on public.examenes (escuela_id, resultado, fecha desc, created_at desc)
  where modulo_origen = 'cale_practica';
create index if not exists respuestas_examen_examen_created_idx on public.respuestas_examen (examen_id, created_at desc);
create index if not exists respuestas_examen_pregunta_created_idx on public.respuestas_examen (pregunta_id, created_at desc);
create index if not exists respuestas_examen_categoria_created_idx on public.respuestas_examen (categoria_nombre, created_at desc);
create index if not exists examenes_cale_preguntas_escuela_created_idx on public.examenes_cale_preguntas (escuela_id, created_at desc);
create index if not exists examenes_cale_preguntas_sede_created_idx on public.examenes_cale_preguntas (sede_id, created_at desc);
create index if not exists examenes_cale_preguntas_examen_orden_idx on public.examenes_cale_preguntas (examen_id, orden_pregunta asc);
create index if not exists examenes_cale_preguntas_pregunta_created_idx on public.examenes_cale_preguntas (pregunta_id, created_at desc);
create index if not exists examenes_cale_preguntas_categoria_created_idx on public.examenes_cale_preguntas (categoria_nombre, created_at desc);
create index if not exists preguntas_examen_fuente_activa_dificultad_idx on public.preguntas_examen (fuente, activa, dificultad, categoria_id);
create index if not exists preguntas_examen_codigo_externo_idx on public.preguntas_examen (codigo_externo);
create index if not exists preguntas_examen_pregunta_trgm_idx on public.preguntas_examen using gin (pregunta gin_trgm_ops);
create index if not exists preguntas_examen_explicacion_trgm_idx on public.preguntas_examen using gin ((coalesce(explicacion, '')) gin_trgm_ops);
create index if not exists preguntas_examen_fundamento_trgm_idx on public.preguntas_examen using gin ((coalesce(fundamento_legal, '')) gin_trgm_ops);
create index if not exists gastos_concepto_trgm_idx on public.gastos using gin (concepto gin_trgm_ops);
create index if not exists gastos_proveedor_trgm_idx
  on public.gastos using gin ((coalesce(proveedor, '')) gin_trgm_ops);
create index if not exists gastos_numero_factura_trgm_idx
  on public.gastos using gin ((coalesce(numero_factura, '')) gin_trgm_ops);
create index if not exists gastos_notas_trgm_idx
  on public.gastos using gin ((coalesce(notas, '')) gin_trgm_ops);
create index if not exists api_rate_limits_reset_at_idx on public.api_rate_limits (reset_at);

-- Mantiene el resumen legado del alumno sincronizado con sus contratos
create or replace function public.sync_alumno_from_matriculas()
returns trigger
language plpgsql security definer set search_path = public
as $$
declare
  target_alumno_id uuid := coalesce(NEW.alumno_id, OLD.alumno_id);
begin
  update public.alumnos
  set
    categorias = (
      select array_agg(distinct categoria order by categoria)
      from public.matriculas_alumno m
      cross join lateral unnest(coalesce(m.categorias, array[]::text[])) as categoria
      where m.alumno_id = target_alumno_id
    ),
    valor_total = (
      select case
        when count(*) = 0 then null
        else coalesce(sum(coalesce(m.valor_total, 0)), 0)
      end
      from public.matriculas_alumno m
      where m.alumno_id = target_alumno_id
        and m.estado <> 'cancelado'
    ),
    numero_contrato = (
      select m.numero_contrato
      from public.matriculas_alumno m
      where m.alumno_id = target_alumno_id
        and m.numero_contrato is not null
      order by coalesce(m.fecha_inscripcion, date '0001-01-01') desc, m.created_at desc
      limit 1
    ),
    fecha_inscripcion = (
      select m.fecha_inscripcion
      from public.matriculas_alumno m
      where m.alumno_id = target_alumno_id
      order by coalesce(m.fecha_inscripcion, date '0001-01-01') desc, m.created_at desc
      limit 1
    ),
    tiene_tramitador = exists (
      select 1
      from public.matriculas_alumno m
      where m.alumno_id = target_alumno_id
        and m.tiene_tramitador = true
    ),
    tramitador_nombre = (
      select string_agg(distinct m.tramitador_nombre, ', ' order by m.tramitador_nombre)
      from public.matriculas_alumno m
      where m.alumno_id = target_alumno_id
        and m.tiene_tramitador = true
        and m.tramitador_nombre is not null
    ),
    tramitador_valor = (
      select case
        when count(*) = 0 then null
        else coalesce(sum(coalesce(m.tramitador_valor, 0)), 0)
      end
      from public.matriculas_alumno m
      where m.alumno_id = target_alumno_id
        and m.tiene_tramitador = true
    )
  where id = target_alumno_id;

  return null;
end;
$$;

drop trigger if exists sync_alumno_from_matriculas_trigger on public.matriculas_alumno;
create trigger sync_alumno_from_matriculas_trigger
  after insert or update or delete on public.matriculas_alumno
  for each row
  execute function public.sync_alumno_from_matriculas();
--
-- -- 19. CURSOS POR ALUMNO (permite combos)
-- create table public.alumno_cursos (
--   id serial primary key,
--   alumno_id uuid references public.alumnos(id) on delete cascade not null,
--   curso_id integer references public.cursos(id) on delete cascade not null
-- );

-- ============================================
-- POLÍTICAS DE SEGURIDAD (RLS)
-- Jerarquía: super_admin > admin_escuela > admin_sede/secretaria/instructor/recepcion > alumno
-- ============================================

alter table public.escuelas enable row level security;
alter table public.sedes enable row level security;
alter table public.perfiles enable row level security;
alter table public.alumnos enable row level security;
alter table public.matriculas_alumno enable row level security;
alter table public.instructores enable row level security;
alter table public.vehiculos enable row level security;
alter table public.clases enable row level security;
alter table public.examenes enable row level security;
-- alter table public.pagos enable row level security; -- Eliminado
alter table public.gastos enable row level security;
alter table public.facturas_correo_integraciones enable row level security;
alter table public.facturas_correo_importaciones enable row level security;
alter table public.ingresos enable row level security;
alter table public.categorias_examen enable row level security;
alter table public.preguntas_examen enable row level security;
alter table public.respuestas_examen enable row level security;
alter table public.examenes_cale_preguntas enable row level security;
alter table public.actividad_log enable row level security;
alter table public.mantenimiento_vehiculos enable row level security;
-- alter table public.cursos enable row level security;
-- alter table public.sede_cursos enable row level security;
-- alter table public.alumno_cursos enable row level security;

-- ========== ESCUELAS ==========
create policy "Super admin: ve todas las escuelas"
  on public.escuelas for select using (public.is_super_admin());
create policy "Super admin: gestiona escuelas"
  on public.escuelas for all using (public.is_super_admin());
create policy "Admin escuela: ve su escuela"
  on public.escuelas for select using (id = public.get_my_escuela_id());
create policy "Admin escuela: actualiza su escuela"
  on public.escuelas for update using (
    id = public.get_my_escuela_id() and public.is_admin_escuela()
  );
create policy "Usuarios sede y alumnos: ven su escuela"
  on public.escuelas for select using (id = public.get_my_escuela_id());

-- ========== SEDES ==========
create policy "Super admin: ve todas las sedes"
  on public.sedes for select using (public.is_super_admin());
create policy "Super admin: gestiona sedes"
  on public.sedes for all using (public.is_super_admin());
create policy "Admin escuela: ve todas las sedes de su escuela"
  on public.sedes for select using (escuela_id = public.get_my_escuela_id());
create policy "Admin escuela: gestiona sedes de su escuela"
  on public.sedes for all using (
    escuela_id = public.get_my_escuela_id() and public.is_admin_escuela()
  );
create policy "Usuarios sede: ven solo su sede"
  on public.sedes for select using (
    id = public.get_my_sede_id() and escuela_id = public.get_my_escuela_id()
  );

-- ========== PERFILES ==========
create policy "Super admin: ve todos los perfiles"
  on public.perfiles for select using (public.is_super_admin());
create policy "Super admin: gestiona perfiles"
  on public.perfiles for all using (public.is_super_admin());
create policy "Admin escuela: ve perfiles de su escuela"
  on public.perfiles for select using (escuela_id = public.get_my_escuela_id());
create policy "Admin escuela: gestiona perfiles de su escuela"
  on public.perfiles for all using (
    escuela_id = public.get_my_escuela_id() and public.is_admin_escuela()
  );
create policy "Usuarios sede: ven perfiles de su sede"
  on public.perfiles for select using (
    sede_id = public.get_my_sede_id() and escuela_id = public.get_my_escuela_id()
    and not public.is_alumno()
  );
-- Alumno: solo ve su propio perfil
create policy "Alumno: ve solo su perfil"
  on public.perfiles for select using (
    public.is_alumno() and id = (select auth.uid())
  );
create policy "Usuarios: actualizan su propio perfil"
  on public.perfiles for update
  using     ((select auth.uid()) = id)
  with check ((select auth.uid()) = id);

-- ============================================================
-- MACRO: Políticas para tablas con escuela_id + sede_id
-- super_admin: todo
-- admin_escuela: toda su escuela (todas las sedes)
-- admin_sede/instructor/recepcion: solo su sede
-- ============================================================

-- ========== ALUMNOS ==========
create policy "Super admin: ve todos los alumnos"
  on public.alumnos for select using (public.is_super_admin());
create policy "Super admin: gestiona alumnos"
  on public.alumnos for all using (public.is_super_admin());
create policy "Admin escuela: ve alumnos de toda su escuela"
  on public.alumnos for select using (
    escuela_id = public.get_my_escuela_id() and public.is_admin_escuela()
  );
create policy "Admin escuela: gestiona alumnos de su escuela"
  on public.alumnos for all using (
    escuela_id = public.get_my_escuela_id() and public.is_admin_escuela()
  );
create policy "Usuarios sede: ven alumnos de su sede"
  on public.alumnos for select using (
    sede_id = public.get_my_sede_id() and escuela_id = public.get_my_escuela_id()
    and not public.is_alumno() and not public.is_instructor()
  );
-- Política eliminada: los instructores no pueden ver información de alumnos
-- Nota: user_id en alumnos es el ID del propio alumno (no del creador),
-- por eso NO se exige auth.uid() = user_id aquí.
create policy "Usuarios sede: crean alumnos en su sede"
  on public.alumnos for insert with check (
    sede_id = public.get_my_sede_id() and escuela_id = public.get_my_escuela_id()
    and not public.is_alumno()
  );
create policy "Usuarios sede: actualizan alumnos de su sede"
  on public.alumnos for update using (
    sede_id = public.get_my_sede_id() and escuela_id = public.get_my_escuela_id()
    and not public.is_alumno()
  );
create policy "Usuarios sede: eliminan alumnos de su sede"
  on public.alumnos for delete using (
    sede_id = public.get_my_sede_id() and escuela_id = public.get_my_escuela_id()
    and not public.is_alumno()
  );
-- Alumno: solo ve su propio registro
create policy "Alumno: ve solo su registro"
  on public.alumnos for select using (
    public.is_alumno() and user_id = (select auth.uid())
  );

-- ========== MATRÍCULAS ALUMNO ==========
create policy "Super admin: ve todas las matriculas alumno"
  on public.matriculas_alumno for select using (public.is_super_admin());
create policy "Super admin: gestiona matriculas alumno"
  on public.matriculas_alumno for all using (public.is_super_admin());
create policy "Admin escuela: ve matriculas de toda su escuela"
  on public.matriculas_alumno for select using (
    escuela_id = public.get_my_escuela_id() and public.is_admin_escuela()
  );
create policy "Admin escuela: gestiona matriculas de su escuela"
  on public.matriculas_alumno for all using (
    escuela_id = public.get_my_escuela_id() and public.is_admin_escuela()
  );
create policy "Usuarios sede: ven matriculas de su sede"
  on public.matriculas_alumno for select using (
    sede_id = public.get_my_sede_id() and escuela_id = public.get_my_escuela_id()
    and not public.is_alumno() and not public.is_instructor()
  );
create policy "Usuarios sede: crean matriculas en su sede"
  on public.matriculas_alumno for insert with check (
    sede_id = public.get_my_sede_id() and escuela_id = public.get_my_escuela_id()
    and created_by = (select auth.uid())
    and not public.is_alumno() and not public.is_instructor()
  );
create policy "Usuarios sede: actualizan matriculas de su sede"
  on public.matriculas_alumno for update using (
    sede_id = public.get_my_sede_id() and escuela_id = public.get_my_escuela_id()
    and not public.is_alumno() and not public.is_instructor()
  );
create policy "Usuarios sede: eliminan matriculas de su sede"
  on public.matriculas_alumno for delete using (
    sede_id = public.get_my_sede_id() and escuela_id = public.get_my_escuela_id()
    and not public.is_alumno() and not public.is_instructor()
  );
create policy "Alumno: ve solo sus matriculas"
  on public.matriculas_alumno for select using (
    public.is_alumno() and alumno_id = public.get_my_alumno_id()
  );

-- ========== INSTRUCTORES ==========
create policy "Super admin: ve todos los instructores"
  on public.instructores for select using (public.is_super_admin());
create policy "Super admin: gestiona instructores"
  on public.instructores for all using (public.is_super_admin());
create policy "Admin escuela: ve instructores de toda su escuela"
  on public.instructores for select using (
    escuela_id = public.get_my_escuela_id() and public.is_admin_escuela()
  );
create policy "Admin escuela: gestiona instructores de su escuela"
  on public.instructores for all using (
    escuela_id = public.get_my_escuela_id() and public.is_admin_escuela()
  );
create policy "Usuarios sede: ven instructores de su sede"
  on public.instructores for select using (
    sede_id = public.get_my_sede_id() and escuela_id = public.get_my_escuela_id()
    and not public.is_alumno() and not public.is_instructor()
  );
-- Instructor: solo ve su propio registro
create policy "Instructor: ve solo su registro"
  on public.instructores for select using (
    public.is_instructor() and user_id = auth.uid()
  );
-- Nota: user_id en instructores es el ID del propio instructor (no del creador).
create policy "Usuarios sede: crean instructores en su sede"
  on public.instructores for insert with check (
    sede_id = public.get_my_sede_id() and escuela_id = public.get_my_escuela_id()
    and not public.is_alumno() and not public.is_instructor()
  );
create policy "Usuarios sede: actualizan instructores de su sede"
  on public.instructores for update using (
    sede_id = public.get_my_sede_id() and escuela_id = public.get_my_escuela_id()
  );
create policy "Usuarios sede: eliminan instructores de su sede"
  on public.instructores for delete using (
    sede_id = public.get_my_sede_id() and escuela_id = public.get_my_escuela_id()
  );

-- ========== VEHÍCULOS ==========
create policy "Super admin: ve todos los vehiculos"
  on public.vehiculos for select using (public.is_super_admin());
create policy "Super admin: gestiona vehiculos"
  on public.vehiculos for all using (public.is_super_admin());
create policy "Admin escuela: ve vehiculos de toda su escuela"
  on public.vehiculos for select using (
    escuela_id = public.get_my_escuela_id() and public.is_admin_escuela()
  );
create policy "Admin escuela: gestiona vehiculos de su escuela"
  on public.vehiculos for all using (
    escuela_id = public.get_my_escuela_id() and public.is_admin_escuela()
  );
create policy "Usuarios sede: ven vehiculos de su sede"
  on public.vehiculos for select using (
    sede_id = public.get_my_sede_id() and escuela_id = public.get_my_escuela_id()
    and not public.is_alumno() and not public.is_instructor()
  );
-- Instructor: ve los vehículos asignados a sus clases
create policy "Instructor: ve vehiculos de sus clases"
  on public.vehiculos for select using (
    public.is_instructor() and id in (
      select vehiculo_id from public.clases
      where instructor_id = public.get_my_instructor_id()
      and vehiculo_id is not null
    )
  );
-- Instructor: puede actualizar kilometraje del vehículo que usa
create policy "Instructor: actualiza vehiculo asignado"
  on public.vehiculos for update using (
    public.is_instructor() and id in (
      select vehiculo_id from public.clases
      where instructor_id = public.get_my_instructor_id()
      and vehiculo_id is not null
    )
  );
create policy "Usuarios sede: crean vehiculos en su sede"
  on public.vehiculos for insert with check (
    sede_id = public.get_my_sede_id() and escuela_id = public.get_my_escuela_id() and (select auth.uid()) = user_id
  );
create policy "Usuarios sede: actualizan vehiculos de su sede"
  on public.vehiculos for update using (
    sede_id = public.get_my_sede_id() and escuela_id = public.get_my_escuela_id()
  );
create policy "Usuarios sede: eliminan vehiculos de su sede"
  on public.vehiculos for delete using (
    sede_id = public.get_my_sede_id() and escuela_id = public.get_my_escuela_id()
  );

-- ========== CLASES ==========
create policy "Super admin: ve todas las clases"
  on public.clases for select using (public.is_super_admin());
create policy "Super admin: gestiona clases"
  on public.clases for all using (public.is_super_admin());
create policy "Admin escuela: ve clases de toda su escuela"
  on public.clases for select using (
    escuela_id = public.get_my_escuela_id() and public.is_admin_escuela()
  );
create policy "Admin escuela: gestiona clases de su escuela"
  on public.clases for all using (
    escuela_id = public.get_my_escuela_id() and public.is_admin_escuela()
  );
create policy "Usuarios sede: ven clases de su sede"
  on public.clases for select using (
    sede_id = public.get_my_sede_id() and escuela_id = public.get_my_escuela_id()
    and not public.is_alumno() and not public.is_instructor()
  );
-- Instructor: solo ve SUS clases asignadas (sus horas de trabajo)
create policy "Instructor: ve solo sus clases"
  on public.clases for select using (
    public.is_instructor() and instructor_id = public.get_my_instructor_id()
  );
-- Alumno: solo ve sus propias clases
create policy "Alumno: ve solo sus clases"
  on public.clases for select using (
    public.is_alumno() and alumno_id = public.get_my_alumno_id()
  );
create policy "Usuarios sede: crean clases en su sede"
  on public.clases for insert with check (
    sede_id = public.get_my_sede_id() and escuela_id = public.get_my_escuela_id() and (select auth.uid()) = user_id
  );
create policy "Usuarios sede: actualizan clases de su sede"
  on public.clases for update using (
    sede_id = public.get_my_sede_id() and escuela_id = public.get_my_escuela_id()
  );
create policy "Usuarios sede: eliminan clases de su sede"
  on public.clases for delete using (
    sede_id = public.get_my_sede_id() and escuela_id = public.get_my_escuela_id()
  );

-- ========== EXÁMENES ==========
create policy "Super admin: ve todos los examenes"
  on public.examenes for select using (public.is_super_admin());
create policy "Super admin: gestiona examenes"
  on public.examenes for all using (public.is_super_admin());
create policy "Admin escuela: ve examenes de toda su escuela"
  on public.examenes for select using (
    escuela_id = public.get_my_escuela_id() and public.is_admin_escuela()
  );
create policy "Admin escuela: gestiona examenes de su escuela"
  on public.examenes for all using (
    escuela_id = public.get_my_escuela_id() and public.is_admin_escuela()
  );
create policy "Usuarios sede: ven examenes de su sede"
  on public.examenes for select using (
    sede_id = public.get_my_sede_id() and escuela_id = public.get_my_escuela_id()
    and not public.is_alumno() and not public.is_instructor()
  );
-- Alumno: solo ve sus propios exámenes
create policy "Alumno: ve solo sus examenes"
  on public.examenes for select using (
    public.is_alumno() and alumno_id = public.get_my_alumno_id()
  );
create policy "Usuarios sede: crean examenes en su sede"
  on public.examenes for insert with check (
    sede_id = public.get_my_sede_id() and escuela_id = public.get_my_escuela_id() and (select auth.uid()) = user_id
  );
create policy "Usuarios sede: actualizan examenes de su sede"
  on public.examenes for update using (
    sede_id = public.get_my_sede_id() and escuela_id = public.get_my_escuela_id()
  );
create policy "Usuarios sede: eliminan examenes de su sede"
  on public.examenes for delete using (
    sede_id = public.get_my_sede_id() and escuela_id = public.get_my_escuela_id()
  );

-- ========== PAGOS (eliminada - se usan ingresos) ==========

-- ========== GASTOS ==========
create policy "Super admin: ve todos los gastos"
  on public.gastos for select using (public.is_super_admin());
create policy "Super admin: gestiona gastos"
  on public.gastos for all using (public.is_super_admin());
create policy "Admin escuela: ve gastos de toda su escuela"
  on public.gastos for select using (
    escuela_id = public.get_my_escuela_id() and public.is_admin_escuela()
  );
create policy "Admin escuela: gestiona gastos de su escuela"
  on public.gastos for all using (
    escuela_id = public.get_my_escuela_id() and public.is_admin_escuela()
  );
create policy "Usuarios sede: ven gastos de su sede"
  on public.gastos for select using (
    sede_id = public.get_my_sede_id() and escuela_id = public.get_my_escuela_id()
    and not public.is_alumno() and not public.is_instructor()
  );
create policy "Usuarios sede: crean gastos en su sede"
  on public.gastos for insert with check (
    sede_id = public.get_my_sede_id() and escuela_id = public.get_my_escuela_id() and (select auth.uid()) = user_id
  );
create policy "Usuarios sede: actualizan gastos de su sede"
  on public.gastos for update using (
    sede_id = public.get_my_sede_id() and escuela_id = public.get_my_escuela_id()
  );
create policy "Usuarios sede: eliminan gastos de su sede"
  on public.gastos for delete using (
    sede_id = public.get_my_sede_id() and escuela_id = public.get_my_escuela_id()
  );

-- ========== INGRESOS ==========
create policy "Super admin: ve todos los ingresos"
  on public.ingresos for select using (public.is_super_admin());
create policy "Super admin: gestiona ingresos"
  on public.ingresos for all using (public.is_super_admin());
create policy "Admin escuela: ve ingresos de toda su escuela"
  on public.ingresos for select using (
    escuela_id = public.get_my_escuela_id() and public.is_admin_escuela()
  );
create policy "Admin escuela: gestiona ingresos de su escuela"
  on public.ingresos for all using (
    escuela_id = public.get_my_escuela_id() and public.is_admin_escuela()
  );
create policy "Usuarios sede: ven ingresos de su sede"
  on public.ingresos for select using (
    sede_id = public.get_my_sede_id() and escuela_id = public.get_my_escuela_id()
    and not public.is_alumno() and not public.is_instructor()
  );
create policy "Usuarios sede: crean ingresos en su sede"
  on public.ingresos for insert with check (
    sede_id = public.get_my_sede_id() and escuela_id = public.get_my_escuela_id() and (select auth.uid()) = user_id
  );
create policy "Usuarios sede: actualizan ingresos de su sede"
  on public.ingresos for update using (
    sede_id = public.get_my_sede_id() and escuela_id = public.get_my_escuela_id()
  );
create policy "Usuarios sede: eliminan ingresos de su sede"
  on public.ingresos for delete using (
    sede_id = public.get_my_sede_id() and escuela_id = public.get_my_escuela_id()
  );

-- ========== CATEGORÍAS EXAMEN (globales) ==========
create policy "Todos pueden ver categorias"
  on public.categorias_examen for select using (true);
create policy "Solo super admin gestiona categorias"
  on public.categorias_examen for all using (public.is_super_admin());

-- ========== PREGUNTAS EXAMEN (globales) ==========
create policy "Todos pueden ver preguntas activas"
  on public.preguntas_examen for select using (activa = true);
create policy "Super admin ve todas las preguntas"
  on public.preguntas_examen for select using (public.is_super_admin());
create policy "Solo super admin gestiona preguntas"
  on public.preguntas_examen for all using (public.is_super_admin());

-- ========== RESPUESTAS EXAMEN (por sede) ==========
create policy "Super admin: ve todas las respuestas"
  on public.respuestas_examen for select using (public.is_super_admin());
create policy "Super admin: gestiona respuestas"
  on public.respuestas_examen for all using (public.is_super_admin());
create policy "Admin escuela: ve respuestas de toda su escuela"
  on public.respuestas_examen for select using (
    escuela_id = public.get_my_escuela_id() and public.is_admin_escuela()
  );
create policy "Usuarios sede: ven respuestas de su sede"
  on public.respuestas_examen for select using (
    sede_id = public.get_my_sede_id() and escuela_id = public.get_my_escuela_id()
    and not public.is_alumno()
  );
create policy "Usuarios sede: crean respuestas en su sede"
  on public.respuestas_examen for insert with check (
    sede_id = public.get_my_sede_id() and escuela_id = public.get_my_escuela_id()
    and not public.is_alumno()
  );
-- Alumno: solo ve sus propias respuestas (analítica)
create policy "Alumno: ve solo sus respuestas"
  on public.respuestas_examen for select using (
    public.is_alumno() and alumno_id = public.get_my_alumno_id()
  );
-- Alumno: puede crear respuestas al contestar examen
create policy "Alumno: crea sus respuestas"
  on public.respuestas_examen for insert with check (
    public.is_alumno() and alumno_id = public.get_my_alumno_id()
    and sede_id = public.get_my_sede_id() and escuela_id = public.get_my_escuela_id()
  );

-- ========== DETALLE DE PREGUNTAS USADAS EN CALE ==========
create policy "Super admin: ve todas las preguntas usadas en CALE"
  on public.examenes_cale_preguntas for select using (public.is_super_admin());
create policy "Super admin: gestiona detalle de preguntas CALE"
  on public.examenes_cale_preguntas for all using (public.is_super_admin());
create policy "Admin escuela: ve detalle de preguntas CALE de su escuela"
  on public.examenes_cale_preguntas for select using (
    escuela_id = public.get_my_escuela_id() and public.is_admin_escuela()
  );
create policy "Usuarios sede: ven detalle de preguntas CALE de su sede"
  on public.examenes_cale_preguntas for select using (
    sede_id = public.get_my_sede_id() and escuela_id = public.get_my_escuela_id()
    and not public.is_alumno()
  );
create policy "Alumno: ve solo detalle de sus preguntas CALE"
  on public.examenes_cale_preguntas for select using (
    public.is_alumno() and alumno_id = public.get_my_alumno_id()
  );

-- -- ========== CURSOS (catálogo global) ==========
-- create policy "Todos pueden ver cursos"
--   on public.cursos for select using (true);
-- create policy "Solo super admin gestiona cursos"
--   on public.cursos for all using (public.is_super_admin());
-- 
-- -- ========== SEDE_CURSOS (cursos habilitados por sede con precio) ==========
-- create policy "Super admin: ve todos los sede_cursos"
--   on public.sede_cursos for select using (public.is_super_admin());
-- create policy "Super admin: gestiona sede_cursos"
--   on public.sede_cursos for all using (public.is_super_admin());
-- create policy "Admin escuela: ve sede_cursos de su escuela"
--   on public.sede_cursos for select using (
--     sede_id in (select id from public.sedes where escuela_id = public.get_my_escuela_id())
--   );
-- create policy "Admin escuela: gestiona sede_cursos de su escuela"
--   on public.sede_cursos for all using (
--     public.is_admin_escuela() and sede_id in (select id from public.sedes where escuela_id = public.get_my_escuela_id())
--   );
-- create policy "Usuarios sede: ven cursos de su sede"
--   on public.sede_cursos for select using (
--     sede_id = public.get_my_sede_id()
--   );
-- 
-- -- ========== ALUMNO_CURSOS ==========
-- create policy "Super admin: ve todos los alumno_cursos"
--   on public.alumno_cursos for select using (public.is_super_admin());
-- create policy "Super admin: gestiona alumno_cursos"
--   on public.alumno_cursos for all using (public.is_super_admin());
-- create policy "Admin escuela: ve alumno_cursos de su escuela"
--   on public.alumno_cursos for select using (
--     alumno_id in (select id from public.alumnos where escuela_id = public.get_my_escuela_id())
--   );
-- create policy "Admin escuela: gestiona alumno_cursos de su escuela"
--   on public.alumno_cursos for all using (
--     public.is_admin_escuela() and alumno_id in (select id from public.alumnos where escuela_id = public.get_my_escuela_id())
--   );
-- create policy "Usuarios sede: ven alumno_cursos de su sede"
--   on public.alumno_cursos for select using (
--     alumno_id in (select id from public.alumnos where sede_id = public.get_my_sede_id())
--     and not public.is_alumno() and not public.is_instructor()
--   );
-- create policy "Usuarios sede: gestionan alumno_cursos de su sede"
--   on public.alumno_cursos for all using (
--     alumno_id in (select id from public.alumnos where sede_id = public.get_my_sede_id())
--     and not public.is_alumno() and not public.is_instructor()
--   );
-- -- Alumno: ve solo sus propios cursos
-- create policy "Alumno: ve sus cursos"
--   on public.alumno_cursos for select using (
--     public.is_alumno() and alumno_id = public.get_my_alumno_id()
--   );

-- ========== MANTENIMIENTO VEHÍCULOS ==========
create policy "Super admin: ve todo mantenimiento"
  on public.mantenimiento_vehiculos for select using (public.is_super_admin());
create policy "Super admin: gestiona mantenimiento"
  on public.mantenimiento_vehiculos for all using (public.is_super_admin());
create policy "Admin escuela: ve mantenimiento de toda su escuela"
  on public.mantenimiento_vehiculos for select using (
    escuela_id = public.get_my_escuela_id() and public.is_admin_escuela()
  );
create policy "Admin escuela: gestiona mantenimiento de su escuela"
  on public.mantenimiento_vehiculos for all using (
    escuela_id = public.get_my_escuela_id() and public.is_admin_escuela()
  );
create policy "Usuarios sede: ven mantenimiento de su sede"
  on public.mantenimiento_vehiculos for select using (
    sede_id = public.get_my_sede_id() and escuela_id = public.get_my_escuela_id()
    and not public.is_alumno() and not public.is_instructor()
  );
create policy "Usuarios sede: crean mantenimiento en su sede"
  on public.mantenimiento_vehiculos for insert with check (
    sede_id = public.get_my_sede_id() and escuela_id = public.get_my_escuela_id()
    and not public.is_alumno()
  );
create policy "Usuarios sede: actualizan mantenimiento de su sede"
  on public.mantenimiento_vehiculos for update using (
    sede_id = public.get_my_sede_id() and escuela_id = public.get_my_escuela_id()
    and not public.is_alumno() and not public.is_instructor()
  );
create policy "Usuarios sede: eliminan mantenimiento de su sede"
  on public.mantenimiento_vehiculos for delete using (
    sede_id = public.get_my_sede_id() and escuela_id = public.get_my_escuela_id()
    and not public.is_alumno() and not public.is_instructor()
  );
-- Instructor: ve mantenimiento de vehículos que usa
create policy "Instructor: ve mantenimiento de sus vehiculos"
  on public.mantenimiento_vehiculos for select using (
    public.is_instructor() and (
      instructor_id = public.get_my_instructor_id()
      or vehiculo_id in (
        select vehiculo_id from public.clases
        where instructor_id = public.get_my_instructor_id()
        and vehiculo_id is not null
      )
    )
  );
-- Instructor: crea registros de mantenimiento
create policy "Instructor: crea mantenimiento"
  on public.mantenimiento_vehiculos for insert with check (
    public.is_instructor()
    and instructor_id = public.get_my_instructor_id()
    and sede_id = public.get_my_sede_id()
    and escuela_id = public.get_my_escuela_id()
    and vehiculo_id in (
      select vehiculo_id from public.clases
      where instructor_id = public.get_my_instructor_id()
      and vehiculo_id is not null
    )
  );
-- Instructor: actualiza solo SUS registros de mantenimiento
create policy "Instructor: actualiza su mantenimiento"
  on public.mantenimiento_vehiculos for update using (
    public.is_instructor() and instructor_id = public.get_my_instructor_id()
  );

-- ========== ACTIVIDAD LOG ==========
create policy "Super admin: ve todo el log"
  on public.actividad_log for select using (public.is_super_admin());
create policy "Super admin: gestiona log"
  on public.actividad_log for all using (public.is_super_admin());
create policy "Admin escuela: ve log de toda su escuela"
  on public.actividad_log for select using (
    escuela_id = public.get_my_escuela_id() and public.is_admin_escuela()
  );
create policy "Usuarios sede: ven log de su sede"
  on public.actividad_log for select using (
    sede_id = public.get_my_sede_id() and escuela_id = public.get_my_escuela_id()
    and not public.is_alumno()
  );
create policy "Sistema: inserta log"
  on public.actividad_log for insert with check ((select auth.uid()) = user_id);

-- ============================================
-- TRIGGER: Al registrarse crea escuela + sede principal + perfil
-- ============================================

create or replace function public.handle_new_user()
returns trigger
language plpgsql security definer set search_path = public
as $$
declare
  nueva_escuela_id uuid;
  nueva_sede_id uuid;
begin
  -- 1. Crear la escuela
  insert into public.escuelas (nombre, email)
  values (
    coalesce(new.raw_user_meta_data->>'escuela', 'Mi Autoescuela'),
    new.email
  )
  returning id into nueva_escuela_id;

  -- 2. Crear sede principal automáticamente
  insert into public.sedes (escuela_id, nombre, es_principal, email)
  values (
    nueva_escuela_id,
    'Sede Principal',
    true,
    new.email
  )
  returning id into nueva_sede_id;

  -- 3. Crear perfil como admin_escuela vinculado a escuela y sede
  insert into public.perfiles (id, escuela_id, sede_id, nombre, email, rol)
  values (
    new.id,
    nueva_escuela_id,
    nueva_sede_id,
    coalesce(new.raw_user_meta_data->>'nombre', ''),
    new.email,
    'admin_escuela'
  );

  return new;
end;
$$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- ============================================
-- TRIGGER: Mantenimiento → sincronizar gasto
-- ============================================

create or replace function public.map_gasto_categoria_from_mantenimiento(p_tipo text)
returns text
language sql
immutable
as $$
  select case
    when p_tipo = 'gasolina' then 'combustible'
    when p_tipo in ('reparacion', 'repuesto', 'mano_obra', 'neumaticos') then 'reparaciones'
    else 'mantenimiento_vehiculo'
  end;
$$;

create or replace function public.sync_gasto_from_mantenimiento()
returns trigger
language plpgsql security definer set search_path = public
as $$
begin
  insert into public.gastos (
    escuela_id, sede_id, user_id, mantenimiento_id, categoria, concepto, monto,
    metodo_pago, proveedor, numero_factura, fecha, recurrente, notas
  ) values (
    NEW.escuela_id, NEW.sede_id, NEW.user_id, NEW.id,
    public.map_gasto_categoria_from_mantenimiento(NEW.tipo), NEW.descripcion, NEW.monto,
    'transferencia', NEW.proveedor, NEW.numero_factura,
    NEW.fecha, false, NEW.notas
  )
  on conflict (mantenimiento_id) do update
  set
    escuela_id = excluded.escuela_id,
    sede_id = excluded.sede_id,
    user_id = excluded.user_id,
    categoria = excluded.categoria,
    concepto = excluded.concepto,
    monto = excluded.monto,
    metodo_pago = excluded.metodo_pago,
    proveedor = excluded.proveedor,
    numero_factura = excluded.numero_factura,
    fecha = excluded.fecha,
    recurrente = excluded.recurrente,
    notas = excluded.notas;

  return NEW;
end;
$$;

create or replace function public.delete_gasto_from_mantenimiento()
returns trigger
language plpgsql security definer set search_path = public
as $$
begin
  delete from public.gastos
  where mantenimiento_id = OLD.id;

  return OLD;
end;
$$;

create trigger mantenimiento_to_gasto
  after insert or update of escuela_id, sede_id, user_id, tipo, descripcion, monto, proveedor, numero_factura, fecha, notas on public.mantenimiento_vehiculos
  for each row execute function public.sync_gasto_from_mantenimiento();

create trigger mantenimiento_delete_gasto
  after delete on public.mantenimiento_vehiculos
  for each row execute function public.delete_gasto_from_mantenimiento();

-- ============================================
-- TRIGGER: Mantenimiento → auto-actualizar kilometraje del vehículo
-- ============================================

create or replace function public.update_vehiculo_kilometraje()
returns trigger
language plpgsql security definer set search_path = public
as $$
begin
  if NEW.kilometraje_actual is not null then
    update public.vehiculos
    set kilometraje = NEW.kilometraje_actual
    where id = NEW.vehiculo_id
    and (kilometraje is null or kilometraje < NEW.kilometraje_actual);
  end if;
  return NEW;
end;
$$;

create trigger mantenimiento_actualiza_km
  after insert or update of kilometraje_actual on public.mantenimiento_vehiculos
  for each row execute function public.update_vehiculo_kilometraje();

-- ============================================
-- CONVERTIR EN SUPER ADMIN (ejecutar después de registrarte):
-- ============================================
-- UPDATE public.perfiles
-- SET rol = 'super_admin', escuela_id = NULL, sede_id = NULL
-- WHERE email = 'TU_EMAIL_AQUI';
