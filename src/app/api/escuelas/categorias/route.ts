import { NextResponse } from "next/server";
import { authorizeApiRequest, resolveEscuelaIdForRequest } from "@/lib/api-auth";
import { getServerDbPool } from "@/lib/server-db";
import { getServerReadCached } from "@/lib/server-read-cache";
import { buildScopeCacheTags } from "@/lib/server-cache-tags";
import type { Rol } from "@/types/database";

const ALLOWED_ROLES: Rol[] = [
  "super_admin",
  "admin_escuela",
  "admin_sede",
  "administrativo",
  "recepcion",
  "instructor",
];

const CACHE_TTL_MS = 60 * 1000;

type SchoolCategoriesRow = {
  categorias: string[] | null;
};

export async function GET(request: Request) {
  const authz = await authorizeApiRequest(ALLOWED_ROLES);
  if (!authz.ok) return authz.response;

  const url = new URL(request.url);
  const escuelaId = resolveEscuelaIdForRequest(
    request,
    authz.perfil,
    url.searchParams.get("escuela_id")
  );

  if (!escuelaId) {
    return NextResponse.json({ categorias: [] });
  }

  try {
    const payload = await getServerReadCached({
      key: `school-categories:${authz.perfil.id}:${authz.perfil.rol}:${escuelaId}`,
      ttlMs: CACHE_TTL_MS,
      tags: buildScopeCacheTags({ escuelaId }),
      loader: async () => {
        const pool = getServerDbPool();
        const result = await pool.query<SchoolCategoriesRow>(
          "select categorias from public.escuelas where id = $1 limit 1",
          [escuelaId]
        );

        return {
          categorias: result.rows[0]?.categorias || [],
        };
      },
    });

    return NextResponse.json(payload, {
      headers: {
        "Cache-Control": "private, max-age=60, stale-while-revalidate=120",
      },
    });
  } catch (error) {
    console.error("[API ESCUELAS/CATEGORIAS] Error:", error);
    return NextResponse.json(
      { error: "No se pudieron cargar las categorias de la escuela." },
      { status: 500 }
    );
  }
}
