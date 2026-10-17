import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import {
  documentCredentials,
  DOCUMENT_LOGIN_ERROR,
  LOGIN_HEADERS,
  signInWithDocument,
} from "@/lib/document-password-login";
import { rateLimit, getRateLimitKey } from "@/lib/rate-limit";

const failure = (error = DOCUMENT_LOGIN_ERROR, status = 401) =>
  NextResponse.json({ error }, { status, headers: LOGIN_HEADERS });

export async function POST(request: Request) {
  const origin = request.headers.get("origin");
  // Native requests have no Origin. Browser requests must remain same-origin.
  if (origin && origin !== new URL(request.url).origin)
    return failure("Solicitud no permitida.", 403);
  if (!request.headers.get("content-type")?.startsWith("application/json"))
    return failure("Formato inválido.", 415);
  try {
    const limit = await rateLimit(getRateLimitKey(request, "api:login-cedula"), 15, 15 * 60_000);
    if (!limit.ok) return failure("Demasiados intentos. Intenta más tarde.", 429);
    const parsed = documentCredentials.safeParse(await request.json().catch(() => null));
    if (!parsed.success) return failure();
    const client = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      {
        auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false },
      }
    );
    const result = await signInWithDocument(client.auth, parsed.data);
    if (!result.ok) return failure(result.error, result.status);
    return NextResponse.json(
      {
        session: {
          access_token: result.session.access_token,
          refresh_token: result.session.refresh_token,
        },
      },
      { headers: LOGIN_HEADERS }
    );
  } catch {
    return failure("No se pudo conectar al servicio de acceso. Intenta de nuevo.", 503);
  }
}
