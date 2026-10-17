import { NextResponse } from "next/server";
import { z } from "zod";
import { parseJsonBody } from "@/lib/api-auth";
import {
  authorizeBillingConsumer,
  CONNECTION_HEADERS,
  connectionUnavailable,
} from "@/lib/vs-billing/access";
import { searchBillingStudents } from "@/lib/vs-billing/service";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
const searchSchema = z.strictObject({
  q: z.string().trim().min(3).max(100),
  cursor: z.uuid().nullable().default(null),
});

// POST de consulta: evita poner cedulas y nombres en las URLs de los registros HTTP.
export async function POST(request: Request) {
  try {
    const auth = await authorizeBillingConsumer(request);
    if (!auth.ok) return auth.response;
    const body = await parseJsonBody(request, searchSchema);
    if (!body.ok) return body.response;
    return NextResponse.json(await searchBillingStudents(body.data.q, body.data.cursor), {
      headers: CONNECTION_HEADERS,
    });
  } catch {
    return connectionUnavailable();
  }
}
