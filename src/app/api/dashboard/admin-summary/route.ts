import { NextResponse } from "next/server";
import { authorizeApiRequest, resolveEscuelaIdForRequest } from "@/lib/api-auth";
import { createEmptyAdminDashboardSummary } from "@/lib/dashboard-admin-summary";
import { getAdminDashboardSummary } from "@/lib/dashboard-admin-summary-server";
import { createServerTiming } from "@/lib/server-timing";
import type { Rol } from "@/types/database";

const ALLOWED_ROLES: Rol[] = [
  "super_admin",
  "admin_escuela",
  "admin_sede",
  "administrativo",
  "recepcion",
  "instructor",
];

export async function GET(request: Request) {
  const timing = createServerTiming();
  const authorization = await timing.measure("auth", () => authorizeApiRequest(ALLOWED_ROLES));
  if (!authorization.ok) return timing.apply(authorization.response);

  const escuelaId = resolveEscuelaIdForRequest(
    request,
    authorization.perfil,
    new URL(request.url).searchParams.get("escuela_id")
  );

  if (!escuelaId) {
    return timing.apply(
      NextResponse.json(createEmptyAdminDashboardSummary(), {
        headers: {
          "Cache-Control": "private, no-store",
        },
      })
    );
  }

  try {
    const response = await timing.measure("summary", () =>
      getAdminDashboardSummary(
        authorization.perfil,
        escuelaId,
        new URL(request.url).searchParams.get("fresh") === "1"
      )
    );

    return timing.apply(
      NextResponse.json(response, {
        headers: {
          "Cache-Control": "private, no-store",
        },
      })
    );
  } catch (error) {
    console.error("Error al construir el resumen del dashboard:", error);
    return timing.apply(
      NextResponse.json({ error: "No se pudo cargar el resumen del dashboard." }, { status: 500 })
    );
  }
}
