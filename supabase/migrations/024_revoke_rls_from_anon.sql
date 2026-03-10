-- Revoke execute on RLS helper functions from anonymous users
-- These functions should only be callable by authenticated users

REVOKE EXECUTE ON FUNCTION public.is_super_admin() FROM anon;
REVOKE EXECUTE ON FUNCTION public.get_my_escuela_id() FROM anon;
REVOKE EXECUTE ON FUNCTION public.get_my_sede_id() FROM anon;
REVOKE EXECUTE ON FUNCTION public.is_admin_escuela() FROM anon;
REVOKE EXECUTE ON FUNCTION public.is_instructor() FROM anon;
REVOKE EXECUTE ON FUNCTION public.get_my_instructor_id() FROM anon;
REVOKE EXECUTE ON FUNCTION public.is_alumno() FROM anon;
REVOKE EXECUTE ON FUNCTION public.get_my_alumno_id() FROM anon;
