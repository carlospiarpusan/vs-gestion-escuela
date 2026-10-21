import Link from "next/link";
import { ArrowRight, CalendarCheck2, CarFront, WalletCards } from "lucide-react";

const outcomes = [
  {
    icon: CalendarCheck2,
    eyebrow: "Operación diaria",
    title: "Cada alumno sabe qué sigue",
    description:
      "Concentra matrículas, horas e instructores para que el equipo no tenga que reconstruir la historia del alumno en cada llamada.",
  },
  {
    icon: WalletCards,
    eyebrow: "Finanzas claras",
    title: "Cobros, cartera y gastos en contexto",
    description:
      "Separa el recaudo y los egresos para detectar lo cobrado, lo pendiente y lo que necesita atención antes de cerrar el día.",
  },
  {
    icon: CarFront,
    eyebrow: "Flota disponible",
    title: "Más control sobre lo que permite operar",
    description:
      "Mantén a la vista vehículos, mantenimientos, sedes y responsables para planear clases con una base más confiable.",
  },
];

export default function Features() {
  return (
    <section
      id="features"
      className="scroll-mt-28 border-y border-[var(--surface-border)] bg-white py-16 sm:scroll-mt-32 sm:py-20 md:py-24"
    >
      <div className="mx-auto max-w-[1180px] px-4 sm:px-6">
        <div className="grid gap-6 lg:grid-cols-[0.88fr_1.12fr] lg:items-end">
          <div>
            <span className="inline-flex items-center rounded-full border border-slate-200 bg-slate-50 px-3 py-1 text-xs font-semibold text-slate-700">
              Resultados para el día a día
            </span>
            <h2 className="mt-4 max-w-xl text-3xl font-semibold tracking-tight text-[#111111] sm:text-4xl md:text-5xl">
              Menos persecución, más visibilidad.
            </h2>
          </div>
          <p className="max-w-2xl text-sm leading-7 text-slate-600 sm:text-base">
            ConduSoft convierte los puntos que suelen dispersarse entre hojas, chats y llamadas en
            una operación que el equipo puede seguir con claridad.
          </p>
        </div>

        <div className="mt-10 grid gap-4 md:grid-cols-3">
          {outcomes.map((outcome) => {
            const Icon = outcome.icon;

            return (
              <article key={outcome.title} className="border-t border-slate-200 pt-5">
                <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-[#f2f7ff]">
                  <Icon className="h-5 w-5 text-[#0071e3]" />
                </div>
                <p className="mt-5 text-xs font-semibold tracking-[0.14em] text-[#0071e3] uppercase">
                  {outcome.eyebrow}
                </p>
                <h3 className="mt-2 text-xl font-semibold text-[#111111]">{outcome.title}</h3>
                <p className="mt-3 max-w-sm text-sm leading-7 text-slate-600">
                  {outcome.description}
                </p>
              </article>
            );
          })}
        </div>

        <div className="mt-10 flex flex-col gap-3 sm:flex-row">
          <a
            href="#product-tour"
            className="inline-flex min-h-[50px] items-center justify-center rounded-full bg-[#111111] px-7 text-sm font-semibold text-white transition-colors hover:bg-[#0071e3]"
          >
            Explorar módulos
            <ArrowRight className="ml-2 h-4 w-4" />
          </a>
          <Link
            href="/registro"
            prefetch={false}
            className="inline-flex min-h-[50px] items-center justify-center rounded-full border border-slate-200 bg-white px-7 text-sm font-semibold text-slate-700 transition-colors hover:border-slate-300 hover:bg-slate-50"
          >
            Crear cuenta
          </Link>
        </div>
      </div>
    </section>
  );
}
