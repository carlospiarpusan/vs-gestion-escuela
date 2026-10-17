-- 052: Mobile review fixes. Function-only patch; keep the 049 RPC signatures.
-- Student creation stays in mobile-admin-users (Auth provisioning); the SQL RPC is update-only.
-- No table, RLS policy, client, or Auth changes.

create or replace function public.mobile_assert_school_scope(
  actor public.perfiles,
  target_school_id uuid,
  target_sede_id uuid default null
)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  if target_school_id is null or not exists (
    select 1 from public.escuelas e where e.id = target_school_id
  ) then
    raise exception 'La escuela no existe.';
  end if;

  if target_sede_id is not null and not exists (
    select 1 from public.sedes s
    where s.id = target_sede_id and s.escuela_id = target_school_id
  ) then
    raise exception 'La sede no pertenece a la escuela.';
  end if;

  if actor.rol = 'super_admin' then
    return;
  end if;

  if actor.escuela_id is distinct from target_school_id then
    raise exception 'No puedes operar sobre otra escuela.';
  end if;

  if actor.rol = 'admin_escuela' then
    return;
  end if;

  if target_sede_id is null or actor.sede_id is distinct from target_sede_id then
    raise exception 'No puedes operar sobre otra sede.';
  end if;
end;
$$;

create or replace function public.mobile_dashboard_summary()
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  actor public.perfiles := public.mobile_current_profile();
  v_alumno_id uuid;
  stats jsonb;
  total_students bigint := 0;
  total_classes bigint := 0;
  total_income numeric := 0;
  total_expense numeric := 0;
  total_schools bigint := 0;
  total_users bigint := 0;
  total_enrollments bigint := 0;
  total_attempts bigint := 0;
begin
  if actor.rol = 'super_admin' then
    select count(*) into total_schools from public.escuelas;
    select count(*) into total_users from public.perfiles where activo = true;

    return jsonb_build_object(
      'headline', 'Pulso general de la plataforma',
      'note', 'La app móvil resume escuelas, usuarios y señal general. Los reportes pesados siguen del lado web.',
      'stats', jsonb_build_array(
        jsonb_build_object('id', 'schools', 'label', 'Escuelas', 'value', total_schools::text),
        jsonb_build_object('id', 'users', 'label', 'Usuarios activos', 'value', total_users::text)
      ),
      'highlights', jsonb_build_array(
        jsonb_build_object('id', 'scope', 'title', 'Control multi-escuela', 'description', 'Consulta escuelas, sedes y estado general desde Android.'),
        jsonb_build_object('id', 'exports', 'title', 'Sin exportes', 'description', 'Esta versión móvil omite exportaciones, PDF y pantallas pesadas.')
      )
    );
  end if;

  perform public.mobile_assert_school_scope(actor, actor.escuela_id, actor.sede_id);

  if actor.rol = 'alumno' then
    select a.id into v_alumno_id
    from public.alumnos a
    where a.user_id = actor.id
      and a.escuela_id = actor.escuela_id and a.sede_id = actor.sede_id
    order by a.created_at, a.id
    limit 1;

    if v_alumno_id is not null then
      select count(*) into total_classes from public.clases c
      where c.alumno_id = v_alumno_id
        and c.escuela_id = actor.escuela_id and c.sede_id = actor.sede_id;
      select count(*) into total_enrollments from public.matriculas_alumno m
      where m.alumno_id = v_alumno_id
        and m.escuela_id = actor.escuela_id and m.sede_id = actor.sede_id;
      select count(*) into total_attempts from public.examenes e
      where e.alumno_id = v_alumno_id
        and e.escuela_id = actor.escuela_id and e.sede_id = actor.sede_id
        and e.modulo_origen in ('cale_practica', 'mobile_offline');
    end if;

    return jsonb_build_object(
      'headline', 'Tu avance en móvil',
      'note', 'Puedes practicar CALE con banco local y sincronizar tus intentos cuando vuelva la señal.',
      'stats', jsonb_build_array(
        jsonb_build_object('id', 'classes', 'label', 'Clases', 'value', total_classes::text),
        jsonb_build_object('id', 'enrollments', 'label', 'Matrículas', 'value', total_enrollments::text),
        jsonb_build_object('id', 'attempts', 'label', 'Intentos CALE', 'value', total_attempts::text)
      ),
      'highlights', jsonb_build_array(
        jsonb_build_object('id', 'offline', 'title', 'Práctica offline', 'description', 'Sincroniza preguntas una vez y practica después sin red.')
      )
    );
  end if;

  -- Match the instructor's RLS visibility: assigned classes, no directory or finances.
  if actor.rol = 'instructor' then
    select count(*) into total_classes
    from public.clases c
    join public.instructores i on i.id = c.instructor_id
    where i.user_id = actor.id
      and i.escuela_id = actor.escuela_id and i.sede_id = actor.sede_id
      and c.escuela_id = actor.escuela_id and c.sede_id = actor.sede_id;

    return jsonb_build_object(
      'headline', 'Tus clases',
      'note', 'Clases asignadas a tu perfil de instructor.',
      'stats', jsonb_build_array(
        jsonb_build_object('id', 'classes', 'label', 'Clases', 'value', total_classes::text)
      ),
      'highlights', '[]'::jsonb
    );
  end if;

  if actor.rol not in ('admin_escuela', 'admin_sede', 'administrativo', 'secretaria', 'recepcion') then
    raise exception 'No tienes permisos para consultar este resumen.';
  end if;

  select count(*) into total_students from public.alumnos a
  where a.escuela_id = actor.escuela_id
    and (actor.rol = 'admin_escuela' or a.sede_id = actor.sede_id);
  select count(*) into total_classes from public.clases c
  where c.escuela_id = actor.escuela_id
    and (actor.rol = 'admin_escuela' or c.sede_id = actor.sede_id);
  select coalesce(sum(i.monto), 0) into total_income from public.ingresos i
  where i.escuela_id = actor.escuela_id and i.estado <> 'anulado'
    and (actor.rol = 'admin_escuela' or i.sede_id = actor.sede_id);

  stats := jsonb_build_array(
    jsonb_build_object('id', 'students', 'label', 'Alumnos', 'value', total_students::text),
    jsonb_build_object('id', 'classes', 'label', 'Clases', 'value', total_classes::text),
    jsonb_build_object('id', 'income', 'label', 'Ingresos', 'value', total_income::text, 'tone', 'success')
  );

  if actor.rol <> 'recepcion' then
    select coalesce(sum(g.monto), 0) into total_expense from public.gastos g
    where g.escuela_id = actor.escuela_id and g.estado_pago <> 'anulado'
      and (actor.rol = 'admin_escuela' or g.sede_id = actor.sede_id);
    stats := stats || jsonb_build_array(
      jsonb_build_object('id', 'expense', 'label', 'Gastos', 'value', total_expense::text, 'tone', 'warning')
    );
  end if;

  return jsonb_build_object(
    'headline', 'Operación diaria lista para Android',
    'note', 'Las mutaciones clave se pueden encolar sin conexión y reintentar luego sin depender de /api.',
    'stats', stats,
    'highlights', jsonb_build_array(
      jsonb_build_object('id', 'daily', 'title', 'Operación diaria', 'description', 'Alumnos, clases, ingresos y gastos se pueden capturar desde móvil.'),
      jsonb_build_object('id', 'web', 'title', 'Web paralela', 'description', 'Contratos impresos, exportes y automatización por correo siguen en la web.')
    )
  );
end;
$$;

create or replace function public.mobile_cale_bank_snapshot(p_since timestamptz default null)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  payload jsonb;
begin
  perform public.mobile_current_profile();

  select jsonb_build_object(
    'questions',
    coalesce(
      jsonb_agg(
        jsonb_build_object(
          'id', q.id,
          'categoria_id', q.categoria_id,
          'pregunta', q.pregunta,
          'imagen_url', q.imagen_url,
          'opcion_a', q.opcion_a,
          'opcion_b', q.opcion_b,
          'opcion_c', q.opcion_c,
          'opcion_d', q.opcion_d,
          'respuesta_correcta', q.respuesta_correcta,
          'explicacion', q.explicacion,
          'fundamento_legal', q.fundamento_legal,
          'codigo_externo', q.codigo_externo,
          'updated_at', coalesce(q.updated_at, q.created_at)
        )
      ),
      '[]'::jsonb
    ),
    'updated_at',
    max(coalesce(q.updated_at, q.created_at))::text
  )
  into payload
  from public.preguntas_examen q
  where q.activa = true
    and q.fuente = 'cale_editorial_v1'
    and (p_since is null or coalesce(q.updated_at, q.created_at) > p_since);

  return coalesce(payload, jsonb_build_object('questions', '[]'::jsonb, 'updated_at', null));
end;
$$;

create or replace function public.mobile_apply_student_command(
  p_command_id uuid,
  p_action text,
  p_payload jsonb
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  actor public.perfiles := public.mobile_current_profile();
  existing_result jsonb;
  previous_command public.mobile_command_log%rowtype;
  target public.alumnos%rowtype;
  updated_row public.alumnos%rowtype;
  resolved_name text;
begin
  if p_action is distinct from 'update' then
    raise exception 'La acción % no está soportada para alumnos móviles.', p_action;
  end if;

  if actor.rol not in ('super_admin', 'admin_escuela', 'admin_sede', 'administrativo', 'secretaria', 'recepcion') then
    raise exception 'No tienes permisos para actualizar alumnos.';
  end if;

  if p_command_id is null or jsonb_typeof(p_payload) is distinct from 'object' then
    raise exception 'Comando o payload invalido.';
  end if;

  -- Lock before reading the log so concurrent retries do not execute twice.
  perform pg_advisory_xact_lock(hashtextextended(p_command_id::text, 0));
  select l.* into previous_command
  from public.mobile_command_log l where l.command_id = p_command_id;

  if found then
    if previous_command.actor_id is distinct from actor.id
      or previous_command.command_type is distinct from ('students.' || p_action)
      or previous_command.payload is distinct from p_payload then
      raise exception 'El identificador del comando ya esta en uso.';
    end if;
    select t.* into target from public.alumnos t where t.id = previous_command.entity_id;
    if target.id is null then
      raise exception 'El registro del comando ya no existe.';
    end if;
    perform public.mobile_assert_school_scope(actor, target.escuela_id, target.sede_id);
    perform public.mobile_assert_school_scope(
      actor,
      (previous_command.result->'row'->>'escuela_id')::uuid,
      (previous_command.result->'row'->>'sede_id')::uuid
    );
    return previous_command.result;
  end if;

  select *
  into target
  from public.alumnos
  where id = (p_payload->>'id')::uuid
  for update;

  if target.id is null then
    raise exception 'El alumno ya no existe.';
  end if;

  perform public.mobile_assert_school_scope(actor, target.escuela_id, target.sede_id);

  perform public.mobile_assert_school_scope(
    actor, target.escuela_id,
    coalesce(nullif(p_payload->>'sede_id', '')::uuid, target.sede_id)
  );

  update public.alumnos
  set
    nombre = coalesce(nullif(p_payload->>'nombre', ''), target.nombre),
    apellidos = coalesce(nullif(p_payload->>'apellidos', ''), target.apellidos),
    dni = coalesce(nullif(p_payload->>'dni', ''), target.dni),
    telefono = coalesce(nullif(p_payload->>'telefono', ''), target.telefono),
    email = coalesce(nullif(p_payload->>'email', ''), target.email),
    estado = coalesce(nullif(p_payload->>'estado', ''), target.estado),
    sede_id = coalesce(nullif(p_payload->>'sede_id', '')::uuid, target.sede_id)
  where id = target.id
  returning * into updated_row;

  resolved_name := trim(concat(updated_row.nombre, ' ', updated_row.apellidos));

  -- Legacy/pre-registered students can reference their creator. Edit the student,
  -- but only synchronize a student account matching the row's original scope.
  update public.perfiles p
  set
    nombre = coalesce(nullif(resolved_name, ''), nombre),
    email = coalesce(updated_row.email, email),
    cedula = coalesce(updated_row.dni, cedula),
    sede_id = updated_row.sede_id
  where p.id = updated_row.user_id and p.rol = 'alumno'
    and p.escuela_id = target.escuela_id and p.sede_id = target.sede_id;

  existing_result := jsonb_build_object(
    'entity_type', 'students',
    'row', to_jsonb(updated_row)
  );

  insert into public.mobile_command_log (command_id, command_type, actor_id, entity_id, payload, result)
  values (p_command_id, 'students.update', actor.id, updated_row.id, p_payload, existing_result);

  return existing_result;
end;
$$;

create or replace function public.mobile_apply_class_command(
  p_command_id uuid,
  p_action text,
  p_payload jsonb
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  actor public.perfiles := public.mobile_current_profile();
  existing_result jsonb;
  previous_command public.mobile_command_log%rowtype;
  target public.clases%rowtype;
  saved_row public.clases%rowtype;
  resolved_id uuid := coalesce(nullif(p_payload->>'id', '')::uuid, gen_random_uuid());
  resolved_school_id uuid := coalesce(nullif(p_payload->>'escuela_id', '')::uuid, actor.escuela_id);
  resolved_sede_id uuid := coalesce(nullif(p_payload->>'sede_id', '')::uuid, actor.sede_id);
begin
  if actor.rol not in ('super_admin', 'admin_escuela', 'admin_sede', 'administrativo', 'secretaria', 'recepcion') then
    raise exception 'No tienes permisos para gestionar clases.';
  end if;

  if p_action is null or p_action not in ('create', 'update') then
    raise exception 'La accion no esta soportada.';
  end if;
  if p_command_id is null or jsonb_typeof(p_payload) is distinct from 'object' then
    raise exception 'Comando o payload invalido.';
  end if;

  -- Lock before reading the log so concurrent retries do not execute twice.
  perform pg_advisory_xact_lock(hashtextextended(p_command_id::text, 0));
  select l.* into previous_command
  from public.mobile_command_log l where l.command_id = p_command_id;

  if found then
    if previous_command.actor_id is distinct from actor.id
      or previous_command.command_type is distinct from ('classes.' || p_action)
      or previous_command.payload is distinct from p_payload then
      raise exception 'El identificador del comando ya esta en uso.';
    end if;
    select t.* into target from public.clases t where t.id = previous_command.entity_id;
    if target.id is null then
      raise exception 'El registro del comando ya no existe.';
    end if;
    perform public.mobile_assert_school_scope(actor, target.escuela_id, target.sede_id);
    perform public.mobile_assert_school_scope(
      actor,
      (previous_command.result->'row'->>'escuela_id')::uuid,
      (previous_command.result->'row'->>'sede_id')::uuid
    );
    return previous_command.result;
  end if;

  if p_action = 'create' then
    perform public.mobile_assert_school_scope(actor, resolved_school_id, resolved_sede_id);

    if not exists (
      select 1 from public.alumnos a
      where a.id = nullif(p_payload->>'alumno_id', '')::uuid
        and a.escuela_id = resolved_school_id and a.sede_id = resolved_sede_id
    ) or (nullif(p_payload->>'instructor_id', '')::uuid is not null and not exists (
      select 1 from public.instructores i
      where i.id = nullif(p_payload->>'instructor_id', '')::uuid
        and i.escuela_id = resolved_school_id and i.sede_id = resolved_sede_id
    )) or (nullif(p_payload->>'vehiculo_id', '')::uuid is not null and not exists (
      select 1 from public.vehiculos v
      where v.id = nullif(p_payload->>'vehiculo_id', '')::uuid
        and v.escuela_id = resolved_school_id and v.sede_id = resolved_sede_id
    )) then
      raise exception 'Alumno, instructor o vehiculo fuera del alcance de la clase.';
    end if;

    insert into public.clases (
      id,
      escuela_id,
      sede_id,
      user_id,
      alumno_id,
      instructor_id,
      vehiculo_id,
      tipo,
      fecha,
      hora_inicio,
      hora_fin,
      estado,
      notas
    )
    values (
      resolved_id,
      resolved_school_id,
      resolved_sede_id,
      actor.id,
      (p_payload->>'alumno_id')::uuid,
      nullif(p_payload->>'instructor_id', '')::uuid,
      nullif(p_payload->>'vehiculo_id', '')::uuid,
      coalesce(nullif(p_payload->>'tipo', ''), 'practica'),
      coalesce(nullif(p_payload->>'fecha', ''), current_date::text)::date,
      coalesce(nullif(p_payload->>'hora_inicio', ''), '08:00')::time,
      coalesce(nullif(p_payload->>'hora_fin', ''), '09:00')::time,
      coalesce(nullif(p_payload->>'estado', ''), 'programada'),
      nullif(p_payload->>'notas', '')
    )
    returning * into saved_row;
  elsif p_action = 'update' then
    select *
    into target
    from public.clases
    where id = resolved_id
    for update;

    if target.id is null then
      raise exception 'La clase ya no existe.';
    end if;

    perform public.mobile_assert_school_scope(actor, target.escuela_id, target.sede_id);

    if not exists (
      select 1 from public.alumnos a
      where a.id = coalesce(nullif(p_payload->>'alumno_id', '')::uuid, target.alumno_id)
        and a.escuela_id = target.escuela_id and a.sede_id = target.sede_id
    ) or (coalesce(nullif(p_payload->>'instructor_id', '')::uuid, target.instructor_id) is not null and not exists (
      select 1 from public.instructores i
      where i.id = coalesce(nullif(p_payload->>'instructor_id', '')::uuid, target.instructor_id)
        and i.escuela_id = target.escuela_id and i.sede_id = target.sede_id
    )) or (coalesce(nullif(p_payload->>'vehiculo_id', '')::uuid, target.vehiculo_id) is not null and not exists (
      select 1 from public.vehiculos v
      where v.id = coalesce(nullif(p_payload->>'vehiculo_id', '')::uuid, target.vehiculo_id)
        and v.escuela_id = target.escuela_id and v.sede_id = target.sede_id
    )) then
      raise exception 'Alumno, instructor o vehiculo fuera del alcance de la clase.';
    end if;

    update public.clases
    set
      fecha = coalesce(nullif(p_payload->>'fecha', ''), target.fecha::text)::date,
      hora_inicio = coalesce(nullif(p_payload->>'hora_inicio', ''), target.hora_inicio::text)::time,
      hora_fin = coalesce(nullif(p_payload->>'hora_fin', ''), target.hora_fin::text)::time,
      tipo = coalesce(nullif(p_payload->>'tipo', ''), target.tipo),
      estado = coalesce(nullif(p_payload->>'estado', ''), target.estado),
      alumno_id = coalesce(nullif(p_payload->>'alumno_id', '')::uuid, target.alumno_id),
      instructor_id = coalesce(nullif(p_payload->>'instructor_id', '')::uuid, target.instructor_id),
      vehiculo_id = coalesce(nullif(p_payload->>'vehiculo_id', '')::uuid, target.vehiculo_id),
      notas = coalesce(nullif(p_payload->>'notas', ''), target.notas)
    where id = target.id
    returning * into saved_row;
  else
    raise exception 'La acción % no está soportada para clases móviles.', p_action;
  end if;

  existing_result := jsonb_build_object('entity_type', 'classes', 'row', to_jsonb(saved_row));

  insert into public.mobile_command_log (command_id, command_type, actor_id, entity_id, payload, result)
  values (p_command_id, concat('classes.', p_action), actor.id, saved_row.id, p_payload, existing_result);

  return existing_result;
end;
$$;

create or replace function public.mobile_apply_income_command(
  p_command_id uuid,
  p_action text,
  p_payload jsonb
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  actor public.perfiles := public.mobile_current_profile();
  existing_result jsonb;
  previous_command public.mobile_command_log%rowtype;
  target public.ingresos%rowtype;
  saved_row public.ingresos%rowtype;
  resolved_id uuid := coalesce(nullif(p_payload->>'id', '')::uuid, gen_random_uuid());
  resolved_school_id uuid := coalesce(nullif(p_payload->>'escuela_id', '')::uuid, actor.escuela_id);
  resolved_sede_id uuid := coalesce(nullif(p_payload->>'sede_id', '')::uuid, actor.sede_id);
begin
  if actor.rol not in ('super_admin', 'admin_escuela', 'admin_sede', 'administrativo', 'secretaria', 'recepcion') then
    raise exception 'No tienes permisos para gestionar ingresos.';
  end if;

  if p_action is null or p_action not in ('create', 'update') then
    raise exception 'La accion no esta soportada.';
  end if;
  if p_command_id is null or jsonb_typeof(p_payload) is distinct from 'object' then
    raise exception 'Comando o payload invalido.';
  end if;

  -- Lock before reading the log so concurrent retries do not execute twice.
  perform pg_advisory_xact_lock(hashtextextended(p_command_id::text, 0));
  select l.* into previous_command
  from public.mobile_command_log l where l.command_id = p_command_id;

  if found then
    if previous_command.actor_id is distinct from actor.id
      or previous_command.command_type is distinct from ('income.' || p_action)
      or previous_command.payload is distinct from p_payload then
      raise exception 'El identificador del comando ya esta en uso.';
    end if;
    select t.* into target from public.ingresos t where t.id = previous_command.entity_id;
    if target.id is null then
      raise exception 'El registro del comando ya no existe.';
    end if;
    perform public.mobile_assert_school_scope(actor, target.escuela_id, target.sede_id);
    perform public.mobile_assert_school_scope(
      actor,
      (previous_command.result->'row'->>'escuela_id')::uuid,
      (previous_command.result->'row'->>'sede_id')::uuid
    );
    return previous_command.result;
  end if;

  if p_action = 'create' then
    perform public.mobile_assert_school_scope(actor, resolved_school_id, resolved_sede_id);
    if (nullif(p_payload->>'alumno_id', '') is not null and not exists (
      select 1 from public.alumnos a
      where a.id = (p_payload->>'alumno_id')::uuid
        and a.escuela_id = resolved_school_id and a.sede_id = resolved_sede_id
    )) or (nullif(p_payload->>'matricula_id', '') is not null and not exists (
      select 1 from public.matriculas_alumno m
      where m.id = (p_payload->>'matricula_id')::uuid
        and m.alumno_id = nullif(p_payload->>'alumno_id', '')::uuid
        and m.escuela_id = resolved_school_id and m.sede_id = resolved_sede_id
    )) then
      raise exception 'Alumno o matricula fuera del alcance del ingreso.';
    end if;

    insert into public.ingresos (
      id,
      escuela_id,
      sede_id,
      user_id,
      alumno_id,
      matricula_id,
      categoria,
      concepto,
      monto,
      metodo_pago,
      fecha,
      fecha_vencimiento,
      estado,
      notas
    )
    values (
      resolved_id,
      resolved_school_id,
      resolved_sede_id,
      actor.id,
      nullif(p_payload->>'alumno_id', '')::uuid,
      nullif(p_payload->>'matricula_id', '')::uuid,
      coalesce(nullif(p_payload->>'categoria', ''), 'otros'),
      coalesce(nullif(p_payload->>'concepto', ''), 'Ingreso móvil'),
      coalesce(nullif(p_payload->>'monto', ''), '0')::numeric,
      coalesce(nullif(p_payload->>'metodo_pago', ''), 'efectivo'),
      coalesce(nullif(p_payload->>'fecha', ''), current_date::text)::date,
      coalesce(nullif(p_payload->>'fecha_vencimiento', ''), coalesce(nullif(p_payload->>'fecha', ''), current_date::text))::date,
      coalesce(nullif(p_payload->>'estado', ''), 'cobrado'),
      nullif(p_payload->>'notas', '')
    )
    returning * into saved_row;
  elsif p_action = 'update' then
    select *
    into target
    from public.ingresos
    where id = resolved_id
    for update;

    if target.id is null then
      raise exception 'El ingreso ya no existe.';
    end if;

    perform public.mobile_assert_school_scope(actor, target.escuela_id, target.sede_id);

    update public.ingresos
    set
      concepto = coalesce(nullif(p_payload->>'concepto', ''), target.concepto),
      monto = coalesce(nullif(p_payload->>'monto', ''), target.monto::text)::numeric,
      metodo_pago = coalesce(nullif(p_payload->>'metodo_pago', ''), target.metodo_pago),
      fecha = coalesce(nullif(p_payload->>'fecha', ''), target.fecha::text)::date,
      fecha_vencimiento = coalesce(nullif(p_payload->>'fecha_vencimiento', ''), target.fecha_vencimiento::text)::date,
      estado = coalesce(nullif(p_payload->>'estado', ''), target.estado),
      categoria = coalesce(nullif(p_payload->>'categoria', ''), target.categoria),
      notas = coalesce(nullif(p_payload->>'notas', ''), target.notas)
    where id = target.id
    returning * into saved_row;
  else
    raise exception 'La acción % no está soportada para ingresos móviles.', p_action;
  end if;

  existing_result := jsonb_build_object('entity_type', 'income', 'row', to_jsonb(saved_row));

  insert into public.mobile_command_log (command_id, command_type, actor_id, entity_id, payload, result)
  values (p_command_id, concat('income.', p_action), actor.id, saved_row.id, p_payload, existing_result);

  return existing_result;
end;
$$;

create or replace function public.mobile_apply_expense_command(
  p_command_id uuid,
  p_action text,
  p_payload jsonb
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  actor public.perfiles := public.mobile_current_profile();
  existing_result jsonb;
  previous_command public.mobile_command_log%rowtype;
  target public.gastos%rowtype;
  saved_row public.gastos%rowtype;
  resolved_id uuid := coalesce(nullif(p_payload->>'id', '')::uuid, gen_random_uuid());
  resolved_school_id uuid := coalesce(nullif(p_payload->>'escuela_id', '')::uuid, actor.escuela_id);
  resolved_sede_id uuid := coalesce(nullif(p_payload->>'sede_id', '')::uuid, actor.sede_id);
begin
  if actor.rol not in ('super_admin', 'admin_escuela', 'admin_sede', 'administrativo', 'secretaria') then
    raise exception 'No tienes permisos para gestionar gastos.';
  end if;

  if p_action is null or p_action not in ('create', 'update') then
    raise exception 'La accion no esta soportada.';
  end if;
  if p_command_id is null or jsonb_typeof(p_payload) is distinct from 'object' then
    raise exception 'Comando o payload invalido.';
  end if;

  -- Lock before reading the log so concurrent retries do not execute twice.
  perform pg_advisory_xact_lock(hashtextextended(p_command_id::text, 0));
  select l.* into previous_command
  from public.mobile_command_log l where l.command_id = p_command_id;

  if found then
    if previous_command.actor_id is distinct from actor.id
      or previous_command.command_type is distinct from ('expenses.' || p_action)
      or previous_command.payload is distinct from p_payload then
      raise exception 'El identificador del comando ya esta en uso.';
    end if;
    select t.* into target from public.gastos t where t.id = previous_command.entity_id;
    if target.id is null then
      raise exception 'El registro del comando ya no existe.';
    end if;
    perform public.mobile_assert_school_scope(actor, target.escuela_id, target.sede_id);
    perform public.mobile_assert_school_scope(
      actor,
      (previous_command.result->'row'->>'escuela_id')::uuid,
      (previous_command.result->'row'->>'sede_id')::uuid
    );
    return previous_command.result;
  end if;

  if p_action = 'create' then
    perform public.mobile_assert_school_scope(actor, resolved_school_id, resolved_sede_id);
    insert into public.gastos (
      id,
      escuela_id,
      sede_id,
      user_id,
      categoria,
      concepto,
      monto,
      metodo_pago,
      proveedor,
      fecha,
      fecha_vencimiento,
      estado_pago,
      recurrente,
      notas
    )
    values (
      resolved_id,
      resolved_school_id,
      resolved_sede_id,
      actor.id,
      coalesce(nullif(p_payload->>'categoria', ''), 'otros'),
      coalesce(nullif(p_payload->>'concepto', ''), 'Gasto móvil'),
      coalesce(nullif(p_payload->>'monto', ''), '0')::numeric,
      coalesce(nullif(p_payload->>'metodo_pago', ''), 'transferencia'),
      nullif(p_payload->>'proveedor', ''),
      coalesce(nullif(p_payload->>'fecha', ''), current_date::text)::date,
      coalesce(nullif(p_payload->>'fecha_vencimiento', ''), coalesce(nullif(p_payload->>'fecha', ''), current_date::text))::date,
      coalesce(nullif(p_payload->>'estado_pago', ''), 'pagado'),
      false,
      nullif(p_payload->>'notas', '')
    )
    returning * into saved_row;
  elsif p_action = 'update' then
    select *
    into target
    from public.gastos
    where id = resolved_id
    for update;

    if target.id is null then
      raise exception 'El gasto ya no existe.';
    end if;

    perform public.mobile_assert_school_scope(actor, target.escuela_id, target.sede_id);

    update public.gastos
    set
      concepto = coalesce(nullif(p_payload->>'concepto', ''), target.concepto),
      monto = coalesce(nullif(p_payload->>'monto', ''), target.monto::text)::numeric,
      categoria = coalesce(nullif(p_payload->>'categoria', ''), target.categoria),
      metodo_pago = coalesce(nullif(p_payload->>'metodo_pago', ''), target.metodo_pago),
      proveedor = coalesce(nullif(p_payload->>'proveedor', ''), target.proveedor),
      fecha = coalesce(nullif(p_payload->>'fecha', ''), target.fecha::text)::date,
      fecha_vencimiento = coalesce(nullif(p_payload->>'fecha_vencimiento', ''), target.fecha_vencimiento::text)::date,
      estado_pago = coalesce(nullif(p_payload->>'estado_pago', ''), target.estado_pago),
      notas = coalesce(nullif(p_payload->>'notas', ''), target.notas)
    where id = target.id
    returning * into saved_row;
  else
    raise exception 'La acción % no está soportada para gastos móviles.', p_action;
  end if;

  existing_result := jsonb_build_object('entity_type', 'expenses', 'row', to_jsonb(saved_row));

  insert into public.mobile_command_log (command_id, command_type, actor_id, entity_id, payload, result)
  values (p_command_id, concat('expenses.', p_action), actor.id, saved_row.id, p_payload, existing_result);

  return existing_result;
end;
$$;

create or replace function public.mobile_submit_cale_attempt(
  p_command_id uuid,
  p_question_ids uuid[],
  p_answers jsonb,
  p_elapsed_seconds integer default 0
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  actor public.perfiles := public.mobile_current_profile();
  existing_result jsonb;
  previous_command public.mobile_command_log%rowtype;
  answer_row jsonb;
  alumno_row public.alumnos%rowtype;
  exam_row public.examenes%rowtype;
  question_row record;
  selected_answer text;
  correct_count integer := 0;
  answered_count integer := 0;
  question_count integer := coalesce(cardinality(p_question_ids), 0);
  idx integer := 0;
  percentage integer := 0;
  exam_result text := 'suspendido';
  attempt_count integer := 0;
  answer_rows jsonb := '[]'::jsonb;
  notes_payload jsonb;
begin
  if actor.rol <> 'alumno' then
    raise exception 'Solo un alumno puede enviar su práctica CALE.';
  end if;

  if p_command_id is null or jsonb_typeof(p_answers) is distinct from 'object' then
    raise exception 'Comando o respuestas invalidas.';
  end if;
  perform pg_advisory_xact_lock(hashtextextended(p_command_id::text, 0));

  select a.* into alumno_row
  from public.alumnos a
  where a.user_id = actor.id
    and a.escuela_id = actor.escuela_id and a.sede_id = actor.sede_id
  order by a.created_at, a.id
  limit 1
  for update;

  if alumno_row.id is null then
    raise exception 'No se encontró el perfil del alumno.';
  end if;

  perform public.mobile_assert_school_scope(actor, alumno_row.escuela_id, alumno_row.sede_id);

  select l.* into previous_command
  from public.mobile_command_log l where l.command_id = p_command_id;
  if found then
    if previous_command.actor_id is distinct from actor.id
      or previous_command.command_type is distinct from 'exams.submit'
      or previous_command.payload is distinct from jsonb_build_object('question_ids', p_question_ids, 'answers', p_answers) then
      raise exception 'El identificador del comando ya esta en uso.';
    end if;
    if not exists (
      select 1 from public.examenes e
      where e.id = previous_command.entity_id and e.user_id = actor.id
        and e.alumno_id = alumno_row.id
        and e.escuela_id = alumno_row.escuela_id and e.sede_id = alumno_row.sede_id
    ) then
      raise exception 'El intento ya no pertenece al alcance del alumno.';
    end if;
    return previous_command.result;
  end if;

  if question_count = 0 then
    raise exception 'Debes enviar al menos una pregunta.';
  end if;

  for question_row in
    select
      q.id,
      q.categoria_id,
      c.nombre as categoria_nombre,
      q.pregunta,
      q.imagen_url,
      q.opcion_a,
      q.opcion_b,
      q.opcion_c,
      q.opcion_d,
      q.respuesta_correcta,
      q.explicacion,
      q.fundamento_legal,
      q.codigo_externo
    from public.preguntas_examen q
    left join public.categorias_examen c on c.id = q.categoria_id
    where q.id = any(p_question_ids)
      and q.activa = true
      and q.fuente = 'cale_editorial_v1'
    order by array_position(p_question_ids, q.id)
  loop
    selected_answer := nullif(p_answers ->> question_row.id::text, '');
    if selected_answer in ('a', 'b', 'c', 'd') then
      answered_count := answered_count + 1;
    else
      selected_answer := null;
    end if;

    if selected_answer is not null and selected_answer = question_row.respuesta_correcta then
      correct_count := correct_count + 1;
    end if;

    answer_rows := answer_rows || jsonb_build_array(
      jsonb_build_object(
        'pregunta_id', question_row.id,
        'categoria_id', question_row.categoria_id,
        'categoria_nombre', coalesce(question_row.categoria_nombre, 'General'),
        'pregunta_texto', question_row.pregunta,
        'imagen_url', question_row.imagen_url,
        'opcion_a', question_row.opcion_a,
        'opcion_b', question_row.opcion_b,
        'opcion_c', question_row.opcion_c,
        'opcion_d', question_row.opcion_d,
        'respuesta_alumno', selected_answer,
        'respuesta_omitida', selected_answer is null,
        'respuesta_correcta', question_row.respuesta_correcta,
        'es_correcta', selected_answer is not null and selected_answer = question_row.respuesta_correcta,
        'explicacion', question_row.explicacion,
        'fundamento_legal', question_row.fundamento_legal,
        'codigo_externo', question_row.codigo_externo
      )
    );
  end loop;

  if jsonb_array_length(answer_rows) <> question_count then
    raise exception 'El banco local ya no coincide con el banco activo.';
  end if;

  if answered_count = 0 then
    raise exception 'Debes responder al menos una pregunta antes de enviar.';
  end if;

  percentage := round((correct_count::numeric / question_count::numeric) * 100);
  exam_result := case when percentage >= 80 then 'aprobado' else 'suspendido' end;

  select count(*)
  into attempt_count
  from public.examenes
  where alumno_id = alumno_row.id
    and modulo_origen in ('cale_practica', 'mobile_offline');

  notes_payload := jsonb_build_object(
    'modulo', 'mobile_offline',
    'source', 'cale_editorial_v1',
    'questionCount', question_count,
    'correctCount', correct_count,
    'percentage', percentage,
    'elapsedSeconds', greatest(coalesce(p_elapsed_seconds, 0), 0),
    'submittedAt', now()
  );

  insert into public.examenes (
    escuela_id,
    sede_id,
    user_id,
    alumno_id,
    tipo,
    fecha,
    hora,
    resultado,
    intentos,
    modulo_origen,
    fuente_banco,
    total_preguntas,
    respuestas_correctas,
    porcentaje,
    tiempo_segundos,
    notas
  )
  values (
    alumno_row.escuela_id,
    alumno_row.sede_id,
    actor.id,
    alumno_row.id,
    'teorico',
    current_date,
    current_time,
    exam_result,
    attempt_count + 1,
    'mobile_offline',
    'cale_editorial_v1',
    question_count,
    correct_count,
    percentage,
    greatest(coalesce(p_elapsed_seconds, 0), 0),
    'CALEJSON:' || notes_payload::text
  )
  returning * into exam_row;

  idx := 0;
  -- jsonb_array_elements returns a JSON value, not the question record above.
  for answer_row in
    select value
    from jsonb_array_elements(answer_rows)
  loop
    idx := idx + 1;

    insert into public.examenes_cale_preguntas (
      escuela_id,
      sede_id,
      alumno_id,
      examen_id,
      pregunta_id,
      categoria_id,
      categoria_nombre,
      codigo_externo,
      pregunta_texto,
      orden_pregunta
    )
    values (
      alumno_row.escuela_id,
      alumno_row.sede_id,
      alumno_row.id,
      exam_row.id,
      (answer_row->>'pregunta_id')::uuid,
      (answer_row->>'categoria_id')::uuid,
      answer_row->>'categoria_nombre',
      answer_row->>'codigo_externo',
      answer_row->>'pregunta_texto',
      idx
    );

    if coalesce((answer_row->>'es_correcta')::boolean, false) = false then
      insert into public.respuestas_examen (
        escuela_id,
        sede_id,
        alumno_id,
        examen_id,
        pregunta_id,
        orden_pregunta,
        respuesta_alumno,
        respuesta_omitida,
        es_correcta,
        categoria_nombre,
        pregunta_texto,
        imagen_url,
        opcion_a,
        opcion_b,
        opcion_c,
        opcion_d,
        respuesta_correcta,
        explicacion,
        fundamento_legal,
        tiempo_segundos
      )
      values (
        alumno_row.escuela_id,
        alumno_row.sede_id,
        alumno_row.id,
        exam_row.id,
        (answer_row->>'pregunta_id')::uuid,
        idx,
        nullif(answer_row->>'respuesta_alumno', ''),
        coalesce((answer_row->>'respuesta_omitida')::boolean, false),
        coalesce((answer_row->>'es_correcta')::boolean, false),
        answer_row->>'categoria_nombre',
        answer_row->>'pregunta_texto',
        answer_row->>'imagen_url',
        answer_row->>'opcion_a',
        answer_row->>'opcion_b',
        answer_row->>'opcion_c',
        answer_row->>'opcion_d',
        answer_row->>'respuesta_correcta',
        answer_row->>'explicacion',
        answer_row->>'fundamento_legal',
        null
      );
    end if;
  end loop;

  existing_result := jsonb_build_object(
    'exam_id', exam_row.id,
    'summary', jsonb_build_object(
      'result', exam_result,
      'questionCount', question_count,
      'answeredCount', answered_count,
      'correctCount', correct_count,
      'incorrectCount', question_count - correct_count,
      'percentage', percentage,
      'elapsedSeconds', greatest(coalesce(p_elapsed_seconds, 0), 0),
      'source', 'cale_editorial_v1',
      'savedAt', now()
    )
  );

  insert into public.mobile_command_log (command_id, command_type, actor_id, entity_id, payload, result)
  values (p_command_id, 'exams.submit', actor.id, exam_row.id, jsonb_build_object('question_ids', p_question_ids, 'answers', p_answers), existing_result);

  return existing_result;
end;
$$;

-- A grant to authenticated does not remove PostgreSQL's default PUBLIC execute.
revoke execute on function public.mobile_current_profile() from public, anon;
revoke execute on function public.mobile_assert_school_scope(public.perfiles, uuid, uuid) from public, anon, authenticated;
revoke execute on function public.mobile_dashboard_summary() from public, anon;
revoke execute on function public.mobile_cale_bank_snapshot(timestamptz) from public, anon;
revoke execute on function public.mobile_apply_student_command(uuid, text, jsonb) from public, anon;
revoke execute on function public.mobile_apply_class_command(uuid, text, jsonb) from public, anon;
revoke execute on function public.mobile_apply_income_command(uuid, text, jsonb) from public, anon;
revoke execute on function public.mobile_apply_expense_command(uuid, text, jsonb) from public, anon;
revoke execute on function public.mobile_submit_cale_attempt(uuid, uuid[], jsonb, integer) from public, anon;

grant execute on function public.mobile_current_profile() to authenticated;
grant execute on function public.mobile_dashboard_summary() to authenticated;
grant execute on function public.mobile_cale_bank_snapshot(timestamptz) to authenticated;
grant execute on function public.mobile_apply_student_command(uuid, text, jsonb) to authenticated;
grant execute on function public.mobile_apply_class_command(uuid, text, jsonb) to authenticated;
grant execute on function public.mobile_apply_income_command(uuid, text, jsonb) to authenticated;
grant execute on function public.mobile_apply_expense_command(uuid, text, jsonb) to authenticated;
grant execute on function public.mobile_submit_cale_attempt(uuid, uuid[], jsonb, integer) to authenticated;
