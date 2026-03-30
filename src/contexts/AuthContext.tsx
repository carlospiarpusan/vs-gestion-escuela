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
import {
  buildIdleLogoutHref,
  getIdleLogoutDeadline,
  IDLE_LOGOUT_ACTIVITY_THROTTLE_MS,
  IDLE_LOGOUT_LAST_ACTIVITY_KEY,
  IDLE_LOGOUT_STORAGE_KEY,
} from "@/lib/session-timeout";
import { createClient } from "@/lib/supabase";
import type { Session } from "@supabase/supabase-js";
import type { Perfil } from "@/types/database";

const APP_TITLE = "Condusoft";
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

const noopAsync = async () => {};

const FALLBACK_AUTH_CONTEXT: AuthContextValue = {
  user: null,
  perfil: null,
  escuelaNombre: null,
  sedeNombre: null,
  schoolOptions: [],
  activeEscuelaId: null,
  setActiveEscuelaId: noopAsync,
  refreshProfile: noopAsync,
  loading: true,
  error: null,
  logout: noopAsync,
};

let warnedAboutMissingAuthProvider = false;

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
  const signOutRedirectRef = useRef<string | null>(null);
  const idleLogoutTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const lastActivityAtRef = useRef(0);

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
  const [loading, setLoading] = useState(!Boolean(initialState?.user && initialState?.perfil));
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

  const clearIdleLogoutState = useCallback(() => {
    if (idleLogoutTimerRef.current) {
      clearTimeout(idleLogoutTimerRef.current);
      idleLogoutTimerRef.current = null;
    }

    if (typeof window === "undefined") {
      return;
    }

    window.localStorage.removeItem(IDLE_LOGOUT_STORAGE_KEY);
    window.localStorage.removeItem(IDLE_LOGOUT_LAST_ACTIVITY_KEY);
  }, []);

  const applySuperAdminGlobalScope = useCallback(
    async (
      supabase: ReturnType<typeof createClient>,
      perfilData: Perfil,
      options?: DashboardSchoolOption[]
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
      setActiveEscuelaIdState(null);
      persistDashboardSchoolSelection(null);
      setPerfil({ ...perfilData, escuela_id: null, sede_id: null });
      setEscuelaNombre(null);
      setSedeNombre(null);
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
          await applySuperAdminGlobalScope(supabase, typedPerfil);
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
    [applySuperAdminGlobalScope, resetAuthState, router]
  );

  const performSignOut = useCallback(
    async (redirectTo: string) => {
      signOutRedirectRef.current = redirectTo;
      clearIdleLogoutState();

      try {
        const supabase = createClient();
        await supabase.auth.signOut();
      } catch (err) {
        console.error("[AuthContext] Error al cerrar sesión:", err);
        signOutRedirectRef.current = null;
        router.replace(redirectTo);
      }
    },
    [clearIdleLogoutState, router]
  );

  useEffect(() => {
    document.title = escuelaNombre ?? APP_TITLE;
  }, [escuelaNombre]);

  useEffect(() => {
    const supabase = createClient();
    let cancelled = false;

    if (!hasInitialStateRef.current) {
      setTimeout(() => {
        void hydrateAuth(supabase, undefined, { redirectIfMissing: true, showLoading: true });
      }, 0);
    }

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((event, session) => {
      if (cancelled) return;

      if (event === "SIGNED_OUT" || !session?.user) {
        resetAuthState();
        clearIdleLogoutState();
        setLoading(false);
        router.replace(signOutRedirectRef.current ?? "/login");
        signOutRedirectRef.current = null;
        return;
      }

      void hydrateAuth(supabase, session, { redirectIfMissing: false, showLoading: false });
    });

    return () => {
      cancelled = true;
      subscription.unsubscribe();
    };
  }, [clearIdleLogoutState, hydrateAuth, resetAuthState, router]);

  useEffect(() => {
    if (!user) {
      clearIdleLogoutState();
      return;
    }

    const scheduleIdleLogout = (deadline: number) => {
      if (idleLogoutTimerRef.current) {
        clearTimeout(idleLogoutTimerRef.current);
      }

      const remainingMs = Math.max(deadline - Date.now(), 0);
      idleLogoutTimerRef.current = setTimeout(() => {
        void performSignOut(buildIdleLogoutHref());
      }, remainingMs);
    };

    const registerActivity = (force = false) => {
      if (typeof window === "undefined") return;
      if (document.visibilityState === "hidden" && !force) return;

      const now = Date.now();

      if (!force && now - lastActivityAtRef.current < IDLE_LOGOUT_ACTIVITY_THROTTLE_MS) {
        return;
      }

      lastActivityAtRef.current = now;
      const deadline = getIdleLogoutDeadline(now);
      window.localStorage.setItem(IDLE_LOGOUT_LAST_ACTIVITY_KEY, String(now));
      window.localStorage.setItem(IDLE_LOGOUT_STORAGE_KEY, String(deadline));
      scheduleIdleLogout(deadline);
    };

    const syncFromStorage = () => {
      if (typeof window === "undefined") return;

      const storedDeadline = Number(window.localStorage.getItem(IDLE_LOGOUT_STORAGE_KEY));

      if (!Number.isFinite(storedDeadline) || storedDeadline <= Date.now()) {
        void performSignOut(buildIdleLogoutHref());
        return false;
      }

      scheduleIdleLogout(storedDeadline);
      return true;
    };

    const handleVisibilityChange = () => {
      if (document.visibilityState === "visible") {
        const canContinue = syncFromStorage();
        if (!canContinue) return;
        registerActivity(true);
      }
    };

    const handleActivity = () => {
      registerActivity();
    };

    const handleStorage = (event: StorageEvent) => {
      if (event.key !== IDLE_LOGOUT_STORAGE_KEY) return;

      if (!event.newValue) {
        clearIdleLogoutState();
        return;
      }

      syncFromStorage();
    };

    registerActivity(true);

    window.addEventListener("pointerdown", handleActivity, { passive: true });
    window.addEventListener("keydown", handleActivity);
    window.addEventListener("touchstart", handleActivity, { passive: true });
    window.addEventListener("scroll", handleActivity, { passive: true });
    window.addEventListener("focus", handleVisibilityChange);
    window.addEventListener("storage", handleStorage);
    document.addEventListener("visibilitychange", handleVisibilityChange);

    return () => {
      if (idleLogoutTimerRef.current) {
        clearTimeout(idleLogoutTimerRef.current);
        idleLogoutTimerRef.current = null;
      }

      window.removeEventListener("pointerdown", handleActivity);
      window.removeEventListener("keydown", handleActivity);
      window.removeEventListener("touchstart", handleActivity);
      window.removeEventListener("scroll", handleActivity);
      window.removeEventListener("focus", handleVisibilityChange);
      window.removeEventListener("storage", handleStorage);
      document.removeEventListener("visibilitychange", handleVisibilityChange);
    };
  }, [clearIdleLogoutState, performSignOut, user]);

  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const setActiveEscuelaId = useCallback(async (_escuelaId: string) => {
    // super_admin opera en alcance global — no se necesita cambiar escuela activa.
  }, []);

  const logout = useCallback(async () => {
    await performSignOut("/");
  }, [performSignOut]);

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
  if (ctx) return ctx;

  if (process.env.NODE_ENV !== "production" && !warnedAboutMissingAuthProvider) {
    // eslint-disable-next-line react-hooks/globals
    warnedAboutMissingAuthProvider = true;
    console.warn(
      "[AuthContext] useAuth se renderizo sin <AuthProvider>; devolviendo fallback seguro."
    );
  }

  return FALLBACK_AUTH_CONTEXT;
}
