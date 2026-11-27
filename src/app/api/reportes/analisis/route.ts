import { NextResponse } from "next/server";
import { z } from "zod";
import { authorizeApiRequest, getStaffReadSedeScope } from "@/lib/api-auth";
import { getServerDbPool } from "@/lib/server-db";
import { getServerReadCached } from "@/lib/server-read-cache";
import { buildFinanceCacheTags } from "@/lib/server-cache-tags";
import { createServerTiming } from "@/lib/server-timing";
import { ALLOWED_FINANCE_ROLES, buildFinanceScope } from "@/lib/finance/server/request";
import {
  buildAnalysisWindow,
  createSchoolAnalysis,
  type AnalysisPayload,
} from "@/lib/analytics/school-analysis";
import { buildSchoolAnalysisQuery } from "@/lib/analytics/school-analysis-query";
import { getTodayDateString } from "@/lib/date-utils";

const schema = z
  .object({
    year: z.coerce.number().int().min(2000).max(2100),
    month: z.union([z.literal("all"), z.string().regex(/^(0?[1-9]|1[0-2])$/)]),
    escuela_id: z.uuid().optional(),
    sede_id: z.uuid().optional(),
    fresh: z.enum(["0", "1"]).optional(),
  })
  .strict();
const headers = { "Cache-Control": "private, no-store" };

export async function GET(request: Request) {
  const timing = createServerTiming();
  const auth = await timing.measure("auth", () => authorizeApiRequest(ALLOWED_FINANCE_ROLES));
  if (!auth.ok) return auth.response;
  const reply = (body: unknown, status = 200) =>
    timing.apply(NextResponse.json(body, { status, headers }));
  const branch = getStaffReadSedeScope(auth.perfil);
  if (branch.error) return reply({ error: branch.error }, 403);
  const url = new URL(request.url);
  const entries = [...url.searchParams.entries()];
  if (new Set(entries.map(([key]) => key)).size !== entries.length)
    return reply({ error: "No repitas los filtros del análisis." }, 400);
  const today = getTodayDateString();
  const parsed = schema.safeParse({
    year: today.slice(0, 4),
    month: today.slice(5, 7),
    ...Object.fromEntries(entries),
  });
  if (!parsed.success) return reply({ error: "Revisa los filtros del análisis." }, 400);
  const scope = buildFinanceScope(request, auth.perfil, url);
  if (auth.perfil.rol !== "super_admin") {
    if (!scope.escuelaId || !z.uuid().safeParse(scope.escuelaId).success)
      return reply({ error: "Selecciona una escuela para consultar su análisis." }, 400);
  } else if (scope.escuelaId && !z.uuid().safeParse(scope.escuelaId).success) {
    return reply({ error: "La escuela seleccionada no es válida." }, 400);
  }
  if (scope.sedeId && !z.uuid().safeParse(scope.sedeId).success)
    return reply({ error: "La sede asignada no es válida." }, 403);
  let window;
  try {
    window = buildAnalysisWindow(
      parsed.data.year,
      parsed.data.month === "all" ? null : Number(parsed.data.month)
    );
  } catch (error) {
    return reply({ error: error instanceof Error ? error.message : "Período inválido." }, 400);
  }
  try {
    const data = await timing.measure("analysis", () =>
      getServerReadCached({
        key: [
          "school-analysis-v2",
          auth.perfil.id,
          auth.perfil.rol,
          scope.escuelaId ?? "consolidated",
          scope.sedeId ?? "all",
          window.current.from,
          window.current.to,
          window.previous.from,
          window.previous.to,
          window.today,
        ],
        tags: buildFinanceCacheTags("reports", scope),
        ttlMs: 300_000,
        bypass: parsed.data.fresh === "1",
        loader: async () => {
          const query = buildSchoolAnalysisQuery(
            scope.escuelaId,
            scope.sedeId,
            window,
            branch.sedeId
          );
          const result = await getServerDbPool().query<{ payload: AnalysisPayload }>(
            query.text,
            query.values
          );
          const payload = result.rows[0]?.payload;
          if (!payload) throw new Error("Analysis payload missing");
          if (scope.sedeId && !payload.branches.some((s) => s.id === scope.sedeId)) return null;
          if (auth.perfil.rol === "super_admin") {
            try {
              const schoolsRes = await getServerDbPool().query<{ id: string; name: string }>(
                "select id, nombre as name from public.escuelas order by nombre"
              );
              payload.schools = schoolsRes.rows;
            } catch {
              payload.schools = [];
            }
          }
          return createSchoolAnalysis(payload, window, {
            schoolId: scope.escuelaId,
            branchId: scope.sedeId,
          });
        },
      })
    );
    if (!data) return reply({ error: "La sede no pertenece a la escuela seleccionada." }, 403);
    return reply(data);
  } catch {
    // Do not expose database errors or identifying source records in analytics logs.
    console.error("school_analysis_failed");
    return reply({ error: "No se pudo cargar el análisis. Vuelve a intentarlo." }, 500);
  }
}
