import { NextRequest, NextResponse } from "next/server";
import { authorizeApiRequest } from "@/lib/api-auth";
import { getServerDbPool } from "@/lib/server-db";
import { derivePrefixFromCategories, type ContractSequencePrefix } from "@/lib/contracts";

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
  const categorias = categoriasParam
    .split(",")
    .map((c) => c.trim())
    .filter(Boolean);

  if (categorias.length === 0) {
    return NextResponse.json({ error: "Debe indicar al menos una categoría." }, { status: 400 });
  }

  const prefix = derivePrefixFromCategories(categorias);
  const columnMap: Record<ContractSequencePrefix, string> = {
    MOT: "siguiente_consecutivo_mot",
    CAR: "siguiente_consecutivo_car",
    COM: "siguiente_consecutivo_com",
  };
  const col = columnMap[prefix];

  try {
    const pool = getServerDbPool();
    const res = await pool.query<Record<string, string>>(
      `SELECT coalesce(${col}, 1)::text AS next_val
       FROM configuracion_contratos_escuela
       WHERE escuela_id = $1`,
      [escuelaId]
    );

    const nextSequence = parseInt(res.rows[0]?.next_val ?? "1", 10);
    const paddedSeq = String(nextSequence).padStart(4, "0");
    const nextNumber = `${prefix}-${paddedSeq}`;

    return NextResponse.json({ nextNumber, prefix, nextSequence });
  } catch (error) {
    console.error("[API contratos/preview]", error);
    return NextResponse.json(
      { error: "No se pudo obtener la vista previa del contrato." },
      { status: 500 }
    );
  }
}
