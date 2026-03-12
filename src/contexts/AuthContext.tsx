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
  ReactNode,
} from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase";
import type { Session, User } from "@supabase/supabase-js";
import type { Perfil } from "@/types/database";

const APP_TITLE = "AutoEscuelaPro";

/* ─── Forma del contexto ─── */
interface AuthContextValue {
  user: User | null;
  perfil: Perfil | null;
  escuelaNombre: string | null;
  sedeNombre: string | null;
  loading: boolean;
  error: string | null;
  logout: () => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | null>(null);

/* ─── Proveedor ─── */
export function AuthProvider({ children }: { children: ReactNode }) {
  const router = useRouter();

  const [user, setUser] = useState<User | null>(null);
  const [perfil, setPerfil] = useState<Perfil | null>(null);
  const [escuelaNombre, setEscuelaNombre] = useState<string | null>(null);
  const [sedeNombre, setSedeNombre] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const supabase = createClient();
    let cancelled = false;

    const resetAuthState = () => {
      if (cancelled) return;
      setUser(null);
      setPerfil(null);
      setEscuelaNombre(null);
      setSedeNombre(null);
      setError(null);
      document.title = APP_TITLE;
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
        const session = sessionOverride ?? (
          await supabase.auth.getSession()
        ).data.session;

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

        setPerfil(perfilData as Perfil);
        let nextEscuelaNombre: string | null = null;
        let nextSedeNombre: string | null = null;

        // Cargar nombre de escuela y sede en paralelo
        if (perfilData.escuela_id) {
          const [escuelaRes, sedeRes] = await Promise.all([
            supabase
              .from("escuelas")
              .select("nombre")
              .eq("id", perfilData.escuela_id)
              .single(),
            perfilData.sede_id
              ? supabase
                  .from("sedes")
                  .select("nombre")
                  .eq("id", perfilData.sede_id)
                  .single()
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
        document.title = nextEscuelaNombre ?? APP_TITLE;
        setLoading(false);
      } catch (err) {
        if (cancelled) return;
        console.error("[AuthContext] Error inesperado:", err);
        setError("Error de conexión. Verifica tu red e intenta de nuevo.");
        setLoading(false);
      }
    };

    void hydrateAuth(undefined, { redirectIfMissing: true, showLoading: true });

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
  }, [router]);

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
      value={{ user, perfil, escuelaNombre, sedeNombre, loading, error, logout }}
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
