import Link from "next/link";
import SectionIntro from "@/components/public/SectionIntro";

const steps = [
  {
    number: "01",
    title: "Crea tu cuenta o solicita una demo",
    description:
      "Empieza con una prueba guiada de Condusoft o crea la cuenta para dejar lista la base de tu autoescuela.",
  },
  {
    number: "02",
    title: "Configura sedes, usuarios, vehículos y categorías",
    description:
      "La estructura inicial queda preparada para operar con alumnos, agenda, finanzas y flota desde el mismo panel.",
  },
  {
    number: "03",
    title: "Empieza a operar con módulos visibles y separados",
    description:
      "Cada tarea vive donde corresponde: alumnos, clases, ingresos, cartera, gastos, informes y vehículos.",
  },
];

export default function HowItWorks() {
  return (
    <section
      id="how-it-works"
      className="bg-background relative scroll-mt-28 overflow-hidden py-16 sm:scroll-mt-32 sm:py-24 md:py-32"
    >
      <div className="mx-auto max-w-[980px] px-4 sm:px-6">
        <SectionIntro
          badge="Implementación simple"
          title="Una puesta en marcha pensada para autoescuelas que necesitan operar rápido"
          description="Condusoft no busca llenarte de configuración. Busca dejar la base lista para controlar alumnos, agenda, finanzas y flota con una estructura clara."
        />

        <div className="grid gap-5">
          {steps.map((step) => (
            <article
              key={step.number}
              className="apple-panel-muted grid gap-5 rounded-[28px] p-5 sm:grid-cols-[96px_minmax(0,1fr)] sm:p-6"
            >
              <div className="text-5xl font-bold tracking-tighter text-[color:color-mix(in_srgb,var(--brand-400)_16%,white)] sm:text-6xl dark:text-[color:color-mix(in_srgb,var(--brand-400)_34%,black)]">
                {step.number}
              </div>
              <div>
                <h3 className="text-foreground text-2xl font-semibold">{step.title}</h3>
                <p className="apple-copy mt-3 text-sm leading-7 sm:text-[15px]">
                  {step.description}
                </p>
              </div>
            </article>
          ))}
        </div>

        <div className="mt-12 flex flex-col gap-3 sm:mt-14 sm:flex-row">
          <Link
            href="/registro"
            className="apple-button-primary min-h-[48px] w-full justify-center px-6 text-sm font-semibold sm:w-auto"
          >
            Crear cuenta
          </Link>
          <a
            href="#pricing"
            className="apple-button-secondary min-h-[48px] w-full justify-center px-6 text-sm font-semibold sm:w-auto"
          >
            Ver planes y acompañamiento
          </a>
        </div>
      </div>
    </section>
  );
}
