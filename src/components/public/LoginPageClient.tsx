"use client";

import { useState } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { Eye, EyeOff, Loader2 } from "lucide-react";
import { createClient } from "@/lib/supabase";
import { navigateAfterSignIn } from "@/lib/auth-navigation";
import CondusoftLogo from "@/components/brand/CondusoftLogo";
import { IDLE_LOGOUT_REASON, IDLE_LOGOUT_MINUTES } from "@/lib/session-timeout";

export default function LoginPageClient() {
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
        const response = await fetch("/api/public/login", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ cedula: trimmed, password }),
        });
        if (!response.ok) {
          const body = await response.json().catch(() => null);
          setError(body?.error || "Cédula o contraseña incorrectos.");
          setLoading(false);
          return;
        }
      }

      navigateAfterSignIn();
    } catch {
      setError("Error de conexión. Intenta de nuevo.");
      setLoading(false);
    }
  };

  return (
    <main className="flex min-h-screen items-center justify-center bg-[#fbfbfd] px-4 py-8 text-[#111111] dark:bg-zinc-950 dark:text-white">
      <section className="w-full max-w-[430px] rounded-[28px] border border-black/10 bg-white px-5 py-6 shadow-[0_22px_70px_rgba(15,23,42,0.10)] sm:px-7 sm:py-8 dark:border-white/10 dark:bg-zinc-900">
        <div className="mb-7 flex items-center justify-between gap-4">
          <Link href="/" className="transition-opacity hover:opacity-80">
            <CondusoftLogo size="md" />
          </Link>
          <Link href="/registro" className="apple-link text-sm font-semibold">
            Crear cuenta
          </Link>
        </div>

        <div className="mb-6">
          <h1 className="text-2xl font-semibold tracking-tight">Iniciar sesión</h1>
          <p className="mt-2 text-sm leading-6 text-slate-500 dark:text-zinc-400">
            Entra con tu correo o cédula.
          </p>
        </div>

        {loggedOutByInactivity && !error && (
          <div className="mb-4 rounded-2xl border border-amber-200/70 bg-amber-50/80 p-3 text-sm text-amber-700 dark:border-amber-900/50 dark:bg-amber-950/30 dark:text-amber-300">
            Sesión cerrada por inactividad después de {IDLE_LOGOUT_MINUTES} minutos.
          </div>
        )}

        {pendingRegistration && !loggedOutByInactivity && !error && (
          <div className="mb-4 rounded-2xl border border-emerald-200/70 bg-emerald-50/80 p-3 text-sm text-emerald-700 dark:border-emerald-900/50 dark:bg-emerald-950/30 dark:text-emerald-300">
            Confirma tu cuenta desde el correo antes de entrar.
          </div>
        )}

        {error && (
          <div className="mb-4 rounded-2xl border border-red-200/70 bg-red-50/80 p-3 text-sm text-red-600 dark:border-red-900/50 dark:bg-red-950/30 dark:text-red-400">
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
      </section>
    </main>
  );
}
