import { NextResponse } from "next/server";
import { authorizeApiRequest } from "@/lib/api-auth";
import { loadSchoolSubscriptionAdminDetail } from "@/lib/school-subscription-service";
import { getServerDbPool } from "@/lib/server-db";

export const runtime = "nodejs";

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ schoolId: string }> }
) {
  const authz = await authorizeApiRequest(["super_admin"]);
  if (!authz.ok) return authz.response;

  const { schoolId } = await params;
  if (!schoolId) {
    return NextResponse.json({ error: "Falta el identificador de la escuela." }, { status: 400 });
  }

  try {
    const payload = await loadSchoolSubscriptionAdminDetail(getServerDbPool(), schoolId);
    return NextResponse.json(payload);
  } catch (error) {
    console.error("Error al cargar el detalle comercial de la escuela:", error);
    return NextResponse.json(
      {
        error:
          error instanceof Error
            ? error.message
            : "No se pudo cargar el detalle comercial de la escuela.",
      },
      { status: 500 }
    );
  }
}
