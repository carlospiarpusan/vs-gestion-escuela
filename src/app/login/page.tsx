/**
 * ============================================================
 * Página de Login - /login
 * ============================================================
 *
 * Formulario de inicio de sesión con email y contraseña.
 * Usa Supabase Auth para autenticar al usuario.
 *
 * Flujo:
 * 1. Usuario introduce email y contraseña
 * 2. Se valida el formato del email (trim + validación)
 * 3. Se llama a supabase.auth.signInWithPassword()
 * 4. Si es exitoso → redirige a /dashboard
 * 5. Si falla → muestra error genérico (no revela si el email existe)
 *
 * Seguridad:
 * - Mensaje de error genérico para evitar enumeración de emails
 * - Trim del email para evitar espacios accidentales
 * - Try/catch para manejar errores de red
 * - El middleware.ts redirige a /dashboard si ya está autenticado
 *
 * Dependencias: lib/supabase.ts, lucide-react
 * ============================================================
 */

"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Eye, EyeOff, Loader2 } from "lucide-react";
import { createClient } from "@/lib/supabase";

export default function LoginPage() {
  const router = useRouter();
  const [showPassword, setShowPassword] = useState(false);
  const [identifier, setIdentifier] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  /**
   * Manejar envío del formulario de login.
   * Valida inputs, llama a Supabase Auth y redirige al dashboard.
   */
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setLoading(true);

    const trimmed = identifier.trim().toLowerCase();
    if (!trimmed || !password) {
      setError("Completa todos los campos.");
      setLoading(false);
      return;
    }

    try {
      const supabase = createClient();

      if (trimmed.includes("@")) {
        // Es un correo real → intentar directamente
        const { error } = await supabase.auth.signInWithPassword({ email: trimmed, password });
        if (error) {
          setError("Correo o contraseña incorrectos.");
          setLoading(false);
          return;
        }
      } else {
        // Es una cédula → probar alumno → instructor → administrativo → email real
        const { error: errAlumno } = await supabase.auth.signInWithPassword({
          email: `${trimmed}@alumno.local`,
          password,
        });
        if (errAlumno) {
          const { error: errInstructor } = await supabase.auth.signInWithPassword({
            email: `${trimmed}@instructor.local`,
            password,
          });
          if (errInstructor) {
            const { error: errAdmin } = await supabase.auth.signInWithPassword({
              email: `${trimmed}@administrativo.local`,
              password,
            });
            if (errAdmin) {
              // Último intento: el usuario puede tener email real.
              // Buscar el email en la tabla perfiles por cédula.
              const lookup = await fetch("/api/buscar-email-cedula", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ cedula: trimmed }),
              });
              if (lookup.ok) {
                const { email: realEmail } = await lookup.json();
                const { error: errReal } = await supabase.auth.signInWithPassword({
                  email: realEmail,
                  password,
                });
                if (errReal) {
                  setError("Cédula o contraseña incorrectos.");
                  setLoading(false);
                  return;
                }
              } else {
                setError("Cédula o contraseña incorrectos.");
                setLoading(false);
                return;
              }
            }
          }
        }
      }

      // Login exitoso → refrescar sesión del servidor y redirigir
      router.refresh();
      router.push("/dashboard");
    } catch {
      // Error de red o servidor
      setError("Error de conexión. Intenta de nuevo.");
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-[#f5f5f7] dark:bg-[#000] px-4 sm:px-6 py-8 transition-colors duration-300">
      {/* Enlace para volver al inicio */}
      <div className="absolute top-4 left-4 sm:top-6 sm:left-6">
        <Link href="/" className="text-sm text-[#0071e3] hover:underline">
          &larr; Inicio
        </Link>
      </div>

      <div className="w-full max-w-sm animate-scale-in">
        {/* ========== Logo y título ========== */}
        <div className="text-center mb-6 sm:mb-8">
          <h1 className="text-3xl font-semibold tracking-tight text-[#1d1d1f] dark:text-[#f5f5f7]">
            AutoEscuela<span className="gradient-text">Pro</span>
          </h1>
          <p className="text-[#86868b] mt-2 text-sm">
            Inicia sesión en tu cuenta
          </p>
        </div>

        {/* ========== Mensaje de error ========== */}
        {error && (
          <div className="mb-4 p-3 rounded-xl bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 text-red-600 dark:text-red-400 text-sm text-center">
            {error}
          </div>
        )}

        {/* ========== Formulario ========== */}
        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Campo: Email */}
          <div>
            <label
              htmlFor="identifier"
              className="block text-xs font-medium text-[#1d1d1f] dark:text-[#f5f5f7] mb-1.5"
            >
              Correo electrónico o número de cédula
            </label>
            <input
              id="identifier"
              type="text"
              value={identifier}
              onChange={(e) => setIdentifier(e.target.value)}
              placeholder="tu@email.com o número de cédula"
              required
              autoComplete="username"
              className="w-full px-4 py-3.5 sm:py-3 rounded-xl border border-gray-200 dark:border-gray-800 bg-[#f5f5f7] dark:bg-[#1d1d1f] text-[#1d1d1f] dark:text-[#f5f5f7] text-base sm:text-sm placeholder:text-[#86868b] focus:outline-none focus:ring-2 focus:ring-[#0071e3] focus:border-transparent transition-all"
            />
          </div>

          {/* Campo: Contraseña (con toggle de visibilidad) */}
          <div>
            <label
              htmlFor="password"
              className="block text-xs font-medium text-[#1d1d1f] dark:text-[#f5f5f7] mb-1.5"
            >
              Contraseña
            </label>
            <div className="relative">
              <input
                id="password"
                type={showPassword ? "text" : "password"}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Tu contraseña"
                required
                autoComplete="current-password"
                className="w-full px-4 py-3.5 sm:py-3 rounded-xl border border-gray-200 dark:border-gray-800 bg-[#f5f5f7] dark:bg-[#1d1d1f] text-[#1d1d1f] dark:text-[#f5f5f7] text-base sm:text-sm placeholder:text-[#86868b] focus:outline-none focus:ring-2 focus:ring-[#0071e3] focus:border-transparent transition-all pr-12"
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-[#86868b] hover:text-[#1d1d1f] dark:hover:text-[#f5f5f7] transition-colors"
                aria-label={showPassword ? "Ocultar contraseña" : "Mostrar contraseña"}
              >
                {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
              </button>
            </div>
          </div>

          {/* Botón de envío */}
          <button
            type="submit"
            disabled={loading}
            className="w-full bg-[#0071e3] text-white py-3.5 sm:py-3 rounded-xl text-base sm:text-sm font-medium hover:bg-[#0077ED] transition-all duration-300 hover:shadow-lg hover:shadow-[#0071e3]/20 active:scale-[0.98] disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
          >
            {loading ? (
              <>
                <Loader2 size={16} className="animate-spin" />
                Iniciando sesión...
              </>
            ) : (
              "Iniciar Sesión"
            )}
          </button>
        </form>

        {/* ========== Separador ========== */}
        <div className="flex items-center gap-3 my-6">
          <div className="flex-1 h-px bg-gray-200 dark:bg-gray-800" />
          <span className="text-xs text-[#86868b]">o</span>
          <div className="flex-1 h-px bg-gray-200 dark:bg-gray-800" />
        </div>

        {/* ========== Enlace a registro ========== */}
        <p className="text-center text-sm text-[#86868b]">
          ¿No tienes cuenta?{" "}
          <Link
            href="/registro"
            className="text-[#0071e3] hover:underline font-medium"
          >
            Crear cuenta
          </Link>
        </p>
      </div>
    </div>
  );
}
