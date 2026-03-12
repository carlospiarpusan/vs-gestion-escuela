/**
 * ============================================================
 * Página de Registro - /registro
 * ============================================================
 *
 * Formulario para crear una cuenta nueva de administrador de autoescuela.
 * Al registrarse, el trigger handle_new_user() en Supabase crea
 * automáticamente: escuela + sede principal + perfil admin_escuela.
 *
 * Flujo:
 * 1. Usuario llena: nombre, email, nombre de escuela, contraseña
 * 2. Se validan los campos (trim, formato, contraseña segura)
 * 3. Se llama a supabase.auth.signUp() con metadata
 * 4. El trigger PostgreSQL crea la escuela y el perfil
 * 5. Si es exitoso → redirige a /dashboard
 *
 * Seguridad:
 * - Contraseña mínima 8 caracteres con al menos 1 mayúscula y 1 número
 * - Trim de todos los inputs para evitar espacios
 * - Mensajes de error sanitizados (no se exponen errores internos de Supabase)
 * - Try/catch para errores de red
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
import { getPasswordValidationError } from "@/lib/password-policy";

/**
 * Sanitizar mensajes de error de Supabase para no exponer
 * información interna de la base de datos.
 */
function sanitizeAuthError(message: string): string {
  const lower = message.toLowerCase();
  if (lower.includes("already registered") || lower.includes("already exists")) {
    return "Ya existe una cuenta con este correo electrónico.";
  }
  if (lower.includes("invalid email")) {
    return "El formato del correo electrónico no es válido.";
  }
  if (lower.includes("password")) {
    return "La contraseña no cumple los requisitos mínimos.";
  }
  return "Error al crear la cuenta. Intenta de nuevo.";
}

export default function RegistroPage() {
  const router = useRouter();
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    nombre: "",
    email: "",
    escuela: "",
    password: "",
  });

  /** Actualizar un campo del formulario */
  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  /**
   * Manejar envío del formulario de registro.
   * Valida campos, crea la cuenta en Supabase y redirige al dashboard.
   */
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setLoading(true);

    // Limpiar espacios de todos los campos de texto
    const nombre = formData.nombre.trim();
    const email = formData.email.trim().toLowerCase();
    const escuela = formData.escuela.trim();
    const password = formData.password;

    // Validación de campos requeridos
    if (!nombre || !email || !escuela || !password) {
      setError("Completa todos los campos.");
      setLoading(false);
      return;
    }

    // Validación de contraseña segura
    const passwordError = getPasswordValidationError(password);
    if (passwordError) {
      setError(passwordError);
      setLoading(false);
      return;
    }

    try {
      const supabase = createClient();
      const { error } = await supabase.auth.signUp({
        email,
        password,
        options: {
          // Metadata enviada al trigger handle_new_user()
          // para crear la escuela y el perfil automáticamente
          data: {
            nombre,
            escuela,
          },
        },
      });

      if (error) {
        // Sanitizar el error para no exponer detalles internos
        setError(sanitizeAuthError(error.message));
        setLoading(false);
        return;
      }

      // Registro exitoso → redirigir al dashboard
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
          &larr; Volver al inicio
        </Link>
      </div>

      <div className="relative z-10 w-full max-w-md animate-scale-in">
        <div className="apple-auth-card px-6 py-7 sm:px-7 sm:py-8">
          <div className="mb-7 text-center">
            <span className="apple-badge">Configuración inicial</span>
            <h1 className="mt-4 text-3xl font-semibold tracking-tight text-[#1d1d1f] dark:text-[#f5f5f7]">
              AutoEscuela<span className="gradient-text">Pro</span>
            </h1>
            <p className="mt-2 text-sm text-[#86868b]">
              Crea tu cuenta y deja lista tu autoescuela en minutos.
            </p>
          </div>

          {error && (
            <div className="mb-4 rounded-2xl border border-red-200/70 bg-red-50/80 p-3 text-center text-sm text-red-600 dark:border-red-900/50 dark:bg-red-950/30 dark:text-red-400">
              {error}
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label htmlFor="nombre" className="apple-label">
                Nombre completo
              </label>
              <input
                id="nombre"
                name="nombre"
                type="text"
                value={formData.nombre}
                onChange={handleChange}
                placeholder="Tu nombre"
                required
                autoComplete="name"
                maxLength={100}
                className="apple-input"
              />
            </div>

            <div>
              <label htmlFor="email" className="apple-label">
                Correo electrónico
              </label>
              <input
                id="email"
                name="email"
                type="email"
                value={formData.email}
                onChange={handleChange}
                placeholder="tu@email.com"
                required
                autoComplete="email"
                className="apple-input"
              />
            </div>

            <div>
              <label htmlFor="escuela" className="apple-label">
                Nombre de tu autoescuela
              </label>
              <input
                id="escuela"
                name="escuela"
                type="text"
                value={formData.escuela}
                onChange={handleChange}
                placeholder="Mi Autoescuela"
                required
                autoComplete="organization"
                maxLength={150}
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
                  name="password"
                  type={showPassword ? "text" : "password"}
                  value={formData.password}
                  onChange={handleChange}
                  placeholder="Mín. 8 caracteres, 1 mayúscula, 1 número"
                  required
                  minLength={8}
                  autoComplete="new-password"
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
                  Creando cuenta...
                </>
              ) : (
                "Crear cuenta"
              )}
            </button>
          </form>

          <p className="mt-4 text-center text-xs leading-5 text-[#86868b]">
            Al registrarte, aceptas nuestros términos de servicio y política de privacidad.
          </p>

          <div className="my-6 flex items-center gap-3">
            <div className="apple-divider flex-1" />
            <span className="text-xs text-[#86868b]">o</span>
            <div className="apple-divider flex-1" />
          </div>

          <p className="text-center text-sm text-[#86868b]">
            ¿Ya tienes cuenta?{" "}
            <Link href="/login" className="font-medium text-[#0071e3] hover:underline">
              Iniciar sesión
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
}
