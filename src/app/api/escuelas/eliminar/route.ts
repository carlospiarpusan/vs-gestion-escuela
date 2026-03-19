import { NextResponse } from "next/server";
import { z } from "zod";
import { authorizeApiRequest, buildSupabaseAdminClient, parseJsonBody } from "@/lib/api-auth";
import { getServerDbPool } from "@/lib/server-db";

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
    const pool = getServerDbPool();

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
      return NextResponse.json({ error: "La escuela ya no existe." }, { status: 404 });
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
    const client = await pool.connect();
    let deletedUsers = 0;
    const authCleanupErrors: string[] = [];

    try {
      await client.query("BEGIN");
      await client.query(
        `
          delete from public.perfiles
          where escuela_id = $1
        `,
        [escuelaId]
      );
      await client.query(
        `
          delete from public.escuelas
          where id = $1
        `,
        [escuelaId]
      );
      await client.query("COMMIT");
    } catch (error) {
      await client.query("ROLLBACK");
      return NextResponse.json(
        {
          error:
            error instanceof Error
              ? `No se pudo eliminar completamente la escuela: ${error.message}`
              : "No se pudo eliminar completamente la escuela.",
        },
        { status: 400 }
      );
    } finally {
      client.release();
    }

    for (const userId of userIds) {
      try {
        await deleteAuthUserIfExists(supabaseAdmin, userId);
        deletedUsers += 1;
      } catch (error) {
        authCleanupErrors.push(
          error instanceof Error ? error.message : `No se pudo limpiar el usuario ${userId}.`
        );
      }
    }

    return NextResponse.json({
      success: true,
      deleted_school_id: escuelaId,
      deleted_users: deletedUsers,
      auth_cleanup_errors: authCleanupErrors,
    });
  } catch {
    return NextResponse.json({ error: "Error interno al eliminar la escuela." }, { status: 500 });
  }
}
