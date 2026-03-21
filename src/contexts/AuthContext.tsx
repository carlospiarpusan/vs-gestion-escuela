"use client";

/**
 * AuthContext — estado de autenticación compartido para todo el dashboard.
 *
 * Beneficio de rendimiento: en lugar de que cada página llame a Supabase
 * de forma independiente (useAuth en 12 páginas = 24 llamadas de red),
 * AuthProvider hace UNA sola vez las llamadas y todas las páginas leen
 * del contexto React sin costo adicional de red.
 *
 * Flujo:
 * 1. getSession()     → lee la sesión del JWT local (sin llamada de red)
 * 2. from("perfiles") → 1 llamada para cargar el rol y escuela/sede del usuario
 * 3. from("escuelas") + from("sedes") → en paralelo, solo si el perfil tiene escuela_id
 */

import {
  createContext,
  useContext,
  useEffect,
  useState,
  useCallback,
  useRef,
  ReactNode,
} from "react";
import { useRouter } from "next/navigation";
import type { DashboardInitialAuthState, AuthUserSnapshot } from "@/lib/dashboard-auth-state";
import {
  DASHBOARD_SCHOOL_COOKIE,
  normalizeUuid,
  type DashboardSchoolOption,
} from "@/lib/dashboard-scope";
import { createClient } from "@/lib/supabase";
import type { Session } from "@supabase/supabase-js";
import type { Perfil } from "@/types/database";

const APP_TITLE = "AutoEscuelaPro";
const DASHBOARD_SCHOOL_STORAGE_KEY = "dashboard:selected-school-id";

function persistDashboardSchoolSelection(schoolId: string | null) {
  if (typeof window === "undefined") return;

  const normalizedSchoolId = normalizeUuid(schoolId);

  if (normalizedSchoolId) {
    window.localStorage.setItem(DASHBOARD_SCHOOL_STORAGE_KEY, normalizedSchoolId);
    document.cookie = `${DASHBOARD_SCHOOL_COOKIE}=${encodeURIComponent(normalizedSchoolId)}; path=/; max-age=31536000; samesite=lax`;
    return;
  }

  window.localStorage.removeItem(DASHBOARD_SCHOOL_STORAGE_KEY);
  document.cookie = `${DASHBOARD_SCHOOL_COOKIE}=; path=/; max-age=0; samesite=lax`;
}

function getStoredDashboardSchoolId() {
  if (typeof window === "undefined") return null;
  return normalizeUuid(window.localStorage.getItem(DASHBOARD_SCHOOL_STORAGE_KEY));
}

/* ─── Forma del contexto ─── */
interface AuthContextValue {
  user: AuthUserSnapshot | null;
  perfil: Perfil | null;
  escuelaNombre: string | null;
  sedeNombre: string | null;
  schoolOptions: DashboardSchoolOption[];
  activeEscuelaId: string | null;
  setActiveEscuelaId: (escuelaId: string) => Promise<void>;
  refreshProfile: () => Promise<void>;
  loading: boolean;
  error: string | null;
  logout: () => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | null>(null);

/* ─── Proveedor ─── */
export function AuthProvider({
  children,
  initialState,
}: {
  children: ReactNode;
  initialState?: DashboardInitialAuthState | null;
}) {
  const router = useRouter();
  const hasInitialStateRef = useRef(Boolean(initialState?.user && initialState?.perfil));

  const [user, setUser] = useState<AuthUserSnapshot | null>(initialState?.user ?? null);
  const [perfil, setPerfil] = useState<Perfil | null>(initialState?.perfil ?? null);
  const [escuelaNombre, setEscuelaNombre] = useState<string | null>(
    initialState?.escuelaNombre ?? null
  );
  const [sedeNombre, setSedeNombre] = useState<string | null>(initialState?.sedeNombre ?? null);
  const [schoolOptions, setSchoolOptions] = useState<DashboardSchoolOption[]>(
    initialState?.schoolOptions ?? []
  );
  const [activeEscuelaId, setActiveEscuelaIdState] = useState<string | null>(
    initialState?.activeEscuelaId ?? null
  );
  const [loading, setLoading] = useState(!hasInitialStateRef.current);
  const [error, setError] = useState<string | null>(null);

  const resetAuthState = useCallback(() => {
    setUser(null);
    setPerfil(null);
    setEscuelaNombre(null);
    setSedeNombre(null);
    setSchoolOptions([]);
    setActiveEscuelaIdState(null);
    setError(null);
  }, []);

  const applySuperAdminSchoolScope = useCallback(
    async (
      supabase: ReturnType<typeof createClient>,
      perfilData: Perfil,
      options?: DashboardSchoolOption[],
      requestedSchoolId?: string | null
    ) => {
      const nextOptions =
        options ??
        (((
          await supabase
            .from("escuelas")
            .select("id, nombre")
            .order("nombre", { ascending: true })
            .limit(100)
        ).data as DashboardSchoolOption[] | null) ||
          []);

      setSchoolOptions(nextOptions);

      const storedSchoolId = requestedSchoolId ?? getStoredDashboardSchoolId();
      const nextSchoolId =
        nextOptions.find((school) => school.id === storedSchoolId)?.id ??
        nextOptions[0]?.id ??
        null;

      setActiveEscuelaIdState(nextSchoolId);
      persistDashboardSchoolSelection(nextSchoolId);

      if (!nextSchoolId) {
        setPerfil({ ...perfilData, escuela_id: null, sede_id: null });
        setEscuelaNombre(null);
        setSedeNombre(null);
        return;
      }

      const [schoolRes, sedeRes] = await Promise.all([
        supabase.from("escuelas").select("nombre").eq("id", nextSchoolId).single(),
        supabase
          .from("sedes")
          .select("id, nombre")
          .eq("escuela_id", nextSchoolId)
          .order("es_principal", { ascending: false })
          .order("nombre", { ascending: true })
          .limit(1)
          .maybeSingle(),
      ]);

      const nextEscuelaNombre =
        schoolRes.data?.nombre ??
        nextOptions.find((school) => school.id === nextSchoolId)?.nombre ??
        null;
      const nextSedeNombre = sedeRes.data?.nombre ?? null;

      setPerfil({
        ...perfilData,
        escuela_id: nextSchoolId,
        sede_id: sedeRes.data?.id ?? null,
      });
      setEscuelaNombre(nextEscuelaNombre);
      setSedeNombre(nextSedeNombre);
    },
    []
  );

  const hydrateAuth = useCallback(
    async (
      supabase: ReturnType<typeof createClient>,
      sessionOverride?: Session | null,
      options?: { redirectIfMissing?: boolean; showLoading?: boolean }
    ) => {
      if (options?.showLoading !== false) {
        setLoading(true);
      }
      setError(null);

      try {
        const session = sessionOverride ?? (await supabase.auth.getSession()).data.session;

        if (!session?.user) {
          resetAuthState();
          setLoading(false);
          if (options?.redirectIfMissing !== false) {
            router.push("/login");
          }
          return;
        }

        const currentUser = session.user;
        setUser(currentUser);

        const { data: perfilData, error: perfilError } = await supabase
          .from("perfiles")
          .select(
            "id, escuela_id, sede_id, nombre, email, rol, telefono, avatar_url, activo, ultimo_acceso, created_at"
          )
          .eq("id", currentUser.id)
          .single();

        if (perfilError || !perfilData) {
          setError("No se pudo cargar tu perfil. Contacta al administrador.");
          setLoading(false);
          return;
        }

        const typedPerfil = perfilData as Perfil;

        if (typedPerfil.rol === "super_admin") {
          await applySuperAdminSchoolScope(supabase, typedPerfil);
          setLoading(false);
          return;
        }

        setPerfil(typedPerfil);
        setActiveEscuelaIdState(typedPerfil.escuela_id);
        setSchoolOptions([]);

        let nextEscuelaNombre: string | null = null;
        let nextSedeNombre: string | null = null;

        if (typedPerfil.escuela_id) {
          const [escuelaRes, sedeRes] = await Promise.all([
            supabase.from("escuelas").select("nombre").eq("id", typedPerfil.escuela_id).single(),
            typedPerfil.sede_id
              ? supabase.from("sedes").select("nombre").eq("id", typedPerfil.sede_id).single()
              : Promise.resolve({ data: null }),
          ]);

          if (escuelaRes.data) {
            nextEscuelaNombre = escuelaRes.data.nombre;
          }
          if (sedeRes.data) {
            nextSedeNombre = sedeRes.data.nombre;
          }
        }

        setEscuelaNombre(nextEscuelaNombre);
        setSedeNombre(nextSedeNombre);
        setLoading(false);
      } catch (err) {
        console.error("[AuthContext] Error inesperado:", err);
        setError("Error de conexión. Verifica tu red e intenta de nuevo.");
        setLoading(false);
      }
    },
    [applySuperAdminSchoolScope, resetAuthState, router]
  );

  useEffect(() => {
    document.title = escuelaNombre ?? APP_TITLE;
  }, [escuelaNombre]);

  useEffect(() => {
    const supabase = createClient();
    let cancelled = false;

    if (!hasInitialStateRef.current) {
      void hydrateAuth(supabase, undefined, { redirectIfMissing: true, showLoading: true });
    }

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((event, session) => {
      if (cancelled) return;

      if (event === "SIGNED_OUT" || !session?.user) {
        resetAuthState();
        setLoading(false);
        router.push("/login");
        return;
      }

      void hydrateAuth(supabase, session, { redirectIfMissing: false, showLoading: false });
    });

    return () => {
      cancelled = true;
      subscription.unsubscribe();
    };
  }, [hydrateAuth, resetAuthState, router]);

  const setActiveEscuelaId = useCallback(
    async (escuelaId: string) => {
      if (!perfil || perfil.rol !== "super_admin") return;

      const normalizedId = normalizeUuid(escuelaId);
      if (!normalizedId || normalizedId === activeEscuelaId) return;

      setLoading(true);
      setError(null);

      try {
        const supabase = createClient();
        await applySuperAdminSchoolScope(supabase, perfil, schoolOptions, normalizedId);
      } catch (err) {
        console.error("[AuthContext] Error cambiando alcance de escuela:", err);
        setError("No se pudo cambiar la escuela activa.");
      } finally {
        setLoading(false);
      }
    },
    [activeEscuelaId, applySuperAdminSchoolScope, perfil, schoolOptions]
  );

  const logout = useCallback(async () => {
    try {
      const supabase = createClient();
      await supabase.auth.signOut();
    } catch (err) {
      console.error("[AuthContext] Error al cerrar sesión:", err);
    } finally {
      router.push("/");
    }
  }, [router]);

  const refreshProfile = useCallback(async () => {
    const supabase = createClient();
    await hydrateAuth(supabase, undefined, { redirectIfMissing: false, showLoading: false });
  }, [hydrateAuth]);

  return (
    <AuthContext.Provider
      value={{
        user,
        perfil,
        escuelaNombre,
        sedeNombre,
        schoolOptions,
        activeEscuelaId,
        setActiveEscuelaId,
        refreshProfile,
        loading,
        error,
        logout,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

/* ─── Hook consumidor ─── */
export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth debe usarse dentro de <AuthProvider>");
  return ctx;
}
