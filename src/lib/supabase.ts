/**
 * ============================================================
 * Cliente de Supabase para el navegador (client-side)
 * ============================================================
 *
 * Crea una instancia del cliente Supabase usando @supabase/ssr.
 * Se usa en componentes "use client" para autenticación, queries y
 * operaciones CRUD contra la base de datos.
 *
 * IMPORTANTE: Las variables NEXT_PUBLIC_* se exponen al navegador.
 * Solo usar la ANON KEY aquí (nunca la SERVICE_ROLE_KEY).
 * La seguridad real se garantiza con las políticas RLS en Supabase.
 *
 * Dependencias: @supabase/ssr
 * Usado por: hooks/useAuth.ts, todas las páginas del dashboard
 * ============================================================
 */

import { createBrowserClient } from "@supabase/ssr";

// --- Validación de variables de entorno al cargar el módulo ---
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

if (!supabaseUrl) {
  throw new Error(
    "[Supabase] Falta NEXT_PUBLIC_SUPABASE_URL en las variables de entorno. " +
    "Copia .env.example a .env.local y configura tus credenciales."
  );
}

if (!supabaseAnonKey) {
  throw new Error(
    "[Supabase] Falta NEXT_PUBLIC_SUPABASE_ANON_KEY en las variables de entorno. " +
    "Copia .env.example a .env.local y configura tus credenciales."
  );
}

/**
 * Crea y devuelve un cliente Supabase para uso en el navegador.
 *
 * Cada llamada crea una nueva instancia (liviano, sin estado persistente).
 * El cliente gestiona automáticamente cookies y tokens de sesión.
 *
 * @returns Instancia de SupabaseClient configurada con URL y ANON_KEY
 *
 * @example
 * const supabase = createClient();
 * const { data } = await supabase.from("alumnos").select("*");
 */
export function createClient() {
  return createBrowserClient(supabaseUrl, supabaseAnonKey);
}
