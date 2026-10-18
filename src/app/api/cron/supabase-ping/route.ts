import { timingSafeEqual } from "node:crypto";
import { NextResponse } from "next/server";
import { executeSupabaseMaintenancePing } from "@/lib/supabase-ping-service";

export const runtime = "nodejs";

export async function GET(request: Request) {
  const secret = process.env.CRON_SECRET;
  const provided = request.headers.get("authorization") ?? "";
  const expected = secret ? `Bearer ${secret}` : "";

  if (
    !expected ||
    Buffer.byteLength(expected) !== Buffer.byteLength(provided) ||
    !timingSafeEqual(Buffer.from(expected), Buffer.from(provided))
  ) {
    return NextResponse.json({ error: "No autorizado." }, { status: 401 });
  }

  try {
    const report = await executeSupabaseMaintenancePing();
    const status = report.ok ? 200 : 503;
    return NextResponse.json(report, {
      status,
      headers: { "Cache-Control": "no-store" },
    });
  } catch {
    return NextResponse.json(
      { error: "No se pudo completar el ping de mantenimiento de Supabase." },
      { status: 500 }
    );
  }
}
