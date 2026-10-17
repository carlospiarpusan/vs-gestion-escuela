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
 * Proxy verifica la firma del token. Layout y APIs verifican ademas
 * el usuario actual y los permisos antes de entregar datos privados.
 *
 * Configuración: La constante `config.matcher` define qué rutas proteger.
 * ============================================================
 */

import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { createServerClient } from "@supabase/ssr";
import {
  DEVICE_VARIANT_OVERRIDE_COOKIE,
  FORCE_DESKTOP_QUERY_PARAM,
  FORCE_MOBILE_QUERY_PARAM,
  type DeviceVariant,
  isTruthyOverrideValue,
} from "@/lib/device-variant";
import { CONTENT_SECURITY_POLICY } from "@/lib/security-headers";
import { createServerTiming } from "@/lib/server-timing";

const AUTH_COOKIE_PATTERNS = [
  /^sb-.*auth-token(?:\.\d+)?$/i,
  /^__Secure-sb-.*auth-token(?:\.\d+)?$/i,
  /^__Host-sb-.*auth-token(?:\.\d+)?$/i,
  /^supabase-auth-token(?:\.\d+)?$/i,
  /^sb-access-token$/i,
  /^sb-refresh-token$/i,
];

function applySecurityHeaders(response: NextResponse) {
  response.headers.set("Accept-CH", "Sec-CH-UA-Mobile");
  response.headers.set("Content-Security-Policy", CONTENT_SECURITY_POLICY);
  response.headers.set("Permissions-Policy", "camera=(), microphone=(), geolocation=()");
  response.headers.set("Referrer-Policy", "strict-origin-when-cross-origin");
  response.headers.set("Strict-Transport-Security", "max-age=31536000; includeSubDomains");
  response.headers.set("X-Content-Type-Options", "nosniff");
  response.headers.set("X-Frame-Options", "DENY");
  return response;
}

function resolveRequestedVariant(searchParams: URLSearchParams): DeviceVariant | null {
  const forceDesktop = searchParams.get(FORCE_DESKTOP_QUERY_PARAM);
  if (forceDesktop !== null) {
    return isTruthyOverrideValue(forceDesktop) ? "desktop" : null;
  }

  const forceMobile = searchParams.get(FORCE_MOBILE_QUERY_PARAM);
  if (forceMobile !== null) {
    return isTruthyOverrideValue(forceMobile) ? "mobile" : null;
  }

  return null;
}

function hasSupabaseAuthCookies(request: NextRequest) {
  return request.cookies
    .getAll()
    .some(({ name }) => AUTH_COOKIE_PATTERNS.some((pattern) => pattern.test(name)));
}

export async function proxy(request: NextRequest) {
  const timing = createServerTiming();
  const url = request.nextUrl.clone();
  const pathname = request.nextUrl.pathname;
  const isProtectedRoute = pathname.startsWith("/dashboard");
  const isAuthRoute = pathname === "/login" || pathname === "/registro";
  const hasForceMobile = url.searchParams.has(FORCE_MOBILE_QUERY_PARAM);
  const hasForceDesktop = url.searchParams.has(FORCE_DESKTOP_QUERY_PARAM);

  if (hasForceMobile || hasForceDesktop) {
    const nextVariant = resolveRequestedVariant(url.searchParams);
    url.searchParams.delete(FORCE_MOBILE_QUERY_PARAM);
    url.searchParams.delete(FORCE_DESKTOP_QUERY_PARAM);

    const response = NextResponse.redirect(url);

    if (nextVariant) {
      response.cookies.set(DEVICE_VARIANT_OVERRIDE_COOKIE, nextVariant, {
        path: "/",
        maxAge: 60 * 60 * 24 * 30,
        sameSite: "lax",
      });
    } else {
      response.cookies.delete(DEVICE_VARIANT_OVERRIDE_COOKIE);
    }

    return timing.apply(applySecurityHeaders(response));
  }

  // --- Crear respuesta mutable para manipular cookies ---
  let response = NextResponse.next({
    request: { headers: request.headers },
  });

  const hasAuthCookies = hasSupabaseAuthCookies(request);

  if (!hasAuthCookies) {
    if (isProtectedRoute) {
      const loginUrl = new URL("/login", request.url);
      return timing.apply(applySecurityHeaders(NextResponse.redirect(loginUrl)));
    }

    return timing.apply(applySecurityHeaders(response));
  }

  /**
   * Crear cliente Supabase para el servidor.
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

  // getClaims reutiliza las claves publicas; getUser sigue en layout y APIs.
  const { data, error } = await timing.measure(
    "supabase_auth",
    () => supabase.auth.getClaims(),
    "Validacion de sesion"
  );
  const hasVerifiedSession = !error && Boolean(data?.claims?.sub);

  // Si intenta acceder al dashboard sin sesión → redirigir a /login
  if (isProtectedRoute && !hasVerifiedSession) {
    const loginUrl = new URL("/login", request.url);
    return timing.apply(applySecurityHeaders(NextResponse.redirect(loginUrl)));
  }

  // Si ya está logueado e intenta ir a /login o /registro → ir al dashboard
  // En login comprobamos revocacion para evitar un bucle con el layout.
  const user = isAuthRoute && hasVerifiedSession ? (await supabase.auth.getUser()).data.user : null;
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
  matcher: ["/dashboard/:path*", "/login", "/registro"],
};
