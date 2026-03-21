import { NextResponse } from "next/server";
import { authorizeApiRequest } from "@/lib/api-auth";
import { getServerDbPool } from "@/lib/server-db";
import { getServerReadCached } from "@/lib/server-read-cache";
import { createServerTiming } from "@/lib/server-timing";
import { buildQueryParts } from "@/app/api/reportes/contables/query-builder";
import type {
  AggregateRow,
  AllowedPerfil,
  AgingBucketRow,
  CounterpartyAggregateRow,
  NamedAggregateRow,
  QueryFilters,
  TramitadorPortfolioRow,
} from "@/app/api/reportes/contables/types";
import {
  ALLOWED_FINANCE_ROLES,
  buildFinanceListContext,
  buildFinanceServerCacheKey,
  isFreshDataRequested,
} from "@/lib/finance/server/request";
import { PAYABLE_BUCKET_LABELS, sumBucketTotal } from "@/lib/finance/aging";
import { buildFinanceCacheTags } from "@/lib/server-cache-tags";
import { normalizeDateOnly, toNumber } from "@/lib/finance/server/normalizers";

type ExpenseSummarySqlRow = {
  gastos_totales: number | string | null;
  gasto_promedio: number | string | null;
  total_gastos: number | string | null;
  gastos_recurrentes_total: number | string | null;
  gastos_recurrentes_count: number | string | null;
};

const CACHE_TTL_MS = 45 * 1000;

export async function GET(request: Request) {
  const timing = createServerTiming();
  const authz = await timing.measure(
    "authz",
    () => authorizeApiRequest(ALLOWED_FINANCE_ROLES),
    "Autorizacion gastos"
  );
  if (!authz.ok) return authz.response;

  const perfil = authz.perfil as AllowedPerfil;
  const { url, from, to, search, scope } = buildFinanceListContext(request, perfil, {
    defaultPageSize: 20,
  });

  if (!scope.escuelaId) {
    return timing.apply(
      NextResponse.json({ error: "Selecciona una escuela activa para ver gastos." }, { status: 400 })
    );
  }

  const filters: QueryFilters = {
    alumnoId: null,
    ingresoCategoria: null,
    ingresoEstado: null,
    ingresoMetodo: null,
    ingresoView: null,
    gastoCategoria: url.searchParams.get("categoria"),
    gastoContraparte: url.searchParams.get("contraparte"),
    gastoEstado: url.searchParams.get("estado"),
    gastoMetodo: url.searchParams.get("metodo"),
    gastoView: url.searchParams.get("view"),
    recurrenteOnly: url.searchParams.get("recurrente") === "true",
  };
  const cacheBypass = isFreshDataRequested(url.searchParams);

  try {
    const payload = await timing.measure(
      "expense_json",
      () =>
        getServerReadCached({
          key: buildFinanceServerCacheKey("expense", perfil.id, scope, url.searchParams),
          ttlMs: CACHE_TTL_MS,
          tags: buildFinanceCacheTags("expense", scope),
          bypass: cacheBypass,
          loader: async () => {
            const pool = getServerDbPool();
            const parts = buildQueryParts({ scope, from, to, search, filters });
            // buildQueryParts comparte un solo arreglo de valores para ingresos, gastos
            // y obligaciones. Incluimos todos los CTE para que los placeholders
            // declarados coincidan con los parametros enviados.
            const cte = `with ${parts.filteredIngresosCte}, ${parts.filteredGastosCte}, ${parts.filteredObligationsCte}`;

            const [
              summaryRes,
              byCategoryRes,
              byMethodRes,
              topConceptsRes,
              topProvidersRes,
              topTramitadoresRes,
              payablesBucketsRes,
              payablesTramitadoresRes,
              payablesTopRes,
              tramitadorPortfolioRes,
            ] = await Promise.all([
              pool.query<ExpenseSummarySqlRow>(
                `
                  ${cte}
                  select
                    coalesce(sum(monto), 0) as gastos_totales,
                    coalesce(avg(monto), 0) as gasto_promedio,
                    count(*)::int as total_gastos,
                    coalesce(sum(monto) filter (where recurrente = true), 0) as gastos_recurrentes_total,
                    (count(*) filter (where recurrente = true))::int as gastos_recurrentes_count
                  from filtered_gastos
                `,
                parts.values
              ),
              pool.query<AggregateRow>(
                `
                  ${cte}
                  select categoria, count(*)::int as cantidad, coalesce(sum(monto), 0) as total
                  from filtered_gastos
                  group by categoria
                  order by total desc, categoria asc
                `,
                parts.values
              ),
              pool.query<AggregateRow>(
                `
                  ${cte}
                  select metodo_pago, count(*)::int as cantidad, coalesce(sum(monto), 0) as total
                  from filtered_gastos
                  group by metodo_pago
                  order by total desc, metodo_pago asc
                `,
                parts.values
              ),
              pool.query<AggregateRow>(
                `
                  ${cte}
                  select concepto, count(*)::int as cantidad, coalesce(sum(monto), 0) as total
                  from filtered_gastos
                  group by concepto
                  order by total desc, cantidad desc, concepto asc
                  limit 8
                `,
                parts.values
              ),
              pool.query<AggregateRow>(
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
              ),
              pool.query<NamedAggregateRow>(
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
              ),
              pool.query<AgingBucketRow>(
                `
                  ${cte}
                  select
                    case
                      when fecha_vencimiento < current_date then '${PAYABLE_BUCKET_LABELS.overdue}'
                      when fecha_vencimiento <= current_date + interval '7 day' then '${PAYABLE_BUCKET_LABELS.dueSoon}'
                      else '${PAYABLE_BUCKET_LABELS.current}'
                    end as bucket,
                    count(*)::int as cantidad,
                    coalesce(sum(monto), 0) as total
                  from filtered_gastos
                  where estado = 'pendiente'
                  group by 1
                  order by min(fecha_vencimiento) asc
                `,
                parts.values
              ),
              pool.query<CounterpartyAggregateRow>(
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
              ),
              pool.query<CounterpartyAggregateRow>(
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
              ),
              pool.query<TramitadorPortfolioRow>(
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
              ),
            ]);

            const summary = summaryRes.rows[0];
            const payablesBuckets = payablesBucketsRes.rows.map((row) => ({
              bucket: row.bucket,
              cantidad: Number(row.cantidad || 0),
              total: toNumber(row.total),
            }));

            return {
              generatedAt: new Date().toISOString(),
              filters: { from, to },
              summary: {
                gastosTotales: toNumber(summary?.gastos_totales),
                gastoPromedio: toNumber(summary?.gasto_promedio),
                totalGastos: Number(summary?.total_gastos || 0),
                gastosRecurrentesTotal: toNumber(summary?.gastos_recurrentes_total),
                gastosRecurrentesCount: Number(summary?.gastos_recurrentes_count || 0),
              },
              breakdown: {
                gastosPorCategoria: byCategoryRes.rows.map((row) => ({
                  categoria: row.categoria,
                  cantidad: Number(row.cantidad || 0),
                  total: toNumber(row.total),
                })),
                gastosPorMetodo: byMethodRes.rows.map((row) => ({
                  metodo_pago: row.metodo_pago,
                  cantidad: Number(row.cantidad || 0),
                  total: toNumber(row.total),
                })),
                topConceptosGasto: topConceptsRes.rows.map((row) => ({
                  concepto: row.concepto,
                  cantidad: Number(row.cantidad || 0),
                  total: toNumber(row.total),
                })),
                topProveedoresGasto: topProvidersRes.rows.map((row) => ({
                  concepto: row.concepto,
                  cantidad: Number(row.cantidad || 0),
                  total: toNumber(row.total),
                })),
                topTramitadoresGasto: topTramitadoresRes.rows.map((row) => ({
                  nombre: row.nombre || "Sin tramitador",
                  cantidad: Number(row.cantidad || 0),
                  total: toNumber(row.total),
                })),
                tramitadorPortfolio: tramitadorPortfolioRes.rows.map((row) => ({
                  nombre: row.nombre || "Sin tramitador",
                  movimientos: Number(row.movimientos || 0),
                  pagado: toNumber(row.pagado),
                  pendiente: toNumber(row.pendiente),
                  vencido: toNumber(row.vencido),
                  porVencer: toNumber(row.por_vencer),
                  ticketPromedio: toNumber(row.ticket_promedio),
                  ultimaFecha: normalizeDateOnly(row.ultima_fecha),
                })),
              },
              payables: {
                totalPendiente: payablesBuckets.reduce((sum, row) => sum + row.total, 0),
                vencido: sumBucketTotal(payablesBuckets, PAYABLE_BUCKET_LABELS.overdue),
                vencePronto: sumBucketTotal(payablesBuckets, PAYABLE_BUCKET_LABELS.dueSoon),
                alDia: sumBucketTotal(payablesBuckets, PAYABLE_BUCKET_LABELS.current),
                buckets: payablesBuckets,
                topProveedores: payablesTopRes.rows.map((row) => ({
                  nombre: row.nombre || "Sin proveedor",
                  cantidad: Number(row.cantidad || 0),
                  total: toNumber(row.total),
                })),
                topTramitadores: payablesTramitadoresRes.rows.map((row) => ({
                  nombre: row.nombre || "Sin tramitador",
                  cantidad: Number(row.cantidad || 0),
                  total: toNumber(row.total),
                })),
              },
            };
          },
        }),
      "Dashboard gastos"
    );

    return timing.apply(
      NextResponse.json(payload, {
        headers: {
          "Cache-Control": `private, max-age=${Math.floor(CACHE_TTL_MS / 1000)}, stale-while-revalidate=60`,
        },
      })
    );
  } catch (error) {
    console.error("[API GASTOS] Error:", error);
    return timing.apply(
      NextResponse.json({ error: "No se pudo cargar el dashboard de gastos." }, { status: 500 })
    );
  }
}
