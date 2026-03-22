"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { Eye, EyeOff, Loader2 } from "lucide-react";
import { createClient } from "@/lib/supabase";
import AuthWorkspace from "@/components/public/AuthWorkspace";
import { IDLE_LOGOUT_REASON, IDLE_LOGOUT_MINUTES } from "@/lib/session-timeout";

export default function LoginPageClient() {
  const router = useRouter();
  const [showPassword, setShowPassword] = useState(false);
  const [identifier, setIdentifier] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const searchParams = useSearchParams();
  const loggedOutByInactivity = searchParams.get("reason") === IDLE_LOGOUT_REASON;

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
        const { error } = await supabase.auth.signInWithPassword({ email: trimmed, password });
        if (error) {
          setError("Correo o contraseña incorrectos.");
          setLoading(false);
          return;
        }
      } else {
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

      router.refresh();
      router.push("/dashboard");
    } catch {
      setError("Error de conexión. Intenta de nuevo.");
      setLoading(false);
    }
  };

  return (
    <AuthWorkspace
      badge="Acceso seguro"
      title="Inicia sesión"
      description="Entra a Condusoft para revisar operación, pagos, alumnos, evaluaciones y el día a día de tu autoescuela."
      backLabel="Inicio"
      highlights={[
        {
          title: "Operación diaria",
          description: "Consulta clases, alumnos, instructores y flota sin cambiar de sistema.",
        },
        {
          title: "Finanzas claras",
          description: "Revisa ingresos, gastos, cartera y caja diaria desde el mismo panel.",
        },
        {
          title: "Acceso por rol",
          description: "Cada usuario entra directo a lo que necesita según su responsabilidad.",
        },
      ]}
    >
      {loggedOutByInactivity && !error && (
        <div className="mb-4 rounded-2xl border border-amber-200/70 bg-amber-50/80 p-3 text-center text-sm text-amber-700 dark:border-amber-900/50 dark:bg-amber-950/30 dark:text-amber-300">
          Cerramos tu sesión por inactividad después de {IDLE_LOGOUT_MINUTES} minutos. Vuelve a
          entrar para seguir trabajando.
        </div>
      )}

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
              Iniciando sesión...
            </>
          ) : (
            "Iniciar Sesión"
          )}
        </button>
      </form>

      <div className="my-6 flex items-center gap-3">
        <div className="apple-divider flex-1" />
        <span className="text-xs text-[var(--gray-500)]">o</span>
        <div className="apple-divider flex-1" />
      </div>

      <p className="text-center text-sm text-[var(--gray-500)]">
        ¿No tienes cuenta?{" "}
        <Link href="/registro" className="apple-link">
          Crear cuenta
        </Link>
      </p>
    </AuthWorkspace>
  );
}
