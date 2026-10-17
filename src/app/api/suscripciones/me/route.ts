import { NextResponse } from "next/server";
import { authorizeApiRequest } from "@/lib/api-auth";
import { loadSchoolBillingCenter } from "@/lib/school-subscription-service";
import { getServerDbPool } from "@/lib/server-db";

export const runtime = "nodejs";

export async function GET() {
  const authz = await authorizeApiRequest(["admin_escuela"]);
  if (!authz.ok) return authz.response;

  if (!authz.perfil.escuela_id) {
    return NextResponse.json(
      { error: "No se encontró una escuela asociada al perfil." },
      { status: 400 }
    );
  }

  try {
    const payload = await loadSchoolBillingCenter(getServerDbPool(), authz.perfil.escuela_id);
    return NextResponse.json(payload);
  } catch (error) {
    console.error("Error al cargar el centro de facturación:", error);
    return NextResponse.json(
      {
        error:
          error instanceof Error ? error.message : "No se pudo cargar el centro de facturación.",
      },
      { status: 500 }
    );
  }
}
