import Link from "next/link";
import type { ReactNode } from "react";
import { BadgeCheck, BookOpenCheck, Building2, Car, CreditCard } from "lucide-react";
import CondusoftLogo from "@/components/brand/CondusoftLogo";

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

const authCapabilityGroups = [
  { icon: Building2, label: "Alumnos, matrículas y sedes" },
  { icon: CreditCard, label: "Ingresos, cartera y caja diaria" },
  { icon: Car, label: "Flota, bitácora y mantenimiento" },
  { icon: BookOpenCheck, label: "Evaluación CALE y app móvil" },
];

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
    mode === "login" ? "Panel operativo para autoescuelas" : "Base inicial lista para operar";
  const heroCopy = isMinimalHero
    ? "Vuelve a tu panel para revisar alumnos, agenda, recaudo, cartera, flota y evaluación CALE."
    : "Crea tu escuela con una base limpia y sigue después con alumnos, pagos y agenda.";

  return (
    <main className="apple-auth-shell px-4 py-6 sm:px-6 lg:px-8">
      <div className="mx-auto grid w-full max-w-6xl gap-6 pt-[max(0.75rem,env(safe-area-inset-top))] lg:grid-cols-[minmax(0,1fr)_minmax(420px,0.78fr)] lg:items-stretch">
        <section className="apple-auth-hero order-2 min-h-[360px] px-6 py-7 lg:order-1 lg:px-8 lg:py-9">
          <div className="relative z-10 flex h-full flex-col justify-between">
            <div>
              <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                <Link href="/" className="apple-auth-back-link text-xs font-medium">
                  {backLabel}
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
                <CondusoftLogo size="lg" subtitle={heroTagline} />
              </div>

              <h2 className="text-foreground mt-6 max-w-2xl text-3xl font-semibold tracking-tight sm:text-[2.55rem] sm:leading-[1.08]">
                {helperTitle}
              </h2>
              <p className="apple-copy mt-3 max-w-2xl text-sm leading-7 sm:text-base">{heroCopy}</p>
            </div>

            <div className="mt-7 grid gap-3 sm:grid-cols-2">
              {visibleHighlights.map((highlight) => (
                <div key={highlight.title} className="apple-auth-list-item">
                  <span className="apple-auth-list-dot" aria-hidden="true">
                    <BadgeCheck size={15} />
                  </span>
                  <div>
                    <p className="text-foreground text-sm font-semibold">{highlight.title}</p>
                    <p className="apple-copy mt-1 text-sm leading-6">{highlight.description}</p>
                  </div>
                </div>
              ))}
            </div>

            <div className="mt-7 grid gap-2 sm:grid-cols-2">
              {authCapabilityGroups.map((item) => (
                <div key={item.label} className="apple-auth-mini-card">
                  <item.icon size={16} />
                  <span>{item.label}</span>
                </div>
              ))}
            </div>

            <div className="apple-auth-footnote mt-7">
              {mode === "login"
                ? "Acceso segmentado para administradores, alumnos, instructores y administrativos."
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
