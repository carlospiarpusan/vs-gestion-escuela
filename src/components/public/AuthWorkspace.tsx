import Link from "next/link";
import type { ReactNode } from "react";

type AuthHighlight = {
  title: string;
  description: string;
};

type AuthWorkspaceProps = {
  badge: string;
  title: string;
  description: string;
  backLabel: string;
  children: ReactNode;
  highlights: AuthHighlight[];
  helperTitle?: string;
};

export default function AuthWorkspace({
  badge,
  title,
  description,
  backLabel,
  children,
  highlights,
  helperTitle = "Operación clara desde el primer día",
}: AuthWorkspaceProps) {
  return (
    <main className="apple-auth-shell px-4 py-6 sm:px-6 lg:px-8">
      <div className="mx-auto flex w-full max-w-6xl flex-col gap-6 pt-[max(0.75rem,env(safe-area-inset-top))] lg:flex-row lg:items-stretch">
        <section className="apple-panel order-2 flex min-h-[240px] flex-1 flex-col justify-between px-6 py-7 lg:order-1 lg:px-8 lg:py-9">
          <div>
            <Link href="/" className="apple-button-secondary text-xs font-medium">
              &larr; {backLabel}
            </Link>
            <span className="apple-brand-mark mt-8 inline-flex px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.18em]">
              Plataforma operativa
            </span>
            <h2 className="mt-5 text-3xl font-semibold tracking-tight text-foreground sm:text-4xl">
              {helperTitle}
            </h2>
            <p className="apple-copy mt-4 max-w-2xl text-sm leading-7 sm:text-base">
              Menos dispersión entre WhatsApp, hojas de cálculo y cuadernos. Más control diario en
              alumnos, pagos, agenda y flota.
            </p>
          </div>

          <div className="mt-8 grid gap-3 sm:grid-cols-3 lg:grid-cols-1 xl:grid-cols-3">
            {highlights.map((highlight) => (
              <article
                key={highlight.title}
                className="apple-panel-muted rounded-[22px] px-4 py-4"
              >
                <p className="text-sm font-semibold text-foreground">{highlight.title}</p>
                <p className="apple-copy mt-2 text-sm leading-6">{highlight.description}</p>
              </article>
            ))}
          </div>
        </section>

        <section className="apple-auth-card order-1 w-full max-w-xl px-6 py-7 sm:px-7 sm:py-8 lg:order-2 lg:min-w-[420px]">
          <div className="mb-7">
            <span className="apple-badge">{badge}</span>
            <h1 className="mt-4 text-3xl font-semibold tracking-tight text-foreground">
              {title}
            </h1>
            <p className="apple-copy mt-2 text-sm leading-7">{description}</p>
          </div>

          {children}
        </section>
      </div>
    </main>
  );
}
