import Link from "next/link";
import { BadgeCheck, Headphones, Layers3 } from "lucide-react";
import SectionIntro from "@/components/public/SectionIntro";
import { SCHOOL_PLAN_ORDER, SCHOOL_PLAN_DESCRIPTORS } from "@/lib/school-plans";

const planSupportHighlights = [
  "Definición del plan según el tamaño real de la escuela, no con promesas genéricas.",
  "Acompañamiento inicial para sedes, usuarios, categorías, flota y estructura operativa.",
  "Revisión del punto de partida ideal antes de crecer a más sedes o más equipo interno.",
];

export default function Pricing() {
  return (
    <section
      id="pricing"
      className="border-y border-gray-100 bg-[linear-gradient(180deg,rgba(244,247,252,0.9),rgba(255,255,255,0.96))] py-16 sm:py-24 md:py-32 dark:border-gray-900 dark:bg-[linear-gradient(180deg,rgba(10,10,12,0.95),rgba(0,0,0,1))]"
    >
      <div className="mx-auto max-w-[1180px] px-6">
        <SectionIntro
          badge="Planes para autoescuelas"
          title="Elige el plan según la etapa real de tu escuela"
          description="AutoEscuela Pro no se presenta como una tarifa genérica. Ordena la operación de tu escuela según su tamaño, su estructura y el nivel de control que hoy necesita."
          aside={
            <div className="apple-panel-muted max-w-sm px-5 py-5">
              <p className="text-[11px] font-semibold tracking-[0.16em] text-[var(--gray-500)] uppercase">
                Enfoque comercial
              </p>
              <p className="mt-3 text-sm leading-6 text-[var(--gray-700)] dark:text-[var(--gray-500)]">
                Los planes describen la etapa operativa ideal de la escuela. No venden humo ni
                inventan módulos que hoy no existen en la plataforma.
              </p>
            </div>
          }
        />

        <div className="grid gap-5 lg:grid-cols-2 xl:grid-cols-4">
          {SCHOOL_PLAN_ORDER.map((planId) => {
            const plan = SCHOOL_PLAN_DESCRIPTORS[planId];
            return (
              <article
                key={plan.id}
                className={`apple-panel flex h-full flex-col px-5 py-5 ${plan.panelClassName}`}
              >
                <div className="flex items-center justify-between gap-3">
                  <span
                    className={`inline-flex rounded-full px-2.5 py-1 text-[11px] font-semibold ${plan.badgeClassName}`}
                  >
                    {plan.badge}
                  </span>
                  <Layers3 className={`h-4 w-4 ${plan.accentClassName}`} />
                </div>

                <h3 className="text-foreground mt-4 text-xl font-semibold">{plan.label}</h3>
                <p className="mt-2 text-sm font-medium text-[var(--gray-700)] dark:text-[var(--gray-500)]">
                  {plan.audience}
                </p>
                <p className="mt-3 text-sm leading-6 text-[var(--gray-700)] dark:text-[var(--gray-500)]">
                  {plan.publicDescription}
                </p>

                <div className="mt-4 rounded-[20px] border border-[var(--surface-border)] bg-white/70 px-4 py-4 dark:bg-white/[0.04]">
                  <p
                    className={`text-xs font-semibold tracking-[0.16em] uppercase ${plan.accentClassName}`}
                  >
                    Mejor para
                  </p>
                  <p className="text-foreground mt-2 text-sm leading-6">{plan.recommendedFor}</p>
                </div>

                <div className="mt-4 space-y-3">
                  {plan.focusPoints.map((item) => (
                    <div key={item} className="flex items-start gap-3">
                      <BadgeCheck className={`mt-0.5 h-4 w-4 shrink-0 ${plan.accentClassName}`} />
                      <p className="text-sm leading-6 text-[var(--gray-700)] dark:text-[var(--gray-500)]">
                        {item}
                      </p>
                    </div>
                  ))}
                </div>

                <p className={`mt-5 text-xs font-medium ${plan.accentClassName}`}>
                  {plan.capacityGuide}
                </p>
              </article>
            );
          })}
        </div>

        <div className="mt-8 grid gap-6 lg:grid-cols-[0.9fr_1.1fr]">
          <div className="apple-panel-muted px-6 py-6">
            <div className="flex items-center gap-3">
              <Headphones className="h-5 w-5 text-[var(--brand-600)]" />
              <p className="text-sm font-semibold tracking-[0.16em] text-[var(--gray-500)] uppercase">
                Qué acompaña el arranque
              </p>
            </div>
            <div className="mt-5 space-y-4">
              {planSupportHighlights.map((item) => (
                <div key={item} className="flex items-start gap-3">
                  <BadgeCheck className="mt-0.5 h-5 w-5 shrink-0 text-[var(--brand-600)]" />
                  <p className="text-sm leading-6 text-[var(--gray-700)] dark:text-[var(--gray-500)]">
                    {item}
                  </p>
                </div>
              ))}
            </div>
          </div>

          <div className="apple-panel px-6 py-6">
            <p className="text-[11px] font-semibold tracking-[0.16em] text-[var(--gray-500)] uppercase">
              Cómo elegir bien
            </p>
            <h3 className="text-foreground mt-3 text-2xl font-semibold">
              El plan correcto no es el más grande, sino el que coincide con tu etapa operativa
            </h3>
            <p className="mt-4 text-sm leading-6 text-[var(--gray-700)] dark:text-[var(--gray-500)]">
              Si tu escuela apenas está ordenando alumnos, clases y caja, conviene empezar simple.
              Si ya manejas varias sedes, flota, gastos e informes más visibles, el plan debe
              responder a esa complejidad. La idea es que pagues por una estructura que sí te ayude
              a operar mejor.
            </p>

            <div className="mt-6 flex flex-col gap-3 sm:flex-row">
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
