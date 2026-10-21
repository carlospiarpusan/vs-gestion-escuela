import { cookies } from "next/headers";
import { cache } from "react";
import { createServerClient } from "@supabase/ssr";
import { type DashboardSchoolOption } from "@/lib/dashboard-scope";
import type { DashboardInitialAuthState } from "@/lib/dashboard-auth-state";
import type { Perfil, SchoolSubscriptionAccess } from "@/types/database";

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
  app_metadata?: Record<string, unknown>;
}) {
  return {
    id: user.id,
    email: user.email ?? undefined,
    user_metadata: user.user_metadata ?? {},
    app_metadata: { debe_cambiar_password: user.app_metadata?.debe_cambiar_password === true },
  };
}

// Compartido por layout y pagina solo durante la misma peticion, nunca entre usuarios.
export const getDashboardInitialAuthState = cache(
  async (): Promise<DashboardInitialAuthState | null> => {
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
        subscriptionAccess: null,
        schoolOptions,
        activeEscuelaId: null,
      };
    }

    let escuelaNombre: string | null = null;
    let sedeNombre: string | null = null;
    let subscriptionAccess: SchoolSubscriptionAccess | null = null;

    if (perfil.escuela_id) {
      const [escuelaRes, sedeRes, subscriptionRes] = await Promise.all([
        supabase.from("escuelas").select("nombre").eq("id", perfil.escuela_id).maybeSingle(),
        perfil.sede_id
          ? supabase.from("sedes").select("nombre").eq("id", perfil.sede_id).maybeSingle()
          : Promise.resolve({ data: null }),
        supabase.rpc("my_school_subscription_access"),
      ]);

      escuelaNombre = escuelaRes.data?.nombre ?? null;
      sedeNombre = sedeRes.data?.nombre ?? null;
      subscriptionAccess = (subscriptionRes.data ?? null) as SchoolSubscriptionAccess | null;
    }

    return {
      user: toUserSnapshot(user),
      perfil,
      escuelaNombre,
      sedeNombre,
      subscriptionAccess,
      schoolOptions: [],
      activeEscuelaId: perfil.escuela_id,
    };
  }
);
