import { NextResponse } from "next/server";
import { authorizeApiRequest } from "@/lib/api-auth";
import { getServerDbPool } from "@/lib/server-db";
import { getServerReadCached } from "@/lib/server-read-cache";
import { createServerTiming } from "@/lib/server-timing";
import { buildQueryParts } from "@/app/api/reportes/contables/query-builder";
import type {
  AllowedPerfil,
  AgingBucketRow,
  ContractsMonthlyRow,
  ContractOldDebtRow,
  CounterpartyAggregateRow,
  QueryFilters,
} from "@/app/api/reportes/contables/types";
import {
  ALLOWED_FINANCE_ROLES,
  buildFinanceListContext,
  buildFinanceServerCacheKey,
  isFreshDataRequested,
} from "@/lib/finance/server/request";
import { RECEIVABLE_BUCKET_LABELS } from "@/lib/finance/aging";
import { buildFinanceCacheTags } from "@/lib/server-cache-tags";
import { normalizeDateOnly, normalizePeriod, toNumber } from "@/lib/finance/server/normalizers";

type ContractsSummaryRow = {
  total_esperado: number | string | null;
  total_cobrado: number | string | null;
  total_pendiente: number | string | null;
  registros: number | string | null;
};

type PortfolioPendingSqlRow = {
  obligation_id: string;
  alumno_id: string | null;
  nombre: string | null;
  documento: string | null;
  referencia: string | null;
  tipo_registro: string | null;
  fecha_registro: string | null;
  fecha_referencia: string | null;
  valor_esperado: number | string | null;
  valor_cobrado: number | string | null;
  saldo_pendiente: number | string | null;
  dias_pendiente: number | string | null;
};

type CountRow = {
  total: number | string | null;
};

const CACHE_TTL_MS = 120 * 1000;

export async function GET(request: Request) {
  const timing = createServerTiming();
  const authz = await timing.measure(
    "authz",
    () => authorizeApiRequest(ALLOWED_FINANCE_ROLES),
    "Autorizacion cartera"
  );
  if (!authz.ok) return authz.response;

  const perfil = authz.perfil as AllowedPerfil;
  const { url, from, to, page, pageSize, search, scope } = buildFinanceListContext(
    request,
    perfil,
    {
      defaultPageSize: 10,
    }
  );

  if (!scope.escuelaId) {
    return timing.apply(
      NextResponse.json(
        { error: "Selecciona una escuela activa para ver cartera." },
        { status: 400 }
      )
    );
  }

  const view = url.searchParams.get("view");
  const filters: QueryFilters = {
    alumnoId: null,
    ingresoCategoria: view === "aptitud" ? "examen_aptitud" : null,
    ingresoEstado: null,
    ingresoMetodo: url.searchParams.get("metodo"),
    ingresoView: view && view !== "all" && view !== "aptitud" ? view : null,
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
      "portfolio_json",
      () =>
        getServerReadCached({
          key: buildFinanceServerCacheKey("portfolio", perfil.id, scope, url.searchParams),
          ttlMs: CACHE_TTL_MS,
          tags: buildFinanceCacheTags("portfolio", scope),
          bypass: cacheBypass,
          loader: async () => {
            const pool = getServerDbPool();
            const parts = buildQueryParts({ scope, from, to, search, filters });
            const cte = `with ${parts.filteredIngresosCte}, ${parts.filteredObligationsCte}`;
            const offset = page * pageSize;

            const [
              summaryRes,
              monthlyRes,
              oldestRes,
              pendingCountRes,
              pendingRowsRes,
              bucketsRes,
              topDeudoresRes,
            ] = await Promise.all([
              pool.query<ContractsSummaryRow>(
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
              ),
              pool.query<ContractsMonthlyRow>(
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
              ),
              pool.query<ContractOldDebtRow>(
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
              ),
              pool.query<CountRow>(
                `
                  ${cte}
                  select count(*)::int as total
                  from filtered_obligations
                  where saldo_pendiente > 0
                `,
                parts.values
              ),
              pool.query<PortfolioPendingSqlRow>(
                `
                  ${cte}
                  select
                    obligation_id,
                    alumno_id::text as alumno_id,
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
                  limit $${parts.values.length + 1} offset $${parts.values.length + 2}
                `,
                [...parts.values, String(pageSize), String(offset)]
              ),
              pool.query<AgingBucketRow>(
                `
                  ${cte}
                  select
                    case
                      when fecha_referencia < current_date - interval '60 day' then '${RECEIVABLE_BUCKET_LABELS.overdueCritical}'
                      when fecha_referencia < current_date - interval '30 day' then '${RECEIVABLE_BUCKET_LABELS.overdueMedium}'
                      else '${RECEIVABLE_BUCKET_LABELS.current}'
                    end as bucket,
                    count(*)::int as cantidad,
                    coalesce(sum(saldo_pendiente), 0) as total
                  from filtered_obligations
                  where saldo_pendiente > 0
                  group by 1
                  order by min(fecha_referencia) asc
                `,
                parts.values
              ),
              pool.query<CounterpartyAggregateRow>(
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
              ),
            ]);

            const summary = summaryRes.rows[0];
            const bucketRows = bucketsRes.rows.map((row) => ({
              bucket: row.bucket,
              cantidad: Number(row.cantidad || 0),
              total: toNumber(row.total),
            }));

            return {
              generatedAt: new Date().toISOString(),
              filters: { from, to, page, pageSize },
              summary: {
                registros: Number(summary?.registros || 0),
                totalEsperado: toNumber(summary?.total_esperado),
                totalCobrado: toNumber(summary?.total_cobrado),
                totalPendiente: toNumber(summary?.total_pendiente),
              },
              buckets: bucketRows,
              topDeudores: topDeudoresRes.rows.map((row) => ({
                nombre: row.nombre || "Sin alumno asociado",
                cantidad: Number(row.cantidad || 0),
                total: toNumber(row.total),
              })),
              monthly: monthlyRes.rows.map((row) => ({
                periodo: normalizePeriod(row.periodo),
                registros: Number(row.registros || 0),
                valorEsperado: toNumber(row.valor_esperado),
                valorCobrado: toNumber(row.valor_cobrado),
                saldoPendiente: toNumber(row.saldo_pendiente),
              })),
              oldestPending: oldestRes.rows.map((row) => ({
                nombre: row.nombre || "Sin alumno asociado",
                documento: row.documento,
                referencia: row.referencia,
                tipoRegistro: row.tipo_registro,
                saldoPendiente: toNumber(row.saldo_pendiente),
                fechaRegistro: normalizeDateOnly(row.fecha_registro),
                fechaReferencia: normalizeDateOnly(row.fecha_referencia),
                diasPendiente: Number(row.dias_pendiente || 0),
              })),
              pendingCount: Number(pendingCountRes.rows[0]?.total || 0),
              pendingRows: pendingRowsRes.rows.map((row) => ({
                obligationId: row.obligation_id,
                alumnoId: row.alumno_id,
                nombre: row.nombre || "Sin alumno asociado",
                documento: row.documento,
                referencia: row.referencia,
                tipoRegistro: row.tipo_registro,
                fechaRegistro: normalizeDateOnly(row.fecha_registro),
                fechaReferencia: normalizeDateOnly(row.fecha_referencia),
                valorEsperado: toNumber(row.valor_esperado),
                valorCobrado: toNumber(row.valor_cobrado),
                saldoPendiente: toNumber(row.saldo_pendiente),
                diasPendiente: Number(row.dias_pendiente || 0),
              })),
            };
          },
        }),
      "Dashboard cartera"
    );

    return timing.apply(
      NextResponse.json(payload, {
        headers: {
          "Cache-Control": `private, max-age=${Math.floor(CACHE_TTL_MS / 1000)}, stale-while-revalidate=60`,
        },
      })
    );
  } catch (error) {
    console.error("[API CARTERA] Error:", error);
    return timing.apply(
      NextResponse.json({ error: "No se pudo cargar el dashboard de cartera." }, { status: 500 })
    );
  }
}
