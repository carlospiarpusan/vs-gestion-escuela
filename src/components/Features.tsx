import Link from "next/link";
import { BellRing, Calendar, Car, CreditCard, ShieldCheck } from "lucide-react";

import { availableFeatures, upcomingFeatures } from "@/lib/public-site-content";

const areaIcons = {
  operacion: Calendar,
  finanzas: CreditCard,
  flota: Car,
  automatizacion: BellRing,
  cumplimiento: ShieldCheck,
} as const;

export default function Features() {
  return (
    <section
      id="features"
      className="scroll-mt-28 border-y border-[var(--surface-border)] bg-[linear-gradient(180deg,#ffffff_0%,#f7fbff_100%)] py-16 sm:scroll-mt-32 sm:py-24 md:py-32"
    >
      <div className="mx-auto max-w-[1200px] px-4 sm:px-6">
        <div className="mb-12 text-center md:text-left">
          <span className="inline-flex items-center rounded-full border border-blue-200 bg-blue-50 px-3 py-1 text-xs font-medium text-blue-700">
            Funciones del producto
          </span>
          <h2 className="mt-4 text-3xl font-bold tracking-tight text-[#0f172a] sm:text-4xl md:text-5xl">
            Lo que ya puedes operar hoy
          </h2>
          <p className="mt-5 max-w-2xl text-base leading-relaxed text-slate-600 sm:text-lg">
            Condusoft muestra una operación real y visible hoy, con una hoja de ruta clara para lo
            que viene después.
          </p>
        </div>

        <div className="grid gap-6 lg:grid-cols-2">
          {availableFeatures.map((feature) => {
            const Icon = areaIcons[feature.id as keyof typeof areaIcons] ?? Calendar;

            return (
              <article
                key={feature.id}
                className="group relative overflow-hidden rounded-[2rem] border border-white bg-white p-6 shadow-[0_20px_46px_rgba(15,23,42,0.08)] transition-all hover:-translate-y-1 hover:shadow-[0_28px_60px_rgba(15,23,42,0.12)] sm:p-8"
              >
                <div className="pointer-events-none absolute inset-0 bg-gradient-to-br from-blue-50/70 to-transparent" />
                <div className="relative z-10">
                  <div className="mb-6 flex items-center justify-between">
                    <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-blue-100 transition-colors group-hover:bg-blue-600">
                      <Icon className="h-6 w-6 text-blue-700 group-hover:text-white" />
                    </div>
                    <span className="rounded-full bg-emerald-50 px-3 py-1 text-[10px] font-semibold tracking-wider text-emerald-700 uppercase">
                      Disponible
                    </span>
                  </div>

                  <p className="text-xs font-semibold tracking-wider text-blue-700 uppercase">
                    {feature.eyebrow}
                  </p>
                  <h3 className="mt-2 text-xl font-bold text-[#0f172a] sm:text-2xl">
                    {feature.title}
                  </h3>
                  <p className="mt-4 text-sm leading-relaxed text-slate-600 sm:text-[15px]">
                    {feature.description}
                  </p>
                  <p className="mt-5 text-sm leading-6 font-semibold text-emerald-700">
                    {feature.outcome}
                  </p>

                  <div className="mt-6 flex flex-wrap gap-2">
                    {feature.modules.map((module) => (
                      <span
                        key={module}
                        className="rounded-lg border border-slate-200 bg-slate-50 px-3 py-1.5 text-xs font-medium text-slate-600"
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

        <div className="relative mt-12 overflow-hidden rounded-[2rem] border border-emerald-200 bg-[linear-gradient(180deg,#f4fff8_0%,#effcf5_100%)] p-6 shadow-[0_22px_50px_rgba(15,23,42,0.08)] sm:p-8">
          <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_80%_20%,rgba(16,185,129,0.08),transparent_25rem)]" />
          <div className="relative z-10 flex flex-col gap-6 lg:flex-row lg:items-end lg:justify-between">
            <div className="max-w-3xl">
              <span className="inline-flex rounded-full border border-amber-200 bg-amber-50 px-3 py-1 text-xs font-semibold tracking-wider text-amber-700 uppercase">
                Próximamente
              </span>
              <h3 className="mt-5 text-2xl font-bold text-[#0f172a] sm:text-3xl">
                Lo siguiente: más automatización y más lectura ejecutiva
              </h3>
              <p className="mt-4 text-sm leading-relaxed text-slate-600 sm:text-base">
                La idea es clara: aprovechar la base operativa que ya tienes para reducir tareas
                repetitivas y ver mejor el negocio.
              </p>
            </div>
            <Link
              href="/registro"
              className="inline-flex min-h-[48px] w-full shrink-0 items-center justify-center rounded-full bg-[#0f172a] px-6 text-sm font-semibold text-white transition-all hover:bg-[#1e293b] sm:w-auto"
            >
              Crear cuenta
            </Link>
          </div>

          <div className="relative z-10 mt-8 grid gap-4 md:grid-cols-2 xl:grid-cols-3">
            {upcomingFeatures.map((feature) => (
              <article
                key={feature.id}
                className="rounded-[1.5rem] border border-dashed border-slate-300 bg-white/72 p-5 transition-colors hover:border-slate-400 hover:bg-white"
              >
                <div className="mb-3 flex items-center gap-2">
                  <div className="h-2 w-2 animate-pulse rounded-full bg-amber-400" />
                  <p className="text-xs font-medium tracking-wider text-slate-500 uppercase">
                    {feature.note}
                  </p>
                </div>
                <h4 className="text-lg font-semibold text-slate-900">{feature.title}</h4>
                <p className="mt-3 text-sm leading-relaxed text-slate-600">{feature.description}</p>
              </article>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}
