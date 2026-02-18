import Link from "next/link";

export default function Footer() {
  return (
    <footer className="bg-[#f5f5f7] dark:bg-[#161616] border-t border-gray-200/50 dark:border-gray-800/50">
      <div className="max-w-[980px] mx-auto px-6 py-8">
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-8 mb-8">
          <div>
            <h4 className="text-xs font-semibold text-[#1d1d1f] dark:text-[#f5f5f7] mb-3">
              Plataforma
            </h4>
            <ul className="space-y-2">
              <li>
                <a href="#features" className="text-xs text-[#86868b] hover:text-[#1d1d1f] dark:hover:text-[#f5f5f7] transition-colors">
                  Características
                </a>
              </li>
              <li>
                <a href="#pricing" className="text-xs text-[#86868b] hover:text-[#1d1d1f] dark:hover:text-[#f5f5f7] transition-colors">
                  Precios
                </a>
              </li>
              <li>
                <a href="#how-it-works" className="text-xs text-[#86868b] hover:text-[#1d1d1f] dark:hover:text-[#f5f5f7] transition-colors">
                  Cómo funciona
                </a>
              </li>
            </ul>
          </div>
          <div>
            <h4 className="text-xs font-semibold text-[#1d1d1f] dark:text-[#f5f5f7] mb-3">
              Cuenta
            </h4>
            <ul className="space-y-2">
              <li>
                <Link href="/login" className="text-xs text-[#86868b] hover:text-[#1d1d1f] dark:hover:text-[#f5f5f7] transition-colors">
                  Iniciar Sesión
                </Link>
              </li>
              <li>
                <Link href="/registro" className="text-xs text-[#86868b] hover:text-[#1d1d1f] dark:hover:text-[#f5f5f7] transition-colors">
                  Crear Cuenta
                </Link>
              </li>
            </ul>
          </div>
          <div>
            <h4 className="text-xs font-semibold text-[#1d1d1f] dark:text-[#f5f5f7] mb-3">
              Legal
            </h4>
            <ul className="space-y-2">
              <li>
                <span className="text-xs text-[#86868b]">
                  Privacidad
                </span>
              </li>
              <li>
                <span className="text-xs text-[#86868b]">
                  Términos de uso
                </span>
              </li>
            </ul>
          </div>
        </div>
        <div className="border-t border-gray-200/50 dark:border-gray-800/50 pt-6">
          <p className="text-xs text-[#86868b]">
            Copyright &copy; {new Date().getFullYear()} AutoEscuelaPro. Todos los derechos reservados.
          </p>
        </div>
      </div>
    </footer>
  );
}
