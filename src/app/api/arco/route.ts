import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { getServerDbPool } from "@/lib/server-db";
import { authorizeApiRequest, parseJsonBody } from "@/lib/api-auth";
import type { Rol, SolicitudArco, EstadoSolicitudArco } from "@/types/database";

// ── POST: Enviar solicitud ARCO (público — no requiere auth) ──────────
const arcoSchema = z.object({
  tipo: z.enum(["acceso", "rectificacion", "cancelacion", "oposicion"]),
  nombre: z.string().trim().min(2, "El nombre es obligatorio").max(200),
  dni: z.string().trim().min(5, "La cedula es obligatoria").max(30),
  email: z.string().email("El email no es valido").max(200),
  telefono: z.string().trim().max(30).optional().nullable(),
  descripcion: z
    .string()
    .trim()
    .min(10, "La descripcion debe tener al menos 10 caracteres")
    .max(5000),
  escuela_nombre: z.string().trim().max(200).optional().nullable(),
});

export async function POST(request: NextRequest) {
  const parsed = await parseJsonBody(request, arcoSchema);
  if (!parsed.ok) return parsed.response;

  const { tipo, nombre, dni, email, telefono, descripcion, escuela_nombre } = parsed.data;

  const pool = getServerDbPool();

  try {
    // Try to find the school by name (optional)
    let escuelaId: string | null = null;
    if (escuela_nombre?.trim()) {
      const escuelaRes = await pool.query<{ id: string }>(
        `select id from public.escuelas where lower(nombre) = lower($1) limit 1`,
        [escuela_nombre.trim()]
      );
      escuelaId = escuelaRes.rows[0]?.id ?? null;
    }

    const insertRes = await pool.query<{ id: string; created_at: string }>(
      `
        insert into public.solicitudes_arco
          (escuela_id, tipo, nombre, dni, email, telefono, descripcion)
        values ($1, $2, $3, $4, $5, $6, $7)
        returning id, created_at
      `,
      [escuelaId, tipo, nombre, dni, email, telefono || null, descripcion]
    );

    const row = insertRes.rows[0];

    return NextResponse.json(
      {
        id: row?.id,
        mensaje:
          "Tu solicitud ha sido registrada. Segun la Ley 1581 de 2012, tienes derecho a una respuesta en un plazo maximo de 15 dias habiles.",
        created_at: row?.created_at,
      },
      { status: 201 }
    );
  } catch (error) {
    console.error("Error al crear solicitud ARCO:", error);
    return NextResponse.json(
      { error: "No se pudo registrar la solicitud. Intenta de nuevo." },
      { status: 500 }
    );
  }
}

// ── GET: Listar solicitudes ARCO (solo admin) ─────────────────────────
const ADMIN_ROLES: Rol[] = ["super_admin", "admin_escuela"];

export async function GET() {
  const authz = await authorizeApiRequest(ADMIN_ROLES);
  if (!authz.ok) return authz.response;

  const pool = getServerDbPool();
  const isSuperAdmin = authz.perfil.rol === "super_admin";

  try {
    const query = isSuperAdmin
      ? `
          select s.*, e.nombre as escuela_nombre
          from public.solicitudes_arco s
          left join public.escuelas e on e.id = s.escuela_id
          order by s.created_at desc
          limit 100
        `
      : `
          select s.*, e.nombre as escuela_nombre
          from public.solicitudes_arco s
          left join public.escuelas e on e.id = s.escuela_id
          where s.escuela_id = $1
          order by s.created_at desc
          limit 100
        `;

    const params = isSuperAdmin ? [] : [authz.perfil.escuela_id];
    const result = await pool.query<SolicitudArco & { escuela_nombre: string | null }>(
      query,
      params
    );

    return NextResponse.json({ rows: result.rows });
  } catch (error) {
    console.error("Error al listar solicitudes ARCO:", error);
    return NextResponse.json({ error: "No se pudieron cargar las solicitudes." }, { status: 500 });
  }
}

// ── PATCH: Responder solicitud ARCO (solo admin) ──────────────────────
const patchSchema = z.object({
  id: z.string().uuid(),
  estado: z.enum(["en_proceso", "completada", "rechazada"]),
  respuesta: z.string().trim().min(1).max(5000),
});

export async function PATCH(request: NextRequest) {
  const authz = await authorizeApiRequest(ADMIN_ROLES);
  if (!authz.ok) return authz.response;

  const parsed = await parseJsonBody(request, patchSchema);
  if (!parsed.ok) return parsed.response;

  const { id, estado, respuesta } = parsed.data;
  const pool = getServerDbPool();

  try {
    const isSuperAdmin = authz.perfil.rol === "super_admin";
    const updateQuery = isSuperAdmin
      ? `
          update public.solicitudes_arco
          set estado = $2, respuesta = $3, responded_at = now(), responded_by = $4
          where id = $1
          returning id, estado
        `
      : `
          update public.solicitudes_arco
          set estado = $2, respuesta = $3, responded_at = now(), responded_by = $4
          where id = $1 and escuela_id = $5
          returning id, estado
        `;

    const params: (string | EstadoSolicitudArco)[] = isSuperAdmin
      ? [id, estado, respuesta, authz.perfil.id]
      : [id, estado, respuesta, authz.perfil.id, authz.perfil.escuela_id!];

    const result = await pool.query<{ id: string; estado: string }>(updateQuery, params);

    if (result.rowCount === 0) {
      return NextResponse.json(
        { error: "Solicitud no encontrada o sin permisos." },
        { status: 404 }
      );
    }

    return NextResponse.json({
      id: result.rows[0]?.id,
      estado: result.rows[0]?.estado,
      mensaje: "Solicitud actualizada correctamente.",
    });
  } catch (error) {
    console.error("Error al actualizar solicitud ARCO:", error);
    return NextResponse.json({ error: "No se pudo actualizar la solicitud." }, { status: 500 });
  }
}
