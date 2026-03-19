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
          await supabase.from("escuelas").select("id, nombre").order("nombre", { ascending: true })
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

  useEffect(() => {
    document.title = escuelaNombre ?? APP_TITLE;
  }, [escuelaNombre]);

  useEffect(() => {
    const supabase = createClient();
    let cancelled = false;

    const resetAuthState = () => {
      if (cancelled) return;
      setUser(null);
      setPerfil(null);
      setEscuelaNombre(null);
      setSedeNombre(null);
      setSchoolOptions([]);
      setActiveEscuelaIdState(null);
      setError(null);
    };

    const hydrateAuth = async (
      sessionOverride?: Session | null,
      options?: { redirectIfMissing?: boolean; showLoading?: boolean }
    ) => {
      if (!cancelled && options?.showLoading !== false) {
        setLoading(true);
      }
      if (!cancelled) {
        setError(null);
      }

      try {
        // getSession() lee el JWT de la cookie local — sin llamada de red.
        // El middleware (proxy.ts) ya valida el token en el servidor,
        // así que aquí no necesitamos repetir esa validación.
        const session = sessionOverride ?? (await supabase.auth.getSession()).data.session;

        if (!session?.user) {
          resetAuthState();
          if (!cancelled) {
            setLoading(false);
          }
          if (options?.redirectIfMissing !== false) {
            router.push("/login");
          }
          return;
        }

        const currentUser = session.user;
        if (cancelled) return;
        setUser(currentUser);

        // Cargar perfil del usuario (rol, escuela_id, sede_id)
        const { data: perfilData, error: perfilError } = await supabase
          .from("perfiles")
          .select("*")
          .eq("id", currentUser.id)
          .single();

        if (cancelled) return;

        if (perfilError || !perfilData) {
          setError("No se pudo cargar tu perfil. Contacta al administrador.");
          setLoading(false);
          return;
        }

        const typedPerfil = perfilData as Perfil;

        if (typedPerfil.rol === "super_admin") {
          await applySuperAdminSchoolScope(supabase, typedPerfil);
          if (!cancelled) {
            setLoading(false);
          }
          return;
        }

        setPerfil(typedPerfil);
        setActiveEscuelaIdState(typedPerfil.escuela_id);
        setSchoolOptions([]);
        let nextEscuelaNombre: string | null = null;
        let nextSedeNombre: string | null = null;

        // Cargar nombre de escuela y sede en paralelo
        if (perfilData.escuela_id) {
          const [escuelaRes, sedeRes] = await Promise.all([
            supabase.from("escuelas").select("nombre").eq("id", perfilData.escuela_id).single(),
            perfilData.sede_id
              ? supabase.from("sedes").select("nombre").eq("id", perfilData.sede_id).single()
              : Promise.resolve({ data: null }),
          ]);

          if (cancelled) return;

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
        if (cancelled) return;
        console.error("[AuthContext] Error inesperado:", err);
        setError("Error de conexión. Verifica tu red e intenta de nuevo.");
        setLoading(false);
      }
    };

    if (!hasInitialStateRef.current) {
      void hydrateAuth(undefined, { redirectIfMissing: true, showLoading: true });
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

      void hydrateAuth(session, { redirectIfMissing: false, showLoading: false });
    });

    return () => {
      cancelled = true;
      subscription.unsubscribe();
    };
  }, [applySuperAdminSchoolScope, router]);

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
