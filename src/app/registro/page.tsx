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

/**
 * Validar que la contraseña cumpla requisitos mínimos de seguridad.
 * - Mínimo 8 caracteres
 * - Al menos 1 letra mayúscula
 * - Al menos 1 número
 *
 * @returns Mensaje de error o null si es válida
 */
function validatePassword(password: string): string | null {
  if (password.length < 8) {
    return "La contraseña debe tener al menos 8 caracteres.";
  }
  if (!/[A-Z]/.test(password)) {
    return "La contraseña debe incluir al menos una mayúscula.";
  }
  if (!/[0-9]/.test(password)) {
    return "La contraseña debe incluir al menos un número.";
  }
  return null;
}

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
    const passwordError = validatePassword(password);
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
    <div className="min-h-screen flex flex-col items-center justify-center bg-[#f5f5f7] dark:bg-[#000] px-6 transition-colors duration-300">
      {/* Enlace para volver al inicio */}
      <div className="absolute top-6 left-6">
        <Link href="/" className="text-sm text-[#0071e3] hover:underline">
          &larr; Volver al inicio
        </Link>
      </div>

      <div className="w-full max-w-sm animate-scale-in">
        {/* ========== Logo y título ========== */}
        <div className="text-center mb-8">
          <h1 className="text-3xl font-semibold tracking-tight text-[#1d1d1f] dark:text-[#f5f5f7]">
            AutoEscuela<span className="gradient-text">Pro</span>
          </h1>
          <p className="text-[#86868b] mt-2 text-sm">
            Crea tu cuenta gratuita
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
          {/* Campo: Nombre completo */}
          <div>
            <label
              htmlFor="nombre"
              className="block text-xs font-medium text-[#1d1d1f] dark:text-[#f5f5f7] mb-1.5"
            >
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
              className="w-full px-4 py-3 rounded-xl border border-gray-200 dark:border-gray-800 bg-[#f5f5f7] dark:bg-[#1d1d1f] text-[#1d1d1f] dark:text-[#f5f5f7] text-sm placeholder:text-[#86868b] focus:outline-none focus:ring-2 focus:ring-[#0071e3] focus:border-transparent transition-all"
            />
          </div>

          {/* Campo: Email */}
          <div>
            <label
              htmlFor="email"
              className="block text-xs font-medium text-[#1d1d1f] dark:text-[#f5f5f7] mb-1.5"
            >
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
              className="w-full px-4 py-3 rounded-xl border border-gray-200 dark:border-gray-800 bg-[#f5f5f7] dark:bg-[#1d1d1f] text-[#1d1d1f] dark:text-[#f5f5f7] text-sm placeholder:text-[#86868b] focus:outline-none focus:ring-2 focus:ring-[#0071e3] focus:border-transparent transition-all"
            />
          </div>

          {/* Campo: Nombre de la autoescuela */}
          <div>
            <label
              htmlFor="escuela"
              className="block text-xs font-medium text-[#1d1d1f] dark:text-[#f5f5f7] mb-1.5"
            >
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
              className="w-full px-4 py-3 rounded-xl border border-gray-200 dark:border-gray-800 bg-[#f5f5f7] dark:bg-[#1d1d1f] text-[#1d1d1f] dark:text-[#f5f5f7] text-sm placeholder:text-[#86868b] focus:outline-none focus:ring-2 focus:ring-[#0071e3] focus:border-transparent transition-all"
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
                name="password"
                type={showPassword ? "text" : "password"}
                value={formData.password}
                onChange={handleChange}
                placeholder="Mín. 8 caracteres, 1 mayúscula, 1 número"
                required
                minLength={8}
                autoComplete="new-password"
                className="w-full px-4 py-3 rounded-xl border border-gray-200 dark:border-gray-800 bg-[#f5f5f7] dark:bg-[#1d1d1f] text-[#1d1d1f] dark:text-[#f5f5f7] text-sm placeholder:text-[#86868b] focus:outline-none focus:ring-2 focus:ring-[#0071e3] focus:border-transparent transition-all pr-12"
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
            className="w-full bg-[#0071e3] text-white py-3 rounded-xl text-sm font-medium hover:bg-[#0077ED] transition-all duration-300 hover:shadow-lg hover:shadow-[#0071e3]/20 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
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

        {/* ========== Términos ========== */}
        <p className="text-xs text-[#86868b] text-center mt-4">
          Al registrarte, aceptas nuestros términos de servicio y política de
          privacidad.
        </p>

        {/* ========== Separador ========== */}
        <div className="flex items-center gap-3 my-6">
          <div className="flex-1 h-px bg-gray-200 dark:bg-gray-800" />
          <span className="text-xs text-[#86868b]">o</span>
          <div className="flex-1 h-px bg-gray-200 dark:bg-gray-800" />
        </div>

        {/* ========== Enlace a login ========== */}
        <p className="text-center text-sm text-[#86868b]">
          ¿Ya tienes cuenta?{" "}
          <Link
            href="/login"
            className="text-[#0071e3] hover:underline font-medium"
          >
            Iniciar sesión
          </Link>
        </p>
      </div>
    </div>
  );
}
