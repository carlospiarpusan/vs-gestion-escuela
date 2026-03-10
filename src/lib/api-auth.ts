import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import { createServerClient } from "@supabase/ssr";
import type { Perfil, Rol } from "@/types/database";

type MinimalPerfil = Pick<Perfil, "id" | "rol" | "escuela_id" | "sede_id" | "activo">;

type AuthorizationResult =
  | { ok: true; perfil: MinimalPerfil }
  | { ok: false; response: NextResponse };

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

export async function authorizeApiRequest(allowedRoles: Rol[]): Promise<AuthorizationResult> {
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
      response: NextResponse.json({ error: "No tienes permisos para esta acción." }, { status: 403 }),
    };
  }

  return { ok: true, perfil };
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

export async function findAuthUserByEmail(
  supabaseAdmin: {
    auth: {
      admin: {
        listUsers: (params: { page: number; perPage: number }) => Promise<{
          data?: { users?: Array<{ id: string; email?: string | null }> };
          error?: { message?: string } | null;
        }>;
      };
    };
  },
  email: string
) {
  let page = 1;
  while (true) {
    const { data, error } = await supabaseAdmin.auth.admin.listUsers({ page, perPage: 1000 });
    if (error) throw new Error(error.message || "No se pudo consultar usuarios.");

    const users = data?.users ?? [];
    const match = users.find((user) => user.email?.toLowerCase() === email.toLowerCase());
    if (match) return match;
    if (users.length < 1000) return null;
    page += 1;
  }
}
