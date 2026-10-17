import { NextResponse } from "next/server";
import {
  authorizeBillingConsumer,
  CONNECTION_HEADERS,
  connectionUnavailable,
} from "@/lib/vs-billing/access";
import { VS_BILLING_SCHOOL } from "@/lib/vs-billing/scope";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  try {
    const auth = await authorizeBillingConsumer(request);
    if (!auth.ok) return auth.response;
    return NextResponse.json(
      {
        schema_version: 1,
        source: "condusoft",
        empresa: VS_BILLING_SCHOOL,
        permisos: ["alumnos:leer"],
        campos: [
          "id",
          "nombre",
          "apellidos",
          "nombre_completo",
          "tipo_documento",
          "documento",
          "email",
        ],
      },
      { headers: CONNECTION_HEADERS }
    );
  } catch {
    return connectionUnavailable();
  }
}
