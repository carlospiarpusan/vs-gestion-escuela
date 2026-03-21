import { NextResponse } from "next/server";
import { authorizeApiRequest, resolveEscuelaIdForRequest } from "@/lib/api-auth";
import { buildDashboardListServerCacheKey, isFreshDashboardDataRequested } from "@/lib/dashboard-server-cache";
import { getServerReadCached } from "@/lib/server-read-cache";
import { buildDashboardListCacheTags } from "@/lib/server-cache-tags";
import { getServerDbPool } from "@/lib/server-db";
import type { EstadoVehiculo, Rol, TipoVehiculo } from "@/types/database";

const ALLOWED_ROLES: Rol[] = [
  "super_admin",
  "admin_escuela",
  "admin_sede",
  "administrativo",
  "instructor",
];

type VehiculoCatalogRow = {
  id: string;
  escuela_id: string;
  sede_id: string;
  user_id: string;
  marca: string;
  modelo: string;
  matricula: string;
  tipo: TipoVehiculo;
  anio: number | null;
  fecha_itv: string | null;
  seguro_vencimiento: string | null;
  estado: EstadoVehiculo;
  kilometraje: number | string | null;
  notas: string | null;
  created_at: string;
};

type InstructorCatalogRow = {
  id: string;
  nombre: string;
  apellidos: string;
};

const CACHE_TTL_MS = 60 * 1000;

export async function GET(request: Request) {
  const auth = await authorizeApiRequest(ALLOWED_ROLES);
  if (!auth.ok) return auth.response;

  const { perfil } = auth;
  const url = new URL(request.url);
  const escuelaId = resolveEscuelaIdForRequest(request, perfil, url.searchParams.get("escuela_id"));

  if (!escuelaId) {
    return NextResponse.json({
      vehiculos: [],
      instructores: [],
      currentInstructorId: null,
    });
  }

  const scope = {
    escuelaId,
    sedeId: perfil.sede_id,
  };

  const pool = getServerDbPool();
  const payload = await getServerReadCached({
    key: buildDashboardListServerCacheKey("vehiculos-catalogos", perfil.id, scope, url.searchParams),
    ttlMs: CACHE_TTL_MS,
    tags: buildDashboardListCacheTags("vehiculos-catalogos", scope),
    bypass: isFreshDashboardDataRequested(url.searchParams),
    loader: async () => {
      const [vehiculosRes, instructoresRes, currentInstructorRes] = await Promise.all([
        pool.query<VehiculoCatalogRow>(
          `
            select
              id,
              escuela_id,
              sede_id,
              user_id,
              marca,
              modelo,
              matricula,
              tipo,
              anio,
              fecha_itv,
              seguro_vencimiento,
              estado,
              kilometraje,
              notas,
              created_at
            from public.vehiculos
            where escuela_id = $1
            order by created_at desc
          `,
          [escuelaId]
        ),
        pool.query<InstructorCatalogRow>(
          `
            select id, nombre, apellidos
            from public.instructores
            where escuela_id = $1
            order by nombre asc, apellidos asc
          `,
          [escuelaId]
        ),
        perfil.rol === "instructor"
          ? pool.query<{ id: string }>(
              `
                select id
                from public.instructores
                where user_id = $1
                limit 1
              `,
              [perfil.id]
            )
          : Promise.resolve({ rows: [] as Array<{ id: string }> }),
      ]);

      return {
        vehiculos: vehiculosRes.rows.map((row) => ({
          ...row,
          kilometraje: Number(row.kilometraje || 0),
        })),
        instructores: instructoresRes.rows,
        currentInstructorId: currentInstructorRes.rows[0]?.id ?? null,
      };
    },
  });

  return NextResponse.json(payload, {
    headers: {
      "Cache-Control": `private, max-age=${Math.floor(CACHE_TTL_MS / 1000)}, stale-while-revalidate=120`,
    },
  });
}
