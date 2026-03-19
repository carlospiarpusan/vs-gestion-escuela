import { NextResponse } from "next/server";
import { getServerDbPool } from "@/lib/server-db";
import type {
  AllowedPerfil,
  ReportScope,
  SchoolOption,
  SedeOption,
  QueryParts,
  ReportInclude,
  LedgerRow,
  SummaryRow,
  AggregateRow,
  NamedAggregateRow,
  TramitadorPortfolioRow,
  AgingBucketRow,
  CounterpartyAggregateRow,
  DailySeriesSqlRow,
  MonthlySeriesSqlRow,
  ContractsSummaryRow,
  ContractsMonthlyRow,
  ContractOldDebtRow,
  StudentReportSqlRow,
  StudentsRevenueSqlRow,
  ContractPendingSqlRow,
  LedgerCountRow,
} from "./types";

/* ------------------------------------------------------------------ */
/*  Helpers                                                            */
/* ------------------------------------------------------------------ */

export function toNumber(value: unknown) {
  return Number(value || 0);
}

function normalizeDateOnly(value: unknown) {
  if (!value) return "";

  if (value instanceof Date) {
    return value.toISOString().slice(0, 10);
  }

  const text = String(value);
  const match = text.match(/^\d{4}-\d{2}-\d{2}/);
  if (match) return match[0];

  const parsed = new Date(text);
  if (Number.isNaN(parsed.getTime())) return text;

  return parsed.toISOString().slice(0, 10);
}

function normalizePeriod(value: unknown) {
  if (!value) return "";

  const text = String(value);
  const match = text.match(/^\d{4}-\d{2}/);
  if (match) return match[0];

  const parsed = value instanceof Date ? value : new Date(text);
  if (Number.isNaN(parsed.getTime())) return text;

  return `${parsed.getUTCFullYear()}-${String(parsed.getUTCMonth() + 1).padStart(2, "0")}`;
}

function appendCtes(baseCte: string, ...extraCtes: string[]) {
  const base = baseCte.trim().replace(/^with\s+/i, "");
  const extras = extraCtes.map((cte) => cte.trim().replace(/,$/, "")).filter(Boolean);

  return `with ${[base, ...extras].join(",\n")}`;
}

async function getAccessibleOptions(
  pool: ReturnType<typeof getServerDbPool>,
  perfil: AllowedPerfil,
  scope: ReportScope
) {
  if (perfil.rol === "super_admin") {
    const schoolsRes = await pool.query<SchoolOption>(
      "select id, nombre from escuelas order by nombre asc"
    );

    if (scope.escuelaId) {
      const sedesRes = await pool.query<SedeOption>(
        "select id, nombre, escuela_id from sedes where escuela_id = $1 order by nombre asc",
        [scope.escuelaId]
      );

      return {
        escuelas: schoolsRes.rows,
        sedes: sedesRes.rows,
      };
    }

    const sedesRes = await pool.query<SedeOption>(
      "select id, nombre, escuela_id from sedes order by nombre asc limit 500"
    );

    return {
      escuelas: schoolsRes.rows,
      sedes: sedesRes.rows,
    };
  }

  const schoolId = perfil.escuela_id;
  if (!schoolId) {
    return { escuelas: [], sedes: [] };
  }

  const schoolsRes = await pool.query<SchoolOption>(
    "select id, nombre from escuelas where id = $1",
    [schoolId]
  );

  if (perfil.rol === "admin_sede" && perfil.sede_id) {
    const sedesRes = await pool.query<SedeOption>(
      "select id, nombre, escuela_id from sedes where id = $1",
      [perfil.sede_id]
    );
    return {
      escuelas: schoolsRes.rows,
      sedes: sedesRes.rows,
    };
  }

  const sedesRes = await pool.query<SedeOption>(
    "select id, nombre, escuela_id from sedes where escuela_id = $1 order by nombre asc",
    [schoolId]
  );

  return {
    escuelas: schoolsRes.rows,
    sedes: sedesRes.rows,
  };
}

/* ------------------------------------------------------------------ */
/*  buildJsonResponse                                                  */
/* ------------------------------------------------------------------ */

export async function buildJsonResponse({
  pool,
  parts,
  page,
  pageSize,
  perfil,
  scope,
  from,
  to,
  includes,
  ledgerTipo,
}: {
  pool: ReturnType<typeof getServerDbPool>;
  parts: QueryParts;
  page: number;
  pageSize: number;
  perfil: AllowedPerfil;
  scope: ReportScope;
  from: string;
  to: string;
  includes: Set<ReportInclude>;
  ledgerTipo: "ingreso" | "gasto" | null;
}) {
  const cte = `with ${parts.filteredIngresosCte}, ${parts.filteredGastosCte}, ${parts.filteredObligationsCte}`;
  const dailySeriesCte = appendCtes(
    cte,
    `
      daily_ingresos as (
        select
          fecha,
          coalesce(sum(case when estado = 'cobrado' then monto else 0 end), 0) as ingresos,
          coalesce(sum(case when estado = 'pendiente' then monto else 0 end), 0) as pendientes
        from filtered_ingresos
        group by fecha
      )
    `,
    `
      daily_gastos as (
        select fecha, coalesce(sum(monto), 0) as gastos
        from filtered_gastos
        group by fecha
      )
    `
  );
  const monthlySeriesCte = appendCtes(
    cte,
    `
      monthly_ingresos as (
        select
          to_char(date_trunc('month', fecha), 'YYYY-MM') as periodo,
          coalesce(sum(case when estado = 'cobrado' then monto else 0 end), 0) as ingresos
        from filtered_ingresos
        group by 1
      )
    `,
    `
      monthly_gastos as (
        select
          to_char(date_trunc('month', fecha), 'YYYY-MM') as periodo,
          coalesce(sum(monto), 0) as gastos
        from filtered_gastos
        group by 1
      )
    `
  );
  const offset = page * pageSize;
  const limitRef = `$${parts.values.length + 1}`;
  const offsetRef = `$${parts.values.length + 2}`;
  const needsOptions = includes.has("options");
  const needsSummary = includes.has("summary");
  const needsBreakdown = includes.has("breakdown");
  const needsSeries = includes.has("series");
  const needsLedger = includes.has("ledger");
  const needsReceivables = includes.has("receivables");
  const needsPayables = includes.has("payables");
  const needsContracts = includes.has("contracts");
  const needsStudents = includes.has("students");

  const [
    summaryRes,
    ingresosCategoriaRes,
    ingresosLineaRes,
    gastosCategoriaRes,
    metodosRes,
    gastosMetodoRes,
    serieDiariaRes,
    serieMensualRes,
    topIngresosRes,
    topGastosRes,
    topTramitadoresGastoRes,
    topProveedoresGastoRes,
    ledgerCountRes,
    ledgerRes,
    receivablesBucketsRes,
    receivablesTopRes,
    payablesBucketsRes,
    payablesTramitadoresRes,
    payablesTopRes,
    tramitadorPortfolioRes,
    contractsSummaryRes,
    contractsMonthlyRes,
    contractsOldestRes,
    contractsPendingCountRes,
    contractsPendingRowsRes,
    contractsBucketsRes,
    contractsTopDeudoresRes,
    options,
    studentsRevenueRes,
    studentsRowsRes,
  ] = await Promise.all([
    needsSummary
      ? pool.query<SummaryRow>(
          `
            ${cte}
            select
              coalesce(sum(case when estado = 'cobrado' then monto else 0 end), 0) as ingresos_cobrados,
              coalesce(sum(case when estado = 'pendiente' then monto else 0 end), 0) as ingresos_pendientes,
              coalesce(sum(case when estado = 'anulado' then monto else 0 end), 0) as ingresos_anulados,
              coalesce(avg(case when estado = 'cobrado' then monto end), 0) as ticket_promedio,
              count(*)::int as total_ingresos,
              (select coalesce(sum(monto), 0) from filtered_gastos) as gastos_totales,
              (select count(*)::int from filtered_gastos) as total_gastos,
              (select coalesce(avg(monto), 0) from filtered_gastos) as gasto_promedio,
              (select coalesce(sum(monto), 0) from filtered_gastos where recurrente = true) as gastos_recurrentes_total,
              (select count(*)::int from filtered_gastos where recurrente = true) as gastos_recurrentes_count,
              ${parts.studentCountsSql.regulares} as alumnos_regulares,
              ${parts.studentCountsSql.practica} as alumnos_practica,
              ${parts.studentCountsSql.aptitud} as alumnos_aptitud
            from filtered_ingresos
          `,
          parts.values
        )
      : Promise.resolve({ rows: [] as SummaryRow[] }),
    needsBreakdown
      ? pool.query<AggregateRow>(
          `
            ${cte}
            select categoria, count(*)::int as cantidad, coalesce(sum(monto), 0) as total
            from filtered_ingresos
            group by categoria
            order by total desc, categoria asc
          `,
          parts.values
        )
      : Promise.resolve({ rows: [] as AggregateRow[] }),
    needsBreakdown
      ? pool.query<NamedAggregateRow>(
          `
            ${cte}
            select
              case
                when categoria in ('matricula', 'mensualidad', 'material', 'tasas_dgt') then 'Cursos'
                when categoria = 'clase_suelta' then 'Practica adicional'
                when categoria in ('examen_teorico', 'examen_practico', 'examen_aptitud') then 'Examenes'
                else 'Otros'
              end as nombre,
              count(*)::int as cantidad,
              coalesce(sum(monto), 0) as total
            from filtered_ingresos
            group by 1
            order by total desc, nombre asc
          `,
          parts.values
        )
      : Promise.resolve({ rows: [] as NamedAggregateRow[] }),
    needsBreakdown
      ? pool.query<AggregateRow>(
          `
            ${cte}
            select categoria, count(*)::int as cantidad, coalesce(sum(monto), 0) as total
            from filtered_gastos
            group by categoria
            order by total desc, categoria asc
          `,
          parts.values
        )
      : Promise.resolve({ rows: [] as AggregateRow[] }),
    needsBreakdown
      ? pool.query<AggregateRow>(
          `
            ${cte}
            select metodo_pago, count(*)::int as cantidad, coalesce(sum(monto), 0) as total
            from filtered_ingresos
            group by metodo_pago
            order by total desc, metodo_pago asc
          `,
          parts.values
        )
      : Promise.resolve({ rows: [] as AggregateRow[] }),
    needsBreakdown
      ? pool.query<AggregateRow>(
          `
            ${cte}
            select metodo_pago, count(*)::int as cantidad, coalesce(sum(monto), 0) as total
            from filtered_gastos
            group by metodo_pago
            order by total desc, metodo_pago asc
          `,
          parts.values
        )
      : Promise.resolve({ rows: [] as AggregateRow[] }),
    needsSeries
      ? pool.query<DailySeriesSqlRow>(
          `
            ${dailySeriesCte}
            select
              coalesce(di.fecha, dg.fecha) as fecha,
              coalesce(di.ingresos, 0) as ingresos,
              coalesce(di.pendientes, 0) as pendientes,
              coalesce(dg.gastos, 0) as gastos,
              coalesce(di.ingresos, 0) - coalesce(dg.gastos, 0) as balance
            from daily_ingresos di
            full outer join daily_gastos dg on dg.fecha = di.fecha
            order by fecha desc
          `,
          parts.values
        )
      : Promise.resolve({ rows: [] as DailySeriesSqlRow[] }),
    needsSeries
      ? pool.query<MonthlySeriesSqlRow>(
          `
            ${monthlySeriesCte}
            select
              coalesce(mi.periodo, mg.periodo) as periodo,
              coalesce(mi.ingresos, 0) as ingresos,
              coalesce(mg.gastos, 0) as gastos,
              coalesce(mi.ingresos, 0) - coalesce(mg.gastos, 0) as balance
            from monthly_ingresos mi
            full outer join monthly_gastos mg on mg.periodo = mi.periodo
            order by periodo desc
          `,
          parts.values
        )
      : Promise.resolve({ rows: [] as MonthlySeriesSqlRow[] }),
    needsBreakdown
      ? pool.query<AggregateRow>(
          `
            ${cte}
            select concepto, count(*)::int as cantidad, coalesce(sum(monto), 0) as total
            from filtered_ingresos
            group by concepto
            order by total desc, cantidad desc, concepto asc
            limit 8
          `,
          parts.values
        )
      : Promise.resolve({ rows: [] as AggregateRow[] }),
    needsBreakdown
      ? pool.query<AggregateRow>(
          `
            ${cte}
            select concepto, count(*)::int as cantidad, coalesce(sum(monto), 0) as total
            from filtered_gastos
            group by concepto
            order by total desc, cantidad desc, concepto asc
            limit 8
          `,
          parts.values
        )
      : Promise.resolve({ rows: [] as AggregateRow[] }),
    needsBreakdown
      ? pool.query<NamedAggregateRow>(
          `
            ${cte}
            select
              coalesce(contraparte, 'Sin tramitador') as nombre,
              count(*)::int as cantidad,
              coalesce(sum(monto), 0) as total
            from filtered_gastos
            where categoria = 'tramitador'
            group by 1
            order by total desc, cantidad desc, nombre asc
            limit 12
          `,
          parts.values
        )
      : Promise.resolve({ rows: [] as NamedAggregateRow[] }),
    needsBreakdown
      ? pool.query<AggregateRow>(
          `
            ${cte}
            select contraparte as concepto, count(*)::int as cantidad, coalesce(sum(monto), 0) as total
            from filtered_gastos
            where contraparte is not null and categoria != 'tramitador'
            group by contraparte
            order by total desc, cantidad desc, contraparte asc
            limit 8
          `,
          parts.values
        )
      : Promise.resolve({ rows: [] as AggregateRow[] }),
    needsLedger
      ? pool.query<LedgerCountRow>(
          `
            ${cte}
            select ${
              ledgerTipo === "ingreso"
                ? "(select count(*) from filtered_ingresos)"
                : ledgerTipo === "gasto"
                  ? "(select count(*) from filtered_gastos)"
                  : "(select count(*) from filtered_ingresos) + (select count(*) from filtered_gastos)"
            } as total
          `,
          parts.values
        )
      : Promise.resolve({ rows: [] as LedgerCountRow[] }),
    needsLedger
      ? pool.query<LedgerRow & { created_at: string }>(
          `
            ${cte}
            select *
            from (
              ${
                ledgerTipo !== "gasto"
                  ? `
              select
                id::text as id, fecha, 'ingreso'::text as tipo, categoria, concepto, monto, estado,
                metodo_pago, numero_factura, contraparte, documento, contrato, created_at
              from filtered_ingresos
              `
                  : ""
              }
              ${!ledgerTipo ? "union all" : ""}
              ${
                ledgerTipo !== "ingreso"
                  ? `
              select
                id::text as id, fecha, 'gasto'::text as tipo, categoria, concepto, monto,
                estado, metodo_pago, numero_factura, contraparte, documento, contrato, created_at
              from filtered_gastos
              `
                  : ""
              }
            ) ledger
            order by fecha desc, created_at desc
            limit ${limitRef} offset ${offsetRef}
          `,
          [...parts.values, String(pageSize), String(offset)]
        )
      : Promise.resolve({ rows: [] as Array<LedgerRow & { created_at: string }> }),
    needsReceivables
      ? pool.query<AgingBucketRow>(
          `
            ${cte}
            select
              case
                when fecha_vencimiento < current_date then 'Vencido'
                when fecha_vencimiento <= current_date + interval '7 day' then 'Proximo a vencer'
                else 'Al dia'
              end as bucket,
              count(*)::int as cantidad,
              coalesce(sum(monto), 0) as total
            from filtered_ingresos
            where estado = 'pendiente'
            group by 1
            order by min(fecha_vencimiento) asc
          `,
          parts.values
        )
      : Promise.resolve({ rows: [] as AgingBucketRow[] }),
    needsReceivables
      ? pool.query<CounterpartyAggregateRow>(
          `
            ${cte}
            select
              coalesce(contraparte, 'Sin alumno asociado') as nombre,
              count(*)::int as cantidad,
              coalesce(sum(monto), 0) as total
            from filtered_ingresos
            where estado = 'pendiente'
            group by 1
            order by total desc, cantidad desc, nombre asc
            limit 8
          `,
          parts.values
        )
      : Promise.resolve({ rows: [] as CounterpartyAggregateRow[] }),
    needsPayables
      ? pool.query<AgingBucketRow>(
          `
            ${cte}
            select
              case
                when fecha_vencimiento < current_date then 'Vencido'
                when fecha_vencimiento <= current_date + interval '7 day' then 'Proximo a vencer'
                else 'Al dia'
              end as bucket,
              count(*)::int as cantidad,
              coalesce(sum(monto), 0) as total
            from filtered_gastos
            where estado = 'pendiente'
            group by 1
            order by min(fecha_vencimiento) asc
          `,
          parts.values
        )
      : Promise.resolve({ rows: [] as AgingBucketRow[] }),
    needsPayables
      ? pool.query<CounterpartyAggregateRow>(
          `
            ${cte}
            select
              coalesce(contraparte, 'Sin tramitador') as nombre,
              count(*)::int as cantidad,
              coalesce(sum(monto), 0) as total
            from filtered_gastos
            where estado = 'pendiente' and categoria = 'tramitador'
            group by 1
            order by total desc, cantidad desc, nombre asc
            limit 12
          `,
          parts.values
        )
      : Promise.resolve({ rows: [] as CounterpartyAggregateRow[] }),
    needsPayables
      ? pool.query<CounterpartyAggregateRow>(
          `
            ${cte}
            select
              coalesce(contraparte, 'Sin proveedor') as nombre,
              count(*)::int as cantidad,
              coalesce(sum(monto), 0) as total
            from filtered_gastos
            where estado = 'pendiente'
            group by 1
            order by total desc, cantidad desc, nombre asc
            limit 8
          `,
          parts.values
        )
      : Promise.resolve({ rows: [] as CounterpartyAggregateRow[] }),
    needsBreakdown || needsPayables
      ? pool.query<TramitadorPortfolioRow>(
          `
            ${cte}
            select
              coalesce(contraparte, 'Sin tramitador') as nombre,
              count(*)::int as movimientos,
              coalesce(sum(case when estado = 'pagado' then monto else 0 end), 0) as pagado,
              coalesce(sum(case when estado = 'pendiente' then monto else 0 end), 0) as pendiente,
              coalesce(
                sum(
                  case
                    when estado = 'pendiente' and fecha_vencimiento < current_date then monto
                    else 0
                  end
                ),
                0
              ) as vencido,
              coalesce(
                sum(
                  case
                    when estado = 'pendiente'
                      and fecha_vencimiento >= current_date
                      and fecha_vencimiento <= current_date + interval '7 day'
                    then monto
                    else 0
                  end
                ),
                0
              ) as por_vencer,
              coalesce(avg(monto), 0) as ticket_promedio,
              max(fecha)::date as ultima_fecha
            from filtered_gastos
            where categoria = 'tramitador'
            group by 1
            order by pendiente desc, pagado desc, movimientos desc, nombre asc
            limit 12
          `,
          parts.values
        )
      : Promise.resolve({ rows: [] as TramitadorPortfolioRow[] }),
    needsContracts
      ? pool.query<ContractsSummaryRow>(
          `
            ${cte}
            select
              count(*)::int as registros,
              coalesce(sum(valor_esperado), 0) as total_esperado,
              coalesce(sum(valor_cobrado), 0) as total_cobrado,
              coalesce(sum(saldo_pendiente), 0) as total_pendiente
            from filtered_obligations
            where saldo_pendiente > 0
          `,
          parts.values
        )
      : Promise.resolve({ rows: [] as ContractsSummaryRow[] }),
    needsContracts
      ? pool.query<ContractsMonthlyRow>(
          `
            ${cte}
            select
              to_char(date_trunc('month', fecha_registro), 'YYYY-MM') as periodo,
              count(*)::int as registros,
              coalesce(sum(valor_esperado), 0) as valor_esperado,
              coalesce(sum(valor_cobrado), 0) as valor_cobrado,
              coalesce(sum(saldo_pendiente), 0) as saldo_pendiente
            from filtered_obligations
            group by 1
            order by periodo desc
          `,
          parts.values
        )
      : Promise.resolve({ rows: [] as ContractsMonthlyRow[] }),
    needsContracts
      ? pool.query<ContractOldDebtRow>(
          `
            ${cte}
            select
              nombre,
              documento,
              referencia,
              tipo_registro,
              saldo_pendiente,
              fecha_registro,
              fecha_referencia,
              greatest((current_date - fecha_referencia::date), 0)::int as dias_pendiente
            from filtered_obligations
            where saldo_pendiente > 0
            order by dias_pendiente desc, saldo_pendiente desc, fecha_referencia asc
            limit 12
          `,
          parts.values
        )
      : Promise.resolve({ rows: [] as ContractOldDebtRow[] }),
    needsContracts
      ? pool.query<LedgerCountRow>(
          `
            ${cte}
            select count(*)::int as total
            from filtered_obligations
            where saldo_pendiente > 0
          `,
          parts.values
        )
      : Promise.resolve({ rows: [] as LedgerCountRow[] }),
    needsContracts
      ? pool.query<ContractPendingSqlRow>(
          `
            ${cte}
            select
              obligation_id,
              nombre,
              documento,
              referencia,
              tipo_registro,
              fecha_registro,
              fecha_referencia,
              valor_esperado,
              valor_cobrado,
              saldo_pendiente,
              greatest((current_date - fecha_referencia::date), 0)::int as dias_pendiente
            from filtered_obligations
            where saldo_pendiente > 0
            order by dias_pendiente desc, saldo_pendiente desc, fecha_referencia asc
            limit ${limitRef} offset ${offsetRef}
          `,
          [...parts.values, String(pageSize), String(offset)]
        )
      : Promise.resolve({ rows: [] as ContractPendingSqlRow[] }),
    needsContracts
      ? pool.query<AgingBucketRow>(
          `
            ${cte}
            select
              case
                when fecha_referencia < current_date - interval '60 day' then 'Vencido'
                when fecha_referencia < current_date - interval '30 day' then 'Proximo a vencer'
                else 'Al dia'
              end as bucket,
              count(*)::int as cantidad,
              coalesce(sum(saldo_pendiente), 0) as total
            from filtered_obligations
            where saldo_pendiente > 0
            group by 1
            order by min(fecha_referencia) asc
          `,
          parts.values
        )
      : Promise.resolve({ rows: [] as AgingBucketRow[] }),
    needsContracts
      ? pool.query<CounterpartyAggregateRow>(
          `
            ${cte}
            select
              nombre,
              count(*)::int as cantidad,
              coalesce(sum(saldo_pendiente), 0) as total
            from filtered_obligations
            where saldo_pendiente > 0
            group by 1
            order by total desc, cantidad desc, nombre asc
            limit 8
          `,
          parts.values
        )
      : Promise.resolve({ rows: [] as CounterpartyAggregateRow[] }),
    needsOptions
      ? getAccessibleOptions(pool, perfil, scope)
      : Promise.resolve({ escuelas: [], sedes: [] }),
    needsStudents
      ? pool.query<StudentsRevenueSqlRow>(
          `
            ${cte}
            select
              tipo_registro,
              count(*)::int as cantidad,
              coalesce(sum(valor_cobrado), 0) as total_ingresos
            from filtered_obligations
            group by 1
          `,
          parts.values
        )
      : Promise.resolve({ rows: [] as StudentsRevenueSqlRow[] }),
    needsStudents
      ? pool.query<StudentReportSqlRow>(
          `
            ${cte}
            select
              obligation_id as id,
              nombre,
              documento as dni,
              tipo_registro,
              categorias,
              fecha_registro as fecha_inscripcion,
              valor_esperado as valor_total,
              valor_cobrado as pago_total
            from filtered_obligations
            order by fecha_registro desc, nombre asc
            limit 100
          `,
          parts.values
        )
      : Promise.resolve({ rows: [] as StudentReportSqlRow[] }),
  ]);

  const studentsRevenueRows = (studentsRevenueRes as { rows: StudentsRevenueSqlRow[] }).rows;
  const studentsDetailRows = (studentsRowsRes as { rows: StudentReportSqlRow[] }).rows;

  const summaryRow = summaryRes.rows[0] ?? {};
  const ingresosCobrados = toNumber(summaryRow.ingresos_cobrados);
  const gastosTotales = toNumber(summaryRow.gastos_totales);
  const balanceNeto = ingresosCobrados - gastosTotales;
  const contractsSummaryRow =
    (contractsSummaryRes as { rows: ContractsSummaryRow[] }).rows[0] ?? {};

  return NextResponse.json({
    generatedAt: new Date().toISOString(),
    filters: {
      from,
      to,
      page,
      pageSize,
      scope,
    },
    options,
    summary: {
      ingresosCobrados,
      ingresosPendientes: toNumber(summaryRow.ingresos_pendientes),
      ingresosAnulados: toNumber(summaryRow.ingresos_anulados),
      gastosTotales,
      balanceNeto,
      margenPorcentaje: ingresosCobrados > 0 ? (balanceNeto / ingresosCobrados) * 100 : 0,
      ticketPromedio: toNumber(summaryRow.ticket_promedio),
      gastoPromedio: toNumber(summaryRow.gasto_promedio),
      gastosRecurrentesTotal: toNumber(summaryRow.gastos_recurrentes_total),
      gastosRecurrentesCount: Number(summaryRow.gastos_recurrentes_count || 0),
      cobranzaPorcentaje:
        ingresosCobrados + toNumber(summaryRow.ingresos_pendientes) > 0
          ? (ingresosCobrados / (ingresosCobrados + toNumber(summaryRow.ingresos_pendientes))) * 100
          : 0,
      totalIngresos: Number(summaryRow.total_ingresos || 0),
      totalGastos: Number(summaryRow.total_gastos || 0),
      totalMovimientos:
        Number(summaryRow.total_ingresos || 0) + Number(summaryRow.total_gastos || 0),
      alumnosNuevosRegulares: Number(summaryRow.alumnos_regulares || 0),
      alumnosNuevosPractica: Number(summaryRow.alumnos_practica || 0),
      alumnosNuevosAptitud: Number(summaryRow.alumnos_aptitud || 0),
    },
    breakdown: {
      ingresosPorCategoria: ingresosCategoriaRes.rows.map((row: AggregateRow) => ({
        categoria: row.categoria,
        cantidad: Number(row.cantidad || 0),
        total: toNumber(row.total),
      })),
      ingresosPorLinea: ingresosLineaRes.rows.map((row: NamedAggregateRow) => ({
        nombre: row.nombre || "Otros",
        cantidad: Number(row.cantidad || 0),
        total: toNumber(row.total),
      })),
      gastosPorCategoria: gastosCategoriaRes.rows.map((row: AggregateRow) => ({
        categoria: row.categoria,
        cantidad: Number(row.cantidad || 0),
        total: toNumber(row.total),
      })),
      ingresosPorMetodo: metodosRes.rows.map((row: AggregateRow) => ({
        metodo_pago: row.metodo_pago,
        cantidad: Number(row.cantidad || 0),
        total: toNumber(row.total),
      })),
      gastosPorMetodo: gastosMetodoRes.rows.map((row: AggregateRow) => ({
        metodo_pago: row.metodo_pago,
        cantidad: Number(row.cantidad || 0),
        total: toNumber(row.total),
      })),
      topConceptosIngreso: topIngresosRes.rows.map((row: AggregateRow) => ({
        concepto: row.concepto,
        cantidad: Number(row.cantidad || 0),
        total: toNumber(row.total),
      })),
      topConceptosGasto: topGastosRes.rows.map((row: AggregateRow) => ({
        concepto: row.concepto,
        cantidad: Number(row.cantidad || 0),
        total: toNumber(row.total),
      })),
      topTramitadoresGasto: topTramitadoresGastoRes.rows.map((row: NamedAggregateRow) => ({
        nombre: row.nombre || "Sin tramitador",
        cantidad: Number(row.cantidad || 0),
        total: toNumber(row.total),
      })),
      tramitadorPortfolio: tramitadorPortfolioRes.rows.map((row: TramitadorPortfolioRow) => ({
        nombre: row.nombre || "Sin tramitador",
        movimientos: Number(row.movimientos || 0),
        pagado: toNumber(row.pagado),
        pendiente: toNumber(row.pendiente),
        vencido: toNumber(row.vencido),
        porVencer: toNumber(row.por_vencer),
        ticketPromedio: toNumber(row.ticket_promedio),
        ultimaFecha: normalizeDateOnly(row.ultima_fecha),
      })),
      topProveedoresGasto: topProveedoresGastoRes.rows.map((row: AggregateRow) => ({
        concepto: row.concepto,
        cantidad: Number(row.cantidad || 0),
        total: toNumber(row.total),
      })),
    },
    series: {
      diaria: serieDiariaRes.rows.map((row: DailySeriesSqlRow) => ({
        fecha: normalizeDateOnly(row.fecha),
        ingresos: toNumber(row.ingresos),
        pendientes: toNumber(row.pendientes),
        gastos: toNumber(row.gastos),
        balance: toNumber(row.balance),
      })),
      mensual: serieMensualRes.rows.map((row: MonthlySeriesSqlRow) => ({
        periodo: normalizePeriod(row.periodo),
        ingresos: toNumber(row.ingresos),
        gastos: toNumber(row.gastos),
        balance: toNumber(row.balance),
      })),
    },
    ledger: {
      totalCount: needsLedger ? Number(ledgerCountRes.rows[0]?.total || 0) : 0,
      rows: needsLedger
        ? (ledgerRes.rows.map((row: LedgerRow & { created_at: string }) => ({
            ...row,
            fecha: normalizeDateOnly(row.fecha),
            monto: toNumber(row.monto),
          })) as LedgerRow[])
        : [],
    },
    receivables: needsReceivables
      ? {
          totalPendiente: receivablesBucketsRes.rows.reduce(
            (sum, row) => sum + toNumber(row.total),
            0
          ),
          vencido: receivablesBucketsRes.rows
            .filter((row: AgingBucketRow) => row.bucket === "Vencido")
            .reduce((sum, row) => sum + toNumber(row.total), 0),
          vencePronto: receivablesBucketsRes.rows
            .filter((row: AgingBucketRow) => row.bucket === "Proximo a vencer")
            .reduce((sum, row) => sum + toNumber(row.total), 0),
          alDia: receivablesBucketsRes.rows
            .filter((row: AgingBucketRow) => row.bucket === "Al dia")
            .reduce((sum, row) => sum + toNumber(row.total), 0),
          buckets: receivablesBucketsRes.rows.map((row: AgingBucketRow) => ({
            bucket: row.bucket,
            cantidad: Number(row.cantidad || 0),
            total: toNumber(row.total),
          })),
          topDeudores: receivablesTopRes.rows.map((row: CounterpartyAggregateRow) => ({
            nombre: row.nombre || "Sin alumno asociado",
            cantidad: Number(row.cantidad || 0),
            total: toNumber(row.total),
          })),
        }
      : undefined,
    payables: needsPayables
      ? {
          totalPendiente: payablesBucketsRes.rows.reduce(
            (sum, row) => sum + toNumber(row.total),
            0
          ),
          vencido: payablesBucketsRes.rows
            .filter((row: AgingBucketRow) => row.bucket === "Vencido")
            .reduce((sum, row) => sum + toNumber(row.total), 0),
          vencePronto: payablesBucketsRes.rows
            .filter((row: AgingBucketRow) => row.bucket === "Proximo a vencer")
            .reduce((sum, row) => sum + toNumber(row.total), 0),
          alDia: payablesBucketsRes.rows
            .filter((row: AgingBucketRow) => row.bucket === "Al dia")
            .reduce((sum, row) => sum + toNumber(row.total), 0),
          buckets: payablesBucketsRes.rows.map((row: AgingBucketRow) => ({
            bucket: row.bucket,
            cantidad: Number(row.cantidad || 0),
            total: toNumber(row.total),
          })),
          topProveedores: payablesTopRes.rows.map((row: CounterpartyAggregateRow) => ({
            nombre: row.nombre || "Sin proveedor",
            cantidad: Number(row.cantidad || 0),
            total: toNumber(row.total),
          })),
          topTramitadores: payablesTramitadoresRes.rows.map((row: CounterpartyAggregateRow) => ({
            nombre: row.nombre || "Sin tramitador",
            cantidad: Number(row.cantidad || 0),
            total: toNumber(row.total),
          })),
        }
      : undefined,
    contracts: needsContracts
      ? {
          registros: Number(contractsSummaryRow.registros || 0),
          totalEsperado: toNumber(contractsSummaryRow.total_esperado),
          totalCobrado: toNumber(contractsSummaryRow.total_cobrado),
          totalPendiente: toNumber(contractsSummaryRow.total_pendiente),
          buckets: contractsBucketsRes.rows.map((row: AgingBucketRow) => ({
            bucket: row.bucket,
            cantidad: Number(row.cantidad || 0),
            total: toNumber(row.total),
          })),
          topDeudores: contractsTopDeudoresRes.rows.map((row: CounterpartyAggregateRow) => ({
            nombre: row.nombre || "Sin alumno asociado",
            cantidad: Number(row.cantidad || 0),
            total: toNumber(row.total),
          })),
          monthly: contractsMonthlyRes.rows.map((row: ContractsMonthlyRow) => ({
            periodo: normalizePeriod(row.periodo),
            registros: Number(row.registros || 0),
            valorEsperado: toNumber(row.valor_esperado),
            valorCobrado: toNumber(row.valor_cobrado),
            saldoPendiente: toNumber(row.saldo_pendiente),
          })),
          oldestPending: contractsOldestRes.rows.map((row: ContractOldDebtRow) => ({
            nombre: row.nombre || "Sin alumno asociado",
            documento: row.documento || null,
            referencia: row.referencia || null,
            tipoRegistro: row.tipo_registro || null,
            saldoPendiente: toNumber(row.saldo_pendiente),
            fechaRegistro: normalizeDateOnly(row.fecha_registro),
            fechaReferencia: normalizeDateOnly(row.fecha_referencia),
            diasPendiente: Number(row.dias_pendiente || 0),
          })),
          pendingCount: Number(contractsPendingCountRes.rows[0]?.total || 0),
          pendingRows: contractsPendingRowsRes.rows.map((row: ContractPendingSqlRow) => ({
            obligationId: row.obligation_id,
            nombre: row.nombre || "Sin alumno asociado",
            documento: row.documento || null,
            referencia: row.referencia || null,
            tipoRegistro: row.tipo_registro || null,
            fechaRegistro: normalizeDateOnly(row.fecha_registro),
            fechaReferencia: normalizeDateOnly(row.fecha_referencia),
            valorEsperado: toNumber(row.valor_esperado),
            valorCobrado: toNumber(row.valor_cobrado),
            saldoPendiente: toNumber(row.saldo_pendiente),
            diasPendiente: Number(row.dias_pendiente || 0),
          })),
        }
      : undefined,
    students: needsStudents
      ? {
          countRegulares: toNumber(
            studentsRevenueRows.find((r) => r.tipo_registro === "regular")?.cantidad
          ),
          totalIngresosRegulares: toNumber(
            studentsRevenueRows.find((r) => r.tipo_registro === "regular")?.total_ingresos
          ),
          countPractica: toNumber(
            studentsRevenueRows.find((r) => r.tipo_registro === "practica_adicional")?.cantidad
          ),
          totalIngresosPractica: toNumber(
            studentsRevenueRows.find((r) => r.tipo_registro === "practica_adicional")
              ?.total_ingresos
          ),
          countAptitud: toNumber(
            studentsRevenueRows.find((r) => r.tipo_registro === "aptitud_conductor")?.cantidad
          ),
          totalIngresosAptitud: toNumber(
            studentsRevenueRows.find((r) => r.tipo_registro === "aptitud_conductor")?.total_ingresos
          ),
          rows: studentsDetailRows.map((row) => ({
            id: row.id,
            nombre: row.nombre,
            dni: row.dni,
            tipo_registro: row.tipo_registro,
            categorias: row.categorias || [],
            fecha_inscripcion: normalizeDateOnly(row.fecha_inscripcion),
            valor_total: toNumber(row.valor_total),
            total_pagado: toNumber(row.pago_total),
            saldo_pendiente: Math.max(0, toNumber(row.valor_total) - toNumber(row.pago_total)),
          })),
        }
      : undefined,
  });
}
