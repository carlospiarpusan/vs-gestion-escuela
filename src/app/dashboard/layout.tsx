/**
 * ============================================================
 * Layout del Dashboard - Estructura principal del panel
 * ============================================================
 *
 * Envuelve todas las páginas dentro de /dashboard/*.
 * Proporciona:
 * - Header con info del usuario, badge de rol, toggle dark mode, logout
 * - Sidebar de navegación (colapsable en móvil)
 * - Área de contenido principal
 *
 * Protección: El middleware.ts ya verifica la sesión antes de llegar aquí.
 * Este layout carga el perfil del usuario via useAuth() para mostrar
 * la navegación correcta según el rol.
 *
 * Dependencias: hooks/useAuth.ts, components/dashboard/Sidebar.tsx
 * ============================================================
 */

"use client";

import { useState, useEffect } from "react";
import { useAuth } from "@/hooks/useAuth";
import Sidebar from "@/components/dashboard/Sidebar";
import { LogOut, Sun, Moon, Menu, AlertCircle } from "lucide-react";

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const { user, perfil, loading, error, logout } = useAuth();
  const [darkMode, setDarkMode] = useState(false);
  const [sidebarOpen, setSidebarOpen] = useState(false);

  /**
   * Sincronizar dark mode con el DOM.
   * Se usa useEffect en lugar de manipulación directa en el render
   * para evitar errores de hidratación en SSR y efectos secundarios.
   */
  useEffect(() => {
    if (darkMode) {
      document.documentElement.classList.add("dark");
    } else {
      document.documentElement.classList.remove("dark");
    }
  }, [darkMode]);

  // --- Estado: Cargando autenticación ---
  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-white dark:bg-black">
        <div className="w-8 h-8 border-2 border-[#0071e3] border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  // --- Estado: Error de autenticación o perfil ---
  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-white dark:bg-black p-4">
        <div className="text-center max-w-md">
          <AlertCircle size={48} className="mx-auto mb-4 text-red-500" />
          <h2 className="text-lg font-semibold text-[#1d1d1f] dark:text-[#f5f5f7] mb-2">
            Error de autenticación
          </h2>
          <p className="text-sm text-[#86868b] mb-4">{error}</p>
          <button
            onClick={() => window.location.reload()}
            className="px-4 py-2 bg-[#0071e3] text-white rounded-lg text-sm hover:bg-[#0077ED] transition-colors"
          >
            Reintentar
          </button>
        </div>
      </div>
    );
  }

  // --- Estado: No autenticado (el middleware redirige, pero por seguridad) ---
  if (!user) return null;

  // --- Datos del usuario para el header ---
  const nombre = perfil?.nombre || user.user_metadata?.nombre || "Usuario";
  const escuela = user.user_metadata?.escuela || "Mi Autoescuela";

  return (
    <div className="min-h-screen bg-[#f5f5f7] dark:bg-[#000000] transition-colors duration-300 flex">
      {/* ========== Sidebar: Navegación lateral ========== */}
      <Sidebar
        rol={perfil?.rol}
        open={sidebarOpen}
        onClose={() => setSidebarOpen(false)}
      />

      {/* ========== Área principal (header + contenido) ========== */}
      <div className="flex-1 flex flex-col min-h-screen">
        {/* --- Header superior fijo --- */}
        <header className="bg-white/80 dark:bg-[#1d1d1f]/80 backdrop-blur-xl border-b border-gray-200/50 dark:border-gray-800/50 sticky top-0 z-30">
          <div className="px-4 sm:px-6 h-12 flex items-center justify-between">
            {/* Lado izquierdo: botón menú móvil + nombre usuario */}
            <div className="flex items-center gap-3">
              {/* Botón hamburguesa: solo visible en móvil (lg:hidden) */}
              <button
                onClick={() => setSidebarOpen(true)}
                className="lg:hidden p-2 rounded-full hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
                aria-label="Abrir menú de navegación"
              >
                <Menu size={16} className="text-[#1d1d1f] dark:text-[#f5f5f7]" />
              </button>
              <div>
                <span className="text-sm font-medium text-[#1d1d1f] dark:text-[#f5f5f7]">
                  {nombre}
                </span>
                <span className="text-xs text-[#86868b] ml-2 hidden sm:inline">
                  {escuela}
                </span>
              </div>
            </div>

            {/* Lado derecho: badge rol + dark mode + logout */}
            <div className="flex items-center gap-3">
              {/* Badge del rol del usuario */}
              {perfil?.rol && (
                <span className="text-[10px] uppercase tracking-wider px-2 py-0.5 rounded-full bg-[#0071e3]/10 text-[#0071e3] font-medium hidden sm:inline">
                  {perfil.rol.replace("_", " ")}
                </span>
              )}
              {/* Toggle dark mode */}
              <button
                onClick={() => setDarkMode(!darkMode)}
                className="p-2 rounded-full hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
                aria-label={darkMode ? "Cambiar a modo claro" : "Cambiar a modo oscuro"}
              >
                {darkMode ? (
                  <Sun size={16} className="text-[#f5f5f7]" />
                ) : (
                  <Moon size={16} className="text-[#1d1d1f]" />
                )}
              </button>
              {/* Botón cerrar sesión */}
              <button
                onClick={logout}
                className="flex items-center gap-1.5 text-xs text-[#86868b] hover:text-red-500 transition-colors"
                aria-label="Cerrar sesión"
              >
                <LogOut size={14} />
                <span className="hidden sm:inline">Salir</span>
              </button>
            </div>
          </div>
        </header>

        {/* --- Área de contenido: aquí se renderizan las páginas hijas --- */}
        <main className="flex-1 p-4 sm:p-6">{children}</main>
      </div>
    </div>
  );
}
