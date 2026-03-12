import Link from "next/link";

export default function PrivacidadPage() {
  return (
    <main className="apple-auth-shell flex min-h-screen items-center justify-center px-4 py-12 sm:px-6">
      <div className="w-full max-w-3xl">
        <Link href="/" className="apple-button-secondary mb-6 inline-flex text-sm font-medium">
          &larr; Volver al inicio
        </Link>

        <section className="apple-auth-card px-6 py-8 sm:px-8 sm:py-10">
          <span className="apple-badge">Política de privacidad</span>
          <h1 className="mt-5 text-3xl font-semibold tracking-tight text-foreground sm:text-4xl">
            Tratamiento básico de datos.
          </h1>
          <p className="mt-4 text-sm leading-7 text-gray-500 sm:text-base">
            AutoEscuelaPro utiliza la información suministrada por la escuela y sus usuarios para
            operar la plataforma, autenticar accesos, organizar la operación diaria y generar
            reportes internos.
          </p>

          <div className="mt-8 space-y-6 text-sm leading-7 text-gray-600 dark:text-gray-300 sm:text-base">
            <section>
              <h2 className="text-lg font-semibold text-foreground">Qué datos usamos</h2>
              <p className="mt-2">
                Datos de identificación, contacto, operación académica, agenda, pagos, sedes,
                usuarios internos y flota cargados por la escuela.
              </p>
            </section>

            <section>
              <h2 className="text-lg font-semibold text-foreground">Para qué los usamos</h2>
              <p className="mt-2">
                Para permitir el acceso a la plataforma, administrar alumnos, clases, finanzas y
                mantener la continuidad del servicio.
              </p>
            </section>

            <section>
              <h2 className="text-lg font-semibold text-foreground">Control de la información</h2>
              <p className="mt-2">
                Cada escuela es responsable de la información que registra y de mantener actualizados
                los datos de sus usuarios autorizados.
              </p>
            </section>
          </div>
        </section>
      </div>
    </main>
  );
}
