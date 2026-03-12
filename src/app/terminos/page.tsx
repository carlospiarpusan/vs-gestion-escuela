import Link from "next/link";

export default function TerminosPage() {
  return (
    <main className="apple-auth-shell flex min-h-screen items-center justify-center px-4 py-12 sm:px-6">
      <div className="w-full max-w-3xl">
        <Link href="/" className="apple-button-secondary mb-6 inline-flex text-sm font-medium">
          &larr; Volver al inicio
        </Link>

        <section className="apple-auth-card px-6 py-8 sm:px-8 sm:py-10">
          <span className="apple-badge">Términos y condiciones</span>
          <h1 className="mt-5 text-3xl font-semibold tracking-tight text-foreground sm:text-4xl">
            Uso básico de la plataforma.
          </h1>
          <p className="mt-4 text-sm leading-7 text-gray-500 sm:text-base">
            AutoEscuelaPro es una herramienta de apoyo operativo para escuelas de conducción. El uso
            de la plataforma implica la responsabilidad de custodiar usuarios, contraseñas y la
            información registrada dentro del sistema.
          </p>

          <div className="mt-8 space-y-6 text-sm leading-7 text-gray-600 dark:text-gray-300 sm:text-base">
            <section>
              <h2 className="text-lg font-semibold text-foreground">Acceso y cuentas</h2>
              <p className="mt-2">
                Cada institución debe asignar accesos únicamente a personal autorizado y mantener sus
                credenciales actualizadas.
              </p>
            </section>

            <section>
              <h2 className="text-lg font-semibold text-foreground">Responsabilidad de la escuela</h2>
              <p className="mt-2">
                La escuela es responsable de la calidad, veracidad y legalidad de los datos cargados
                en alumnos, pagos, agenda, flota y demás módulos.
              </p>
            </section>

            <section>
              <h2 className="text-lg font-semibold text-foreground">Disponibilidad del servicio</h2>
              <p className="mt-2">
                Se realizarán esfuerzos razonables para mantener la continuidad del servicio y la
                seguridad de la información, sin perjuicio de mantenimientos o fallas de terceros.
              </p>
            </section>
          </div>
        </section>
      </div>
    </main>
  );
}
