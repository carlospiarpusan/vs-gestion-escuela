import { NextResponse } from "next/server";
import { handleWompiEvent } from "@/lib/school-subscription-service";
import { getServerDbPool } from "@/lib/server-db";
import type { WompiEventBody } from "@/lib/wompi";

export const runtime = "nodejs";

export async function POST(request: Request) {
  let body: WompiEventBody;

  try {
    body = (await request.json()) as WompiEventBody;
  } catch {
    return NextResponse.json({ error: "JSON inválido." }, { status: 400 });
  }

  try {
    const result = await handleWompiEvent(getServerDbPool(), body);
    return NextResponse.json({ ok: true, ...result });
  } catch (error) {
    console.error("Error procesando evento de Wompi:", error);
    return NextResponse.json(
      {
        error: error instanceof Error ? error.message : "No se pudo procesar el evento de Wompi.",
      },
      { status: 400 }
    );
  }
}
