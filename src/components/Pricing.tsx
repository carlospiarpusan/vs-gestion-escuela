import Link from "next/link";
import { BadgeCheck, Building2, CarFront, GraduationCap, Headphones } from "lucide-react";
import SectionIntro from "@/components/public/SectionIntro";

const planCards = [
  {
    icon: GraduationCap,
    title: "Escuela en crecimiento",
    description:
      "Para una sede que necesita ordenar alumnos, clases, ingresos, cartera y caja diaria con rapidez.",
  },
  {
    icon: Building2,
    title: "Operación multi-sede",
    description:
      "Para escuelas que necesitan control por sede, usuarios, flota, gastos e informes más visibles.",
  },
];

const planHighlights = [
  "Demo guiada para validar el flujo real de tu autoescuela.",
  "Acompañamiento inicial para sedes, vehículos, usuarios y estructura operativa.",
  "Propuesta ajustada al tamaño de tu escuela y su forma de trabajar.",
];

export default function Pricing() {
  return (
    <section
      id="pricing"
      className="border-y border-gray-100 bg-[linear-gradient(180deg,rgba(244,247,252,0.9),rgba(255,255,255,0.96))] py-16 dark:border-gray-900 dark:bg-[linear-gradient(180deg,rgba(10,10,12,0.95),rgba(0,0,0,1))] sm:py-24 md:py-32"
    >
      <div className="mx-auto max-w-[1180px] px-6">
        <SectionIntro
          badge="Planes y acompañamiento"
          title="Una propuesta comercial ajustada a la operación de tu autoescuela"
          description="La home no vende un plan abstracto. Te invita a validar si el sistema encaja con tu nivel de operación, sedes, flota y equipo."
        />

        <div className="grid gap-6 lg:grid-cols-[1.2fr_0.8fr]">
          <div className="apple-panel p-6 sm:p-8">
            <div className="mb-6 flex flex-wrap items-center gap-3">
              <span className="apple-badge">Demo guiada</span>
              <span className="rounded-full border border-emerald-200 bg-emerald-50 px-3 py-1 text-xs font-semibold text-emerald-700 dark:border-emerald-900/70 dark:bg-emerald-950/40 dark:text-emerald-300">
                Implementación acompañada
              </span>
            </div>

            <div className="grid gap-4 md:grid-cols-2">
              {planCards.map((plan) => (
                <article
                  key={plan.title}
                  className="rounded-[28px] border border-gray-100 bg-white/80 p-5 shadow-[0_18px_45px_rgba(15,23,42,0.06)] dark:border-gray-800 dark:bg-white/[0.03]"
                >
                  <plan.icon className="mb-4 h-10 w-10 text-blue-apple" />
                  <h3 className="text-xl font-semibold text-foreground">{plan.title}</h3>
                  <p className="mt-3 text-sm leading-6 text-gray-500">{plan.description}</p>
                </article>
              ))}
            </div>

            <div className="mt-6 rounded-[28px] border border-blue-100 bg-blue-50/70 p-5 dark:border-blue-900/60 dark:bg-blue-950/20">
              <div className="flex items-center gap-3">
                <CarFront className="h-5 w-5 text-blue-apple" />
                <p className="text-sm font-semibold text-foreground">
                  La demo se orienta a tu operación real: alumnos, pagos, sedes, instructores y flota.
                </p>
              </div>
              <p className="mt-3 text-sm leading-6 text-gray-600 dark:text-gray-300">
                El enfoque comercial está pensado para autoescuelas en Colombia que necesitan ordenar su operación antes de crecer.
              </p>
            </div>
          </div>

          <div className="apple-panel-muted flex flex-col justify-between p-6 sm:p-8">
            <div>
              <div className="mb-5 flex items-center gap-3">
                <Headphones className="h-5 w-5 text-blue-apple" />
                <p className="text-sm font-semibold uppercase tracking-[0.18em] text-gray-500">
                  Qué incluye
                </p>
              </div>

              <div className="space-y-4">
                {planHighlights.map((item) => (
                  <div key={item} className="flex items-start gap-3">
                    <BadgeCheck className="mt-0.5 h-5 w-5 shrink-0 text-blue-apple" />
                    <p className="text-sm leading-6 text-gray-600 dark:text-gray-300">{item}</p>
                  </div>
                ))}
              </div>
            </div>

            <div className="mt-8 flex flex-col gap-3">
              <Link
                href="/registro"
                className="apple-button-primary min-h-[48px] justify-center text-sm font-semibold"
              >
                Crear cuenta
              </Link>
              <a
                href="#contacto"
                className="apple-button-secondary min-h-[48px] justify-center text-sm font-semibold"
              >
                Solicitar acompañamiento
              </a>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
