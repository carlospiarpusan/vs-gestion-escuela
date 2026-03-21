import { NextResponse } from "next/server";
import { authorizeApiRequest } from "@/lib/api-auth";
import { getServerDbPool } from "@/lib/server-db";
import { getServerReadCached } from "@/lib/server-read-cache";
import { createServerTiming } from "@/lib/server-timing";
import { normalizeUuid } from "@/lib/dashboard-scope";
import { parseInteger } from "@/app/api/reportes/contables/query-builder";
import type { AllowedPerfil } from "@/app/api/reportes/contables/types";
import {
  ALLOWED_FINANCE_ROLES,
  buildFinanceScope,
  buildFinanceServerCacheKey,
  isFreshDataRequested,
} from "@/lib/finance/server/request";
import { buildFinanceCacheTags } from "@/lib/server-cache-tags";
import { normalizeDateOnly, toNumber } from "@/lib/finance/server/normalizers";

type DailyCashSqlRow = {
  fecha: string;
  movimientos: number | string | null;
  total_efectivo: number | string | null;
  total_datafono: number | string | null;
  total_nequi: number | string | null;
  total_sistecredito: number | string | null;
  total_otro: number | string | null;
  total_registrado: number | string | null;
};

const CACHE_TTL_MS = 45 * 1000;

function buildDateRange(year: number, month: string) {
  if (!month) {
    return {
      from: `${year}-01-01`,
      to: `${year + 1}-01-01`,
    };
  }

  const nextMonth = Number(month) === 12 ? "01" : String(Number(month) + 1).padStart(2, "0");
  const nextYear = Number(month) === 12 ? year + 1 : year;

  return {
    from: `${year}-${month}-01`,
    to: `${nextYear}-${nextMonth}-01`,
  };
}

export async function GET(request: Request) {
  const timing = createServerTiming();
  const authz = await timing.measure(
    "authz",
    () => authorizeApiRequest(ALLOWED_FINANCE_ROLES),
    "Autorizacion caja diaria"
  );
  if (!authz.ok) return authz.response;

  const perfil = authz.perfil as AllowedPerfil;
  const url = new URL(request.url);
  const scope = buildFinanceScope(request, perfil, url);
  const year = parseInteger(url.searchParams.get("year"), new Date().getFullYear(), 2023, 2100);
  const month = (url.searchParams.get("month") || "").trim();
  const alumnoId = normalizeUuid(url.searchParams.get("alumno_id"));
  const categoria = (url.searchParams.get("categoria") || "").trim() || null;
  const metodo = (url.searchParams.get("metodo") || "").trim() || null;
  const estado = (url.searchParams.get("estado") || "").trim() || null;
  const { from, to } = buildDateRange(year, month);
  const cacheBypass = isFreshDataRequested(url.searchParams);

  if (!scope.escuelaId) {
    return timing.apply(
      NextResponse.json({ error: "Selecciona una escuela activa para ver la caja diaria." }, { status: 400 })
    );
  }

  try {
    const payload = await timing.measure(
      "cash_json",
      () =>
        getServerReadCached({
          key: buildFinanceServerCacheKey("cash", perfil.id, scope, url.searchParams),
          ttlMs: CACHE_TTL_MS,
          tags: buildFinanceCacheTags("cash", scope),
          bypass: cacheBypass,
          loader: async () => {
            const pool = getServerDbPool();
            const values: string[] = [];
            const where: string[] = [];
            const addValue = (value: string) => {
              values.push(value);
              return `$${values.length}`;
            };

            if (scope.escuelaId) {
              where.push(`i.escuela_id = ${addValue(scope.escuelaId)}`);
            }
            if (scope.sedeId) {
              where.push(`i.sede_id = ${addValue(scope.sedeId)}`);
            }
            where.push(`i.fecha >= ${addValue(from)}`);
            where.push(`i.fecha < ${addValue(to)}`);

            if (alumnoId) where.push(`i.alumno_id = ${addValue(alumnoId)}`);
            if (categoria) where.push(`i.categoria = ${addValue(categoria)}`);
            if (metodo) where.push(`i.metodo_pago = ${addValue(metodo)}`);
            if (estado) where.push(`i.estado = ${addValue(estado)}`);

            const cte = `
              with filtered_ingresos as (
                select
                  i.fecha,
                  i.monto::numeric as monto,
                  i.estado,
                  i.metodo_pago
                from ingresos i
                where ${where.join(" AND ")}
              )
            `;

            const rowsRes = await pool.query<DailyCashSqlRow>(
              `
                ${cte}
                select
                  fecha,
                  count(*)::int as movimientos,
                  coalesce(sum(case when metodo_pago = 'efectivo' then monto else 0 end), 0) as total_efectivo,
                  coalesce(sum(case when metodo_pago = 'datafono' then monto else 0 end), 0) as total_datafono,
                  coalesce(sum(case when metodo_pago = 'nequi' then monto else 0 end), 0) as total_nequi,
                  coalesce(sum(case when metodo_pago = 'sistecredito' then monto else 0 end), 0) as total_sistecredito,
                  coalesce(sum(case when metodo_pago not in ('efectivo', 'datafono', 'nequi', 'sistecredito') then monto else 0 end), 0) as total_otro,
                  coalesce(sum(monto), 0) as total_registrado
                from filtered_ingresos
                where estado = 'cobrado'
                group by fecha
                order by fecha desc
              `,
              values
            );

            const rows = rowsRes.rows.map((row) => ({
              id: normalizeDateOnly(row.fecha),
              fecha: normalizeDateOnly(row.fecha),
              movimientos: Number(row.movimientos || 0),
              total_efectivo: toNumber(row.total_efectivo),
              total_datafono: toNumber(row.total_datafono),
              total_nequi: toNumber(row.total_nequi),
              total_sistecredito: toNumber(row.total_sistecredito),
              total_otro: toNumber(row.total_otro),
              total_registrado: toNumber(row.total_registrado),
            }));

            const totalEfectivo = rows.reduce((sum, row) => sum + row.total_efectivo, 0);
            const totalDatafono = rows.reduce((sum, row) => sum + row.total_datafono, 0);
            const totalNequi = rows.reduce((sum, row) => sum + row.total_nequi, 0);
            const totalSistecredito = rows.reduce((sum, row) => sum + row.total_sistecredito, 0);
            const totalOtro = rows.reduce((sum, row) => sum + row.total_otro, 0);
            const totalRegistrado = rows.reduce((sum, row) => sum + row.total_registrado, 0);
            const mejorDia = rows.reduce<typeof rows[number] | null>(
              (best, row) =>
                !best || row.total_registrado > best.total_registrado ? row : best,
              null
            );

            return {
              generatedAt: new Date().toISOString(),
              filters: {
                year,
                month,
                alumnoId,
                categoria,
                metodo,
                estado,
              },
              stats: {
                totalEfectivo,
                totalDatafono,
                totalNequi,
                totalSistecredito,
                totalOtro,
                totalRegistrado,
                diasConMovimientos: rows.length,
                promedioPorDia: rows.length > 0 ? totalRegistrado / rows.length : 0,
                mejorDiaFecha: mejorDia?.fecha ?? null,
                mejorDiaMonto: mejorDia?.total_registrado ?? 0,
              },
              rows,
            };
          },
        }),
      "Dashboard caja diaria"
    );

    return timing.apply(
      NextResponse.json(payload, {
        headers: {
          "Cache-Control": `private, max-age=${Math.floor(CACHE_TTL_MS / 1000)}, stale-while-revalidate=60`,
        },
      })
    );
  } catch (error) {
    console.error("[API CAJA DIARIA] Error:", error);
    return timing.apply(
      NextResponse.json({ error: "No se pudo cargar la caja diaria." }, { status: 500 })
    );
  }
}
