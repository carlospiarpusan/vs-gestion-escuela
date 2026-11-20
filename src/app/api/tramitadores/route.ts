import { NextResponse } from "next/server";
import { z } from "zod";
import { authorizeApiRequest, parseJsonBody, resolveEscuelaIdForRequest } from "@/lib/api-auth";
import { getServerDbPool } from "@/lib/server-db";
import { invalidateStudentRecordCaches } from "@/lib/student-records-server";
import {
  TRAMITADOR_CATALOG_READ_ROLES,
  TRAMITADOR_MANAGE_ROLES,
  cleanTramitadorNombre,
} from "@/lib/tramitadores";
import { TramitadorError, getTramitador, listTramitadores } from "@/lib/tramitadores-server";

const optionalText = (max: number) =>
  z
    .string()
    .trim()
    .max(max)
    .nullish()
    .transform((value) => value || null);

const baseSchema = z.object({
  nombre: z.string().trim().min(2).max(120),
  tipo: z.enum(["comision", "descuento"]),
  comision_valor: z.number().min(0).max(100_000_000).nullish(),
  documento: optionalText(30),
  telefono: optionalText(30),
  notas: optionalText(1000),
});

const createSchema = baseSchema.extend({ escuela_id: z.string().uuid().nullish() });
const updateSchema = baseSchema.partial().extend({
  id: z.string().uuid(),
  activo: z.boolean().optional(),
});
const deleteSchema = z.object({ id: z.string().uuid() });

function errorResponse(error: unknown, fallback: string) {
  if (error instanceof TramitadorError) {
    return NextResponse.json({ error: error.message }, { status: error.status });
  }
  if ((error as { code?: string })?.code === "23505") {
    return NextResponse.json(
      { error: "Ya existe un tramitador con ese nombre en la escuela." },
      { status: 409 }
    );
  }
  console.error("[API TRAMITADORES]", error);
  return NextResponse.json({ error: fallback }, { status: 500 });
}

export async function GET(request: Request) {
  const authz = await authorizeApiRequest(TRAMITADOR_CATALOG_READ_ROLES, request);
  if (!authz.ok) return authz.response;

  const url = new URL(request.url);
  const escuelaId = resolveEscuelaIdForRequest(
    request,
    authz.perfil,
    url.searchParams.get("escuela_id")
  );
  if (!escuelaId) return NextResponse.json({ tramitadores: [] });

  const canManage = TRAMITADOR_MANAGE_ROLES.includes(authz.perfil.rol);
  try {
    const tramitadores = await listTramitadores(escuelaId, {
      includeInactive: canManage && url.searchParams.get("todos") === "1",
    });
    return NextResponse.json(
      {
        // El personal operativo solo necesita lo justo para elegir en la matrícula.
        tramitadores: canManage
          ? tramitadores
          : tramitadores.map(({ id, nombre, tipo, comision_valor, activo }) => ({
              id,
              nombre,
              tipo,
              comision_valor,
              activo,
            })),
        canManage,
      },
      { headers: { "Cache-Control": "private, no-store" } }
    );
  } catch (error) {
    return errorResponse(error, "No se pudieron cargar los tramitadores.");
  }
}

export async function POST(request: Request) {
  const authz = await authorizeApiRequest(TRAMITADOR_MANAGE_ROLES, request);
  if (!authz.ok) return authz.response;
  const parsed = await parseJsonBody(request, createSchema);
  if (!parsed.ok) return parsed.response;

  const escuelaId = resolveEscuelaIdForRequest(request, authz.perfil, parsed.data.escuela_id);
  if (!escuelaId) {
    return NextResponse.json({ error: "Selecciona una escuela." }, { status: 400 });
  }

  const data = parsed.data;
  try {
    const result = await getServerDbPool().query<{ id: string }>(
      `insert into public.tramitadores
        (escuela_id, nombre, tipo, comision_valor, documento, telefono, notas, created_by)
       values ($1, $2, $3, $4, $5, $6, $7, $8)
       returning id`,
      [
        escuelaId,
        cleanTramitadorNombre(data.nombre),
        data.tipo,
        data.tipo === "comision" ? (data.comision_valor ?? null) : null,
        data.documento,
        data.telefono,
        data.notas,
        authz.perfil.id,
      ]
    );
    return NextResponse.json({ ok: true, id: result.rows[0]?.id });
  } catch (error) {
    return errorResponse(error, "No se pudo crear el tramitador.");
  }
}

export async function PATCH(request: Request) {
  const authz = await authorizeApiRequest(TRAMITADOR_MANAGE_ROLES, request);
  if (!authz.ok) return authz.response;
  const parsed = await parseJsonBody(request, updateSchema);
  if (!parsed.ok) return parsed.response;

  const pool = getServerDbPool();
  const client = await pool.connect();
  try {
    await client.query("BEGIN");
    const current = await getTramitador(client, parsed.data.id, { forUpdate: true });
    const escuelaId = resolveEscuelaIdForRequest(request, authz.perfil, current?.escuela_id);
    if (!current || current.escuela_id !== escuelaId) {
      throw new TramitadorError("El tramitador no existe.", 404);
    }

    const data = parsed.data;
    const tipo = data.tipo ?? current.tipo;
    const nombre = data.nombre ? cleanTramitadorNombre(data.nombre) : current.nombre;
    await client.query(
      `update public.tramitadores set
         nombre = $2,
         tipo = $3,
         comision_valor = $4,
         documento = case when $5 then $6 else documento end,
         telefono = case when $7 then $8 else telefono end,
         notas = case when $9 then $10 else notas end,
         activo = coalesce($11, activo)
       where id = $1`,
      [
        current.id,
        nombre,
        tipo,
        tipo === "comision"
          ? data.comision_valor !== undefined
            ? data.comision_valor
            : current.comision_valor
          : null,
        data.documento !== undefined,
        data.documento ?? null,
        data.telefono !== undefined,
        data.telefono ?? null,
        data.notas !== undefined,
        data.notas ?? null,
        data.activo ?? null,
      ]
    );

    if (nombre !== current.nombre) {
      // Mantener el nombre histórico igual al del catálogo en matrículas y gastos.
      await client.query(
        "update public.matriculas_alumno set tramitador_nombre = $2 where tramitador_id = $1",
        [current.id, nombre]
      );
      await client.query(
        `update public.gastos set proveedor = $3
         where escuela_id = $1 and categoria = 'tramitador'
           and public.normalize_tramitador_nombre(proveedor) = public.normalize_tramitador_nombre($2)`,
        [current.escuela_id, current.nombre, nombre]
      );
    }

    // Al desactivar el tramitador también se bloquea su acceso.
    if (data.activo === false && current.perfil_id) {
      await client.query("update public.perfiles set activo = false where id = $1", [
        current.perfil_id,
      ]);
    }

    await client.query("COMMIT");
    if (nombre !== current.nombre) invalidateStudentRecordCaches(current.escuela_id, "");
    return NextResponse.json({ ok: true });
  } catch (error) {
    await client.query("ROLLBACK").catch(() => undefined);
    return errorResponse(error, "No se pudo actualizar el tramitador.");
  } finally {
    client.release();
  }
}

export async function DELETE(request: Request) {
  const authz = await authorizeApiRequest(TRAMITADOR_MANAGE_ROLES, request);
  if (!authz.ok) return authz.response;
  const parsed = await parseJsonBody(request, deleteSchema);
  if (!parsed.ok) return parsed.response;

  const pool = getServerDbPool();
  try {
    const current = await getTramitador(pool, parsed.data.id);
    const escuelaId = resolveEscuelaIdForRequest(request, authz.perfil, current?.escuela_id);
    if (!current || current.escuela_id !== escuelaId) {
      throw new TramitadorError("El tramitador no existe.", 404);
    }
    const used = await pool.query<{ total: number }>(
      "select count(*)::int as total from public.matriculas_alumno where tramitador_id = $1",
      [current.id]
    );
    if ((used.rows[0]?.total ?? 0) > 0) {
      throw new TramitadorError(
        "Tiene alumnos asignados. Desactívalo o fusiónalo con otro tramitador."
      );
    }
    if (current.perfil_id) {
      throw new TramitadorError("Tiene acceso creado. Desactívalo en lugar de eliminarlo.");
    }
    await pool.query("delete from public.tramitadores where id = $1", [current.id]);
    return NextResponse.json({ ok: true });
  } catch (error) {
    return errorResponse(error, "No se pudo eliminar el tramitador.");
  }
}
