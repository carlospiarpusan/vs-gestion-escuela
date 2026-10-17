import { NextResponse } from "next/server";
import { z } from "zod";
import {
  authorizeBillingConsumer,
  CONNECTION_HEADERS,
  connectionError,
  connectionUnavailable,
} from "@/lib/vs-billing/access";
import { getBillingStudent } from "@/lib/vs-billing/service";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(request: Request, context: { params: Promise<{ id: string }> }) {
  try {
    const auth = await authorizeBillingConsumer(request);
    if (!auth.ok) return auth.response;
    const id = z.uuid().safeParse((await context.params).id);
    if (!id.success) return connectionError("Identificador invalido.", 400);
    const data = await getBillingStudent(id.data);
    return data
      ? NextResponse.json(data, { headers: CONNECTION_HEADERS })
      : connectionError("Alumno no disponible.", 404);
  } catch {
    return connectionUnavailable();
  }
}
