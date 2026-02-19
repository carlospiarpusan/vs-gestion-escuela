import Link from "next/link";

const footerLinks = {
  Producto: [
    { label: "Características", href: "#features" },
    { label: "Cómo funciona", href: "#how-it-works" },
    { label: "Precios", href: "#pricing" },
  ],
  Compañía: [
    { label: "Acerca de", href: "#" },
    { label: "Blog", href: "#" },
    { label: "Contacto", href: "#" },
  ],
  Legal: [
    { label: "Privacidad", href: "#" },
    { label: "Términos", href: "#" },
  ],
};

export default function Footer() {
  return (
    <footer className="bg-background border-t border-gray-100 dark:border-gray-800 text-[12px]">
      <div className="max-w-[980px] mx-auto px-6 py-12">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-8 mb-12">
          <div className="col-span-2 md:col-span-1">
            <span className="font-semibold text-foreground block mb-4">AutoEscuelaPro</span>
          </div>

          {Object.entries(footerLinks).map(([category, links]) => (
            <div key={category}>
              <h3 className="font-semibold text-foreground mb-2">
                {category}
              </h3>
              <ul className="space-y-2">
                {links.map((link) => (
                  <li key={link.label}>
                    <Link
                      href={link.href}
                      className="text-gray-500 hover:text-blue-apple transition-colors hover:underline"
                    >
                      {link.label}
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>

        <div className="pt-8 border-t border-gray-100 dark:border-gray-800 flex flex-col md:flex-row justify-between items-center gap-4 text-gray-500">
          <p>
            Copyright © {new Date().getFullYear()} AutoEscuelaPro. Todos los derechos reservados.
          </p>
          <div className="flex gap-4">
            <span>España</span>
          </div>
        </div>
      </div>
    </footer>
  );
}
