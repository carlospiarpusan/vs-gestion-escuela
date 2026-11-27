-- Nuevos precios comerciales de los planes (COP).
-- El plan anual equivale a 10 meses (2 meses gratis).
-- Los intentos de pago ya creados conservan su propio amount_in_cents.

update public.planes_config
set
  precio_mensual = case id
    when 'basico' then 149000
    when 'profesional' then 299000
    when 'enterprise' then 590000
  end,
  precio_anual = case id
    when 'basico' then 1490000
    when 'profesional' then 2990000
    when 'enterprise' then 5900000
  end
where id in ('basico', 'profesional', 'enterprise');
