import { NextResponse } from "next/server";
import { authorizeApiRequest } from "@/lib/api-auth";
import {
  loadSchoolBillingCenter,
  reconcileSchoolPaymentAttemptByReference,
  reconcileSchoolPaymentAttemptByTransactionId,
} from "@/lib/school-subscription-service";
import { getServerDbPool } from "@/lib/server-db";

export const runtime = "nodejs";

export async function GET(request: Request) {
  const authz = await authorizeApiRequest(["admin_escuela"]);
  if (!authz.ok) return authz.response;

  if (!authz.perfil.escuela_id) {
    return NextResponse.json({ error: "No se encontró la escuela del usuario." }, { status: 400 });
  }

  const url = new URL(request.url);
  const paymentReference =
    url.searchParams.get("payment_reference") || url.searchParams.get("reference");
  const transactionId = url.searchParams.get("transaction_id") || url.searchParams.get("id");

  try {
    const pool = getServerDbPool();

    if (paymentReference) {
      await reconcileSchoolPaymentAttemptByReference(pool, paymentReference);
    } else if (transactionId) {
      await reconcileSchoolPaymentAttemptByTransactionId(pool, transactionId);
    }

    const payload = await loadSchoolBillingCenter(pool, authz.perfil.escuela_id);
    return NextResponse.json({
      ...payload,
      payment_reference: paymentReference,
      transaction_id: transactionId,
    });
  } catch (error) {
    console.error("Error al confirmar el resultado del checkout:", error);
    return NextResponse.json(
      {
        error:
          error instanceof Error
            ? error.message
            : "No se pudo confirmar el resultado del checkout.",
      },
      { status: 500 }
    );
  }
}
