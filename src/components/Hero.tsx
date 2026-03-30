import Link from "next/link";
import {
  ArrowRight,
  BadgeCheck,
  CalendarRange,
  CreditCard,
  ShieldCheck,
  Sparkles,
} from "lucide-react";
import { HOME_KEYWORDS } from "@/lib/public-site-content";

const heroPoints = [
  "Alumnos, matrículas y clases en un flujo claro.",
  "Ingresos, cartera y gastos sin mezclar información.",
  "Vehículos, sedes y cumplimiento dentro del mismo sistema.",
];

const proofMetrics = [
  { value: "1 panel", label: "para la operación diaria" },
  { value: "3 frentes", label: "operación, finanzas y flota" },
  { value: "0 caos", label: "con hojas sueltas y chats" },
];

const liveAreas = [
  {
    icon: CalendarRange,
    label: "Operación",
    title: "Agenda, alumnos y matrículas",
    description: "Todo el frente académico y operativo sin saltar entre herramientas.",
  },
  {
    icon: CreditCard,
    label: "Finanzas",
    title: "Ingresos, cartera y caja",
    description: "Cada cobro y cada gasto en un tablero más claro para tomar decisiones.",
  },
  {
    icon: ShieldCheck,
    label: "Control",
    title: "Flota, sedes y evidencia",
    description: "Vehículos, respaldo operativo y cumplimiento en una misma base.",
  },
];

export default function Hero() {
  return (
    <section className="relative overflow-hidden border-b border-[var(--surface-border)] bg-[linear-gradient(180deg,#f8fbff_0%,#eef5ff_44%,#ffffff_100%)] pt-24 pb-12 sm:pt-32 sm:pb-20 md:pt-38 md:pb-24">
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_top_left,rgba(37,99,235,0.16),transparent_32rem),radial-gradient(circle_at_100%_10%,rgba(16,185,129,0.1),transparent_26rem)]" />
      <div className="pointer-events-none absolute top-0 left-[12%] h-56 w-56 rounded-full bg-blue-200/40 blur-[90px]" />
      <div className="pointer-events-none absolute right-[6%] bottom-[14%] h-64 w-64 rounded-full bg-emerald-200/40 blur-[110px]" />

      <div className="relative z-10 mx-auto grid max-w-[1180px] gap-10 px-4 sm:px-6 lg:grid-cols-[1.06fr_0.94fr] lg:items-center">
        <div className="max-w-3xl">
          <div
            className="animate-fade-in-up flex flex-wrap items-center gap-3"
            style={{ animationDuration: "0.8s" }}
          >
            <span className="inline-flex items-center rounded-full border border-blue-200 bg-white/85 px-3 py-1 text-xs font-semibold text-blue-700 shadow-sm backdrop-blur-sm">
              <Sparkles className="mr-1.5 h-3.5 w-3.5" />
              Condusoft.co · Software para autoescuelas
            </span>
          </div>

          <h1
            className="animate-fade-in-up mt-7 max-w-3xl text-[2.15rem] leading-[1.06] font-bold tracking-tight text-[#0f172a] sm:text-5xl md:text-6xl lg:text-[4.1rem]"
            style={{ animationDuration: "0.6s" }}
          >
            Ordena la operación de tu autoescuela{" "}
            <span className="bg-gradient-to-r from-[#1d4ed8] to-[#0f766e] bg-clip-text text-transparent">
              sin verte improvisado
            </span>
            .
          </h1>

          <p
            className="animate-fade-in-up mt-5 max-w-2xl text-[15px] leading-7 text-slate-600 sm:text-lg sm:leading-8 md:text-xl"
            style={{ animationDuration: "1s", animationDelay: "0.2s" }}
          >
            Condusoft centraliza alumnos, pagos, agenda, flota y cumplimiento para que tu escuela se
            vea más profesional y opere con más control desde el primer día.
          </p>

          <div
            className="animate-fade-in-up mt-8 grid gap-3 sm:grid-cols-3"
            style={{ animationDuration: "1s", animationDelay: "0.3s" }}
          >
            {proofMetrics.map((metric) => (
              <article
                key={metric.value}
                className="rounded-[1.5rem] border border-white/70 bg-white/80 px-4 py-4 shadow-[0_18px_45px_rgba(15,23,42,0.08)] backdrop-blur-sm"
              >
                <p className="text-2xl font-semibold tracking-tight text-[#0f172a]">
                  {metric.value}
                </p>
                <p className="mt-1 text-sm leading-6 text-slate-500">{metric.label}</p>
              </article>
            ))}
          </div>

          <div
            className="animate-fade-in-up mt-8 space-y-4"
            style={{ animationDuration: "1s", animationDelay: "0.35s" }}
          >
            {heroPoints.map((item) => (
              <div key={item} className="flex items-start gap-4">
                <div className="mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-emerald-100">
                  <BadgeCheck className="h-4 w-4 text-emerald-600" />
                </div>
                <p className="text-sm leading-6 text-slate-600 sm:text-[15px]">{item}</p>
              </div>
            ))}
          </div>

          <div
            className="animate-fade-in-up mt-8 flex flex-col gap-3 sm:mt-10 sm:flex-row sm:items-center"
            style={{ animationDuration: "1s", animationDelay: "0.4s" }}
          >
            <Link
              href="/registro"
              className="group inline-flex min-h-[54px] w-full items-center justify-center rounded-full bg-gradient-to-r from-[#2563eb] to-[#0f6ddf] px-8 text-base font-semibold text-white shadow-[0_20px_40px_rgba(37,99,235,0.24)] transition-all hover:translate-y-[-1px] hover:shadow-[0_26px_48px_rgba(37,99,235,0.3)] sm:w-auto"
            >
              <span className="flex items-center gap-2">
                Crear cuenta
                <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-1" />
              </span>
            </Link>
            <a
              href="#features"
              className="inline-flex min-h-[54px] w-full items-center justify-center rounded-full border border-slate-200 bg-white/78 px-8 text-base font-medium text-slate-700 backdrop-blur-sm transition-all hover:border-slate-300 hover:bg-white sm:w-auto"
            >
              Ver cómo funciona
            </a>
          </div>

          <div
            className="animate-fade-in-up mt-10 flex flex-wrap items-center gap-x-6 gap-y-4 border-t border-slate-200/80 pt-6"
            style={{ animationDuration: "1s", animationDelay: "0.5s" }}
          >
            <p className="text-sm font-medium text-slate-500">Pensado para:</p>
            <div className="flex flex-wrap gap-2">
              {HOME_KEYWORDS.slice(2, 5).map((keyword) => (
                <span
                  key={keyword}
                  className="rounded-full border border-slate-200 bg-white/82 px-3 py-1 text-xs font-medium text-slate-600"
                >
                  {keyword}
                </span>
              ))}
            </div>
          </div>
        </div>

        <div
          className="animate-fade-in-up relative mt-4 space-y-5 sm:mt-8 sm:space-y-6 lg:mt-0"
          style={{ animationDuration: "1.2s", animationDelay: "0.3s" }}
        >
          <div className="relative overflow-hidden rounded-[2rem] border border-white/70 bg-white/82 p-5 shadow-[0_24px_60px_rgba(15,23,42,0.1)] backdrop-blur-xl transition-transform duration-500 hover:-translate-y-1 sm:rounded-[2.5rem] sm:p-6">
            <div className="pointer-events-none absolute inset-0 bg-gradient-to-br from-blue-50/70 to-transparent" />

            <div className="relative z-10 mb-6 flex items-center justify-between">
              <div>
                <span className="inline-flex rounded-full bg-blue-50 px-2.5 py-1 text-[10px] font-semibold tracking-wider text-blue-700 uppercase">
                  Operación visible
                </span>
                <h2 className="mt-2 text-lg font-semibold text-[#0f172a] sm:text-xl">
                  Lo esencial en una sola base
                </h2>
              </div>
            </div>

            <div className="grid gap-4">
              {liveAreas.map((area) => (
                <article
                  key={area.title}
                  className="group rounded-3xl border border-slate-200/80 bg-[#f8fbff] p-5 transition-all hover:border-slate-300 hover:bg-white"
                >
                  <div className="mb-2 text-[11px] font-semibold tracking-[0.16em] text-slate-500 uppercase">
                    {area.label}
                  </div>
                  <div className="flex items-start gap-4">
                    <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-blue-100 transition-colors group-hover:bg-blue-600">
                      <area.icon className="h-6 w-6 text-blue-700 group-hover:text-white" />
                    </div>
                    <div className="min-w-0">
                      <h3 className="text-base font-semibold text-slate-900">{area.title}</h3>
                      <p className="mt-1 text-sm leading-relaxed text-slate-600">
                        {area.description}
                      </p>
                    </div>
                  </div>
                </article>
              ))}
            </div>
          </div>

          <div className="relative overflow-hidden rounded-[1.75rem] border border-emerald-200 bg-[linear-gradient(180deg,#f2fff8_0%,#ecfdf5_100%)] p-5 shadow-[0_18px_40px_rgba(15,23,42,0.08)] transition-transform duration-500 hover:-translate-y-1 sm:rounded-[2rem] sm:p-6">
            <div className="absolute top-0 left-0 h-[1px] w-full bg-gradient-to-r from-transparent via-emerald-400/70 to-transparent" />
            <div className="flex items-start gap-4">
              <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-emerald-100">
                <ShieldCheck className="h-6 w-6 text-emerald-700" />
              </div>
              <div>
                <p className="text-sm font-semibold tracking-wide text-emerald-700 uppercase">
                  Más confianza para vender
                </p>
                <p className="mt-1 text-sm leading-7 text-emerald-900/80">
                  Tu escuela se presenta mejor cuando la operación, la evidencia y los números están
                  organizados en el mismo sistema.
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
