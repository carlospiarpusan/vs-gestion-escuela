import type { AnalysisWindow } from "./school-analysis";

// One read-only statement returns aggregates only. Every base relation is tenant scoped.
export function buildSchoolAnalysisQuery(
  schoolId: string | null,
  branchId: string | null,
  window: AnalysisWindow,
  branchOptionsScope: string | null = branchId
) {
  const values = [
    schoolId,
    branchId,
    window.current.from,
    window.current.to,
    window.previous.from,
    window.previous.to,
    window.today,
    branchOptionsScope,
  ];
  const scoped = (alias: string) =>
    `($1::uuid is null or ${alias}.escuela_id=$1::uuid) and ($2::uuid is null or ${alias}.sede_id=$2::uuid)`;
  return {
    values,
    text: `with
    periods as (select 'current'::text as key,$3::date as start_date,$4::date as end_date
      union all select 'previous',$5::date,$6::date),
    students as (select a.id,a.escuela_id,a.tipo_registro,a.valor_total,a.fecha_inscripcion,a.created_at,a.email,a.telefono,a.direccion,a.dni,a.tipo_documento
      from public.alumnos a where ${scoped("a")}),
    contracts as (select m.id,m.alumno_id,m.valor_total,m.fecha_inscripcion,m.categorias,m.estado
      from public.matriculas_alumno m
      join public.alumnos a on a.id=m.alumno_id and a.escuela_id=m.escuela_id
      where ${scoped("m")}),
    income as (select i.alumno_id,i.matricula_id,i.fecha,i.fecha_vencimiento,i.estado,i.monto,i.categoria
      from public.ingresos i where ${scoped("i")} and (i.fecha <= $7::date or i.estado='pendiente')),
    expenses as (select g.fecha,g.estado_pago,g.monto,g.categoria
      from public.gastos g where ${scoped("g")} and g.fecha between $5::date and $4::date),
    period_metrics as (select p.key,
      (select count(*) from contracts m where m.estado<>'cancelado' and m.fecha_inscripcion between p.start_date and p.end_date)::int as "enrollments",
      coalesce((select sum(i.monto) from income i where i.estado='cobrado' and i.fecha between p.start_date and p.end_date),0) as "collected",
      (select count(*) from income i where i.estado='cobrado' and i.fecha between p.start_date and p.end_date)::int as "collectedCount",
      coalesce((select sum(g.monto) from expenses g where g.estado_pago='pagado' and g.fecha between p.start_date and p.end_date),0) as "paidExpenses",
      (select count(*) from expenses g where g.estado_pago='pagado' and g.fecha between p.start_date and p.end_date)::int as "expenseCount",
      coalesce((select sum(g.monto) from expenses g where g.estado_pago='pendiente' and g.fecha between p.start_date and p.end_date),0) as "pendingExpenses"
      from periods p),
    monthly_income as (select to_char(fecha,'YYYY-MM') as month,sum(monto) as total from income
      where estado='cobrado' and fecha between $3::date and $4::date group by 1),
    monthly_expenses as (select to_char(fecha,'YYYY-MM') as month,sum(monto) as total from expenses
      where estado_pago='pagado' and fecha between $3::date and $4::date group by 1),
    monthly_enrollments as (select to_char(fecha_inscripcion,'YYYY-MM') as month,count(*)::int as total from contracts
      where estado<>'cancelado' and fecha_inscripcion between $3::date and $4::date group by 1),
    contract_payments as (select matricula_id,sum(monto) filter(where estado='cobrado') as paid,
      sum(monto) filter(where estado='pendiente' and fecha_vencimiento is not null) as scheduled,
      sum(monto) filter(where estado='pendiente' and fecha_vencimiento < $7::date and fecha <= $7::date) as overdue
      from income where matricula_id is not null group by 1),
    student_payments as (select alumno_id,sum(monto) filter(where estado='cobrado') as paid,
      sum(monto) filter(where estado='pendiente' and fecha_vencimiento is not null) as scheduled,
      sum(monto) filter(where estado='pendiente' and fecha_vencimiento < $7::date and fecha <= $7::date) as overdue
      from income where alumno_id is not null and matricula_id is null group by 1),
    obligations as (
      select greatest(coalesce(m.valor_total,0)-coalesce(p.paid,0),0) as balance,
        coalesce(p.scheduled,0) as scheduled,coalesce(p.overdue,0) as overdue,m.fecha_inscripcion as registered
      from contracts m left join contract_payments p on p.matricula_id=m.id
      where m.estado<>'cancelado' and m.fecha_inscripcion <= $7::date
      union all
      select greatest(coalesce(a.valor_total,0)-coalesce(p.paid,0),0),coalesce(p.scheduled,0),coalesce(p.overdue,0),
        coalesce(a.fecha_inscripcion,(a.created_at at time zone 'America/Bogota')::date)
      from students a left join student_payments p on p.alumno_id=a.id
      where a.tipo_registro in ('aptitud_conductor','practica_adicional')
        and coalesce(a.fecha_inscripcion,(a.created_at at time zone 'America/Bogota')::date) <= $7::date
      union all
      select monto,case when fecha_vencimiento is not null then monto else 0 end,case when fecha_vencimiento < $7::date then monto else 0 end,fecha
      from income where alumno_id is null and matricula_id is null and estado='pendiente' and fecha <= $7::date
        and categoria in ('clase_suelta','examen_teorico','examen_practico','examen_aptitud')
    ),
    debt as (select *,case when $7::date-registered<=30 then '0-30'
      when $7::date-registered<=60 then '31-60' when $7::date-registered<=90 then '61-90' else '90+' end as bucket
      from obligations where balance>0),
    duplicate_documents as (select count(*)-1 as extra from students
      where nullif(trim(dni),'') is not null
      group by coalesce(tipo_documento,'CC'),upper(regexp_replace(dni,'[[:space:].-]','','g')) having count(*)>1)
    select jsonb_build_object(
      'periods',(select jsonb_agg(to_jsonb(p)||jsonb_build_object('cashFlow',p."collected"-p."paidExpenses")) from period_metrics p),
      'monthly',(select jsonb_agg(jsonb_build_object('month',to_char(d,'YYYY-MM'),
        'enrollments',coalesce(m.total,0),'collected',coalesce(i.total,0),'paidExpenses',coalesce(g.total,0)) order by d)
        from generate_series(date_trunc('month',$3::date),date_trunc('month',$4::date),interval '1 month') d
        left join monthly_income i on i.month=to_char(d,'YYYY-MM')
        left join monthly_expenses g on g.month=to_char(d,'YYYY-MM')
        left join monthly_enrollments m on m.month=to_char(d,'YYYY-MM')),
      'courses',coalesce((select jsonb_agg(r) from (select categorias as categories,count(*)::int as count from contracts
        where estado<>'cancelado' and fecha_inscripcion between $3::date and $4::date group by categorias) r),'[]'::jsonb),
      'expenses',coalesce((select jsonb_agg(r order by r.current desc,r.category) from
        (select categoria as category,coalesce(sum(monto) filter(where fecha between $3::date and $4::date),0) as current,
          coalesce(sum(monto) filter(where fecha between $5::date and $6::date),0) as previous,
          count(*) filter(where fecha between $3::date and $4::date)::int as count from expenses where estado_pago='pagado' group by categoria) r),'[]'::jsonb),
      'portfolio',jsonb_build_object('balance',coalesce((select sum(balance) from debt),0),
        'obligations',(select count(*)::int from debt),'overdue',coalesce((select sum(least(balance,greatest(overdue,0))) from debt),0),
        'withoutSchedule',coalesce((select sum(greatest(balance-scheduled,0)) from debt),0),
        'aging',coalesce((select jsonb_agg(r order by r.bucket) from (select bucket,sum(balance) as balance,count(*)::int as count from debt group by bucket) r),'[]'::jsonb)),
      'quality',jsonb_build_object('students',(select count(*)::int from students),
        'incompleteContact',(select count(*)::int from students where nullif(trim(email),'') is null or nullif(trim(telefono),'') is null or nullif(trim(direccion),'') is null),
        'duplicateDocuments',coalesce((select sum(extra)::int from duplicate_documents),0),
        'contractsWithoutValue',(select count(*)::int from contracts where estado<>'cancelado' and (valor_total is null or valor_total<=0)),
        'regularsWithoutContract',(select count(*)::int from students a where a.tipo_registro='regular'
          and not exists(select 1 from public.matriculas_alumno m where m.alumno_id=a.id and m.escuela_id=a.escuela_id)),
        'unlinkedCollections',(select count(*)::int from income i join students a on a.id=i.alumno_id where i.matricula_id is null and i.estado='cobrado' and a.tipo_registro='regular'),
        'firstActivity',(select min(d)::text from (select fecha_inscripcion as d from contracts where fecha_inscripcion<=$7::date
          union all select fecha from income where fecha<=$7::date union all select fecha from public.gastos g where ${scoped("g")} and fecha<=$7::date) dates)),
      'branches',coalesce((select jsonb_agg(jsonb_build_object('id',s.id,'name',s.nombre) order by s.nombre) from public.sedes s
        where ($1::uuid is null or s.escuela_id=$1::uuid) and ($8::uuid is null or s.id=$8::uuid)),'[]'::jsonb)
    ) as payload`,
  };
}
