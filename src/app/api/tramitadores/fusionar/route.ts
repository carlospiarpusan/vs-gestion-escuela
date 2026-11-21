import { NextResponse } from "next/server";
import { z } from "zod";
import { authorizeApiRequest, parseJsonBody, resolveEscuelaIdForRequest } from "@/lib/api-auth";
import { getServerDbPool } from "@/lib/server-db";
import { invalidateStudentRecordCaches } from "@/lib/student-records-server";
import { TRAMITADOR_MANAGE_ROLES } from "@/lib/tramitadores";
import { TramitadorError, getTramitador } from "@/lib/tramitadores-server";

const mergeSchema = z
  .object({ origen_id: z.string().uuid(), destino_id: z.string().uuid() })
  .refine((value) => value.origen_id !== value.destino_id, "Elige dos tramitadores distintos.");

/** Pasa todas las matrículas y gastos del origen al destino y elimina el origen. */
export async function POST(request: Request) {
  const authz = await authorizeApiRequest(TRAMITADOR_MANAGE_ROLES, request);
  if (!authz.ok) return authz.response;
  const parsed = await parseJsonBody(request, mergeSchema);
  if (!parsed.ok) return parsed.response;

  const client = await getServerDbPool().connect();
  try {
    await client.query("BEGIN");
    const origen = await getTramitador(client, parsed.data.origen_id, { forUpdate: true });
    const destino = await getTramitador(client, parsed.data.destino_id, { forUpdate: true });
    const escuelaId = resolveEscuelaIdForRequest(request, authz.perfil, destino?.escuela_id);
    if (
      !origen ||
      !destino ||
      origen.escuela_id !== escuelaId ||
      destino.escuela_id !== escuelaId
    ) {
      throw new TramitadorError("Los tramitadores no existen en esta escuela.", 404);
    }
    if (origen.perfil_id && destino.perfil_id) {
      throw new TramitadorError(
        "Ambos tienen acceso creado. Quita el acceso de uno antes de fusionarlos."
      );
    }

    const moved = await client.query(
      "update public.matriculas_alumno set tramitador_id = $2 where tramitador_id = $1",
      [origen.id, destino.id]
    );
    await client.query(
      `update public.gastos set proveedor = $3
       where escuela_id = $1 and categoria = 'tramitador'
         and public.normalize_tramitador_nombre(proveedor) = public.normalize_tramitador_nombre($2)`,
      [escuelaId, origen.nombre, destino.nombre]
    );
    await client.query(
      `update public.alumnos set tramitador_nombre = $3
       where escuela_id = $1
         and public.normalize_tramitador_nombre(tramitador_nombre) = public.normalize_tramitador_nombre($2)`,
      [escuelaId, origen.nombre, destino.nombre]
    );
    if (origen.perfil_id) {
      await client.query("update public.tramitadores set perfil_id = null where id = $1", [
        origen.id,
      ]);
      await client.query("update public.tramitadores set perfil_id = $2 where id = $1", [
        destino.id,
        origen.perfil_id,
      ]);
    }
    await client.query("delete from public.tramitadores where id = $1", [origen.id]);
    await client.query("COMMIT");

    invalidateStudentRecordCaches(escuelaId, "");
    return NextResponse.json({ ok: true, matriculas: moved.rowCount ?? 0 });
  } catch (error) {
    await client.query("ROLLBACK").catch(() => undefined);
    if (error instanceof TramitadorError) {
      return NextResponse.json({ error: error.message }, { status: error.status });
    }
    console.error("[API TRAMITADORES/FUSIONAR]", error);
    return NextResponse.json({ error: "No se pudo fusionar." }, { status: 500 });
  } finally {
    client.release();
  }
}
