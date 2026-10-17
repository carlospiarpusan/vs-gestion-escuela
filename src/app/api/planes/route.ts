import { NextResponse } from "next/server";
import { authorizeApiRequest, parseJsonBody } from "@/lib/api-auth";
import { getServerDbPool } from "@/lib/server-db";
import { getServerReadCached, revalidateServerReadCache } from "@/lib/server-read-cache";
import { buildDashboardCacheTags, buildDashboardListCacheTags } from "@/lib/server-cache-tags";
import { z } from "zod";
import type { PlanConfig } from "@/types/database";

const updatePlanSchema = z
  .object({
    id: z.enum(["gratuito", "basico", "profesional", "enterprise"]),
    nombre: z.string().trim().min(2).max(100).optional(),
    descripcion: z.string().trim().max(5000).nullable().optional(),
    precio_mensual: z.number().min(0).max(99_999_999).optional(),
    precio_anual: z.number().min(0).max(999_999_999).optional(),
    max_alumnos_default: z.number().int().min(1).max(100_000).optional(),
    max_sedes_default: z.number().int().min(1).max(1000).optional(),
    caracteristicas: z.array(z.string().trim().min(1).max(500)).max(100).optional(),
    activo: z.boolean().optional(),
  })
  .strict();

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
          precio_anual: Number(r.precio_anual),
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
    const parsed = await parseJsonBody(request, updatePlanSchema);
    if (!parsed.ok) return parsed.response;
    const body = parsed.data;
    const planId = body.id;

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

    if (body.precio_anual !== undefined) {
      const precio = Number(body.precio_anual);
      if (!Number.isFinite(precio) || precio < 0 || precio > 999_999_999) {
        return NextResponse.json(
          { error: "El precio anual debe ser un número válido entre 0 y 999.999.999." },
          { status: 400 }
        );
      }
      updates.push(`precio_anual = $${paramIdx++}`);
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
    revalidateServerReadCache([
      ...PLANES_CACHE_TAGS,
      ...buildDashboardCacheTags("superadmin"),
      ...buildDashboardListCacheTags("subscriptions"),
    ]);

    const updated = result.rows[0];
    return NextResponse.json({
      success: true,
      plan: {
        ...updated,
        precio_mensual: Number(updated.precio_mensual),
        precio_anual: Number(updated.precio_anual),
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
