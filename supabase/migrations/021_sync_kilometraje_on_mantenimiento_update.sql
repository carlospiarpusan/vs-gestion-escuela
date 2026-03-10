-- Sincronizar kilometraje del vehiculo tambien cuando se actualiza un registro
DROP TRIGGER IF EXISTS mantenimiento_actualiza_km ON public.mantenimiento_vehiculos;

CREATE TRIGGER mantenimiento_actualiza_km
  AFTER INSERT OR UPDATE OF kilometraje_actual ON public.mantenimiento_vehiculos
  FOR EACH ROW EXECUTE FUNCTION public.update_vehiculo_kilometraje();
