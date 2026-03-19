import Link from "next/link";
import { ArrowRight, BadgeCheck, CalendarClock, CarFront, WalletCards } from "lucide-react";

const heroBenefits = [
  "Reduce errores en expedientes y controla pagos atrasados con más orden.",
  "Evita cruces de horarios y aprovecha mejor instructores y vehículos.",
];

const heroMetrics = [
  { label: "Ingresos del mes", value: "$12.5M COP", accent: "bg-emerald-500" },
  { label: "Nuevos alumnos", value: "27", accent: "bg-blue-apple" },
  { label: "Clases hoy", value: "18", accent: "bg-amber-400" },
];

const todaysAgenda = [
  { hour: "07:30", title: "Clase práctica B1", meta: "Vehículo Mazda 2 • Sede principal" },
  { hour: "10:00", title: "Examen interno de patio", meta: "Instructor Camilo R. • 3 alumnos" },
  { hour: "15:40", title: "Control de cartera", meta: "5 pagos por confirmar" },
];

export default function Hero() {
  return (
    <section className="relative overflow-hidden border-b border-gray-100 bg-[linear-gradient(180deg,rgba(255,255,255,0.9),rgba(246,248,252,0.98))] pt-28 pb-16 sm:pt-32 sm:pb-20 md:pt-40 md:pb-28 dark:border-gray-900 dark:bg-[linear-gradient(180deg,rgba(4,4,6,0.98),rgba(0,0,0,1))]">
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_top_left,rgba(0,113,227,0.14),transparent_32rem),radial-gradient(circle_at_85%_18%,rgba(39,144,255,0.12),transparent_26rem)]" />

      <div className="relative z-10 mx-auto grid max-w-[1180px] gap-10 px-6 lg:grid-cols-[1.02fr_0.98fr] lg:items-center">
        <div className="max-w-3xl text-left">
          <div className="flex flex-wrap items-center gap-3">
            <span className="apple-badge">Hecho para autoescuelas en Colombia</span>
            <span className="rounded-full border border-gray-200 bg-white/80 px-3 py-1 text-xs font-semibold text-gray-600 shadow-sm dark:border-gray-800 dark:bg-white/[0.04] dark:text-gray-300">
              Operación local, sin hojas sueltas
            </span>
          </div>

          <h1 className="text-foreground mt-6 text-4xl font-semibold tracking-[-0.03em] sm:text-5xl md:text-6xl lg:text-7xl">
            Gestiona alumnos, pagos y clases desde un solo panel.
          </h1>

          <p className="mt-6 max-w-2xl text-base leading-8 text-gray-600 sm:text-xl dark:text-gray-300">
            AutoEscuelaPro centraliza la operación diaria de tu escuela de conducción para que
            tengas más control, menos reprocesos y una visión clara del negocio en Colombia.
          </p>

          <div className="mt-8 space-y-3">
            {heroBenefits.map((item) => (
              <div key={item} className="flex items-start gap-3">
                <BadgeCheck className="text-blue-apple mt-0.5 h-5 w-5 shrink-0" />
                <p className="text-sm leading-6 text-gray-600 sm:text-base dark:text-gray-300">
                  {item}
                </p>
              </div>
            ))}
          </div>

          <div className="mt-9 flex flex-col gap-3 sm:flex-row sm:flex-wrap">
            <Link
              href="/registro"
              className="apple-button-primary min-h-[48px] justify-center px-6 text-sm font-semibold sm:text-base"
            >
              Crear cuenta para mi autoescuela
            </Link>
            <a
              href="#how-it-works"
              className="apple-button-secondary min-h-[48px] justify-center px-6 text-sm font-semibold sm:text-base"
            >
              Probar demo guiada
            </a>
            <Link
              href="/login"
              className="apple-button-ghost text-blue-apple min-h-[48px] justify-center px-2 text-sm font-semibold sm:text-base"
            >
              Iniciar sesión
            </Link>
          </div>

          <p className="mt-4 text-sm text-gray-500">
            Ideal para escuelas nuevas y operaciones multi-sede en ciudades como Ipiales, Pasto,
            Cali o Bogotá.
          </p>
        </div>

        <div className="relative">
          <div className="apple-panel overflow-hidden rounded-[34px] border border-white/60 p-4 shadow-[0_30px_90px_rgba(15,23,42,0.14)] sm:p-5 dark:border-white/[0.08]">
            <div className="mb-4 flex items-center justify-between rounded-[22px] border border-gray-100 bg-white/80 px-4 py-3 dark:border-gray-800 dark:bg-white/[0.03]">
              <div>
                <p className="text-xs font-semibold tracking-[0.18em] text-gray-500 uppercase">
                  Panel principal
                </p>
                <p className="text-foreground mt-1 text-sm font-semibold">
                  Escuela de conducción lista para operar
                </p>
              </div>
              <div className="text-blue-apple rounded-full bg-blue-50 px-3 py-1 text-xs font-semibold dark:bg-blue-950/30">
                En línea
              </div>
            </div>

            <div className="grid gap-3 sm:grid-cols-3">
              {heroMetrics.map((metric) => (
                <div
                  key={metric.label}
                  className="rounded-[24px] border border-gray-100 bg-white/85 p-4 dark:border-gray-800 dark:bg-white/[0.03]"
                >
                  <p className="text-xs font-semibold tracking-[0.12em] text-gray-500 uppercase">
                    {metric.label}
                  </p>
                  <p className="text-foreground mt-3 text-2xl font-semibold tracking-tight">
                    {metric.value}
                  </p>
                  <div className="mt-4 h-2 rounded-full bg-gray-100 dark:bg-gray-800">
                    <div className={`h-2 rounded-full ${metric.accent} w-[72%]`} />
                  </div>
                </div>
              ))}
            </div>

            <div className="mt-4 grid gap-4 lg:grid-cols-[1.1fr_0.9fr]">
              <div className="rounded-[26px] border border-gray-100 bg-white/85 p-5 dark:border-gray-800 dark:bg-white/[0.03]">
                <div className="mb-5 flex items-center gap-3">
                  <CalendarClock className="text-blue-apple h-5 w-5" />
                  <div>
                    <p className="text-foreground text-sm font-semibold">Agenda de hoy</p>
                    <p className="text-xs text-gray-500">Clases, exámenes y tareas operativas</p>
                  </div>
                </div>

                <div className="space-y-3">
                  {todaysAgenda.map((item) => (
                    <div
                      key={item.hour}
                      className="rounded-[20px] border border-gray-100 px-4 py-3 dark:border-gray-800"
                    >
                      <div className="flex items-center justify-between gap-3">
                        <p className="text-foreground text-sm font-semibold">{item.title}</p>
                        <span className="text-blue-apple text-xs font-semibold">{item.hour}</span>
                      </div>
                      <p className="mt-1 text-xs leading-5 text-gray-500">{item.meta}</p>
                    </div>
                  ))}
                </div>
              </div>

              <div className="flex flex-col gap-4">
                <div className="rounded-[26px] border border-gray-100 bg-white/85 p-5 dark:border-gray-800 dark:bg-white/[0.03]">
                  <div className="flex items-center gap-3">
                    <WalletCards className="text-blue-apple h-5 w-5" />
                    <p className="text-foreground text-sm font-semibold">Cartera y pagos</p>
                  </div>
                  <p className="text-foreground mt-4 text-3xl font-semibold tracking-tight">94%</p>
                  <p className="mt-2 text-sm leading-6 text-gray-500">
                    de pagos del mes conciliados sin revisar varias hojas de cálculo.
                  </p>
                </div>

                <div className="rounded-[26px] border border-blue-100 bg-blue-50/70 p-5 dark:border-blue-900/60 dark:bg-blue-950/20">
                  <div className="flex items-center gap-3">
                    <CarFront className="text-blue-apple h-5 w-5" />
                    <p className="text-foreground text-sm font-semibold">Flota bajo control</p>
                  </div>
                  <p className="mt-3 text-sm leading-6 text-gray-600 dark:text-gray-300">
                    Tecnomecánica, mantenimiento y disponibilidad listos para que no se te cruce la
                    operación del día.
                  </p>
                  <a
                    href="#features"
                    className="text-blue-apple mt-5 inline-flex items-center gap-2 text-sm font-semibold"
                  >
                    Ver módulos del sistema
                    <ArrowRight className="h-4 w-4" />
                  </a>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
