import { NextResponse } from "next/server";
import { z } from "zod";
import {
  authorizeApiRequest,
  buildSupabaseAdminClient,
  parseJsonBody,
} from "@/lib/api-auth";

const deleteEscuelaSchema = z.object({
  escuela_id: z.string().uuid(),
});

async function deleteAuthUserIfExists(
  supabaseAdmin: ReturnType<typeof buildSupabaseAdminClient>,
  userId: string
) {
  const { error } = await supabaseAdmin.auth.admin.deleteUser(userId);
  if (!error) return;

  const message = error.message?.toLowerCase() ?? "";
  if (message.includes("not found") || message.includes("user not found")) {
    return;
  }

  throw error;
}

export async function POST(request: Request) {
  try {
    const authz = await authorizeApiRequest(["super_admin"]);
    if (!authz.ok) return authz.response;

    const parsedBody = await parseJsonBody(request, deleteEscuelaSchema);
    if (!parsedBody.ok) return parsedBody.response;

    const escuelaId = parsedBody.data.escuela_id;
    const supabaseAdmin = buildSupabaseAdminClient();

    const { data: escuela, error: escuelaError } = await supabaseAdmin
      .from("escuelas")
      .select("id, nombre")
      .eq("id", escuelaId)
      .maybeSingle();

    if (escuelaError) {
      return NextResponse.json(
        { error: "No se pudo validar la escuela a eliminar." },
        { status: 400 }
      );
    }

    if (!escuela) {
      return NextResponse.json(
        { error: "La escuela ya no existe." },
        { status: 404 }
      );
    }

    const { data: perfiles, error: perfilesError } = await supabaseAdmin
      .from("perfiles")
      .select("id")
      .eq("escuela_id", escuelaId);

    if (perfilesError) {
      return NextResponse.json(
        { error: "No se pudieron cargar los usuarios asociados a la escuela." },
        { status: 400 }
      );
    }

    const userIds = Array.from(new Set((perfiles || []).map((item) => item.id)));

    const deleteSteps = [
      () => supabaseAdmin.from("mantenimiento_vehiculos").delete().eq("escuela_id", escuelaId),
      () => supabaseAdmin.from("respuestas_examen").delete().eq("escuela_id", escuelaId),
      () => supabaseAdmin.from("ingresos").delete().eq("escuela_id", escuelaId),
      () => supabaseAdmin.from("gastos").delete().eq("escuela_id", escuelaId),
      () => supabaseAdmin.from("examenes").delete().eq("escuela_id", escuelaId),
      () => supabaseAdmin.from("horas_trabajo").delete().eq("escuela_id", escuelaId),
      () => supabaseAdmin.from("clases").delete().eq("escuela_id", escuelaId),
      () => supabaseAdmin.from("vehiculos").delete().eq("escuela_id", escuelaId),
      () => supabaseAdmin.from("instructores").delete().eq("escuela_id", escuelaId),
      () => supabaseAdmin.from("matriculas_alumno").delete().eq("escuela_id", escuelaId),
      () => supabaseAdmin.from("alumnos").delete().eq("escuela_id", escuelaId),
      () => supabaseAdmin.from("actividad_log").delete().eq("escuela_id", escuelaId),
      () => supabaseAdmin.from("perfiles").delete().eq("escuela_id", escuelaId),
      () => supabaseAdmin.from("sedes").delete().eq("escuela_id", escuelaId),
      () => supabaseAdmin.from("escuelas").delete().eq("id", escuelaId),
    ];

    for (const step of deleteSteps) {
      const { error } = await step();
      if (error) {
        return NextResponse.json(
          { error: `No se pudo eliminar completamente la escuela: ${error.message}` },
          { status: 400 }
        );
      }
    }

    for (const userId of userIds) {
      await deleteAuthUserIfExists(supabaseAdmin, userId);
    }

    return NextResponse.json({
      success: true,
      deleted_school_id: escuelaId,
      deleted_users: userIds.length,
    });
  } catch {
    return NextResponse.json(
      { error: "Error interno al eliminar la escuela." },
      { status: 500 }
    );
  }
}
