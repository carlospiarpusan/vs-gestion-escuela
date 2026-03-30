import Link from "next/link";
import type { ReactNode } from "react";

type AuthHighlight = {
  title: string;
  description: string;
};

type AuthWorkspaceProps = {
  mode: "login" | "register";
  badge: string;
  title: string;
  description: string;
  backLabel: string;
  children: ReactNode;
  highlights: AuthHighlight[];
  helperTitle?: string;
  heroVariant?: "full" | "minimal";
  securityNote?: string;
};

export default function AuthWorkspace({
  mode,
  badge,
  title,
  description,
  backLabel,
  children,
  highlights,
  helperTitle = "Tu escuela más ordenada desde el primer acceso",
  heroVariant = "full",
  securityNote = "Datos protegidos, sesión segura y acceso segmentado según rol.",
}: AuthWorkspaceProps) {
  const isMinimalHero = heroVariant === "minimal";
  const visibleHighlights = highlights.slice(0, isMinimalHero ? 2 : 3);
  const heroTagline =
    mode === "login" ? "Acceso claro para tu operación diaria" : "Base inicial lista para operar";
  const heroCopy = isMinimalHero
    ? "Entra sin distracciones y vuelve rápido a tu panel."
    : "Crea tu escuela con una base limpia y sigue después con alumnos, pagos y agenda.";

  return (
    <main className="apple-auth-shell px-4 py-6 sm:px-6 lg:px-8">
      <div className="mx-auto grid w-full max-w-6xl gap-6 pt-[max(0.75rem,env(safe-area-inset-top))] lg:grid-cols-[minmax(0,1.08fr)_minmax(430px,0.92fr)] lg:items-stretch">
        <section className="apple-auth-hero apple-panel order-2 min-h-[320px] px-6 py-7 lg:order-1 lg:px-8 lg:py-9">
          <div className="relative z-10 flex h-full flex-col justify-between">
            <div>
              <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                <Link href="/" className="apple-button-secondary text-xs font-medium">
                  &larr; {backLabel}
                </Link>

                <div className="apple-auth-switch" aria-label="Cambiar entre login y registro">
                  <Link
                    href="/login"
                    data-active={mode === "login"}
                    aria-current={mode === "login" ? "page" : undefined}
                    className="apple-auth-switch-link"
                  >
                    Login
                  </Link>
                  <Link
                    href="/registro"
                    data-active={mode === "register"}
                    aria-current={mode === "register" ? "page" : undefined}
                    className="apple-auth-switch-link"
                  >
                    Registro
                  </Link>
                </div>
              </div>

              <div className="mt-10 flex items-center gap-4">
                <span className="apple-brand-mark flex h-12 w-12 items-center justify-center text-sm font-semibold">
                  C
                </span>
                <div>
                  <p className="apple-kicker">Condusoft</p>
                  <p className="text-foreground/80 text-sm">{heroTagline}</p>
                </div>
              </div>

              <h2 className="text-foreground mt-6 max-w-2xl text-3xl font-semibold tracking-tight sm:text-[2.55rem] sm:leading-[1.08]">
                {helperTitle}
              </h2>
              <p className="apple-copy mt-3 max-w-2xl text-sm leading-7 sm:text-base">{heroCopy}</p>
            </div>

            <div className="mt-7 space-y-3">
              {visibleHighlights.map((highlight, index) => (
                <div key={highlight.title} className="apple-auth-list-item">
                  <span className="apple-auth-list-dot" aria-hidden="true">
                    {String(index + 1).padStart(2, "0")}
                  </span>
                  <div>
                    <p className="text-foreground text-sm font-semibold">{highlight.title}</p>
                    <p className="apple-copy mt-1 text-sm leading-6">{highlight.description}</p>
                  </div>
                </div>
              ))}
            </div>

            <div className="apple-auth-footnote mt-6">
              {mode === "login"
                ? "Acceso simple, rápido y sin ruido visual."
                : "Registro claro para que empieces con una estructura seria."}
            </div>
          </div>
        </section>

        <section className="apple-auth-card order-1 w-full max-w-xl px-6 py-7 sm:px-7 sm:py-8 lg:order-2 lg:min-w-[420px]">
          <div className="mb-7 pb-2">
            <div className="flex items-start justify-between gap-3">
              <span className="apple-badge">{badge}</span>
              <span className="apple-auth-status">{mode === "login" ? "Seguro" : "Guiado"}</span>
            </div>
            <h1 className="text-foreground mt-4 text-3xl font-semibold tracking-tight sm:text-[2.05rem]">
              {title}
            </h1>
            <p className="apple-copy mt-2 max-w-lg text-sm leading-7">{description}</p>
          </div>

          {children}

          {securityNote ? (
            <p className="apple-auth-security-note mt-6 text-xs">{securityNote}</p>
          ) : null}
        </section>
      </div>
    </main>
  );
}
