import { NextResponse } from "next/server";
import { authorizeApiRequest, resolveEscuelaIdForRequest } from "@/lib/api-auth";
import { buildDashboardListServerCacheKey, isFreshDashboardDataRequested } from "@/lib/dashboard-server-cache";
import { getServerReadCached } from "@/lib/server-read-cache";
import { buildDashboardListCacheTags } from "@/lib/server-cache-tags";
import { getServerDbPool } from "@/lib/server-db";
import type { Rol } from "@/types/database";

const ALLOWED_ROLES: Rol[] = ["super_admin", "admin_escuela", "admin_sede", "administrativo"];
const CACHE_TTL_MS = 60 * 1000;

type EscuelaCategoriesRow = {
  categorias: string[] | null;
};

type SedeRow = {
  id: string;
};

type TramitadorRow = {
  nombre: string | null;
};

export async function GET(request: Request) {
  const auth = await authorizeApiRequest(ALLOWED_ROLES);
  if (!auth.ok) return auth.response;

  const { perfil } = auth;
  const url = new URL(request.url);
  const escuelaId = resolveEscuelaIdForRequest(request, perfil, url.searchParams.get("escuela_id"));

  if (!escuelaId) {
    return NextResponse.json({
      categoriasEscuela: [],
      tramitadorOptions: [],
      defaultSedeId: null,
    });
  }

  const scope = {
    escuelaId,
    sedeId: perfil.sede_id,
  };
  const pool = getServerDbPool();

  const payload = await getServerReadCached({
    key: buildDashboardListServerCacheKey("alumnos-catalogos", perfil.id, scope, url.searchParams),
    ttlMs: CACHE_TTL_MS,
    tags: buildDashboardListCacheTags("alumnos-catalogos", scope),
    bypass: isFreshDashboardDataRequested(url.searchParams),
    loader: async () => {
      const [escuelaRes, sedeRes, tramitadoresRes] = await Promise.all([
        pool.query<EscuelaCategoriesRow>(
          `
            select categorias
            from public.escuelas
            where id = $1
            limit 1
          `,
          [escuelaId]
        ),
        perfil.sede_id
          ? Promise.resolve({ rows: [{ id: perfil.sede_id }] as SedeRow[] })
          : pool.query<SedeRow>(
              `
                select id
                from public.sedes
                where escuela_id = $1
                order by es_principal desc, created_at asc
                limit 1
              `,
              [escuelaId]
            ),
        pool.query<TramitadorRow>(
          `
            select distinct nullif(trim(proveedor), '') as nombre
            from public.gastos
            where escuela_id = $1
              and categoria = 'tramitador'
              and nullif(trim(proveedor), '') is not null
            order by nombre asc
          `,
          [escuelaId]
        ),
      ]);

      return {
        categoriasEscuela: escuelaRes.rows[0]?.categorias || [],
        tramitadorOptions: tramitadoresRes.rows
          .map((row) => row.nombre || "")
          .filter(Boolean),
        defaultSedeId: sedeRes.rows[0]?.id ?? null,
      };
    },
  });

  return NextResponse.json(payload, {
    headers: {
      "Cache-Control": `private, max-age=${Math.floor(CACHE_TTL_MS / 1000)}, stale-while-revalidate=120`,
    },
  });
}
