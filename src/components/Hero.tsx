import Link from "next/link";
import {
  ArrowRight,
  BadgeCheck,
  CalendarDays,
  Car,
  CreditCard,
  FileCheck2,
  Smartphone,
} from "lucide-react";
import CondusoftLogo from "@/components/brand/CondusoftLogo";

const outcomes = [
  { value: "Operación", label: "alumnos, matrículas y horas" },
  { value: "Finanzas", label: "ingresos, cartera, caja diaria y gastos" },
  { value: "Control", label: "flota, sedes, permisos y cumplimiento" },
];

const dailyFlow = [
  { icon: CalendarDays, title: "Horas", detail: "trabajo registrado por instructor" },
  { icon: CreditCard, title: "Recaudo", detail: "cobros, abonos y cartera" },
  { icon: Car, title: "Flota", detail: "vehículos y mantenimientos" },
  { icon: Smartphone, title: "CALE", detail: "práctica móvil para alumnos" },
  { icon: FileCheck2, title: "Control", detail: "contratos y evidencia interna" },
];

export default function Hero() {
  return (
    <section className="relative overflow-hidden border-b border-[var(--surface-border)] bg-[#fbfbfd] pt-24 pb-12 sm:pt-32 sm:pb-16 md:pt-36">
      <div className="mx-auto grid max-w-[1180px] gap-10 px-4 sm:px-6 lg:grid-cols-[0.98fr_1.02fr] lg:items-center">
        <div className="max-w-3xl">
          <div className="animate-fade-in-up inline-flex items-center rounded-full border border-black/10 bg-white px-3 py-1.5 text-xs font-semibold text-[#111111] shadow-sm">
            Software para autoescuelas y CEA en Colombia
          </div>

          <h1 className="animate-fade-in-up mt-7 max-w-3xl text-[2.5rem] leading-[1.03] font-semibold tracking-tight text-[#111111] sm:text-5xl md:text-6xl lg:text-[4.25rem]">
            Tu autoescuela, bajo control.
          </h1>

          <p className="animate-fade-in-up mt-5 max-w-2xl text-[15px] leading-7 text-slate-600 sm:text-lg sm:leading-8">
            ConduSoft reúne alumnos, horas, recaudo, cartera y flota en una plataforma clara para
            que tu equipo trabaje con la información al día.
          </p>

          <div className="animate-fade-in-up mt-8 flex flex-col gap-3 sm:flex-row sm:items-center">
            <Link
              href="/registro"
              prefetch={false}
              className="group inline-flex min-h-[52px] w-full items-center justify-center rounded-full bg-[#111111] px-7 text-sm font-semibold text-white shadow-[0_18px_38px_rgba(15,23,42,0.18)] transition-all hover:-translate-y-0.5 hover:bg-[#0071e3] sm:w-auto"
            >
              Crear cuenta
              <ArrowRight className="ml-2 h-4 w-4 transition-transform group-hover:translate-x-1" />
            </Link>
            <a
              href="#product-tour"
              className="inline-flex min-h-[52px] w-full items-center justify-center rounded-full border border-slate-200 bg-white px-7 text-sm font-semibold text-slate-700 shadow-sm transition-all hover:border-slate-300 hover:bg-slate-50 sm:w-auto"
            >
              Explorar la plataforma
            </a>
          </div>

          <div className="animate-fade-in-up mt-9 grid gap-3 border-t border-slate-200 pt-6 sm:grid-cols-3">
            {outcomes.map((outcome) => (
              <div key={outcome.value}>
                <p className="text-sm font-semibold text-[#111111]">{outcome.value}</p>
                <p className="mt-1 text-sm leading-6 text-slate-500">{outcome.label}</p>
              </div>
            ))}
          </div>
        </div>

        <div className="animate-fade-in-up lg:pl-4">
          <div className="overflow-hidden rounded-[2rem] border border-slate-200 bg-white shadow-[0_24px_70px_rgba(15,23,42,0.11)]">
            <div className="flex items-center justify-between border-b border-slate-100 px-5 py-4">
              <CondusoftLogo
                size="sm"
                subtitle="Vista de la plataforma"
                subtitleClassName="hidden sm:block"
              />
              <span className="rounded-full bg-emerald-50 px-3 py-1 text-xs font-semibold text-emerald-700">
                Operación conectada
              </span>
            </div>

            <div className="p-5 sm:p-6">
              <div className="grid gap-3 sm:grid-cols-3">
                <div className="rounded-2xl border border-slate-100 bg-slate-50 px-4 py-4">
                  <p className="text-lg font-semibold tracking-tight text-[#0071e3] sm:text-2xl">
                    Alumnos
                  </p>
                  <p className="mt-1 text-xs leading-5 text-slate-500">registro y seguimiento</p>
                </div>
                <div className="rounded-2xl border border-slate-100 bg-slate-50 px-4 py-4">
                  <p className="text-lg font-semibold tracking-tight text-[#111111] sm:text-2xl">
                    Recaudo
                  </p>
                  <p className="mt-1 text-xs leading-5 text-slate-500">caja y cartera</p>
                </div>
                <div className="rounded-2xl border border-slate-100 bg-slate-50 px-4 py-4">
                  <p className="text-lg font-semibold tracking-tight text-emerald-600 sm:text-2xl">
                    Flota
                  </p>
                  <p className="mt-1 text-xs leading-5 text-slate-500">disponibilidad y control</p>
                </div>
              </div>

              <div className="mt-5 overflow-hidden rounded-[1.5rem] border border-slate-100">
                {dailyFlow.map((item, index) => (
                  <div
                    key={item.title}
                    className={`flex items-center gap-4 px-4 py-4 ${
                      index !== dailyFlow.length - 1 ? "border-b border-slate-100" : ""
                    }`}
                  >
                    <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl bg-[#f2f7ff]">
                      <item.icon className="h-5 w-5 text-[#0071e3]" />
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="text-sm font-semibold text-[#111111]">{item.title}</p>
                      <p className="mt-0.5 text-sm text-slate-500">{item.detail}</p>
                    </div>
                    <BadgeCheck className="h-4 w-4 text-emerald-500" />
                  </div>
                ))}
              </div>

              <div className="mt-5 grid gap-3 sm:grid-cols-2">
                <div className="rounded-[1.5rem] border border-blue-100 bg-[#f5f9ff] px-4 py-4">
                  <p className="text-xs font-semibold tracking-[0.14em] text-[#0071e3] uppercase">
                    Evaluación CALE
                  </p>
                  <p className="mt-2 text-sm leading-6 text-slate-600">
                    Práctica móvil y seguimiento para acompañar a los alumnos desde la misma base.
                  </p>
                </div>
                <div className="rounded-[1.5rem] border border-slate-200 bg-white px-4 py-4">
                  <p className="text-xs font-semibold tracking-[0.14em] text-slate-700 uppercase">
                    Equipo conectado
                  </p>
                  <p className="mt-2 text-sm leading-6 text-slate-600">
                    Roles, sedes y responsabilidades visibles para trabajar con más claridad.
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
