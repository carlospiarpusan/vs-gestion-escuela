/**
 * ============================================================
 * Hook de Autenticación - useAuth
 * ============================================================
 *
 * Hook principal para gestionar el estado de autenticación.
 * Verifica si el usuario está logueado, carga su perfil (rol, escuela, sede)
 * y redirige a /login si no está autenticado.
 *
 * Estados posibles:
 * - loading=true  → Verificando sesión (mostrar spinner)
 * - loading=false, user=null  → No autenticado (redirigiendo a /login)
 * - loading=false, user!=null, perfil=null → Error cargando perfil
 * - loading=false, user!=null, perfil!=null → Autenticado correctamente
 *
 * Dependencias: lib/supabase.ts, types/database.ts
 * Usado por: dashboard/layout.tsx, todas las páginas protegidas
 * ============================================================
 */

"use client";

import { useEffect, useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase";
import type { User } from "@supabase/supabase-js";
import type { Perfil } from "@/types/database";

/**
 * Estado interno del hook de autenticación.
 * - error: mensaje de error si falla la carga del perfil o la autenticación
 */
interface AuthState {
  user: User | null;
  perfil: Perfil | null;
  loading: boolean;
  error: string | null;
}

export function useAuth() {
  const router = useRouter();
  const [state, setState] = useState<AuthState>({
    user: null,
    perfil: null,
    loading: true,
    error: null,
  });

  useEffect(() => {
    const supabase = createClient();

    /**
     * Flujo de verificación:
     * 1. Obtener usuario de la sesión actual (cookie/token)
     * 2. Si no hay usuario → redirigir a /login
     * 3. Si hay usuario → cargar su perfil desde la tabla "perfiles"
     * 4. Actualizar el estado con user + perfil o error
     */
    const checkAuth = async () => {
      try {
        // Paso 1: Verificar sesión activa
        const { data: { user }, error: authError } = await supabase.auth.getUser();

        if (authError || !user) {
          // No autenticado → redirigir al login
          router.push("/login");
          return;
        }

        // Paso 2: Cargar perfil del usuario (contiene rol, escuela_id, sede_id)
        const { data: perfil, error: perfilError } = await supabase
          .from("perfiles")
          .select("*")
          .eq("id", user.id)
          .single();

        if (perfilError) {
          // Usuario autenticado pero sin perfil en la BD
          // Esto puede pasar si el trigger handle_new_user() falló
          console.error("[useAuth] Error cargando perfil:", perfilError.message);
          setState({
            user,
            perfil: null,
            loading: false,
            error: "No se pudo cargar tu perfil. Contacta al administrador.",
          });
          return;
        }

        // Paso 3: Todo OK → actualizar estado
        setState({
          user,
          perfil: perfil as Perfil,
          loading: false,
          error: null,
        });
      } catch (err) {
        // Error inesperado (red, timeout, etc.)
        console.error("[useAuth] Error inesperado:", err);
        setState({
          user: null,
          perfil: null,
          loading: false,
          error: "Error de conexión. Verifica tu red e intenta de nuevo.",
        });
      }
    };

    checkAuth();
  }, [router]);

  /**
   * Cierra la sesión del usuario y redirige a la landing page.
   * Limpia la cookie de sesión de Supabase.
   */
  const logout = useCallback(async () => {
    try {
      const supabase = createClient();
      await supabase.auth.signOut();
    } catch (err) {
      console.error("[useAuth] Error al cerrar sesión:", err);
    } finally {
      // Redirigir siempre, incluso si signOut falla
      router.push("/");
    }
  }, [router]);

  return { ...state, logout };
}
