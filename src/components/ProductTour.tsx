"use client";

import { useState, type KeyboardEvent } from "react";
import {
  BellRing,
  BookOpenCheck,
  CalendarDays,
  Car,
  CheckCircle2,
  CreditCard,
  FileCheck2,
  type LucideIcon,
} from "lucide-react";
import Link from "next/link";

type ProductArea = {
  id: string;
  label: string;
  title: string;
  description: string;
  items: string[];
  icon: LucideIcon;
};

const productAreas: ProductArea[] = [
  {
    id: "operacion",
    label: "Operación",
    title: "Alumnos, matrículas y horas en el mismo recorrido",
    description:
      "Desde el registro hasta las horas y evaluaciones, la operación académica se mantiene conectada para que el equipo tenga contexto al atender.",
    items: ["Alumnos y matrículas", "Horas e instructores", "Exámenes y seguimiento"],
    icon: CalendarDays,
  },
  {
    id: "finanzas",
    label: "Finanzas",
    title: "Una lectura más clara del recaudo",
    description:
      "Consulta ingresos, abonos, cartera, caja diaria y gastos sin mezclarlos en una sola hoja de cálculo.",
    items: ["Ingresos y abonos", "Cartera y caja diaria", "Gastos e informes"],
    icon: CreditCard,
  },
  {
    id: "flota",
    label: "Flota",
    title: "Vehículos y mantenimiento a la vista",
    description:
      "La disponibilidad de la flota, su mantenimiento y el historial operativo quedan visibles al planear la jornada.",
    items: ["Vehículos por sede", "Mantenimiento y bitácora", "Responsables y control"],
    icon: Car,
  },
  {
    id: "cale",
    label: "CALE",
    title: "Práctica móvil para acompañar la evaluación",
    description:
      "ConduSoft integra preparación CALE y práctica móvil para que los alumnos puedan continuar el proceso desde el celular.",
    items: ["Simulacros y práctica", "Seguimiento de resultados", "App para alumnos"],
    icon: BookOpenCheck,
  },
  {
    id: "cumplimiento",
    label: "Cumplimiento",
    title: "Evidencia y responsabilidades bien organizadas",
    description:
      "Permisos, contratos, solicitudes ARCO y documentación interna permanecen relacionados con la operación de la escuela.",
    items: ["Permisos y contratos", "Consentimiento y solicitudes ARCO", "Backups e incidentes"],
    icon: FileCheck2,
  },
  {
    id: "automatizacion",
    label: "Automatización",
    title: "Menos tareas repetitivas para el equipo",
    description:
      "Los flujos de importación, exportación y envío de facturas ayudan a reducir trabajo manual en actividades recurrentes.",
    items: ["Correo de facturas", "Importaciones y exportaciones", "Flujos operativos"],
    icon: BellRing,
  },
];

export default function ProductTour() {
  const [activeAreaId, setActiveAreaId] = useState(productAreas[0].id);
  const activeArea = productAreas.find((area) => area.id === activeAreaId) ?? productAreas[0];
  const ActiveIcon = activeArea.icon;

  const handleTabKeyDown = (event: KeyboardEvent<HTMLButtonElement>, index: number) => {
    const keys = ["ArrowLeft", "ArrowRight", "Home", "End"];
    if (!keys.includes(event.key)) return;

    event.preventDefault();
    const nextIndex =
      event.key === "Home"
        ? 0
        : event.key === "End"
          ? productAreas.length - 1
          : (index + (event.key === "ArrowRight" ? 1 : -1) + productAreas.length) %
            productAreas.length;
    const nextArea = productAreas[nextIndex];

    setActiveAreaId(nextArea.id);
    document.getElementById(`product-tab-${nextArea.id}`)?.focus();
  };

  return (
    <section
      id="product-tour"
      className="scroll-mt-28 bg-[#fbfbfd] py-16 sm:scroll-mt-32 sm:py-20 md:py-24"
    >
      <div className="mx-auto max-w-[1180px] px-4 sm:px-6">
        <div className="grid gap-6 lg:grid-cols-[0.82fr_1.18fr] lg:items-end">
          <div>
            <span className="inline-flex items-center rounded-full border border-slate-200 bg-white px-3 py-1 text-xs font-semibold text-slate-700">
              Recorrido por la plataforma
            </span>
            <h2 className="mt-4 max-w-xl text-3xl font-semibold tracking-tight text-[#111111] sm:text-4xl md:text-5xl">
              Explora lo que tu equipo puede ordenar desde un solo lugar.
            </h2>
          </div>
          <p className="max-w-2xl text-sm leading-7 text-slate-600 sm:text-base">
            Revisa las áreas principales antes de crear tu cuenta. Cada una reúne tareas que suelen
            perderse cuando la operación vive en herramientas separadas.
          </p>
        </div>

        <div className="mt-10 grid gap-5 lg:grid-cols-[260px_minmax(0,1fr)]">
          <div
            className="flex gap-2 overflow-x-auto pb-1 lg:flex-col lg:overflow-visible"
            role="tablist"
            aria-label="Áreas de ConduSoft"
          >
            {productAreas.map((area, index) => {
              const Icon = area.icon;
              const isActive = area.id === activeArea.id;

              return (
                <button
                  key={area.id}
                  type="button"
                  role="tab"
                  aria-selected={isActive}
                  aria-controls={`product-panel-${area.id}`}
                  id={`product-tab-${area.id}`}
                  onClick={() => setActiveAreaId(area.id)}
                  onKeyDown={(event) => handleTabKeyDown(event, index)}
                  className={`flex min-h-12 shrink-0 items-center gap-3 rounded-xl border px-4 py-3 text-left text-sm font-semibold transition-colors lg:w-full ${
                    isActive
                      ? "border-blue-200 bg-white text-[#111111] shadow-sm"
                      : "border-transparent text-slate-600 hover:border-slate-200 hover:bg-white"
                  }`}
                >
                  <span
                    className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-lg ${
                      isActive ? "bg-[#0071e3] text-white" : "bg-slate-200/70 text-slate-600"
                    }`}
                  >
                    <Icon className="h-4 w-4" />
                  </span>
                  {area.label}
                </button>
              );
            })}
          </div>

          <div
            id={`product-panel-${activeArea.id}`}
            role="tabpanel"
            aria-labelledby={`product-tab-${activeArea.id}`}
            className="border border-slate-200 bg-white p-5 shadow-[0_18px_42px_rgba(15,23,42,0.08)] sm:p-7"
          >
            <div className="grid gap-7 md:grid-cols-[minmax(0,1fr)_260px] md:items-start">
              <div>
                <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-[#f2f7ff]">
                  <ActiveIcon className="h-6 w-6 text-[#0071e3]" />
                </div>
                <p className="mt-5 text-xs font-semibold tracking-[0.14em] text-[#0071e3] uppercase">
                  {activeArea.label}
                </p>
                <h3 className="mt-2 max-w-xl text-2xl font-semibold tracking-tight text-[#111111] sm:text-3xl">
                  {activeArea.title}
                </h3>
                <p className="mt-4 max-w-xl text-sm leading-7 text-slate-600 sm:text-base">
                  {activeArea.description}
                </p>
              </div>

              <div className="border-l-0 border-slate-200 pt-0 md:border-l md:pl-6">
                <p className="text-xs font-semibold tracking-[0.14em] text-slate-500 uppercase">
                  Lo que puedes gestionar
                </p>
                <ul className="mt-4 space-y-3">
                  {activeArea.items.map((item) => (
                    <li
                      key={item}
                      className="flex items-start gap-3 text-sm leading-6 text-slate-700"
                    >
                      <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-emerald-600" />
                      {item}
                    </li>
                  ))}
                </ul>
              </div>
            </div>

            <div className="mt-8 border-t border-slate-100 pt-5">
              <Link
                href="/registro"
                prefetch={false}
                className="inline-flex min-h-[46px] items-center justify-center rounded-full bg-[#111111] px-6 text-sm font-semibold text-white transition-colors hover:bg-[#0071e3]"
              >
                Crear cuenta
              </Link>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
