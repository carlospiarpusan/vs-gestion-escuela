-- Renombrar a "Sede 1" todas las sedes de escuelas que solo tienen una sede
UPDATE sedes
SET nombre = 'Sede 1'
WHERE escuela_id IN (
  SELECT escuela_id
  FROM sedes
  GROUP BY escuela_id
  HAVING COUNT(*) = 1
)
AND nombre != 'Sede 1';
