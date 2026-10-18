import { NextResponse } from "next/server";
import { authorizeApiRequest, parseJsonBody, resolveEscuelaIdForRequest } from "@/lib/api-auth";
import { retentionCommandSchema } from "@/lib/data-retention";
import {
  changeRetention,
  getRetentionOverview,
  RetentionError,
} from "@/lib/data-retention-service";

const headers = { "Cache-Control": "no-store" };
function failure(error: unknown) {
  return NextResponse.json(
    {
      error: error instanceof RetentionError ? error.message : "No se pudo procesar la retencion.",
    },
    { status: error instanceof RetentionError ? error.status : 500, headers }
  );
}
export async function GET(request: Request) {
  const auth = await authorizeApiRequest(["super_admin", "admin_escuela"], request);
  if (!auth.ok) return auth.response;
  const schoolId = resolveEscuelaIdForRequest(
    request,
    auth.perfil,
    new URL(request.url).searchParams.get("escuela_id")
  );
  if (!schoolId)
    return NextResponse.json({ error: "Selecciona una escuela." }, { status: 400, headers });
  try {
    return NextResponse.json(await getRetentionOverview(schoolId), { headers });
  } catch (error) {
    return failure(error);
  }
}
export async function POST(request: Request) {
  const auth = await authorizeApiRequest(["super_admin"], request);
  if (!auth.ok) return auth.response;
  const parsed = await parseJsonBody(request, retentionCommandSchema);
  if (!parsed.ok) return parsed.response;
  try {
    return NextResponse.json(await changeRetention(parsed.data, auth.perfil.id), { headers });
  } catch (error) {
    return failure(error);
  }
}
