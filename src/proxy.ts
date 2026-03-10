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
import { canAccessDashboardPath, getDashboardFallbackPath } from "@/lib/access-control";
import type { Rol } from "@/types/database";

export async function proxy(request: NextRequest) {
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
          cookiesToSet.forEach(({ name, value }) =>
            request.cookies.set(name, value)
          );
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
  const { data: { user } } = await supabase.auth.getUser();

  const pathname = request.nextUrl.pathname;

  // Rutas protegidas: /dashboard y todas sus subrutas
  const isProtectedRoute = pathname.startsWith("/dashboard");
  // Rutas de autenticación: /login y /registro
  const isAuthRoute = pathname === "/login" || pathname === "/registro";

  // Si intenta acceder al dashboard sin sesión → redirigir a /login
  if (isProtectedRoute && !user) {
    const loginUrl = new URL("/login", request.url);
    return NextResponse.redirect(loginUrl);
  }

  if (isProtectedRoute && user) {
    // Use role from JWT metadata to avoid a DB query on every request.
    // The role in user_metadata is set when the user is created/updated.
    // AuthContext still fetches the full perfil for the UI.
    const rol = user.user_metadata?.rol as string | undefined;

    if (!rol) {
      // Fallback: fetch from DB only if metadata is missing
      const { data: perfil } = await supabase
        .from("perfiles")
        .select("rol, activo")
        .eq("id", user.id)
        .maybeSingle();

      if (!perfil?.activo) {
        const loginUrl = new URL("/login", request.url);
        return NextResponse.redirect(loginUrl);
      }

      if (!canAccessDashboardPath(perfil.rol, pathname)) {
        const fallbackUrl = new URL(getDashboardFallbackPath(perfil.rol), request.url);
        return NextResponse.redirect(fallbackUrl);
      }
    } else {
      if (!canAccessDashboardPath(rol as Rol, pathname)) {
        const fallbackUrl = new URL(getDashboardFallbackPath(rol as Rol), request.url);
        return NextResponse.redirect(fallbackUrl);
      }
    }
  }

  // Si ya está logueado e intenta ir a /login o /registro → ir al dashboard
  if (isAuthRoute && user) {
    const dashboardUrl = new URL("/dashboard", request.url);
    return NextResponse.redirect(dashboardUrl);
  }

  return response;
}

/**
 * Configuración del matcher: define en qué rutas se ejecuta el middleware.
 * Excluye archivos estáticos (_next/static, _next/image, favicon, etc.)
 * para no afectar el rendimiento de carga de assets.
 */
export const config = {
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)",
  ],
};
