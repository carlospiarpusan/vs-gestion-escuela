-- Legacy students remain unchanged; creation requirements are enforced by the API.
alter table public.alumnos add column if not exists datos_facturacion jsonb;
alter table public.alumnos add constraint alumnos_datos_facturacion_object
  check (datos_facturacion is null or jsonb_typeof(datos_facturacion) = 'object') not valid;
alter table public.alumnos validate constraint alumnos_datos_facturacion_object;
