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
  const searchParams = useSearchParams();
  const loggedOutByInactivity = searchParams.get("reason") === IDLE_LOGOUT_REASON;
  const pendingRegistration = searchParams.get("registered") === "1";
  const registeredEmail = searchParams.get("email")?.trim().toLowerCase() ?? "";
  const [showPassword, setShowPassword] = useState(false);
  const [identifier, setIdentifier] = useState(registeredEmail);
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

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
      mode="login"
      badge="Login"
      title="Inicia sesión"
      description="Entra con tu correo o cédula y vuelve directo a alumnos, pagos y agenda."
      backLabel="Inicio"
      helperTitle="La operación de tu escuela, lista al entrar"
      heroVariant="minimal"
      securityNote="Correo para administradores. Cédula para alumnos, instructores y administrativos."
      highlights={[
        {
          title: "Acceso sin fricción",
          description: "Correo o cédula, contraseña y entrada directa al panel.",
        },
        {
          title: "Mensajes claros",
          description: "Errores visibles y una jerarquía sobria para entrar sin dudas.",
        },
      ]}
    >
      {loggedOutByInactivity && !error && (
        <div className="mb-4 rounded-2xl border border-amber-200/70 bg-amber-50/80 p-3 text-center text-sm text-amber-700 dark:border-amber-900/50 dark:bg-amber-950/30 dark:text-amber-300">
          Cerramos tu sesión por inactividad después de {IDLE_LOGOUT_MINUTES} minutos. Vuelve a
          entrar para seguir trabajando.
        </div>
      )}

      {pendingRegistration && !loggedOutByInactivity && !error && (
        <div className="mb-4 rounded-2xl border border-emerald-200/70 bg-emerald-50/80 p-3 text-center text-sm text-emerald-700 dark:border-emerald-900/50 dark:bg-emerald-950/30 dark:text-emerald-300">
          Revisa tu correo y confirma tu cuenta antes de iniciar sesión.
        </div>
      )}

      {error && (
        <div className="mb-4 rounded-2xl border border-red-200/70 bg-red-50/80 p-3 text-center text-sm text-red-600 dark:border-red-900/50 dark:bg-red-950/30 dark:text-red-400">
          {error}
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label htmlFor="auth-identifier" className="apple-label">
            Correo o cédula
          </label>
          <input
            id="auth-identifier"
            name="username"
            type="text"
            value={identifier}
            onChange={(e) => setIdentifier(e.target.value)}
            placeholder="tu@email.com o 12345678"
            required
            autoComplete="username"
            className="apple-input"
          />
          <p className="apple-auth-field-hint mt-2">
            Usa tu correo si eres administrador. Si eres alumno, instructor o administrativo, entra
            con tu cédula.
          </p>
        </div>

        <div>
          <label htmlFor="current-password" className="apple-label">
            Contraseña
          </label>
          <div className="relative">
            <input
              id="current-password"
              name="current-password"
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
          className="apple-button-primary flex min-h-[52px] w-full justify-center py-3.5 text-sm font-semibold disabled:opacity-50"
        >
          {loading ? (
            <>
              <Loader2 size={16} className="animate-spin" />
              Entrando...
            </>
          ) : (
            "Entrar"
          )}
        </button>
      </form>

      <p className="apple-copy mt-6 text-center text-sm">
        ¿Primera vez en Condusoft?{" "}
        <Link href="/registro" className="apple-link">
          Crear cuenta
        </Link>
      </p>
    </AuthWorkspace>
  );
}
