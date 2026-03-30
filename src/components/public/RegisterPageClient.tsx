"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Eye, EyeOff, Loader2 } from "lucide-react";
import { createClient } from "@/lib/supabase";
import { getPasswordValidationError, PASSWORD_POLICY_HINT } from "@/lib/password-policy";
import AuthWorkspace from "@/components/public/AuthWorkspace";

type AuthErrorLike = {
  message?: string;
  code?: string;
  status?: number;
} | null;

function normalizeAuthErrorMessage(message: string): string {
  return message.trim().replace(/\s+/g, " ").replace(/\.$/, "");
}

function describeUnknownAuthError(error: AuthErrorLike): string {
  const message = normalizeAuthErrorMessage(error?.message ?? "");
  const code = error?.code?.trim();
  const status = error?.status;
  const details = [code, status ? `HTTP ${status}` : ""].filter(Boolean).join(" · ");

  if (message && !message.toLowerCase().includes("auth")) {
    return `No pudimos crear la cuenta ahora. ${message}.`;
  }

  if (details) {
    return `No pudimos crear la cuenta ahora. Código: ${details}.`;
  }

  return "No pudimos crear la cuenta ahora. Intenta de nuevo en unos minutos.";
}

function sanitizeAuthError(error: AuthErrorLike): string {
  const message = error?.message ?? "";
  const code = error?.code ?? "";
  const lower = message.toLowerCase();

  if (code === "over_email_send_rate_limit" || lower.includes("rate limit")) {
    return "Ya intentaste registrarte hace poco. Espera unos minutos y vuelve a intentarlo.";
  }
  if (lower.includes("already registered") || lower.includes("already exists")) {
    return "Ya existe una cuenta con este correo electrónico.";
  }
  if (
    code === "email_address_invalid" ||
    lower.includes("invalid email") ||
    lower.includes("is invalid")
  ) {
    return "El formato del correo electrónico no es válido.";
  }
  if (lower.includes("password")) {
    return "La contraseña no cumple los requisitos mínimos.";
  }
  if (
    code === "unexpected_failure" ||
    lower.includes("database error") ||
    lower.includes("unexpected_failure") ||
    lower.includes("internal")
  ) {
    return "No pudimos terminar el registro por un problema interno. Intenta de nuevo en unos minutos.";
  }
  if (lower.includes("fetch") || lower.includes("network")) {
    return "No se pudo conectar con el servicio de registro. Verifica tu conexión e intenta de nuevo.";
  }

  return describeUnknownAuthError(error);
}

export default function RegisterPageClient() {
  const router = useRouter();
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
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

  const passwordHint = useMemo(() => {
    if (!formData.password) return PASSWORD_POLICY_HINT;

    return getPasswordValidationError(formData.password) ?? PASSWORD_POLICY_HINT;
  }, [formData.password]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setSuccess("");
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
      const registerResponse = await fetch("/api/public/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ nombre, email, escuela, password }),
      });
      const registerPayload = (await registerResponse.json().catch(() => null)) as {
        error?: string;
      } | null;

      if (!registerResponse.ok) {
        const backendError =
          registerPayload && typeof registerPayload.error === "string"
            ? registerPayload.error
            : "No se pudo crear la cuenta en este momento. Intenta de nuevo.";
        setError(backendError);
        setLoading(false);
        return;
      }

      const supabase = createClient();
      const { error: signInError } = await supabase.auth.signInWithPassword({ email, password });
      if (signInError) {
        setSuccess("Tu cuenta fue creada. Inicia sesión para entrar al panel de administración.");
        setLoading(false);
        router.push(`/login?registered=1&email=${encodeURIComponent(email)}`);
        return;
      }

      router.refresh();
      router.push("/dashboard");
    } catch (error) {
      const authError =
        error && typeof error === "object"
          ? {
              message: "message" in error ? String(error.message ?? "") : "",
              code: "code" in error ? String(error.code ?? "") : "",
              status:
                "status" in error && typeof error.status === "number" ? error.status : undefined,
            }
          : null;

      console.error("[registro] signUp threw", authError ?? error);
      setError(sanitizeAuthError(authError));
      setLoading(false);
    }
  };

  return (
    <AuthWorkspace
      mode="register"
      badge="Registro"
      title="Crea tu cuenta"
      description="Abre tu escuela en Condusoft con una base seria y lista para empezar a operar."
      backLabel="Volver al inicio"
      helperTitle="Empieza con una base clara, sobria y lista para crecer"
      highlights={[
        {
          title: "Base inicial lista",
          description: "La escuela y el acceso administrador quedan listos desde el registro.",
        },
        {
          title: "Paso siguiente claro",
          description: "Terminas el alta y entras al panel o vuelves al login con el correo listo.",
        },
      ]}
    >
      {error && (
        <div className="mb-4 rounded-2xl border border-red-200/70 bg-red-50/80 p-3 text-center text-sm text-red-600 dark:border-red-900/50 dark:bg-red-950/30 dark:text-red-400">
          {error}
        </div>
      )}

      {success && (
        <div className="mb-4 rounded-2xl border border-emerald-200/70 bg-emerald-50/80 p-3 text-center text-sm text-emerald-700 dark:border-emerald-900/50 dark:bg-emerald-950/30 dark:text-emerald-300">
          {success}
        </div>
      )}

      <p className="apple-auth-field-hint mb-5">
        Te dejamos la escuela creada y tu usuario administrador listo para entrar.
      </p>

      <form onSubmit={handleSubmit} className="space-y-4">
        <div className="grid gap-4 sm:grid-cols-2">
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
          <p className="apple-auth-field-hint mt-2">
            Usamos este nombre para crear tu escuela inicial.
          </p>
        </div>

        <div>
          <label htmlFor="new-password" className="apple-label">
            Contraseña
          </label>
          <div className="relative">
            <input
              id="new-password"
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
          <p
            className={`mt-2 text-xs ${
              formData.password && getPasswordValidationError(formData.password)
                ? "text-red-500 dark:text-red-400"
                : "text-[var(--gray-500)]"
            }`}
          >
            {passwordHint}
          </p>
        </div>

        <button
          type="submit"
          disabled={loading}
          className="apple-button-primary flex min-h-[52px] w-full justify-center py-3.5 text-sm font-semibold disabled:opacity-50"
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

        <p className="apple-copy text-center text-xs leading-6">
          Si no entra automáticamente, te llevamos al login con tu correo ya preparado.
        </p>
      </form>

      <p className="apple-copy mt-6 text-center text-sm">
        ¿Ya tienes acceso?{" "}
        <Link href="/login" className="apple-link">
          Iniciar sesión
        </Link>
      </p>
    </AuthWorkspace>
  );
}
