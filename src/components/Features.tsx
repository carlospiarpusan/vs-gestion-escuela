import Link from "next/link";
import { BellRing, Calendar, Car, CreditCard } from "lucide-react";
import SectionIntro from "@/components/public/SectionIntro";
import { availableFeatures, upcomingFeatures } from "@/lib/public-site-content";

const areaIcons = {
  operacion: Calendar,
  finanzas: CreditCard,
  flota: Car,
  automatizacion: BellRing,
} as const;

export default function Features() {
  return (
    <section
      id="features"
      className="border-y border-white/[0.05] bg-[#0a0f18] py-16 sm:py-24 md:py-32"
    >
      <div className="mx-auto max-w-[1200px] px-5 sm:px-6">
        <div className="mb-12 text-center md:text-left">
          <span className="inline-flex items-center rounded-full border border-blue-500/30 bg-blue-500/10 px-3 py-1 text-xs font-medium text-blue-400 backdrop-blur-sm">
            Funciones del producto
          </span>
          <h2 className="mt-4 text-3xl font-bold tracking-tight text-white sm:text-4xl md:text-5xl">
            Visibilidad real, sin promesas vacías
          </h2>
          <p className="mt-5 max-w-2xl text-base leading-relaxed text-slate-400 sm:text-lg">
            Todo lo que necesitas para operar hoy mismo, más nuestra visión de mejoras continuas
            diseñadas inteligentemente.
          </p>
        </div>

        <div className="grid gap-6 lg:grid-cols-2">
          {availableFeatures.map((feature) => {
            const Icon = areaIcons[feature.id as keyof typeof areaIcons] ?? Calendar;

            return (
              <article
                key={feature.id}
                className="group relative overflow-hidden rounded-[2rem] border border-white/[0.05] bg-slate-900/40 p-6 shadow-xl backdrop-blur-sm transition-all hover:border-white/[0.08] hover:bg-slate-800/50 sm:p-8"
              >
                <div className="pointer-events-none absolute inset-0 bg-gradient-to-br from-white/[0.02] to-transparent" />
                <div className="relative z-10">
                  <div className="mb-6 flex items-center justify-between">
                    <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-blue-500/10 shadow-[inset_0_1px_1px_rgba(255,255,255,0.1)] transition-colors group-hover:bg-blue-500/20">
                      <Icon className="h-6 w-6 text-blue-400" />
                    </div>
                    <span className="rounded-full bg-emerald-500/10 px-3 py-1 text-[10px] font-semibold tracking-wider text-emerald-400 uppercase">
                      Disponible
                    </span>
                  </div>

                  <p className="text-xs font-semibold tracking-wider text-blue-400 uppercase">
                    {feature.eyebrow}
                  </p>
                  <h3 className="mt-2 text-xl font-bold text-white sm:text-2xl">{feature.title}</h3>
                  <p className="mt-4 text-sm leading-relaxed text-slate-400 sm:text-[15px]">
                    {feature.description}
                  </p>
                  <p className="mt-5 text-sm leading-6 font-semibold text-emerald-400">
                    {feature.outcome}
                  </p>

                  <div className="mt-6 flex flex-wrap gap-2">
                    {feature.modules.map((module) => (
                      <span
                        key={module}
                        className="rounded-lg border border-slate-700/50 bg-slate-800/50 px-3 py-1.5 text-xs font-medium text-slate-300"
                      >
                        {module}
                      </span>
                    ))}
                  </div>
                </div>
              </article>
            );
          })}
        </div>

        <div className="relative mt-12 overflow-hidden rounded-[2rem] border border-emerald-500/20 bg-emerald-900/10 p-6 shadow-2xl backdrop-blur-md sm:p-8">
          <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_80%_20%,rgba(16,185,129,0.05),transparent_25rem)]" />
          <div className="relative z-10 flex flex-col gap-6 lg:flex-row lg:items-end lg:justify-between">
            <div className="max-w-3xl">
              <span className="inline-flex rounded-full border border-amber-500/30 bg-amber-500/10 px-3 py-1 text-xs font-semibold tracking-wider text-amber-400 uppercase">
                Próximamente
              </span>
              <h3 className="mt-5 text-2xl font-bold text-white sm:text-3xl">
                Evolución estratégica sin fricciones
              </h3>
              <p className="mt-4 text-sm leading-relaxed text-slate-400 sm:text-base">
                No vendemos promesas al aire. Estas extensiones en automatización y analítica ya
                están en la hoja de ruta para multiplicar la eficiencia de los módulos que ya usas.
              </p>
            </div>
            <Link
              href="/registro"
              className="inline-flex min-h-[48px] shrink-0 items-center justify-center rounded-full bg-white px-6 text-sm font-semibold text-[#0a0f18] transition-all hover:bg-emerald-50"
            >
              Comienza tu transformación
            </Link>
          </div>

          <div className="relative z-10 mt-8 grid gap-4 lg:grid-cols-3">
            {upcomingFeatures.map((feature) => (
              <article
                key={feature.id}
                className="rounded-[1.5rem] border border-dashed border-white/[0.1] bg-slate-900/30 p-5 transition-colors hover:border-white/[0.15] hover:bg-slate-900/50"
              >
                <div className="mb-3 flex items-center gap-2">
                  <div className="h-2 w-2 animate-pulse rounded-full bg-amber-400" />
                  <p className="text-xs font-medium tracking-wider text-slate-500 uppercase">
                    {feature.note}
                  </p>
                </div>
                <h4 className="text-lg font-semibold text-slate-200">{feature.title}</h4>
                <p className="mt-3 text-sm leading-relaxed text-slate-400">{feature.description}</p>
              </article>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}
