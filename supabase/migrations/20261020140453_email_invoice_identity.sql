alter table public.gastos add column if not exists factura_identidad text;
create unique index if not exists gastos_factura_identidad_unique
  on public.gastos(escuela_id, factura_identidad) where factura_identidad is not null;
notify pgrst, 'reload schema';
