-- LOCAL/DISPOSABLE database only, after migration 052; never run against production.
-- psql -X -v ON_ERROR_STOP=1 -f supabase/tests/mobile_review_fixes.sql <LOCAL_DATABASE>
-- Fixtures and assertions run in one transaction and are rolled back.
begin;
set local plpgsql.check_asserts = on;

create function pg_temp.uid(n integer) returns uuid language sql immutable as $$
  select ('00000000-0000-4000-8000-' || lpad(n::text, 12, '0'))::uuid
$$;
create function pg_temp.login(n integer) returns void language plpgsql as $$
begin
  perform set_config('request.jwt.claim.sub', pg_temp.uid(n)::text, true);
  perform set_config('request.jwt.claims', jsonb_build_object('sub', pg_temp.uid(n), 'role', 'authenticated')::text, true);
end;
$$;
create function pg_temp.stat(payload jsonb, stat_id text) returns numeric language sql as $$
  select (s->>'value')::numeric from jsonb_array_elements(payload->'stats') s where s->>'id' = stat_id
$$;
create function pg_temp.expect_error(statement text, message_part text) returns void language plpgsql as $$
begin
  begin
    execute statement;
  exception when others then
    if position(message_part in sqlerrm) > 0 then return; end if;
    raise exception 'Expected error containing %, got %', message_part, sqlerrm;
  end;
  raise exception 'Expected rejection: %', statement;
end;
$$;
create function pg_temp.command(kind text, command_n integer, action text, payload jsonb)
returns jsonb language plpgsql as $$
declare result jsonb;
begin
  execute format('select public.%I($1, $2, $3)', 'mobile_apply_' || kind || '_command')
    into result using pg_temp.uid(command_n), action, payload;
  return result;
end;
$$;

insert into public.escuelas (id, nombre) values
  (pg_temp.uid(1), 'Mobile test school A'), (pg_temp.uid(2), 'Mobile test school B');
insert into public.sedes (id, escuela_id, nombre) values
  (pg_temp.uid(11), pg_temp.uid(1), 'A1'), (pg_temp.uid(12), pg_temp.uid(1), 'A2'),
  (pg_temp.uid(21), pg_temp.uid(2), 'B1');
insert into auth.users (id, email, raw_user_meta_data)
select pg_temp.uid(n), n || '@mobile-test.invalid', '{"rol":"alumno"}'::jsonb
from generate_series(101, 117) n;
insert into public.perfiles (id, nombre, email, rol, escuela_id, sede_id, activo)
select pg_temp.uid(n), 'Mobile test ' || n, n || '@mobile-test.invalid', rol,
  case when n = 113 then null else pg_temp.uid(escuela) end,
  case when n in (113, 117) then null else pg_temp.uid(sede) end, n <> 112
from (values
  (101, 'admin_escuela', 1, 11), (102, 'admin_sede', 1, 11),
  (103, 'administrativo', 1, 11), (104, 'recepcion', 1, 11),
  (105, 'instructor', 1, 11), (106, 'instructor', 1, 11),
  (107, 'alumno', 1, 11), (108, 'alumno', 1, 11), (109, 'alumno', 1, 12),
  (110, 'alumno', 2, 21), (111, 'admin_sede', 1, 12),
  (112, 'alumno', 1, 11), (113, 'super_admin', 1, 11),
  (114, 'instructor', 1, 11), (115, 'alumno', 1, 11),
  (116, 'admin_escuela', 2, 21), (117, 'admin_sede', 1, 11)
) p(n, rol, escuela, sede);
insert into public.alumnos (id, escuela_id, sede_id, user_id, nombre, apellidos, dni, telefono)
select pg_temp.uid(n), pg_temp.uid(escuela), pg_temp.uid(sede), pg_temp.uid(u),
  'Alumno', n::text, n::text, '3000000000'
from (values (201,1,11,107), (202,1,11,108), (203,1,12,109), (204,2,21,110)) a(n,escuela,sede,u);
insert into public.instructores (id, escuela_id, sede_id, user_id, nombre, apellidos, dni, telefono, licencia)
select pg_temp.uid(n), pg_temp.uid(1), pg_temp.uid(11), pg_temp.uid(u), 'Instructor', n::text, n::text, '3000000000', 'TEST'
from (values (301,105), (302,106), (303,114)) i(n,u);
insert into public.vehiculos (id, escuela_id, sede_id, user_id, marca, modelo, matricula)
select pg_temp.uid(n), pg_temp.uid(escuela), pg_temp.uid(sede), pg_temp.uid(101), 'TEST', 'TEST', n::text
from (values (351,1,11), (352,1,12), (353,2,21)) v(n,escuela,sede);
insert into public.matriculas_alumno (id, escuela_id, sede_id, alumno_id, categorias)
select pg_temp.uid(n), pg_temp.uid(escuela), pg_temp.uid(sede), pg_temp.uid(a), array['B']
from (values (401,1,11,201), (402,1,11,202), (403,1,12,203), (404,2,21,204)) m(n,escuela,sede,a);
insert into public.clases (id, escuela_id, sede_id, user_id, alumno_id, instructor_id, fecha, hora_inicio, hora_fin)
select pg_temp.uid(n), pg_temp.uid(escuela), pg_temp.uid(sede), pg_temp.uid(101), pg_temp.uid(a), pg_temp.uid(i),
  current_date, '08:00'::time, '09:00'::time
from (values (501,1,11,201,301), (502,1,11,202,302), (503,1,12,203,null),
  (504,2,21,204,null), (505,2,21,201,301)) c(n,escuela,sede,a,i);
-- 505 is deliberately inconsistent legacy data: never include it in a student's/instructor's summary.
insert into public.examenes (id, escuela_id, sede_id, user_id, alumno_id, tipo, fecha, modulo_origen)
select pg_temp.uid(n), pg_temp.uid(escuela), pg_temp.uid(sede), pg_temp.uid(u), pg_temp.uid(a), 'teorico', current_date, 'cale_practica'
from (values (601,1,11,107,201), (602,1,11,108,202), (603,2,21,110,204)) e(n,escuela,sede,u,a);
insert into public.ingresos (id, escuela_id, sede_id, user_id, categoria, concepto, monto, estado)
select pg_temp.uid(n), pg_temp.uid(escuela), pg_temp.uid(sede), pg_temp.uid(101), 'otros', 'TEST', monto, estado
from (values (801,1,11,100,'cobrado'), (802,1,12,200,'cobrado'), (803,2,21,900,'cobrado'),
  (804,1,11,9999,'anulado')) i(n,escuela,sede,monto,estado);
insert into public.gastos (id, escuela_id, sede_id, user_id, categoria, concepto, monto, estado_pago)
select pg_temp.uid(n), pg_temp.uid(escuela), pg_temp.uid(sede), pg_temp.uid(101), 'otros', 'TEST', monto, estado
from (values (811,1,11,10,'pagado'), (812,1,12,20,'pagado'), (813,2,21,90,'pagado'),
  (814,1,11,9999,'anulado')) g(n,escuela,sede,monto,estado);
insert into public.categorias_examen (id, nombre, fuente) values (pg_temp.uid(700), 'TEST', 'cale_editorial_v1');
insert into public.preguntas_examen (id, categoria_id, pregunta, opcion_a, opcion_b, opcion_c, opcion_d, respuesta_correcta, fuente, activa)
select pg_temp.uid(n), pg_temp.uid(700), 'TEST ' || n, 'A', 'B', 'C', 'D', correcta, fuente, activa
from (values (701,'a','cale_editorial_v1',true), (702,'d','cale_editorial_v1',true),
  (703,'b','cale_editorial_v1',true), (704,'a','cale_editorial_v1',false), (705,'a','manual',true)) q(n,correcta,fuente,activa);

set local role authenticated;

-- BEGIN DASHBOARD TESTS
do $$
declare summary jsonb; actor_n integer;
begin
  perform pg_temp.login(107);
  summary := public.mobile_dashboard_summary();
  assert pg_temp.stat(summary, 'classes') = 1, 'Alumno: own classes only';
  assert pg_temp.stat(summary, 'enrollments') = 1, 'Alumno: own enrollments only';
  assert pg_temp.stat(summary, 'attempts') = 1, 'Alumno: own CALE attempts only';
  assert pg_temp.stat(summary, 'income') is null, 'Alumno: no school income';
  perform pg_temp.login(115);
  summary := public.mobile_dashboard_summary();
  assert pg_temp.stat(summary, 'classes') = 0 and pg_temp.stat(summary, 'attempts') = 0, 'Unlinked alumno: empty summary';
  perform pg_temp.login(105);
  summary := public.mobile_dashboard_summary();
  assert pg_temp.stat(summary, 'classes') = 1, 'Instructor: only assigned, scoped classes';
  assert jsonb_array_length(summary->'stats') = 1, 'Instructor: no financial/student totals';
  perform pg_temp.login(114);
  assert pg_temp.stat(public.mobile_dashboard_summary(), 'classes') = 0, 'Unassigned instructor';
  foreach actor_n in array array[102,103,104] loop
    perform pg_temp.login(actor_n);
    summary := public.mobile_dashboard_summary();
    assert pg_temp.stat(summary, 'students') = 2, 'Branch staff: local students';
    assert pg_temp.stat(summary, 'classes') = 2, 'Branch staff: local classes';
    assert pg_temp.stat(summary, 'income') = 100, 'Branch staff: local income, exclude annulled';
    if actor_n = 104 then
      assert pg_temp.stat(summary, 'expense') is null, 'Reception: no expense totals';
    else
      assert pg_temp.stat(summary, 'expense') = 10, 'Branch staff: local expenses';
    end if;
  end loop;
  perform pg_temp.login(101);
  summary := public.mobile_dashboard_summary();
  assert pg_temp.stat(summary, 'students') = 3 and pg_temp.stat(summary, 'classes') = 3, 'School admin: all local branches';
  assert pg_temp.stat(summary, 'income') = 300 and pg_temp.stat(summary, 'expense') = 30, 'School admin: no other school';
  perform pg_temp.login(113);
  assert pg_temp.stat(public.mobile_dashboard_summary(), 'schools') >= 2, 'Super admin';
  perform pg_temp.login(117);
  perform pg_temp.expect_error('select public.mobile_dashboard_summary()', 'otra sede');
  perform pg_temp.login(112);
  perform pg_temp.expect_error('select public.mobile_dashboard_summary()', 'No autorizado');
  perform pg_temp.expect_error('select public.mobile_cale_bank_snapshot()', 'No autorizado');
  perform pg_temp.login(107);
  summary := public.mobile_cale_bank_snapshot();
  assert (select count(*) from jsonb_array_elements(summary->'questions') q
    where (q->>'id')::uuid in (pg_temp.uid(701),pg_temp.uid(702),pg_temp.uid(703))) = 3, 'Active CALE bank';
  assert not exists (select 1 from jsonb_array_elements(summary->'questions') q
    where (q->>'id')::uuid in (pg_temp.uid(704),pg_temp.uid(705))), 'No inactive/manual questions';
  assert jsonb_array_length(public.mobile_cale_bank_snapshot(now() + interval '1 day')->'questions') = 0, 'Empty delta';
  perform set_config('request.jwt.claim.sub', '', true);
  perform set_config('request.jwt.claims', '{}', true);
  perform pg_temp.expect_error('select public.mobile_dashboard_summary()', 'No autorizado');
end;
$$;

-- BEGIN CALE TESTS
do $$
declare result jsonb; repeated jsonb; exam_id uuid;
  questions uuid[] := array[pg_temp.uid(702), pg_temp.uid(701), pg_temp.uid(703)];
  answers jsonb := jsonb_build_object(pg_temp.uid(702)::text, 'd', pg_temp.uid(701)::text, 'b');
begin
  perform pg_temp.login(107);
  result := public.mobile_submit_cale_attempt(pg_temp.uid(900), questions, answers, 45);
  exam_id := (result->>'exam_id')::uuid;
  assert result->'summary'->>'percentage' = '33', 'CALE: score on server';
  assert result->'summary'->>'answeredCount' = '2', 'CALE: unanswered tracked';
  assert result->'summary'->>'incorrectCount' = '2', 'CALE: wrong plus omitted';
  assert (select array_agg(pregunta_id order by orden_pregunta) from public.examenes_cale_preguntas
    where examen_id = exam_id) = questions, 'CALE: submitted order preserved';
  assert (select count(*) from public.respuestas_examen where examen_id = exam_id) = 2, 'CALE: only mistakes/omissions persisted';
  assert (select respuesta_omitida and respuesta_alumno is null from public.respuestas_examen
    where examen_id = exam_id and pregunta_id = pg_temp.uid(703)), 'CALE: omitted answer snapshot';
  assert (select intentos from public.examenes where id = exam_id) = 2, 'CALE: next attempt';
  repeated := public.mobile_submit_cale_attempt(pg_temp.uid(900), questions, answers, 45);
  assert repeated = result, 'CALE: identical replay';
  assert pg_temp.stat(public.mobile_dashboard_summary(), 'attempts') = 2, 'CALE replay: no duplicate attempt';
end;
$$;
-- END CALE RUNTIME TEST

do $$
declare result jsonb; actor_n integer;
begin
  perform pg_temp.login(107);
  perform pg_temp.expect_error($q$select public.mobile_submit_cale_attempt(pg_temp.uid(901), '{}', '{}')$q$, 'al menos una pregunta');
  perform pg_temp.expect_error($q$select public.mobile_submit_cale_attempt(pg_temp.uid(901), array[pg_temp.uid(701)], '{}')$q$, 'responder al menos');
  perform pg_temp.expect_error($q$select public.mobile_submit_cale_attempt(pg_temp.uid(901), array[pg_temp.uid(701),pg_temp.uid(701)], jsonb_build_object(pg_temp.uid(701)::text,'a'))$q$, 'banco local');
  perform pg_temp.expect_error($q$select public.mobile_submit_cale_attempt(pg_temp.uid(901), array[pg_temp.uid(704)], jsonb_build_object(pg_temp.uid(704)::text,'a'))$q$, 'banco local');
  perform pg_temp.expect_error($q$select public.mobile_submit_cale_attempt(pg_temp.uid(901), array[pg_temp.uid(705)], jsonb_build_object(pg_temp.uid(705)::text,'a'))$q$, 'banco local');
  perform pg_temp.expect_error($q$select public.mobile_submit_cale_attempt(pg_temp.uid(901), array[pg_temp.uid(701)], '[]')$q$, 'respuestas invalidas');
  result := public.mobile_submit_cale_attempt(pg_temp.uid(901), array[pg_temp.uid(701)], jsonb_build_object(pg_temp.uid(701)::text,'a'), -1);
  assert result->'summary'->>'result' = 'aprobado', 'CALE: correct answer succeeds after failed retries';
  assert result->'summary'->>'elapsedSeconds' = '0', 'CALE: clamp negative elapsed seconds';
  perform pg_temp.login(108);
  perform pg_temp.expect_error($q$select public.mobile_submit_cale_attempt(pg_temp.uid(901), array[pg_temp.uid(701)], jsonb_build_object(pg_temp.uid(701)::text,'a'), -1)$q$, 'comando ya esta en uso');
  foreach actor_n in array array[101,102,104,105] loop
    perform pg_temp.login(actor_n);
    perform pg_temp.expect_error($q$select public.mobile_submit_cale_attempt(pg_temp.uid(901), array[pg_temp.uid(701)], '{}')$q$, 'Solo un alumno');
  end loop;
  perform pg_temp.login(115);
  perform pg_temp.expect_error($q$select public.mobile_submit_cale_attempt(pg_temp.uid(902), array[pg_temp.uid(701)], '{}')$q$, 'perfil del alumno');
end;
$$;

do $$
declare result jsonb; payload jsonb; kind text; actor_n integer;
begin
  perform pg_temp.login(102);
  payload := jsonb_build_object('id', pg_temp.uid(201), 'telefono', '3111111111');
  result := pg_temp.command('student', 910, 'update', payload);
  assert result->>'entity_type' = 'students', 'Student update contract';
  assert result->'row'->>'telefono' = '3111111111', 'Student update saved';
  assert result->'row'->>'user_id' = pg_temp.uid(107)::text, 'Student account not operator';
  assert pg_temp.command('student', 910, 'update', payload) = result, 'Student update replay';
  perform pg_temp.expect_error($q$select pg_temp.command('student', 911, 'create', '{}')$q$, 'no est');
  perform pg_temp.expect_error($q$select pg_temp.command('student', 911, null, '{}')$q$, 'no est');
  perform pg_temp.expect_error($q$select pg_temp.command('student', 910, 'update', jsonb_build_object('id',pg_temp.uid(202)))$q$, 'comando ya esta en uso');
  perform pg_temp.expect_error($q$select pg_temp.command('student', 911, 'update', jsonb_build_object('id',pg_temp.uid(203)))$q$, 'otra sede');
  perform pg_temp.expect_error($q$select pg_temp.command('student', 911, 'update', jsonb_build_object('id',pg_temp.uid(204)))$q$, 'otra escuela');
  perform pg_temp.expect_error($q$select pg_temp.command('student', 911, 'update', jsonb_build_object('id',pg_temp.uid(201),'sede_id',pg_temp.uid(12)))$q$, 'otra sede');
  perform pg_temp.expect_error($q$select pg_temp.command('student', 911, 'update', jsonb_build_object('id',pg_temp.uid(201),'sede_id',pg_temp.uid(21)))$q$, 'sede no pertenece');
  perform pg_temp.login(103);
  perform pg_temp.expect_error($q$select pg_temp.command('student', 910, 'update', jsonb_build_object('id',pg_temp.uid(201),'telefono','3111111111'))$q$, 'comando ya esta en uso');

  perform pg_temp.login(102);
  payload := jsonb_build_object('id', pg_temp.uid(520), 'alumno_id', pg_temp.uid(201), 'instructor_id', pg_temp.uid(301), 'vehiculo_id', pg_temp.uid(351));
  result := pg_temp.command('class', 920, 'create', payload);
  assert result->>'entity_type' = 'classes', 'Class create contract';
  assert pg_temp.command('class', 920, 'create', payload) = result, 'Class create replay';
  result := pg_temp.command('class', 921, 'update', jsonb_build_object('id',pg_temp.uid(520),'estado','completada'));
  assert result->'row'->>'estado' = 'completada', 'Class update';
  perform pg_temp.expect_error($q$select pg_temp.command('class', 920, 'update', '{}')$q$, 'comando ya esta en uso');
  perform pg_temp.expect_error($q$select pg_temp.command('class', 922, 'create', jsonb_build_object('alumno_id',pg_temp.uid(204)))$q$, 'fuera del alcance');
  perform pg_temp.expect_error($q$select pg_temp.command('class', 922, 'create', jsonb_build_object('alumno_id',pg_temp.uid(203)))$q$, 'fuera del alcance');
  perform pg_temp.expect_error($q$select pg_temp.command('class', 922, 'create', jsonb_build_object('alumno_id',pg_temp.uid(201),'instructor_id',pg_temp.uid(99999)))$q$, 'fuera del alcance');
  perform pg_temp.expect_error($q$select pg_temp.command('class', 922, 'create', jsonb_build_object('alumno_id',pg_temp.uid(201),'vehiculo_id',pg_temp.uid(353)))$q$, 'fuera del alcance');
  perform pg_temp.expect_error($q$select pg_temp.command('class', 922, 'update', jsonb_build_object('id',pg_temp.uid(520),'vehiculo_id',pg_temp.uid(352)))$q$, 'fuera del alcance');
  perform pg_temp.expect_error($q$select pg_temp.command('class', 922, 'update', jsonb_build_object('id',pg_temp.uid(520),'alumno_id',pg_temp.uid(204)))$q$, 'fuera del alcance');
  perform pg_temp.expect_error($q$select pg_temp.command('class', 922, 'update', jsonb_build_object('id',pg_temp.uid(503)))$q$, 'otra sede');

  payload := jsonb_build_object('id',pg_temp.uid(820),'alumno_id',pg_temp.uid(201),'matricula_id',pg_temp.uid(401),'monto',50);
  result := pg_temp.command('income', 930, 'create', payload);
  assert result->>'entity_type' = 'income', 'Income create';
  assert pg_temp.command('income', 930, 'create', payload) = result, 'Income replay';
  result := pg_temp.command('income', 931, 'update', jsonb_build_object('id',pg_temp.uid(820),'monto',60));
  assert (result->'row'->>'monto')::numeric = 60, 'Income update';
  perform pg_temp.expect_error($q$select pg_temp.command('income', 932, 'create', jsonb_build_object('alumno_id',pg_temp.uid(204),'monto',50))$q$, 'fuera del alcance');
  perform pg_temp.expect_error($q$select pg_temp.command('income', 932, 'create', jsonb_build_object('alumno_id',pg_temp.uid(201),'matricula_id',pg_temp.uid(402)))$q$, 'fuera del alcance');
  perform pg_temp.expect_error($q$select pg_temp.command('income', 932, 'create', jsonb_build_object('matricula_id',pg_temp.uid(401)))$q$, 'fuera del alcance');
  perform pg_temp.expect_error($q$select pg_temp.command('income', 932, 'update', jsonb_build_object('id',pg_temp.uid(802)))$q$, 'otra sede');
  payload := jsonb_build_object('id',pg_temp.uid(830),'monto',5);
  result := pg_temp.command('expense', 940, 'create', payload);
  assert result->>'entity_type' = 'expenses', 'Expense create';
  assert pg_temp.command('expense', 940, 'create', payload) = result, 'Expense replay';
  result := pg_temp.command('expense', 941, 'update', jsonb_build_object('id',pg_temp.uid(830),'monto',6));
  assert (result->'row'->>'monto')::numeric = 6, 'Expense update';
  perform pg_temp.expect_error($q$select pg_temp.command('expense', 942, 'update', jsonb_build_object('id',pg_temp.uid(812)))$q$, 'otra sede');
  perform pg_temp.expect_error($q$select pg_temp.command('income', 940, 'create', jsonb_build_object('id',pg_temp.uid(830),'monto',5))$q$, 'comando ya esta en uso');

  foreach kind in array array['class','income','expense'] loop
    perform pg_temp.expect_error(format('select pg_temp.command(%L,950,''create'',jsonb_build_object(''escuela_id'',pg_temp.uid(2),''sede_id'',pg_temp.uid(21)))',kind), 'otra escuela');
    perform pg_temp.expect_error(format('select pg_temp.command(%L,950,''create'',jsonb_build_object(''sede_id'',pg_temp.uid(12)))',kind), 'otra sede');
    perform pg_temp.expect_error(format('select pg_temp.command(%L,950,''create'',jsonb_build_object(''sede_id'',pg_temp.uid(21)))',kind), 'sede no pertenece');
    perform pg_temp.expect_error(format('select pg_temp.command(%L,950,null,''{}'')',kind), 'no esta soportada');
    perform pg_temp.expect_error(format('select pg_temp.command(%L,null,''create'',''{}'')',kind), 'Comando o payload');
    perform pg_temp.expect_error(format('select pg_temp.command(%L,950,''create'',''[]'')',kind), 'Comando o payload');
  end loop;
  foreach actor_n in array array[105,107] loop
    perform pg_temp.login(actor_n);
    foreach kind in array array['student','class','income','expense'] loop
      perform pg_temp.expect_error(format('select pg_temp.command(%L,910,''update'',''{}'')',kind), 'No tienes permisos');
    end loop;
  end loop;
  perform pg_temp.login(104);
  perform pg_temp.expect_error($q$select pg_temp.command('expense',940,'create',jsonb_build_object('id',pg_temp.uid(830),'monto',5))$q$, 'No tienes permisos');
  perform pg_temp.login(112);
  perform pg_temp.expect_error($q$select pg_temp.command('student',910,'update','{}')$q$, 'No autorizado');

  perform pg_temp.login(101);
  -- Updating an existing row resolves its actual scope, even without payload scope/default sede.
  result := pg_temp.command('class',960,'update',jsonb_build_object('id',pg_temp.uid(503),'notas','School admin'));
  assert result->'row'->>'sede_id' = pg_temp.uid(12)::text, 'School admin can update another local branch';
  perform pg_temp.expect_error($q$select pg_temp.command('student',961,'update',jsonb_build_object('id',pg_temp.uid(201),'sede_id',pg_temp.uid(21)))$q$, 'sede no pertenece');
  result := pg_temp.command('student',961,'update',jsonb_build_object('id',pg_temp.uid(202),'sede_id',pg_temp.uid(12)));
  assert result->'row'->>'sede_id' = pg_temp.uid(12)::text, 'School admin can move within school';
  assert (select sede_id from public.perfiles where id = pg_temp.uid(108)) = pg_temp.uid(12), 'Linked profile stays in same scope';
  perform pg_temp.login(113);
  result := pg_temp.command('expense',962,'update',jsonb_build_object('id',pg_temp.uid(813),'monto',91));
  assert (result->'row'->>'monto')::numeric = 91, 'Super admin update without default school/sede';
  perform pg_temp.expect_error($q$select pg_temp.command('expense',963,'create',jsonb_build_object('escuela_id',pg_temp.uid(1),'sede_id',pg_temp.uid(21)))$q$, 'sede no pertenece');
end;
$$;

reset role;
-- A scope change must invalidate cached results as well as fresh mutations.
update public.perfiles set sede_id = pg_temp.uid(12) where id = pg_temp.uid(102);
set local role authenticated;
do $$
begin
  perform pg_temp.login(102);
  perform pg_temp.expect_error($q$select pg_temp.command('student',910,'update',jsonb_build_object('id',pg_temp.uid(201),'telefono','3111111111'))$q$, 'otra sede');
end;
$$;

reset role;
-- Legacy creator links and mismatched student accounts do not block authorized edits.
update public.alumnos set user_id = pg_temp.uid(116) where id = pg_temp.uid(204);
insert into public.alumnos (id, escuela_id, sede_id, user_id, nombre, apellidos, dni, telefono, estado)
select pg_temp.uid(n), pg_temp.uid(1), pg_temp.uid(11), pg_temp.uid(u),
  'Legacy', n::text, n::text, '3000000000', 'pre_registrado'
from (values (205,101), (206,109), (207,110)) a(n,u);
create temporary table legacy_profiles_before as
select p.id, to_jsonb(p) as snapshot from public.perfiles p
where p.id in (pg_temp.uid(101),pg_temp.uid(116),pg_temp.uid(109),pg_temp.uid(110));
set local role authenticated;
do $$
declare result jsonb; student_n integer; payload jsonb;
begin
  perform pg_temp.login(116);
  payload := jsonb_build_object('id',pg_temp.uid(204),'nombre','Changed','email','legacy@mobile-test.invalid','dni','NEW204');
  result := pg_temp.command('student',970,'update',payload);
  assert result->'row'->>'nombre' = 'Changed', 'Legacy creator-linked student remains editable';
  assert pg_temp.command('student',970,'update',payload) = result, 'Legacy update replay';
  perform pg_temp.login(101);
  foreach student_n in array array[205,206,207] loop
    result := pg_temp.command('student',student_n + 770,'update',jsonb_build_object(
      'id',pg_temp.uid(student_n),'nombre','Changed','email','legacy@mobile-test.invalid','dni','NEW' || student_n));
    assert result->'row'->>'nombre' = 'Changed', 'Legacy/mismatched account permits scoped student edit';
  end loop;
  perform pg_temp.expect_error($q$select pg_temp.command('student',978,'update',jsonb_build_object('id',pg_temp.uid(204),'nombre','Other school'))$q$, 'otra escuela');
end;
$$;
reset role;
do $$
declare fn record;
begin
  assert not exists (select 1 from public.mobile_command_log
    where command_id in (pg_temp.uid(911),pg_temp.uid(922),pg_temp.uid(932),pg_temp.uid(942),pg_temp.uid(950),pg_temp.uid(963),pg_temp.uid(978))),
    'Rejected commands leave no log entries';
  assert not exists (select 1 from public.perfiles p join legacy_profiles_before b on b.id = p.id
    where to_jsonb(p) is distinct from b.snapshot), 'Operator and mismatched student profiles remain entirely unchanged';
  assert (select alumno_id = pg_temp.uid(201) and vehiculo_id = pg_temp.uid(351)
    from public.clases where id = pg_temp.uid(520)), 'Rejected class update leaves references unchanged';
  assert (select sede_id from public.alumnos where id = pg_temp.uid(201)) = pg_temp.uid(11), 'Rejected student move is atomic';
  for fn in select oid, proname from pg_proc where pronamespace = 'public'::regnamespace and proname like 'mobile_%' loop
    assert not has_function_privilege('anon', fn.oid, 'EXECUTE'), 'Anonymous RPC access';
    if fn.proname = 'mobile_assert_school_scope' then
      assert not has_function_privilege('authenticated', fn.oid, 'EXECUTE'), 'Scope helper is private';
    else
      assert has_function_privilege('authenticated', fn.oid, 'EXECUTE'), 'Authenticated RPC access preserved';
    end if;
  end loop;
end;
$$;
set local role anon;
select pg_temp.expect_error('select public.mobile_cale_bank_snapshot()', 'permission denied');
reset role;
rollback;
