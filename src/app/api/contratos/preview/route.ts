import { NextRequest, NextResponse } from "next/server";
import { authorizeApiRequest } from "@/lib/api-auth";
import { normalizeStoredCourseCategories } from "@/lib/course-categories";
import { previewNextContractNumber } from "@/lib/contracts-server";
import { getServerDbPool } from "@/lib/server-db";

/**
 * GET /api/contratos/preview?categorias=B,C
 *
 * Returns a preview of the next contract number that would be assigned
 * for the given set of license categories. Does NOT reserve/consume the number.
 */
export async function GET(request: NextRequest) {
  const authz = await authorizeApiRequest([
    "super_admin",
    "admin_escuela",
    "admin_sede",
    "administrativo",
  ]);
  if (!authz.ok) return authz.response;

  const escuelaId = authz.perfil.escuela_id;
  if (!escuelaId) {
    return NextResponse.json({ error: "Escuela no encontrada." }, { status: 400 });
  }

  const categoriasParam = request.nextUrl.searchParams.get("categorias") || "";
  const categorias = normalizeStoredCourseCategories(
    categoriasParam
      .split(",")
      .map((c) => c.trim())
      .filter(Boolean)
  );

  if (categorias.length === 0) {
    return NextResponse.json({ error: "Debe indicar al menos una categoría." }, { status: 400 });
  }

  try {
    const pool = getServerDbPool();
    const preview = await previewNextContractNumber(pool, {
      escuelaId,
      categorias,
    });

    return NextResponse.json(preview);
  } catch (error) {
    console.error("[API contratos/preview]", error);
    return NextResponse.json(
      { error: "No se pudo obtener la vista previa del contrato." },
      { status: 500 }
    );
  }
}
