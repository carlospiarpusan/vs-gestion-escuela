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
import type { User } from "@supabase/supabase-js";
import type { Perfil } from "@/types/database";

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

    const init = async () => {
      try {
        // getSession() lee el JWT de la cookie local — sin llamada de red.
        // El middleware (proxy.ts) ya valida el token en el servidor,
        // así que aquí no necesitamos repetir esa validación.
        const {
          data: { session },
        } = await supabase.auth.getSession();

        if (!session?.user) {
          router.push("/login");
          return;
        }

        const currentUser = session.user;
        setUser(currentUser);

        // Cargar perfil del usuario (rol, escuela_id, sede_id)
        const { data: perfilData, error: perfilError } = await supabase
          .from("perfiles")
          .select("*")
          .eq("id", currentUser.id)
          .single();

        if (perfilError || !perfilData) {
          setError("No se pudo cargar tu perfil. Contacta al administrador.");
          setLoading(false);
          return;
        }

        setPerfil(perfilData as Perfil);

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

          if (escuelaRes.data) {
            setEscuelaNombre(escuelaRes.data.nombre);
            document.title = escuelaRes.data.nombre;
          }
          if (sedeRes.data) setSedeNombre(sedeRes.data.nombre);
        }

        setLoading(false);
      } catch (err) {
        console.error("[AuthContext] Error inesperado:", err);
        setError("Error de conexión. Verifica tu red e intenta de nuevo.");
        setLoading(false);
      }
    };

    init();
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
