import { NextResponse } from "next/server";
import { getServerDbPool } from "@/lib/server-db";
import { syncAllActiveEmailInvoiceIntegrations } from "@/lib/email-invoice-sync";

export const runtime = "nodejs";

const CRON_LOCK_KEY = 36036;

function isAuthorizedCronRequest(request: Request) {
  const expectedSecret = process.env.CRON_SECRET;
  if (!expectedSecret) {
    console.error("[CRON facturas-correo] CRON_SECRET no está configurado.");
    return false;
  }

  const authHeader = request.headers.get("authorization");
  return authHeader === `Bearer ${expectedSecret}`;
}

export async function GET(request: Request) {
  if (!isAuthorizedCronRequest(request)) {
    return NextResponse.json({ error: "No autorizado." }, { status: 401 });
  }

  const pool = getServerDbPool();
  const client = await pool.connect();

  try {
    const lockRes = await client.query<{ locked: boolean }>(
      "select pg_try_advisory_lock($1) as locked",
      [CRON_LOCK_KEY]
    );

    if (!lockRes.rows[0]?.locked) {
      return NextResponse.json({ ok: true, skipped: true, reason: "sync_already_running" });
    }

    const results = await syncAllActiveEmailInvoiceIntegrations();
    return NextResponse.json({ ok: true, results });
  } catch (error) {
    return NextResponse.json(
      {
        error:
          error instanceof Error
            ? error.message
            : "No se pudo ejecutar la sincronizacion automatica.",
      },
      { status: 500 }
    );
  } finally {
    await client.query("select pg_advisory_unlock($1)", [CRON_LOCK_KEY]).catch(() => undefined);
    client.release();
  }
}
