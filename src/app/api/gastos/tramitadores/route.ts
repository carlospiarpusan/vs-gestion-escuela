import { NextResponse } from "next/server";
import { authorizeApiRequest } from "@/lib/api-auth";
import { getServerDbPool } from "@/lib/server-db";
import { getServerReadCached } from "@/lib/server-read-cache";
import { buildFinanceCacheTags } from "@/lib/server-cache-tags";
import type { Rol } from "@/types/database";

const ALLOWED_ROLES: Rol[] = [
  "super_admin",
  "admin_escuela",
  "admin_sede",
  "administrativo",
  "recepcion",
];

const CACHE_TTL_MS = 60 * 1000;

type TramitadorRow = {
  proveedor: string | null;
};

export async function GET() {
  const authz = await authorizeApiRequest(ALLOWED_ROLES);
  if (!authz.ok) return authz.response;

  const escuelaId = authz.perfil.escuela_id;
  const sedeId =
    authz.perfil.rol === "admin_sede" || authz.perfil.rol === "recepcion"
      ? authz.perfil.sede_id
      : null;

  if (!escuelaId) {
    return NextResponse.json({ options: [] });
  }

  try {
    const payload = await getServerReadCached({
      key: `expense-tramitadores:${authz.perfil.rol}:${escuelaId}:${sedeId || "all"}`,
      ttlMs: CACHE_TTL_MS,
      tags: buildFinanceCacheTags("expense", { escuelaId, sedeId }),
      loader: async () => {
        const pool = getServerDbPool();
        const values: string[] = [escuelaId];
        const where = [
          "g.escuela_id = $1",
          "g.categoria = 'tramitador'",
          "g.proveedor is not null",
        ];

        if (sedeId) {
          values.push(sedeId);
          where.push(`g.sede_id = $${values.length}`);
        }

        // Catálogo único de tramitadores más los proveedores históricos que
        // aún no estén en el catálogo (sin variantes de mayúsculas).
        const result = await pool.query<TramitadorRow>(
          `
            select nombre as proveedor from public.tramitadores
            where escuela_id = $1 and activo
            union
            select distinct trim(g.proveedor) from public.gastos g
            where ${where.join(" and ")}
              and not exists (
                select 1 from public.tramitadores t
                where t.escuela_id = g.escuela_id
                  and t.nombre_normalizado = public.normalize_tramitador_nombre(g.proveedor)
              )
            order by 1 asc
            limit 200
          `,
          values
        );

        return {
          options: result.rows
            .map((row) => row.proveedor?.trim())
            .filter((value): value is string => Boolean(value)),
        };
      },
    });

    return NextResponse.json(payload, {
      headers: {
        "Cache-Control": "private, max-age=60, stale-while-revalidate=120",
      },
    });
  } catch (error) {
    console.error("[API GASTOS/TRAMITADORES] Error:", error);
    return NextResponse.json({ error: "No se pudieron cargar los tramitadores." }, { status: 500 });
  }
}
