import Link from "next/link";
import { PUBLIC_FOOTER_LINKS } from "@/lib/public-navigation";

export default function Footer() {
  return (
    <footer
      id="contacto"
      className="border-t border-[var(--surface-border)] bg-background text-[12px]"
    >
      <div className="mx-auto max-w-[1180px] px-6 py-12">
        <div className="mb-12 grid gap-8 lg:grid-cols-[1.15fr_0.85fr]">
          <div className="apple-panel p-6 sm:p-8">
            <span className="block text-lg font-semibold text-foreground">
              AutoEscuela<span className="gradient-text">Pro</span>
            </span>
            <p className="apple-copy mt-4 max-w-xl text-sm leading-7">
              Software para autoescuelas y escuelas de conducción en Colombia diseñado para que la operación se vea clara, trazable y profesional desde el primer día.
            </p>
            <div className="mt-6 grid gap-4 sm:grid-cols-2">
              <div className="apple-panel-muted rounded-[22px] p-4">
                <p className="apple-kicker">
                  Enfoque
                </p>
                <p className="mt-2 text-sm font-semibold text-foreground">Operación diaria</p>
                <p className="apple-copy mt-1 text-sm">
                  Alumnos, matrículas, agenda, cartera, caja, gastos y flota.
                </p>
              </div>
              <div className="apple-panel-muted rounded-[22px] p-4">
                <p className="apple-kicker">
                  Cobertura
                </p>
                <p className="mt-2 text-sm font-semibold text-foreground">Colombia</p>
                <p className="apple-copy mt-1 text-sm">
                  Enfoque comercial y operativo para escuelas nuevas y multi-sede.
                </p>
              </div>
            </div>

            <div className="mt-6 flex flex-col gap-3 sm:flex-row">
              <Link
                href="/registro"
                className="apple-button-primary min-h-[46px] justify-center text-sm font-semibold"
              >
                Crear cuenta
              </Link>
              <Link
                href="/login"
                className="apple-button-secondary min-h-[46px] justify-center text-sm font-semibold"
              >
                Iniciar sesión
              </Link>
            </div>
          </div>

          <div className="grid grid-cols-1 gap-6 sm:grid-cols-3 lg:grid-cols-1">
            {Object.entries(PUBLIC_FOOTER_LINKS).map(([category, links]) => (
              <div key={category}>
                <h3 className="mb-3 font-semibold text-foreground">{category}</h3>
                <ul className="space-y-2.5">
                  {links.map((link) => (
                    <li key={link.label}>
                      <Link
                        href={link.href}
                        className="apple-copy text-sm transition-colors hover:text-blue-apple hover:underline"
                      >
                        {link.label}
                      </Link>
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
        </div>

        <div className="apple-copy flex flex-col items-start justify-between gap-4 border-t border-[var(--surface-border)] pt-8 md:flex-row md:items-center">
          <p className="text-sm">
            Copyright © {new Date().getFullYear()} AutoEscuelaPro. Todos los derechos reservados.
          </p>
          <p className="text-sm">Hecho para escuelas de conducción en Colombia.</p>
        </div>
      </div>
    </footer>
  );
}
