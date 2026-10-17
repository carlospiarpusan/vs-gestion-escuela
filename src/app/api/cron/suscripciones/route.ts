import { NextResponse } from "next/server";
import {
  processDueSchoolSubscriptions,
  reconcileSchoolPaymentAttemptByReference,
  reconcileSchoolPaymentAttemptByTransactionId,
} from "@/lib/school-subscription-service";
import { getServerDbPool } from "@/lib/server-db";

export const runtime = "nodejs";

const CRON_LOCK_KEY = 36037;

function isAuthorizedCronRequest(request: Request) {
  const expectedSecret = process.env.CRON_SECRET;
  if (!expectedSecret) {
    console.error("[CRON suscripciones] CRON_SECRET no está configurado.");
    return false;
  }

  return request.headers.get("authorization") === `Bearer ${expectedSecret}`;
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
      return NextResponse.json({ ok: true, skipped: true, reason: "subscriptions_cron_locked" });
    }

    const pendingAttemptsRes = await client.query<{
      reference: string;
      wompi_transaction_id: string | null;
    }>(
      `
        select reference, wompi_transaction_id
        from public.school_payment_attempts
        where status = 'pending'
        order by created_at asc
        limit 20
      `
    );

    const reconciled: string[] = [];
    for (const row of pendingAttemptsRes.rows) {
      if (row.wompi_transaction_id) {
        await reconcileSchoolPaymentAttemptByTransactionId(pool, row.wompi_transaction_id);
        reconciled.push(row.wompi_transaction_id);
        continue;
      }

      await reconcileSchoolPaymentAttemptByReference(pool, row.reference);
      reconciled.push(row.reference);
    }

    const summary = await processDueSchoolSubscriptions(pool);
    return NextResponse.json({ ok: true, summary, reconciled });
  } catch (error) {
    return NextResponse.json(
      {
        error:
          error instanceof Error ? error.message : "No se pudo ejecutar el cron de suscripciones.",
      },
      { status: 500 }
    );
  } finally {
    try {
      await client.query("select pg_advisory_unlock($1)", [CRON_LOCK_KEY]);
    } catch {
      // noop
    }
    try {
      client.release();
    } catch {
      // noop
    }
  }
}
