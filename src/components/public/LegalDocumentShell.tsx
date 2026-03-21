import Link from "next/link";
import type { ReactNode } from "react";

type LegalDocumentShellProps = {
  badge: string;
  title: string;
  description: string;
  principles: Array<{ title: string; description: string }>;
  children: ReactNode;
};

export default function LegalDocumentShell({
  badge,
  title,
  description,
  principles,
  children,
}: LegalDocumentShellProps) {
  return (
    <main className="apple-auth-shell px-4 py-6 sm:px-6 lg:px-8">
      <div className="mx-auto w-full max-w-6xl pt-[max(0.75rem,env(safe-area-inset-top))]">
        <Link href="/" className="apple-button-secondary text-xs font-medium">
          &larr; Volver al inicio
        </Link>

        <div className="mt-6 grid gap-6 lg:grid-cols-[minmax(0,1fr)_360px]">
          <section className="apple-auth-card px-6 py-8 sm:px-8 sm:py-10">
            <span className="apple-badge">{badge}</span>
            <h1 className="mt-5 text-3xl font-semibold tracking-tight text-foreground sm:text-4xl">
              {title}
            </h1>
            <p className="apple-copy mt-4 max-w-3xl text-sm leading-7 sm:text-base">
              {description}
            </p>

            <div className="apple-copy mt-8 space-y-6 text-sm leading-7 sm:text-base">
              {children}
            </div>
          </section>

          <aside className="apple-panel h-fit px-5 py-6 sm:px-6">
            <p className="apple-kicker">Principios</p>
            <div className="mt-4 space-y-3">
              {principles.map((principle) => (
                <article
                  key={principle.title}
                  className="apple-panel-muted rounded-[22px] px-4 py-4"
                >
                  <h2 className="text-sm font-semibold text-foreground">{principle.title}</h2>
                  <p className="apple-copy mt-2 text-sm leading-6">
                    {principle.description}
                  </p>
                </article>
              ))}
            </div>
          </aside>
        </div>
      </div>
    </main>
  );
}
