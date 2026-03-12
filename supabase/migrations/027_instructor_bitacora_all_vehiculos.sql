-- Allow instructors to create bitacora entries for ANY vehicle in their school
-- (previously restricted to vehicles assigned via clases)

-- 1. INSERT: remove vehicle-class restriction
DROP POLICY IF EXISTS "Instructor: crea mantenimiento" ON mantenimiento_vehiculos;
CREATE POLICY "Instructor: crea mantenimiento"
  ON mantenimiento_vehiculos FOR INSERT
  WITH CHECK (
    is_instructor()
    AND instructor_id = get_my_instructor_id()
    AND escuela_id = get_my_escuela_id()
  );

-- 2. SELECT: allow instructor to see all bitacora from their school
DROP POLICY IF EXISTS "Instructor: ve mantenimiento de sus vehiculos" ON mantenimiento_vehiculos;
DROP POLICY IF EXISTS "Instructor: ve mantenimiento de su escuela" ON mantenimiento_vehiculos;
CREATE POLICY "Instructor: ve mantenimiento de su escuela"
  ON mantenimiento_vehiculos FOR SELECT
  USING (
    is_instructor()
    AND escuela_id = get_my_escuela_id()
  );

-- 3. UPDATE: instructor can edit their own records (unchanged)
-- Policy "Instructor: actualiza su mantenimiento" stays as is
