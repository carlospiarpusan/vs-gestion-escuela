import { ShieldCheck, Building2, FileCheck2, Workflow } from "lucide-react";

import { trustPoints } from "@/lib/public-site-content";

const trustIcons = {
  colombia: ShieldCheck,
  multisede: Building2,
  roles: Workflow,
  compliance: FileCheck2,
} as const;

export default function TrustSection() {
  return (
    <section className="relative overflow-hidden border-t border-[var(--surface-border)] bg-[linear-gradient(180deg,#f3f8ff_0%,#ffffff_100%)] py-16 sm:py-24 md:py-28">
      <div className="pointer-events-none absolute top-0 right-1/4 h-96 w-96 rounded-full bg-blue-200/30 blur-[120px]" />
      <div className="relative z-10 mx-auto max-w-[1180px] px-4 sm:px-6">
        <div className="mb-14 text-center">
          <span className="inline-flex items-center rounded-full border border-blue-200 bg-blue-50 px-3 py-1 text-xs font-medium text-blue-700">
            Operación, trazabilidad y confianza
          </span>
          <h2 className="mx-auto mt-5 max-w-3xl text-3xl font-bold tracking-tight text-[#0f172a] sm:text-4xl md:text-5xl">
            Una plataforma que te ayuda a vender mejor porque se ve más seria
          </h2>
          <p className="mx-auto mt-5 max-w-2xl text-base leading-relaxed text-slate-600 sm:text-lg">
            Está pensada para autoescuelas en Colombia que necesitan mostrar orden operativo,
            control interno y más confianza frente a su equipo y sus clientes.
          </p>
        </div>

        <div className="grid gap-6 md:grid-cols-2 xl:grid-cols-4">
          {trustPoints.map((item) => {
            const Icon = trustIcons[item.id as keyof typeof trustIcons] ?? ShieldCheck;

            return (
              <article
                key={item.id}
                className="group relative rounded-[2rem] border border-white bg-white p-6 text-center shadow-[0_18px_40px_rgba(15,23,42,0.08)] transition-all hover:-translate-y-2 hover:shadow-[0_24px_54px_rgba(15,23,42,0.12)] sm:p-8"
              >
                <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-blue-100 transition-colors group-hover:bg-blue-600">
                  <Icon className="h-7 w-7 text-blue-700 group-hover:text-white" />
                </div>
                <p className="mt-6 text-xs font-semibold tracking-wider text-blue-700 uppercase">
                  {item.highlight}
                </p>
                <h3 className="mt-2 text-xl font-bold text-[#0f172a]">{item.title}</h3>
                <p className="mt-4 text-sm leading-relaxed text-slate-600">{item.description}</p>
              </article>
            );
          })}
        </div>
      </div>
    </section>
  );
}
