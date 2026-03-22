import Link from "next/link";

export default function CTA() {
  return (
    <section className="border-t border-[var(--surface-border)] bg-[var(--gray-50)] py-16 sm:py-24 md:py-32">
      <div className="mx-auto max-w-[980px] px-6 text-left">
        <div className="apple-panel overflow-hidden p-8 sm:p-10">
          <span className="apple-badge">Listo para ordenar tu operación</span>
          <h2 className="text-foreground mt-5 text-3xl font-semibold tracking-tight sm:text-4xl md:text-5xl lg:text-6xl">
            Condusoft puede llevar tu autoescuela de hojas sueltas a una operación clara esta misma
            semana.
          </h2>
          <p className="mt-5 max-w-2xl text-base leading-8 text-[var(--gray-500)] sm:text-xl">
            Si hoy repartes alumnos, agenda, cartera, caja, gastos y vehículos entre distintas hojas
            o chats, aquí ya tienes una base mucho más ordenada para trabajar en escritorio y móvil.
          </p>

          <div className="mt-10 flex flex-col gap-3 sm:flex-row">
            <Link
              href="/registro"
              className="apple-button-primary min-h-[48px] justify-center px-6 text-sm font-semibold sm:w-auto"
            >
              Crear cuenta
            </Link>
            <a
              href="#pricing"
              className="apple-button-secondary min-h-[48px] justify-center px-6 text-sm font-semibold sm:w-auto"
            >
              Solicitar demo
            </a>
          </div>
        </div>
      </div>
    </section>
  );
}
