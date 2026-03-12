CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  nueva_escuela_id uuid;
  nueva_sede_id uuid;
BEGIN
  -- Los usuarios internos (alumnos, instructores, administrativos, admins creados
  -- desde el dashboard) ya reciben su escuela/perfil desde las APIs protegidas.
  -- Solo el registro público sin rol explícito debe crear escuela + sede + admin.
  IF COALESCE(new.raw_user_meta_data->>'rol', '') <> '' THEN
    RETURN new;
  END IF;

  INSERT INTO public.escuelas (nombre, email)
  VALUES (
    COALESCE(new.raw_user_meta_data->>'escuela', 'Mi Autoescuela'),
    new.email
  )
  RETURNING id INTO nueva_escuela_id;

  INSERT INTO public.sedes (escuela_id, nombre, es_principal, email)
  VALUES (
    nueva_escuela_id,
    'Sede Principal',
    true,
    new.email
  )
  RETURNING id INTO nueva_sede_id;

  INSERT INTO public.perfiles (id, escuela_id, sede_id, nombre, email, rol)
  VALUES (
    new.id,
    nueva_escuela_id,
    nueva_sede_id,
    COALESCE(new.raw_user_meta_data->>'nombre', ''),
    new.email,
    'admin_escuela'
  );

  RETURN new;
END;
$$;
