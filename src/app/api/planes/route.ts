import { NextResponse } from "next/server";
import { authorizeApiRequest } from "@/lib/api-auth";
import { getServerDbPool } from "@/lib/server-db";
import { getServerReadCached, revalidateServerReadCache } from "@/lib/server-read-cache";
import type { PlanConfig, PlanEscuela } from "@/types/database";

const VALID_PLAN_IDS: PlanEscuela[] = ["gratuito", "basico", "profesional", "enterprise"];

const PLANES_CACHE_KEY = "platform:planes-config";
const PLANES_CACHE_TAGS = ["planes-config"];
const PLANES_CACHE_TTL = 5 * 60 * 1000; // 5 min

/* ------------------------------------------------------------------ */
/*  GET  /api/planes — devuelve la configuración de todos los planes   */
/* ------------------------------------------------------------------ */
export async function GET() {
  const authz = await authorizeApiRequest(["super_admin"]);
  if (!authz.ok) return authz.response;

  try {
    const pool = getServerDbPool();
    const planes = await getServerReadCached<PlanConfig[]>({
      key: PLANES_CACHE_KEY,
      ttlMs: PLANES_CACHE_TTL,
      tags: PLANES_CACHE_TAGS,
      loader: async () => {
        const result = await pool.query<PlanConfig>(
          `select * from public.planes_config order by
            case id
              when 'gratuito' then 0
              when 'basico' then 1
              when 'profesional' then 2
              when 'enterprise' then 3
            end`
        );
        return result.rows.map((r) => ({
          ...r,
          precio_mensual: Number(r.precio_mensual),
          caracteristicas:
            typeof r.caracteristicas === "string"
              ? JSON.parse(r.caracteristicas)
              : (r.caracteristicas ?? []),
        }));
      },
    });

    return NextResponse.json({ planes });
  } catch (error) {
    console.error("Error al cargar planes:", error);
    return NextResponse.json({ error: "No se pudieron cargar los planes." }, { status: 500 });
  }
}

/* ------------------------------------------------------------------ */
/*  PATCH  /api/planes — actualiza un plan específico                  */
/* ------------------------------------------------------------------ */
export async function PATCH(request: Request) {
  const authz = await authorizeApiRequest(["super_admin"]);
  if (!authz.ok) return authz.response;

  try {
    const body = await request.json();
    const planId = body.id as string;

    if (!planId || !VALID_PLAN_IDS.includes(planId as PlanEscuela)) {
      return NextResponse.json({ error: "ID de plan inválido." }, { status: 400 });
    }

    // Build dynamic SET clause
    const updates: string[] = [];
    const values: (string | number | boolean | string[])[] = [];
    let paramIdx = 1;

    if (body.nombre !== undefined) {
      const nombre = String(body.nombre).trim();
      if (nombre.length < 2 || nombre.length > 100) {
        return NextResponse.json(
          { error: "El nombre debe tener entre 2 y 100 caracteres." },
          { status: 400 }
        );
      }
      updates.push(`nombre = $${paramIdx++}`);
      values.push(nombre);
    }

    if (body.descripcion !== undefined) {
      updates.push(`descripcion = $${paramIdx++}`);
      values.push(body.descripcion ? String(body.descripcion).trim() : "");
    }

    if (body.precio_mensual !== undefined) {
      const precio = Number(body.precio_mensual);
      if (!Number.isFinite(precio) || precio < 0 || precio > 99_999_999) {
        return NextResponse.json(
          { error: "El precio debe ser un número válido entre 0 y 99.999.999." },
          { status: 400 }
        );
      }
      updates.push(`precio_mensual = $${paramIdx++}`);
      values.push(precio);
    }

    if (body.max_alumnos_default !== undefined) {
      const max = Math.round(Number(body.max_alumnos_default));
      if (!Number.isFinite(max) || max < 1 || max > 100_000) {
        return NextResponse.json(
          { error: "Máx. alumnos debe ser entre 1 y 100.000." },
          { status: 400 }
        );
      }
      updates.push(`max_alumnos_default = $${paramIdx++}`);
      values.push(max);
    }

    if (body.max_sedes_default !== undefined) {
      const max = Math.round(Number(body.max_sedes_default));
      if (!Number.isFinite(max) || max < 1 || max > 1000) {
        return NextResponse.json(
          { error: "Máx. sedes debe ser entre 1 y 1.000." },
          { status: 400 }
        );
      }
      updates.push(`max_sedes_default = $${paramIdx++}`);
      values.push(max);
    }

    if (body.caracteristicas !== undefined) {
      if (!Array.isArray(body.caracteristicas)) {
        return NextResponse.json(
          { error: "Las características deben ser un arreglo." },
          { status: 400 }
        );
      }
      updates.push(`caracteristicas = $${paramIdx++}::jsonb`);
      values.push(JSON.stringify(body.caracteristicas));
    }

    if (body.activo !== undefined) {
      updates.push(`activo = $${paramIdx++}`);
      values.push(Boolean(body.activo));
    }

    if (updates.length === 0) {
      return NextResponse.json(
        { error: "No se proporcionaron campos para actualizar." },
        { status: 400 }
      );
    }

    // Add updated_by
    updates.push(`updated_by = $${paramIdx++}`);
    values.push(authz.perfil.id);

    // Add plan ID as last param
    values.push(planId);

    const pool = getServerDbPool();
    const result = await pool.query(
      `update public.planes_config
       set ${updates.join(", ")}
       where id = $${paramIdx}
       returning *`,
      values
    );

    if (result.rowCount === 0) {
      return NextResponse.json({ error: "Plan no encontrado." }, { status: 404 });
    }

    // Invalidate cache
    revalidateServerReadCache(PLANES_CACHE_TAGS);

    const updated = result.rows[0];
    return NextResponse.json({
      success: true,
      plan: {
        ...updated,
        precio_mensual: Number(updated.precio_mensual),
        caracteristicas:
          typeof updated.caracteristicas === "string"
            ? JSON.parse(updated.caracteristicas)
            : (updated.caracteristicas ?? []),
      },
    });
  } catch (error) {
    console.error("Error al actualizar plan:", error);
    return NextResponse.json({ error: "No se pudo actualizar el plan." }, { status: 500 });
  }
}
