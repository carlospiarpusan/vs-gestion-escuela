import { listTramitadores } from "@/lib/tramitadores-server";
import { toTramitadorOptions } from "@/lib/tramitadores";
import { NextResponse } from "next/server";
import {
  authorizeApiRequest,
  getStaffReadSedeScope,
  resolveEscuelaIdForRequest,
} from "@/lib/api-auth";
import {
  buildDashboardListServerCacheKey,
  isFreshDashboardDataRequested,
} from "@/lib/dashboard-server-cache";
import { getServerReadCached } from "@/lib/server-read-cache";
import { buildDashboardListCacheTags } from "@/lib/server-cache-tags";
import { getServerDbPool } from "@/lib/server-db";
import { normalizeStoredCourseCategories } from "@/lib/course-categories";
import type { Rol } from "@/types/database";

const ALLOWED_ROLES: Rol[] = [
  "super_admin",
  "admin_escuela",
  "admin_sede",
  "administrativo",
  "recepcion",
];
const CACHE_TTL_MS = 300 * 1000;

type EscuelaCategoriesRow = {
  categorias: string[] | null;
};

type SedeRow = {
  id: string;
};

export async function GET(request: Request) {
  const auth = await authorizeApiRequest(ALLOWED_ROLES);
  if (!auth.ok) return auth.response;

  const { perfil } = auth;
  const url = new URL(request.url);
  const escuelaId = resolveEscuelaIdForRequest(request, perfil, url.searchParams.get("escuela_id"));
  const { sedeId, error: scopeError } = getStaffReadSedeScope(perfil);
  if (scopeError) return NextResponse.json({ error: scopeError }, { status: 403 });

  if (!escuelaId) {
    return NextResponse.json({
      categoriasEscuela: [],
      tramitadorOptions: [],
      defaultSedeId: null,
    });
  }

  const scope = {
    escuelaId,
    sedeId,
  };
  const pool = getServerDbPool();

  const payload = await getServerReadCached({
    key: buildDashboardListServerCacheKey("alumnos-catalogos", perfil.rol, scope, url.searchParams),
    ttlMs: CACHE_TTL_MS,
    tags: buildDashboardListCacheTags("alumnos-catalogos", scope),
    bypass: isFreshDashboardDataRequested(url.searchParams),
    loader: async () => {
      const [escuelaRes, sedeRes] = await Promise.all([
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
      ]);

      return {
        categoriasEscuela: normalizeStoredCourseCategories(escuelaRes.rows[0]?.categorias || []),
        defaultSedeId: sedeRes.rows[0]?.id ?? null,
      };
    },
  });

  // El catálogo de tramitadores se lee sin caché: un tramitador recién creado
  // debe aparecer de inmediato en el formulario de matrícula.
  const tramitadorOptions = toTramitadorOptions(await listTramitadores(escuelaId));

  return NextResponse.json(
    { ...payload, tramitadorOptions },
    {
      headers: {
        "Cache-Control": `private, max-age=${Math.floor(CACHE_TTL_MS / 1000)}, stale-while-revalidate=120`,
      },
    }
  );
}
