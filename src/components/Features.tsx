"use client";

import {
  Users,
  Calendar,
  Car,
  ClipboardCheck,
  BarChart3,
  Shield,
} from "lucide-react";

const features = [
  {
    icon: Users,
    title: "Gestión de Alumnos",
    description:
      "Registra, organiza y haz seguimiento de cada alumno con fichas completas, historial de clases y progreso en tiempo real.",
  },
  {
    icon: Calendar,
    title: "Agenda Inteligente",
    description:
      "Planifica clases, asigna instructores y gestiona horarios con un calendario visual e intuitivo.",
  },
  {
    icon: Car,
    title: "Control de Vehículos",
    description:
      "Administra tu flota de vehículos, mantenimientos, ITV y documentación todo en un solo lugar.",
  },
  {
    icon: ClipboardCheck,
    title: "Exámenes y Evaluaciones",
    description:
      "Registra resultados de exámenes teóricos y prácticos. Genera estadísticas de aprobados automáticamente.",
  },
  {
    icon: BarChart3,
    title: "Informes y Analíticas",
    description:
      "Dashboards con métricas clave de tu negocio: ingresos, ocupación, rendimiento de instructores y más.",
  },
  {
    icon: Shield,
    title: "Seguro y en la Nube",
    description:
      "Datos protegidos con encriptación de nivel bancario. Accede desde cualquier dispositivo, en cualquier momento.",
  },
];

export default function Features() {
  return (
    <section
      id="features"
      className="py-24 bg-[#f5f5f7] dark:bg-[#1d1d1f]/30"
    >
      <div className="max-w-[980px] mx-auto px-6">
        {/* Section header */}
        <div className="text-center mb-16">
          <h2 className="text-4xl sm:text-5xl font-semibold tracking-tight text-[#1d1d1f] dark:text-[#f5f5f7] mb-4">
            Todo lo que necesitas.
          </h2>
          <p className="text-xl text-[#86868b] max-w-2xl mx-auto">
            Herramientas diseñadas para simplificar la gestión de tu autoescuela
            desde el primer día.
          </p>
        </div>

        {/* Features grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {features.map((feature) => (
            <div
              key={feature.title}
              className="group bg-white dark:bg-[#161616] rounded-2xl p-8 hover:scale-[1.02] transition-all duration-300 hover:shadow-lg"
            >
              <div className="w-12 h-12 rounded-2xl bg-[#0071e3]/10 flex items-center justify-center mb-5 group-hover:bg-[#0071e3]/20 transition-colors">
                <feature.icon className="w-6 h-6 text-[#0071e3]" />
              </div>
              <h3 className="text-xl font-semibold text-[#1d1d1f] dark:text-[#f5f5f7] mb-2">
                {feature.title}
              </h3>
              <p className="text-[15px] leading-relaxed text-[#86868b]">
                {feature.description}
              </p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
