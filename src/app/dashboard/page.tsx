"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase";
import { LogOut, Sun, Moon } from "lucide-react";
import type { User } from "@supabase/supabase-js";

export default function DashboardPage() {
  const router = useRouter();
  const [user, setUser] = useState<User | null>(null);
  const [darkMode, setDarkMode] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const supabase = createClient();
    supabase.auth.getUser().then(({ data: { user } }) => {
      if (!user) {
        router.push("/login");
        return;
      }
      setUser(user);
      setLoading(false);
    });
  }, [router]);

  useEffect(() => {
    if (darkMode) {
      document.documentElement.classList.add("dark");
    } else {
      document.documentElement.classList.remove("dark");
    }
  }, [darkMode]);

  const handleLogout = async () => {
    const supabase = createClient();
    await supabase.auth.signOut();
    router.push("/");
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-white dark:bg-black">
        <div className="w-8 h-8 border-2 border-[#0071e3] border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  const nombre = user?.user_metadata?.nombre || "Usuario";
  const escuela = user?.user_metadata?.escuela || "Mi Autoescuela";

  return (
    <div className="min-h-screen bg-[#f5f5f7] dark:bg-[#0a0a0a] transition-colors duration-300">
      {/* Top bar */}
      <header className="bg-white/80 dark:bg-[#1d1d1f]/80 glass border-b border-gray-200/50 dark:border-gray-800/50 sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-6 h-12 flex items-center justify-between">
          <h1 className="text-sm font-semibold text-[#1d1d1f] dark:text-[#f5f5f7]">
            AutoEscuela<span className="gradient-text">Pro</span>
          </h1>
          <div className="flex items-center gap-3">
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
              onClick={handleLogout}
              className="flex items-center gap-1.5 text-xs text-[#86868b] hover:text-red-500 transition-colors"
            >
              <LogOut size={14} />
              Salir
            </button>
          </div>
        </div>
      </header>

      {/* Content */}
      <main className="max-w-7xl mx-auto px-6 py-8">
        {/* Welcome */}
        <div className="mb-8">
          <h2 className="text-3xl font-semibold text-[#1d1d1f] dark:text-[#f5f5f7]">
            Hola, {nombre}
          </h2>
          <p className="text-[#86868b] mt-1">{escuela}</p>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
          {[
            { label: "Alumnos Activos", value: "0", color: "#0071e3" },
            { label: "Clases Hoy", value: "0", color: "#28c840" },
            { label: "Exámenes Pendientes", value: "0", color: "#ff9f0a" },
            { label: "Tasa de Aprobados", value: "0%", color: "#bf5af2" },
          ].map((stat) => (
            <div
              key={stat.label}
              className="bg-white dark:bg-[#1d1d1f] rounded-2xl p-6 hover:shadow-md transition-shadow"
            >
              <p
                className="text-3xl font-bold"
                style={{ color: stat.color }}
              >
                {stat.value}
              </p>
              <p className="text-sm text-[#86868b] mt-1">{stat.label}</p>
            </div>
          ))}
        </div>

        {/* Empty state */}
        <div className="bg-white dark:bg-[#1d1d1f] rounded-2xl p-12 text-center">
          <p className="text-4xl mb-4">🚗</p>
          <h3 className="text-xl font-semibold text-[#1d1d1f] dark:text-[#f5f5f7] mb-2">
            ¡Bienvenido a tu dashboard!
          </h3>
          <p className="text-[#86868b] max-w-md mx-auto">
            Aquí podrás gestionar alumnos, instructores, vehículos, clases y
            exámenes. Pronto añadiremos todas las funcionalidades.
          </p>
        </div>
      </main>
    </div>
  );
}
