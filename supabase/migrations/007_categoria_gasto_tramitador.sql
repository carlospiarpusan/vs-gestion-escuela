-- Migración 007: Agregar 'tramitador' como categoría válida de gastos

-- Eliminar constraint existente si lo hay
ALTER TABLE gastos DROP CONSTRAINT IF EXISTS gastos_categoria_check;

-- Agregar nueva constraint con tramitador incluido
ALTER TABLE gastos ADD CONSTRAINT gastos_categoria_check
  CHECK (categoria IN (
    'combustible', 'mantenimiento_vehiculo', 'alquiler', 'servicios',
    'nominas', 'seguros', 'material_didactico', 'marketing',
    'impuestos', 'suministros', 'reparaciones', 'tramitador', 'otros'
  ));
