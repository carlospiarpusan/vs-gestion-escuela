import { ShieldCheck, Building2, Workflow } from "lucide-react";

import { trustPoints } from "@/lib/public-site-content";

const trustIcons = {
  colombia: ShieldCheck,
  multisede: Building2,
  roles: Workflow,
} as const;

export default function TrustSection() {
  return (
    <section className="relative overflow-hidden border-t border-white/[0.05] bg-[#0a0f18] py-16 sm:py-24 md:py-28">
      <div className="pointer-events-none absolute top-0 right-1/4 h-96 w-96 rounded-full bg-blue-500/5 blur-[120px]" />
      <div className="relative z-10 mx-auto max-w-[1180px] px-6">
        <div className="mb-14 text-center">
          <span className="inline-flex items-center rounded-full border border-blue-500/30 bg-blue-500/10 px-3 py-1 text-xs font-medium text-blue-400 backdrop-blur-sm">
            Respaldo Absoluto
          </span>
          <h2 className="mx-auto mt-5 max-w-3xl text-3xl font-bold tracking-tight text-white sm:text-4xl md:text-5xl">
            Decisiones basadas en datos, no en intuición
          </h2>
          <p className="mx-auto mt-5 max-w-2xl text-base leading-relaxed text-slate-400 sm:text-lg">
            AutoEscuela Pro no es una herramienta más. Es la base tecnológica diseñada
            específicamente para elevar los estándares de las escuelas líderes.
          </p>
        </div>

        <div className="grid gap-6 lg:grid-cols-3">
          {trustPoints.map((item) => {
            const Icon = trustIcons[item.id as keyof typeof trustIcons] ?? ShieldCheck;

            return (
              <article
                key={item.id}
                className="group relative rounded-[2rem] border border-white/[0.05] bg-slate-900/40 p-8 text-center shadow-lg transition-all hover:-translate-y-2 hover:bg-slate-800/60"
              >
                <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-blue-500/10 shadow-[inset_0_1px_1px_rgba(255,255,255,0.1)] transition-colors group-hover:bg-blue-500/20">
                  <Icon className="h-7 w-7 text-blue-400" />
                </div>
                <p className="mt-6 text-xs font-semibold tracking-wider text-blue-400 uppercase">
                  {item.highlight}
                </p>
                <h3 className="mt-2 text-xl font-bold text-white">{item.title}</h3>
                <p className="mt-4 text-sm leading-relaxed text-slate-400">{item.description}</p>
              </article>
            );
          })}
        </div>
      </div>
    </section>
  );
}
