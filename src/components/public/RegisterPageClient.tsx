"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Eye, EyeOff, Loader2 } from "lucide-react";
import { createClient } from "@/lib/supabase";
import { getPasswordValidationError } from "@/lib/password-policy";
import AuthWorkspace from "@/components/public/AuthWorkspace";

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

export default function RegisterPageClient() {
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

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setLoading(true);

    const nombre = formData.nombre.trim();
    const email = formData.email.trim().toLowerCase();
    const escuela = formData.escuela.trim();
    const password = formData.password;

    if (!nombre || !email || !escuela || !password) {
      setError("Completa todos los campos.");
      setLoading(false);
      return;
    }

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
          data: {
            nombre,
            escuela,
          },
        },
      });

      if (error) {
        setError(sanitizeAuthError(error.message));
        setLoading(false);
        return;
      }

      router.push("/dashboard");
    } catch {
      setError("Error de conexión. Intenta de nuevo.");
      setLoading(false);
    }
  };

  return (
    <AuthWorkspace
      badge="Configuración inicial"
      title="Crea tu cuenta"
      description="Registra tu autoescuela en Condusoft y deja lista la estructura básica para empezar a operar en Colombia."
      backLabel="Volver al inicio"
      helperTitle="Una base sólida para tu escuela"
      highlights={[
        {
          title: "Escuela y sede",
          description: "Se crea la base inicial para que no arranques con configuraciones vacías.",
        },
        {
          title: "Control por módulos",
          description:
            "Alumnos, pagos, agenda, gastos y flota quedan listos dentro del mismo sistema.",
        },
        {
          title: "Escalamiento limpio",
          description: "Puedes crecer a más usuarios y sedes sin desordenar la operación.",
        },
      ]}
    >
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
              placeholder="Crea una contraseña segura"
              required
              autoComplete="new-password"
              className="apple-input pr-12"
            />
            <button
              type="button"
              onClick={() => setShowPassword(!showPassword)}
              className="absolute top-1/2 right-2 flex h-8 w-8 -translate-y-1/2 items-center justify-center rounded-full text-[var(--gray-500)] transition-colors hover:bg-black/[0.04] dark:hover:bg-white/[0.06]"
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

      <div className="my-6 flex items-center gap-3">
        <div className="apple-divider flex-1" />
        <span className="text-xs text-[var(--gray-500)]">o</span>
        <div className="apple-divider flex-1" />
      </div>

      <p className="text-center text-sm text-[var(--gray-500)]">
        ¿Ya tienes cuenta?{" "}
        <Link href="/login" className="apple-link">
          Iniciar sesión
        </Link>
      </p>
    </AuthWorkspace>
  );
}
