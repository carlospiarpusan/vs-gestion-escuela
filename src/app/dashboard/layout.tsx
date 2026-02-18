"use client";

import { useState } from "react";
import { useAuth } from "@/hooks/useAuth";
import Sidebar from "@/components/dashboard/Sidebar";
import { LogOut, Sun, Moon, Menu } from "lucide-react";

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const { user, perfil, loading, logout } = useAuth();
  const [darkMode, setDarkMode] = useState(false);
  const [sidebarOpen, setSidebarOpen] = useState(false);

  // Sincronizar dark mode con el DOM
  if (typeof document !== "undefined") {
    if (darkMode) {
      document.documentElement.classList.add("dark");
    } else {
      document.documentElement.classList.remove("dark");
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-white dark:bg-black">
        <div className="w-8 h-8 border-2 border-[#0071e3] border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (!user) return null;

  const nombre = perfil?.nombre || user.user_metadata?.nombre || "Usuario";
  const escuela = user.user_metadata?.escuela || "Mi Autoescuela";

  return (
    <div className="min-h-screen bg-[#f5f5f7] dark:bg-[#0a0a0a] transition-colors duration-300 flex">
      {/* Sidebar */}
      <Sidebar
        rol={perfil?.rol}
        open={sidebarOpen}
        onClose={() => setSidebarOpen(false)}
      />

      {/* Main area */}
      <div className="flex-1 flex flex-col min-h-screen">
        {/* Header */}
        <header className="bg-white/80 dark:bg-[#1d1d1f]/80 glass border-b border-gray-200/50 dark:border-gray-800/50 sticky top-0 z-30">
          <div className="px-4 sm:px-6 h-12 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <button
                onClick={() => setSidebarOpen(true)}
                className="lg:hidden p-2 rounded-full hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
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
            <div className="flex items-center gap-3">
              {perfil?.rol && (
                <span className="text-[10px] uppercase tracking-wider px-2 py-0.5 rounded-full bg-[#0071e3]/10 text-[#0071e3] font-medium hidden sm:inline">
                  {perfil.rol.replace("_", " ")}
                </span>
              )}
              <button
                onClick={() => setDarkMode(!darkMode)}
                className="p-2 rounded-full hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
                title={darkMode ? "Modo claro" : "Modo oscuro"}
              >
                {darkMode ? (
                  <Sun size={16} className="text-[#f5f5f7]" />
                ) : (
                  <Moon size={16} className="text-[#1d1d1f]" />
                )}
              </button>
              <button
                onClick={logout}
                className="flex items-center gap-1.5 text-xs text-[#86868b] hover:text-red-500 transition-colors"
              >
                <LogOut size={14} />
                <span className="hidden sm:inline">Salir</span>
              </button>
            </div>
          </div>
        </header>

        {/* Content */}
        <main className="flex-1 p-4 sm:p-6">{children}</main>
      </div>
    </div>
  );
}
