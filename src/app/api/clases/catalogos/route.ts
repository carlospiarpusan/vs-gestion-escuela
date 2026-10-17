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
import type { Rol } from "@/types/database";

const ALLOWED_ROLES: Rol[] = ["super_admin", "admin_escuela", "admin_sede", "administrativo"];
const CACHE_TTL_MS = 300 * 1000;

type AlumnoCatalogRow = {
  id: string;
  nombre: string;
  apellidos: string;
};

type InstructorCatalogRow = {
  id: string;
  nombre: string;
  apellidos: string;
};

type VehiculoCatalogRow = {
  id: string;
  marca: string;
  modelo: string;
  matricula: string;
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
      alumnos: [],
      instructores: [],
      vehiculos: [],
    });
  }

  const scope = {
    escuelaId,
    sedeId,
  };

  const pool = getServerDbPool();
  const payload = await getServerReadCached({
    key: buildDashboardListServerCacheKey("clases-catalogos", perfil.rol, scope, url.searchParams),
    ttlMs: CACHE_TTL_MS,
    tags: buildDashboardListCacheTags("clases-catalogos", scope),
    bypass: isFreshDashboardDataRequested(url.searchParams),
    loader: async () => {
      const [alumnosRes, instructoresRes, vehiculosRes] = await Promise.all([
        pool.query<AlumnoCatalogRow>(
          `
            select id, nombre, apellidos
            from public.alumnos
            where escuela_id = $1
              ${sedeId ? "and sede_id = $2" : ""}
              and estado = 'activo'
            order by nombre asc, apellidos asc
          `,
          sedeId ? [escuelaId, sedeId] : [escuelaId]
        ),
        pool.query<InstructorCatalogRow>(
          `
            select id, nombre, apellidos
            from public.instructores
            where escuela_id = $1
              ${sedeId ? "and sede_id = $2" : ""}
              and estado = 'activo'
            order by nombre asc, apellidos asc
          `,
          sedeId ? [escuelaId, sedeId] : [escuelaId]
        ),
        pool.query<VehiculoCatalogRow>(
          `
            select id, marca, modelo, matricula
            from public.vehiculos
            where escuela_id = $1
              ${sedeId ? "and sede_id = $2" : ""}
              and estado <> 'baja'
            order by created_at desc
          `,
          sedeId ? [escuelaId, sedeId] : [escuelaId]
        ),
      ]);

      return {
        alumnos: alumnosRes.rows,
        instructores: instructoresRes.rows,
        vehiculos: vehiculosRes.rows,
      };
    },
  });

  return NextResponse.json(payload, {
    headers: {
      "Cache-Control": `private, max-age=${Math.floor(CACHE_TTL_MS / 1000)}, stale-while-revalidate=120`,
    },
  });
}
