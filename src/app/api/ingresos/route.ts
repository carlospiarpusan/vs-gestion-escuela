import { NextResponse } from "next/server";
import { authorizeApiRequest } from "@/lib/api-auth";
import { getServerDbPool } from "@/lib/server-db";
import { getServerReadCached } from "@/lib/server-read-cache";
import { createServerTiming } from "@/lib/server-timing";
import { buildQueryParts } from "@/app/api/reportes/contables/query-builder";
import type {
  AggregateRow,
  AllowedPerfil,
  LedgerCountRow,
  NamedAggregateRow,
  QueryFilters,
} from "@/app/api/reportes/contables/types";
import {
  ALLOWED_FINANCE_ROLES,
  buildFinanceListContext,
  buildFinanceServerCacheKey,
  isFreshDataRequested,
} from "@/lib/finance/server/request";
import { buildFinanceCacheTags } from "@/lib/server-cache-tags";
import { normalizeDateOnly, toNumber } from "@/lib/finance/server/normalizers";
import { buildIncomeSummary } from "@/lib/finance/income-summary";

type IncomeSummarySqlRow = {
  ingresos_cobrados: number | string | null;
  ingresos_anulados: number | string | null;
  ticket_promedio: number | string | null;
  total_ingresos: number | string | null;
  movimientos_cobrados: number | string | null;
};

type IncomeReceivablesSqlRow = {
  total_pendiente: number | string | null;
  registros_pendientes: number | string | null;
};

type IncomeLedgerSqlRow = {
  id: string;
  fecha: string;
  categoria: string;
  concepto: string;
  monto: number | string | null;
  estado: string;
  metodo_pago: string | null;
  numero_factura: string | null;
  contraparte: string | null;
  documento: string | null;
  contrato: string | null;
  created_at: string;
};

const CACHE_TTL_MS = 120 * 1000;

export async function GET(request: Request) {
  const timing = createServerTiming();
  const authz = await timing.measure(
    "authz",
    () => authorizeApiRequest(ALLOWED_FINANCE_ROLES),
    "Autorizacion ingresos"
  );
  if (!authz.ok) return authz.response;

  const perfil = authz.perfil as AllowedPerfil;
  const { url, from, to, page, pageSize, search, scope } = buildFinanceListContext(
    request,
    perfil,
    {
      defaultPageSize: 15,
    }
  );

  if (!scope.escuelaId) {
    return timing.apply(
      NextResponse.json(
        { error: "Selecciona una escuela activa para ver ingresos." },
        { status: 400 }
      )
    );
  }

  const filters: QueryFilters = {
    alumnoId: url.searchParams.get("alumno_id"),
    ingresoCategoria: url.searchParams.get("categoria"),
    ingresoEstado: url.searchParams.get("estado"),
    ingresoMetodo: url.searchParams.get("metodo"),
    ingresoView: url.searchParams.get("view"),
    gastoCategoria: null,
    gastoContraparte: null,
    gastoEstado: null,
    gastoMetodo: null,
    gastoView: null,
    recurrenteOnly: false,
  };
  const cacheBypass = isFreshDataRequested(url.searchParams);

  try {
    const payload = await timing.measure(
      "income_json",
      () =>
        getServerReadCached({
          key: buildFinanceServerCacheKey("income", perfil.id, scope, url.searchParams),
          ttlMs: CACHE_TTL_MS,
          tags: buildFinanceCacheTags("income", scope),
          bypass: cacheBypass,
          loader: async () => {
            const pool = getServerDbPool();
            const parts = buildQueryParts({ scope, from, to, search, filters });
            // buildQueryParts comparte un solo arreglo de valores para ingresos, gastos
            // y obligaciones. Incluimos todos los CTE para que los placeholders
            // declarados coincidan con los parametros enviados.
            const cte = `with ${parts.filteredIngresosCte}, ${parts.filteredGastosCte}, ${parts.filteredObligationsCte}`;
            const offset = page * pageSize;

            const [
              summaryRes,
              receivablesRes,
              byCategoryRes,
              byLineRes,
              byMethodRes,
              topConceptsRes,
              ledgerRowsRes,
            ] = await Promise.all([
              pool.query<IncomeSummarySqlRow>(
                `
                  ${cte}
                  select
                    coalesce(sum(case when estado = 'cobrado' then monto else 0 end), 0) as ingresos_cobrados,
                    coalesce(sum(case when estado = 'anulado' then monto else 0 end), 0) as ingresos_anulados,
                    coalesce(avg(case when estado = 'cobrado' then monto end), 0) as ticket_promedio,
                    count(*)::int as total_ingresos,
                    (count(*) filter (where estado = 'cobrado'))::int as movimientos_cobrados
                  from filtered_ingresos
                `,
                parts.values
              ),
              pool.query<IncomeReceivablesSqlRow>(
                `
                  ${cte}
                  select
                    coalesce(sum(saldo_pendiente), 0) as total_pendiente,
                    count(*)::int as registros_pendientes
                  from filtered_obligations
                  where saldo_pendiente > 0
                `,
                parts.values
              ),
              pool.query<AggregateRow>(
                `
                  ${cte}
                  select categoria, count(*)::int as cantidad, coalesce(sum(monto), 0) as total
                  from filtered_ingresos
                  group by categoria
                  order by total desc, categoria asc
                `,
                parts.values
              ),
              pool.query<NamedAggregateRow>(
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
              ),
              pool.query<AggregateRow>(
                `
                  ${cte}
                  select metodo_pago, count(*)::int as cantidad, coalesce(sum(monto), 0) as total
                  from filtered_ingresos
                  group by metodo_pago
                  order by total desc, metodo_pago asc
                `,
                parts.values
              ),
              pool.query<AggregateRow>(
                `
                  ${cte}
                  select concepto, count(*)::int as cantidad, coalesce(sum(monto), 0) as total
                  from filtered_ingresos
                  group by concepto
                  order by total desc, cantidad desc, concepto asc
                  limit 8
                `,
                parts.values
              ),
              pool.query<IncomeLedgerSqlRow>(
                `
                  ${cte}
                  select
                    id::text as id,
                    fecha,
                    categoria,
                    concepto,
                    monto,
                    estado,
                    metodo_pago,
                    numero_factura,
                    contraparte,
                    documento,
                    contrato,
                    created_at
                  from filtered_ingresos
                  order by fecha desc, created_at desc
                  limit $${parts.values.length + 1} offset $${parts.values.length + 2}
                `,
                [...parts.values, String(pageSize), String(offset)]
              ),
            ]);

            const summary = summaryRes.rows[0];
            const receivablesSummary = receivablesRes.rows[0];

            return {
              generatedAt: new Date().toISOString(),
              filters: { from, to, page, pageSize },
              summary: buildIncomeSummary(summary, receivablesSummary),
              breakdown: {
                ingresosPorCategoria: byCategoryRes.rows.map((row) => ({
                  categoria: row.categoria,
                  cantidad: Number(row.cantidad || 0),
                  total: toNumber(row.total),
                })),
                ingresosPorLinea: byLineRes.rows.map((row) => ({
                  nombre: row.nombre || "Otros",
                  cantidad: Number(row.cantidad || 0),
                  total: toNumber(row.total),
                })),
                ingresosPorMetodo: byMethodRes.rows.map((row) => ({
                  metodo_pago: row.metodo_pago,
                  cantidad: Number(row.cantidad || 0),
                  total: toNumber(row.total),
                })),
                topConceptosIngreso: topConceptsRes.rows.map((row) => ({
                  concepto: row.concepto,
                  cantidad: Number(row.cantidad || 0),
                  total: toNumber(row.total),
                })),
              },
              ledger: {
                totalCount: Number(summary?.total_ingresos || 0),
                rows: ledgerRowsRes.rows.map((row) => ({
                  id: row.id,
                  fecha: normalizeDateOnly(row.fecha),
                  categoria: row.categoria,
                  concepto: row.concepto,
                  monto: toNumber(row.monto),
                  estado: row.estado,
                  metodo_pago: row.metodo_pago,
                  numero_factura: row.numero_factura,
                  contraparte: row.contraparte,
                  documento: row.documento,
                  contrato: row.contrato,
                })),
              },
            };
          },
        }),
      "Dashboard ingresos"
    );

    return timing.apply(
      NextResponse.json(payload, {
        headers: {
          "Cache-Control": `private, max-age=${Math.floor(CACHE_TTL_MS / 1000)}, stale-while-revalidate=60`,
        },
      })
    );
  } catch (error) {
    console.error("[API INGRESOS] Error:", error);
    return timing.apply(
      NextResponse.json({ error: "No se pudo cargar el dashboard de ingresos." }, { status: 500 })
    );
  }
}
