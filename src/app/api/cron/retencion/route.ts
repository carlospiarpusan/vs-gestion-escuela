import { timingSafeEqual } from "node:crypto";
import { NextResponse } from "next/server";
import { runRetentionReview } from "@/lib/data-retention-service";

export const runtime = "nodejs";
export async function GET(request: Request) {
  const secret = process.env.CRON_SECRET;
  const provided = request.headers.get("authorization") ?? "";
  const expected = secret ? `Bearer ${secret}` : "";
  if (
    !expected ||
    Buffer.byteLength(expected) !== Buffer.byteLength(provided) ||
    !timingSafeEqual(Buffer.from(expected), Buffer.from(provided))
  )
    return NextResponse.json({ error: "No autorizado." }, { status: 401 });
  try {
    return NextResponse.json(await runRetentionReview(), {
      headers: { "Cache-Control": "no-store" },
    });
  } catch {
    return NextResponse.json({ error: "No se pudo revisar la retencion." }, { status: 500 });
  }
}
