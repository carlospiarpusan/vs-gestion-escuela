import { cookies, headers } from "next/headers";
import { NextResponse } from "next/server";
import { createClient, type User } from "@supabase/supabase-js";
import { createServerClient } from "@supabase/ssr";
import { getDashboardSchoolIdFromRequest, normalizeUuid } from "@/lib/dashboard-scope";
import type { Perfil, Rol } from "@/types/database";
import type { ZodSchema } from "zod";

type MinimalPerfil = Pick<Perfil, "id" | "rol" | "escuela_id" | "sede_id" | "activo">;

type AuthorizationResult =
  | { ok: true; perfil: MinimalPerfil; user: User }
  | { ok: false; response: NextResponse };

export type AuthorizeApiRequestOptions = {
  allowMustChangePassword?: boolean;
  request?: Request;
  skipCsrf?: boolean;
};

export function isAllowedOrigin(originHeader: string | null, targetHost?: string | null): boolean {
  if (!originHeader) return true;
  try {
    const originHost = new URL(originHeader).host.toLowerCase();
    if (!targetHost) {
      if (process.env.NEXT_PUBLIC_SITE_URL) {
        const configuredHost = new URL(process.env.NEXT_PUBLIC_SITE_URL).host.toLowerCase();
        if (originHost === configuredHost) return true;
      }
      return true;
    }
    const cleanHost = targetHost.split(",")[0].trim().toLowerCase();
    if (originHost === cleanHost) return true;
    const cleanWithoutPort = cleanHost.endsWith(":443")
      ? cleanHost.slice(0, -4)
      : cleanHost.endsWith(":80")
        ? cleanHost.slice(0, -3)
        : cleanHost;
    if (originHost === cleanWithoutPort) return true;
    if (process.env.NEXT_PUBLIC_SITE_URL) {
      const configuredHost = new URL(process.env.NEXT_PUBLIC_SITE_URL).host.toLowerCase();
      if (originHost === configuredHost) return true;
    }
    return false;
  } catch {
    return false;
  }
}

async function buildServerClient() {
  const cookieStore = await cookies();

  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return cookieStore.getAll();
        },
        setAll() {
          // Las rutas API aquí solo leen la sesión; no necesitan mutar cookies.
        },
      },
    }
  );
}

export function buildSupabaseAdminClient() {
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;

  if (!serviceRoleKey || !supabaseUrl) {
    throw new Error("Configuración del servidor incompleta.");
  }

  return createClient(supabaseUrl, serviceRoleKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  });
}

export async function authorizeApiRequest(
  allowedRoles: Rol[],
  optionsOrRequest?: AuthorizeApiRequestOptions | Request
): Promise<AuthorizationResult> {
  const options: AuthorizeApiRequestOptions =
    optionsOrRequest instanceof Request ? { request: optionsOrRequest } : optionsOrRequest || {};

  if (!options.skipCsrf) {
    let reqOrigin: string | null = null;
    let reqHost: string | null = null;
    let reqMethod: string | null = null;
    let secFetchSite: string | null = null;

    if (options.request) {
      reqOrigin = options.request.headers.get("origin");
      reqHost =
        options.request.headers.get("host") || options.request.headers.get("x-forwarded-host");
      reqMethod = options.request.method;
      secFetchSite = options.request.headers.get("sec-fetch-site");
    } else {
      try {
        const headerList = await headers();
        reqOrigin = headerList.get("origin");
        reqHost = headerList.get("host") || headerList.get("x-forwarded-host");
        secFetchSite = headerList.get("sec-fetch-site");
      } catch {
        // Fuera de contexto Next.js (tests unitarios u operaciones internas)
      }
    }

    if (secFetchSite === "cross-site") {
      return {
        ok: false,
        response: NextResponse.json({ error: "Origen no autorizado." }, { status: 403 }),
      };
    }

    const isMutative = reqMethod
      ? !["GET", "HEAD", "OPTIONS"].includes(reqMethod.toUpperCase())
      : reqOrigin !== null;

    if (isMutative && reqOrigin) {
      if (!isAllowedOrigin(reqOrigin, reqHost)) {
        return {
          ok: false,
          response: NextResponse.json({ error: "Origen no autorizado." }, { status: 403 }),
        };
      }
    }
  }

  const supabase = await buildServerClient();
  const {
    data: { user },
    error: userError,
  } = await supabase.auth.getUser();

  if (userError || !user) {
    return {
      ok: false,
      response: NextResponse.json({ error: "No autorizado." }, { status: 401 }),
    };
  }

  if (user.user_metadata?.debe_cambiar_password === true && !options.allowMustChangePassword) {
    return {
      ok: false,
      response: NextResponse.json(
        {
          error: "Debes cambiar tu contraseña antes de continuar.",
          code: "MUST_CHANGE_PASSWORD",
        },
        { status: 403 }
      ),
    };
  }

  const { data: perfil, error: perfilError } = await supabase
    .from("perfiles")
    .select("id, rol, escuela_id, sede_id, activo")
    .eq("id", user.id)
    .maybeSingle();

  if (perfilError || !perfil || !perfil.activo) {
    return {
      ok: false,
      response: NextResponse.json({ error: "Acceso denegado." }, { status: 403 }),
    };
  }

  if (!allowedRoles.includes(perfil.rol)) {
    return {
      ok: false,
      response: NextResponse.json(
        { error: "No tienes permisos para esta acción." },
        { status: 403 }
      ),
    };
  }

  return { ok: true, perfil, user };
}

export function normalizeText(value: unknown): string | null {
  if (typeof value !== "string") return null;
  const normalized = value.trim();
  return normalized.length > 0 ? normalized : null;
}

export function normalizeEmail(value: unknown): string | null {
  const normalized = normalizeText(value);
  return normalized ? normalized.toLowerCase() : null;
}

const RESERVED_AUTH_EMAIL_SUFFIXES = [
  "@alumno.local",
  "@instructor.local",
  "@administrativo.local",
];

export function ensureNonReservedAuthEmail(email: string | null): string | null {
  if (!email) return null;
  const normalized = email.toLowerCase();
  const usesReservedDomain = RESERVED_AUTH_EMAIL_SUFFIXES.some((suffix) =>
    normalized.endsWith(suffix)
  );

  return usesReservedDomain
    ? "Ese dominio de correo está reservado para credenciales internas."
    : null;
}

export function isAuthUserAlreadyRegisteredError(message: string | null | undefined) {
  const normalized = message?.toLowerCase() ?? "";
  return (
    normalized.includes("already registered") ||
    normalized.includes("already been registered") ||
    normalized.includes("already exists")
  );
}

export function normalizeCedula(value: unknown): string | null {
  const normalized = normalizeText(value);
  if (!normalized) return null;
  if (normalized.length < 5 || normalized.length > 30) return null;
  return normalized;
}

export function ensureSchoolScope(perfil: MinimalPerfil, escuelaId: string): string | null {
  if (perfil.rol === "super_admin") return null;
  if (perfil.escuela_id !== escuelaId) return "No puedes operar sobre otra escuela.";
  return null;
}

export function ensureSedeScope(perfil: MinimalPerfil, sedeId: string): string | null {
  if (perfil.rol === "super_admin" || perfil.rol === "admin_escuela") return null;
  if (!perfil.sede_id || perfil.sede_id !== sedeId) return "No puedes operar sobre otra sede.";
  return null;
}

export function getStaffReadSedeScope(perfil: Pick<MinimalPerfil, "rol" | "sede_id">) {
  const limited = ["admin_sede", "administrativo", "recepcion"].includes(perfil.rol);
  const sedeId = limited ? perfil.sede_id : null;
  return {
    sedeId,
    error: limited && !sedeId ? "Tu usuario no tiene sede asignada." : null,
  };
}

export function resolveEscuelaIdForRequest(
  request: Request,
  perfil: Pick<MinimalPerfil, "rol" | "escuela_id">,
  requestedEscuelaId?: string | null
) {
  if (perfil.rol !== "super_admin") {
    return perfil.escuela_id;
  }

  return (
    normalizeUuid(requestedEscuelaId) ||
    getDashboardSchoolIdFromRequest(request) ||
    perfil.escuela_id
  );
}

export async function parseJsonBody<T>(
  request: Request,
  schema: ZodSchema<T>
): Promise<{ ok: true; data: T } | { ok: false; response: NextResponse }> {
  let rawBody: unknown;

  try {
    rawBody = await request.json();
  } catch {
    return {
      ok: false,
      response: NextResponse.json({ error: "JSON inválido." }, { status: 400 }),
    };
  }

  const parsed = schema.safeParse(rawBody);
  if (!parsed.success) {
    return {
      ok: false,
      response: NextResponse.json({ error: "Datos inválidos." }, { status: 400 }),
    };
  }

  return { ok: true, data: parsed.data };
}

export async function findAuthUserByEmail(supabaseAdmin: unknown, email: string) {
  const client = supabaseAdmin as {
    auth: {
      admin: {
        listUsers: (params: { page: number; perPage: number }) => Promise<{
          data?: { users?: Array<{ id: string; email?: string | null }> };
          error?: { message?: string } | null;
        }>;
      };
    };
  };

  let page = 1;
  while (true) {
    const { data, error } = await client.auth.admin.listUsers({ page, perPage: 1000 });
    if (error) throw new Error(error.message || "No se pudo consultar usuarios.");

    const users = data?.users ?? [];
    const match = users.find((user) => user.email?.toLowerCase() === email.toLowerCase());
    if (match) return match;
    if (users.length < 1000) return null;
    page += 1;
  }
}

export async function createAuthUserWithRetryOnCollision(
  supabaseAdmin: unknown,
  payload: {
    email: string;
    password: string;
    email_confirm: boolean;
    user_metadata: Record<string, unknown>;
  },
  options?: {
    allowOrphanCleanup?: boolean;
  }
) {
  const client = supabaseAdmin as {
    auth: {
      admin: {
        createUser: (input: {
          email: string;
          password: string;
          email_confirm: boolean;
          user_metadata: Record<string, unknown>;
        }) => Promise<{
          data?: { user?: { id: string } | null };
          error?: { message?: string } | null;
        }>;
        deleteUser: (id: string) => Promise<unknown>;
      };
    };
    from: (table: string) => {
      select: (columns: string) => {
        eq: (
          column: string,
          value: string
        ) => {
          maybeSingle: () => Promise<{
            data?: { id?: string | null } | null;
            error?: { message?: string } | null;
          }>;
        };
      };
    };
  };

  let result = await client.auth.admin.createUser(payload);
  if (!isAuthUserAlreadyRegisteredError(result.error?.message)) {
    return result;
  }

  if (!options?.allowOrphanCleanup) {
    return result;
  }

  const existingUser = await findAuthUserByEmail(client, payload.email);
  if (!existingUser) {
    return result;
  }

  const { data: perfilExistente } = await client
    .from("perfiles")
    .select("id")
    .eq("id", existingUser.id)
    .maybeSingle();

  if (perfilExistente?.id) {
    return result;
  }

  await client.auth.admin.deleteUser(existingUser.id);
  result = await client.auth.admin.createUser(payload);
  return result;
}
