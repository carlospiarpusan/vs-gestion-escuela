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
        // Es una cédula → probar credenciales internas por rol.
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
              setError("Cédula o contraseña incorrectos.");
              setLoading(false);
              return;
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
    <div className="apple-auth-shell flex items-center justify-center px-4 py-8 sm:px-6">
      <div className="absolute left-4 top-4 z-20 sm:left-6 sm:top-6">
        <Link href="/" className="apple-button-secondary text-xs font-medium">
          &larr; Inicio
        </Link>
      </div>

      <div className="relative z-10 w-full max-w-md animate-scale-in">
        <div className="apple-auth-card px-6 py-7 sm:px-7 sm:py-8">
          <div className="mb-7 text-center">
            <span className="apple-badge">Acceso seguro</span>
            <h1 className="mt-4 text-3xl font-semibold tracking-tight text-[#1d1d1f] dark:text-[#f5f5f7]">
              AutoEscuela<span className="gradient-text">Pro</span>
            </h1>
            <p className="mt-2 text-sm text-[#86868b]">
              Inicia sesión para ver tu panel, pagos y evaluaciones.
            </p>
          </div>

          {error && (
            <div className="mb-4 rounded-2xl border border-red-200/70 bg-red-50/80 p-3 text-center text-sm text-red-600 dark:border-red-900/50 dark:bg-red-950/30 dark:text-red-400">
              {error}
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label htmlFor="identifier" className="apple-label">
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
                className="apple-input"
              />
            </div>

            <div>
              <label htmlFor="password" className="apple-label">
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
                  className="apple-input pr-12"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-2 top-1/2 flex h-8 w-8 -translate-y-1/2 items-center justify-center rounded-full text-[#86868b] transition-colors hover:bg-black/[0.04] dark:hover:bg-white/[0.06]"
                  aria-label={showPassword ? "Ocultar contraseña" : "Mostrar contraseña"}
                >
                  {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                </button>
              </div>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="apple-button-primary flex w-full justify-center py-3 text-sm font-medium disabled:opacity-50"
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

          <div className="my-6 flex items-center gap-3">
            <div className="apple-divider flex-1" />
            <span className="text-xs text-[#86868b]">o</span>
            <div className="apple-divider flex-1" />
          </div>

          <p className="text-center text-sm text-[#86868b]">
            ¿No tienes cuenta?{" "}
            <Link href="/registro" className="font-medium text-[#0071e3] hover:underline">
              Crear cuenta
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
}
