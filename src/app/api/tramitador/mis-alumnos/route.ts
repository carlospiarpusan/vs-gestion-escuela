import { NextResponse } from "next/server";
import { authorizeApiRequest } from "@/lib/api-auth";
import { TramitadorError, getTramitadorPortal } from "@/lib/tramitadores-server";

/** Único endpoint del rol tramitador: sus alumnos asignados y nada más. */
export async function GET(request: Request) {
  const authz = await authorizeApiRequest(["tramitador"], request);
  if (!authz.ok) return authz.response;

  try {
    const payload = await getTramitadorPortal(authz.perfil.id);
    return NextResponse.json(payload, { headers: { "Cache-Control": "private, no-store" } });
  } catch (error) {
    if (error instanceof TramitadorError) {
      return NextResponse.json({ error: error.message }, { status: error.status });
    }
    console.error("[API TRAMITADOR/MIS-ALUMNOS]", error);
    return NextResponse.json({ error: "No se pudieron cargar tus alumnos." }, { status: 500 });
  }
}
