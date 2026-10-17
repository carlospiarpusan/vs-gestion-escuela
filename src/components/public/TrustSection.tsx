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
    <section className="border-t border-[var(--surface-border)] bg-[#fbfbfd] py-16 sm:py-20 md:py-24">
      <div className="mx-auto max-w-[1180px] px-4 sm:px-6">
        <div className="grid gap-8 lg:grid-cols-[0.9fr_1.1fr] lg:items-start">
          <div>
            <span className="inline-flex items-center rounded-full border border-slate-200 bg-white px-3 py-1 text-xs font-semibold text-slate-700">
              Confianza operativa
            </span>
            <h2 className="mt-4 max-w-xl text-3xl font-semibold tracking-tight text-[#111111] sm:text-4xl">
              Serio para el equipo, claro para la dirección.
            </h2>
            <p className="mt-4 max-w-xl text-sm leading-7 text-slate-600 sm:text-base">
              ConduSoft conserva lo importante: roles, sedes, trazabilidad y evidencia. La escuela
              no necesita verse compleja para operar con orden.
            </p>
          </div>

          <div className="grid gap-3 sm:grid-cols-2">
            {trustPoints.map((item) => {
              const Icon = trustIcons[item.id as keyof typeof trustIcons] ?? ShieldCheck;

              return (
                <article
                  key={item.id}
                  className="rounded-[1.35rem] border border-slate-200 bg-white p-5 shadow-sm"
                >
                  <div className="flex items-start gap-3">
                    <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl bg-[#f2f7ff]">
                      <Icon className="h-5 w-5 text-[#0071e3]" />
                    </div>
                    <div>
                      <p className="text-xs font-semibold tracking-[0.14em] text-[#0071e3] uppercase">
                        {item.highlight}
                      </p>
                      <h3 className="mt-2 text-base font-semibold text-[#111111]">{item.title}</h3>
                      <p className="mt-2 text-sm leading-6 text-slate-600">{item.description}</p>
                    </div>
                  </div>
                </article>
              );
            })}
          </div>
        </div>
      </div>
    </section>
  );
}
