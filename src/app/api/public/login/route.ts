import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import { createServerClient } from "@supabase/ssr";
import {
  documentCredentials,
  DOCUMENT_LOGIN_ERROR,
  LOGIN_HEADERS,
  signInWithDocument,
} from "@/lib/document-password-login";
import { rateLimit, getRateLimitKey } from "@/lib/rate-limit";

const failure = (message = DOCUMENT_LOGIN_ERROR, status = 401) =>
  NextResponse.json({ error: message }, { status, headers: LOGIN_HEADERS });

export async function POST(request: Request) {
  if (request.headers.get("origin") !== new URL(request.url).origin)
    return failure("Solicitud no permitida.", 403);
  if (!request.headers.get("content-type")?.startsWith("application/json"))
    return failure("Formato inválido.", 415);
  try {
    const limit = await rateLimit(getRateLimitKey(request, "api:login-cedula"), 15, 15 * 60_000);
    if (!limit.ok) return failure("Demasiados intentos. Intenta más tarde.", 429);
    const parsed = documentCredentials.safeParse(await request.json().catch(() => null));
    if (!parsed.success) return failure();
    const cookieStore = await cookies();
    const response = NextResponse.json({ ok: true }, { headers: LOGIN_HEADERS });
    const supabase = createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      {
        cookies: {
          getAll: () => cookieStore.getAll(),
          setAll: (values) => {
            for (const { name, value, options } of values)
              response.cookies.set(name, value, options);
          },
        },
      }
    );
    const result = await signInWithDocument(supabase.auth, parsed.data);
    // The browser receives cookies only, never the mapped email or session as JSON.
    return result.ok ? response : failure(result.error, result.status);
  } catch {
    return failure("No se pudo conectar al servicio de acceso. Intenta de nuevo.", 503);
  }
}
