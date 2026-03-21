import { cookies } from "next/headers";
import { createServerClient } from "@supabase/ssr";
import { type DashboardSchoolOption } from "@/lib/dashboard-scope";
import type { DashboardInitialAuthState } from "@/lib/dashboard-auth-state";
import type { Perfil } from "@/types/database";

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
          // El layout solo necesita leer la sesion para hidratar el dashboard.
        },
      },
    }
  );
}

function toUserSnapshot(user: {
  id: string;
  email?: string | null;
  user_metadata?: Record<string, unknown>;
}) {
  return {
    id: user.id,
    email: user.email ?? undefined,
    user_metadata: user.user_metadata ?? {},
  };
}

export async function getDashboardInitialAuthState(): Promise<DashboardInitialAuthState | null> {
  const supabase = await buildServerClient();

  const {
    data: { user },
    error: userError,
  } = await supabase.auth.getUser();

  if (userError || !user) {
    return null;
  }

  const { data: perfilData, error: perfilError } = await supabase
    .from("perfiles")
    .select(
      "id, escuela_id, sede_id, nombre, email, rol, telefono, avatar_url, activo, ultimo_acceso, created_at"
    )
    .eq("id", user.id)
    .maybeSingle();

  if (perfilError || !perfilData || !perfilData.activo) {
    return null;
  }

  const perfil = perfilData as Perfil;

  if (perfil.rol === "super_admin") {
    const { data: schoolRows } = await supabase
      .from("escuelas")
      .select("id, nombre")
      .order("nombre", { ascending: true })
      .limit(100);

    const schoolOptions = (schoolRows as DashboardSchoolOption[] | null) ?? [];

    return {
      user: toUserSnapshot(user),
      perfil: { ...perfil, escuela_id: null, sede_id: null },
      escuelaNombre: null,
      sedeNombre: null,
      schoolOptions,
      activeEscuelaId: null,
    };
  }

  let escuelaNombre: string | null = null;
  let sedeNombre: string | null = null;

  if (perfil.escuela_id) {
    const [escuelaRes, sedeRes] = await Promise.all([
      supabase.from("escuelas").select("nombre").eq("id", perfil.escuela_id).maybeSingle(),
      perfil.sede_id
        ? supabase.from("sedes").select("nombre").eq("id", perfil.sede_id).maybeSingle()
        : Promise.resolve({ data: null }),
    ]);

    escuelaNombre = escuelaRes.data?.nombre ?? null;
    sedeNombre = sedeRes.data?.nombre ?? null;
  }

  return {
    user: toUserSnapshot(user),
    perfil,
    escuelaNombre,
    sedeNombre,
    schoolOptions: [],
    activeEscuelaId: perfil.escuela_id,
  };
}
