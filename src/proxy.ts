/**
 * ============================================================
 * Middleware de Next.js - Protección de Rutas
 * ============================================================
 *
 * Se ejecuta en el servidor ANTES de renderizar cualquier página.
 * Verifica la sesión de Supabase y protege las rutas /dashboard/*.
 *
 * Flujo:
 * 1. Usuario accede a /dashboard/* → middleware verifica cookie de sesión
 * 2. Si NO hay sesión válida → redirige a /login
 * 3. Si HAY sesión válida → permite el acceso
 * 4. Si está en /login o /registro Y tiene sesión → redirige a /dashboard
 *
 * IMPORTANTE: Este middleware se ejecuta en el Edge Runtime de Next.js.
 * No puede usar APIs de Node.js (fs, path, etc.).
 *
 * Configuración: La constante `config.matcher` define qué rutas proteger.
 * ============================================================
 */

import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { createServerClient } from "@supabase/ssr";
import { createServerTiming } from "@/lib/server-timing";

function applySecurityHeaders(response: NextResponse) {
  response.headers.set(
    "Content-Security-Policy",
    "base-uri 'self'; form-action 'self'; frame-ancestors 'none'; object-src 'none'"
  );
  response.headers.set("Permissions-Policy", "camera=(), microphone=(), geolocation=()");
  response.headers.set("Referrer-Policy", "strict-origin-when-cross-origin");
  response.headers.set("Strict-Transport-Security", "max-age=31536000; includeSubDomains");
  response.headers.set("X-Content-Type-Options", "nosniff");
  response.headers.set("X-Frame-Options", "DENY");
  return response;
}

export async function proxy(request: NextRequest) {
  const timing = createServerTiming();

  // --- Crear respuesta mutable para manipular cookies ---
  let response = NextResponse.next({
    request: { headers: request.headers },
  });

  /**
   * Crear cliente Supabase para el servidor (Edge Runtime).
   * Gestiona cookies de sesión automáticamente mediante los callbacks
   * getAll/setAll que leen/escriben en la request/response de Next.js.
   */
  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        // Leer todas las cookies de la request entrante
        getAll() {
          return request.cookies.getAll();
        },
        // Escribir cookies tanto en la request como en la response
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value));
          response = NextResponse.next({
            request: { headers: request.headers },
          });
          cookiesToSet.forEach(({ name, value, options }) =>
            response.cookies.set(name, value, options)
          );
        },
      },
    }
  );

  // --- Verificar si el usuario tiene una sesión activa ---
  const {
    data: { user },
  } = await timing.measure("supabase_auth", () => supabase.auth.getUser(), "Validacion de sesion");

  const pathname = request.nextUrl.pathname;

  // Rutas protegidas: /dashboard y todas sus subrutas
  const isProtectedRoute = pathname.startsWith("/dashboard");
  // Rutas de autenticación: /login y /registro
  const isAuthRoute = pathname === "/login" || pathname === "/registro";

  // Si intenta acceder al dashboard sin sesión → redirigir a /login
  if (isProtectedRoute && !user) {
    const loginUrl = new URL("/login", request.url);
    return timing.apply(applySecurityHeaders(NextResponse.redirect(loginUrl)));
  }

  // Si ya está logueado e intenta ir a /login o /registro → ir al dashboard
  if (isAuthRoute && user) {
    const dashboardUrl = new URL("/dashboard", request.url);
    return timing.apply(applySecurityHeaders(NextResponse.redirect(dashboardUrl)));
  }

  return timing.apply(applySecurityHeaders(response));
}

/**
 * Configuración del matcher: define en qué rutas se ejecuta el middleware.
 * Excluye archivos estáticos (_next/static, _next/image, favicon, etc.)
 * para no afectar el rendimiento de carga de assets.
 */
export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)"],
};
