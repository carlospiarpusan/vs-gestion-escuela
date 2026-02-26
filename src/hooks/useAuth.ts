/**
 * useAuth — re-exporta el hook del AuthContext.
 *
 * Mantener este archivo permite que todas las páginas sigan importando
 * desde "@/hooks/useAuth" sin cambios, mientras la lógica real vive
 * en AuthContext.tsx.
 */
export { useAuth } from "@/contexts/AuthContext";
