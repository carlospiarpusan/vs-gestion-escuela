import Link from "next/link";
import {
  ArrowRight,
  BadgeCheck,
  CalendarRange,
  CreditCard,
  ShieldCheck,
  Sparkles,
} from "lucide-react";
import { heroHighlights, HOME_KEYWORDS } from "@/lib/public-site-content";

const liveAreas = [
  {
    icon: CalendarRange,
    label: "Disponible hoy",
    title: "Operación diaria",
    description: "Alumnos, matrículas, clases, horas, exámenes e instructores en el mismo flujo.",
  },
  {
    icon: CreditCard,
    label: "Disponible hoy",
    title: "Finanzas separadas",
    description: "Ingresos, cartera, caja diaria, gastos e informes con responsabilidades claras.",
  },
  {
    icon: ShieldCheck,
    label: "Disponible hoy",
    title: "Flota y soporte",
    description: "Vehículos, bitácora, mantenimiento, sedes e importación de facturas por correo.",
  },
];

export default function Hero() {
  return (
    <section className="relative overflow-hidden border-b border-[var(--surface-border)] bg-[#0a0f18] pt-26 pb-14 sm:pt-32 sm:pb-20 md:pt-38 md:pb-24">
      {/* Premium Background Gradients */}
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_top_left,rgba(0,113,227,0.15),transparent_40rem),radial-gradient(circle_at_100%_0%,rgba(16,185,129,0.1),transparent_30rem)]" />
      <div className="pointer-events-none absolute top-1/4 -left-20 h-64 w-64 rounded-full bg-blue-500/20 blur-[100px]" />
      <div className="pointer-events-none absolute -right-20 bottom-1/4 h-64 w-64 rounded-full bg-emerald-500/10 blur-[100px]" />

      <div className="relative z-10 mx-auto grid max-w-[1180px] gap-12 px-5 sm:px-6 lg:grid-cols-[1.1fr_0.9fr] lg:items-center">
        <div className="max-w-3xl">
          <div
            className="animate-fade-in-up flex flex-wrap items-center gap-3"
            style={{ animationDuration: "0.8s" }}
          >
            <span className="inline-flex items-center rounded-full border border-blue-500/30 bg-blue-500/10 px-3 py-1 text-xs font-medium text-blue-400 backdrop-blur-sm">
              <Sparkles className="mr-1.5 h-3.5 w-3.5" />
              Condusoft.co · Software para autoescuelas en Colombia
            </span>
          </div>

          <h1
            className="animate-fade-in-up mt-8 max-w-3xl text-[2.5rem] font-bold tracking-tight text-white sm:text-5xl md:text-6xl lg:text-[4.2rem] lg:leading-[1.1]"
            style={{ animationDuration: "0.6s" }}
          >
            Condusoft,{" "}
            <span className="bg-gradient-to-r from-blue-400 to-emerald-400 bg-clip-text text-transparent">
              software para autoescuelas
            </span>{" "}
            en Colombia.
          </h1>

          <p
            className="animate-fade-in-up mt-6 max-w-2xl text-[16px] leading-relaxed text-slate-300 sm:text-lg sm:leading-8 md:text-xl"
            style={{ animationDuration: "1s", animationDelay: "0.2s" }}
          >
            Gestiona alumnos, matrículas, clases, ingresos, cartera, gastos, flota y sedes desde una
            sola plataforma. Condusoft está diseñado para escuelas de conducción que quieren operar
            mejor, vender con orden y crecer sin caos.
          </p>

          <div
            className="animate-fade-in-up mt-8 space-y-4"
            style={{ animationDuration: "1s", animationDelay: "0.3s" }}
          >
            {heroHighlights.map((item) => (
              <div key={item} className="flex items-start gap-4">
                <div className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-emerald-500/20">
                  <BadgeCheck className="h-4 w-4 text-emerald-400" />
                </div>
                <p className="text-sm leading-6 text-slate-300 sm:text-[16px]">{item}</p>
              </div>
            ))}
          </div>

          <div
            className="animate-fade-in-up mt-10 flex flex-col gap-4 sm:flex-row sm:items-center"
            style={{ animationDuration: "1s", animationDelay: "0.4s" }}
          >
            <Link
              href="/registro"
              className="group relative inline-flex min-h-[54px] items-center justify-center overflow-hidden rounded-full bg-gradient-to-r from-blue-600 to-blue-500 px-8 text-base font-semibold text-white transition-all hover:scale-[1.02] hover:shadow-[0_0_20px_rgba(37,99,235,0.4)]"
            >
              <span className="relative z-10 flex items-center gap-2">
                Toma el control hoy mismo
                <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-1" />
              </span>
            </Link>
            <a
              href="#features"
              className="inline-flex min-h-[54px] items-center justify-center rounded-full border border-slate-700 bg-slate-800/50 px-8 text-base font-medium text-slate-300 backdrop-blur-sm transition-all hover:bg-slate-800 hover:text-white"
            >
              Explorar módulos operacionales
            </a>
          </div>

          <div
            className="animate-fade-in-up mt-10 flex flex-wrap items-center gap-x-6 gap-y-4 border-t border-slate-800 pt-6"
            style={{ animationDuration: "1s", animationDelay: "0.5s" }}
          >
            <p className="text-sm font-medium text-slate-400">Diseñado exclusivamente para:</p>
            <div className="flex flex-wrap gap-2">
              {HOME_KEYWORDS.slice(0, 3).map((keyword) => (
                <span
                  key={keyword}
                  className="rounded-full bg-slate-800/60 px-3 py-1 text-xs font-medium text-slate-300"
                >
                  {keyword}
                </span>
              ))}
            </div>
          </div>
        </div>

        {/* Premium Glassmorphism Right Column */}
        <div
          className="animate-fade-in-up relative mt-8 space-y-6 lg:mt-0"
          style={{ animationDuration: "1.2s", animationDelay: "0.3s" }}
        >
          <div className="relative z-10 overflow-hidden rounded-[2.5rem] border border-white/[0.08] bg-white/[0.02] p-6 shadow-[0_8px_32px_rgba(0,0,0,0.3)] backdrop-blur-xl transition-transform duration-500 hover:-translate-y-1">
            <div className="pointer-events-none absolute inset-0 bg-gradient-to-br from-white/[0.05] to-transparent" />

            <div className="mb-6 flex items-center justify-between">
              <div>
                <span className="inline-flex rounded-full bg-emerald-500/20 px-2.5 py-1 text-[10px] font-semibold tracking-wider text-emerald-400 uppercase">
                  Operación Inmediata
                </span>
                <h2 className="mt-2 text-lg font-semibold text-white sm:text-xl">
                  Módulos de alto rendimiento
                </h2>
              </div>
            </div>

            <div className="grid gap-4">
              {liveAreas.map((area) => (
                <article
                  key={area.title}
                  className="group relative rounded-3xl border border-white/[0.05] bg-slate-900/40 p-5 transition-all hover:bg-slate-800/60"
                >
                  <div className="flex items-start gap-4">
                    <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-blue-500/10 shadow-[inset_0_1px_1px_rgba(255,255,255,0.1)] transition-colors group-hover:bg-blue-500/20">
                      <area.icon className="h-6 w-6 text-blue-400" />
                    </div>
                    <div className="min-w-0">
                      <h3 className="text-base font-semibold text-slate-100">{area.title}</h3>
                      <p className="mt-1 text-sm leading-relaxed text-slate-400">
                        {area.description}
                      </p>
                    </div>
                  </div>
                </article>
              ))}
            </div>
          </div>

          <div className="relative overflow-hidden rounded-[2rem] border border-emerald-500/20 bg-emerald-950/30 p-6 shadow-lg backdrop-blur-md transition-transform duration-500 hover:-translate-y-1">
            <div className="absolute top-0 left-0 h-[1px] w-full bg-gradient-to-r from-transparent via-emerald-500/50 to-transparent" />
            <div className="flex items-start gap-4">
              <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-emerald-500/20">
                <ShieldCheck className="h-6 w-6 text-emerald-400" />
              </div>
              <div>
                <p className="text-sm font-semibold tracking-wide text-emerald-400 uppercase">
                  Seguridad ante todo
                </p>
                <p className="mt-1 text-sm text-emerald-100/70">
                  Respaldos automáticos diarios, cifrado de extremo a extremo y roles de usuario
                  estrictos para garantizar que tu información financiera y operativa esté siempre
                  segura.
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
