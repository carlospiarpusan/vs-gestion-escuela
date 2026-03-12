import Link from "next/link";

const footerLinks = {
  Producto: [
    { label: "Características", href: "#features" },
    { label: "Cómo funciona", href: "#how-it-works" },
    { label: "Precios", href: "#pricing" },
  ],
  Soporte: [
    { label: "Crear cuenta", href: "/registro" },
    { label: "Iniciar sesión", href: "/login" },
    { label: "Solicitar acompañamiento", href: "#contacto" },
  ],
  Legal: [
    { label: "Política de privacidad", href: "/privacidad" },
    { label: "Términos y condiciones", href: "/terminos" },
  ],
};

export default function Footer() {
  return (
    <footer
      id="contacto"
      className="border-t border-gray-100 bg-background text-[12px] dark:border-gray-800"
    >
      <div className="mx-auto max-w-[1180px] px-6 py-12">
        <div className="mb-12 grid gap-8 lg:grid-cols-[1.2fr_0.8fr]">
          <div className="apple-panel p-6 sm:p-8">
            <span className="block text-lg font-semibold text-foreground">AutoEscuelaPro</span>
            <p className="mt-4 max-w-xl text-sm leading-7 text-gray-500">
              Plataforma para escuelas de conducción en Colombia. Diseñada para ordenar alumnos,
              pagos, agenda, flota y operación diaria desde un solo lugar.
            </p>
            <div className="mt-6 grid gap-4 sm:grid-cols-2">
              <div className="rounded-[24px] border border-gray-100 bg-white/80 p-4 dark:border-gray-800 dark:bg-white/[0.03]">
                <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-gray-500">
                  Cobertura
                </p>
                <p className="mt-2 text-sm font-semibold text-foreground">Colombia</p>
                <p className="mt-1 text-sm text-gray-500">Pensado para sedes urbanas y multi-sede.</p>
              </div>
              <div className="rounded-[24px] border border-gray-100 bg-white/80 p-4 dark:border-gray-800 dark:bg-white/[0.03]">
                <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-gray-500">
                  Base operativa
                </p>
                <p className="mt-2 text-sm font-semibold text-foreground">Ipiales, Colombia</p>
                <p className="mt-1 text-sm text-gray-500">Acompañamiento remoto para implementación.</p>
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
            {Object.entries(footerLinks).map(([category, links]) => (
              <div key={category}>
                <h3 className="mb-3 font-semibold text-foreground">{category}</h3>
                <ul className="space-y-2.5">
                  {links.map((link) => (
                    <li key={link.label}>
                      <Link
                        href={link.href}
                        className="text-sm text-gray-500 transition-colors hover:text-blue-apple hover:underline"
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

        <div className="flex flex-col items-start justify-between gap-4 border-t border-gray-100 pt-8 text-gray-500 dark:border-gray-800 md:flex-row md:items-center">
          <p className="text-sm">
            Copyright © {new Date().getFullYear()} AutoEscuelaPro. Todos los derechos reservados.
          </p>
          <p className="text-sm">Hecho para escuelas de conducción en Colombia.</p>
        </div>
      </div>
    </footer>
  );
}
