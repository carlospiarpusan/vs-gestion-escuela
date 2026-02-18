"use client";

import Link from "next/link";

export default function Hero() {
  return (
    <section className="relative min-h-screen flex flex-col items-center justify-center overflow-hidden bg-white dark:bg-black pt-12">
      {/* Subtle gradient background */}
      <div className="absolute inset-0 bg-gradient-to-b from-white via-white to-[#f5f5f7] dark:from-black dark:via-black dark:to-[#1d1d1f]/30" />

      <div className="relative z-10 max-w-[980px] mx-auto px-6 text-center">
        {/* Overline */}
        <p className="text-[#0071e3] text-sm font-semibold mb-4 opacity-0 animate-fade-in-up">
          Gestión de Escuelas de Conducción
        </p>

        {/* Main headline - Apple style large text */}
        <h1 className="text-5xl sm:text-6xl md:text-7xl lg:text-[80px] font-semibold tracking-[-0.015em] leading-[1.05] text-[#1d1d1f] dark:text-[#f5f5f7] mb-2 opacity-0 animate-fade-in-up delay-100">
          AutoEscuela
          <span className="gradient-text">Pro</span>
        </h1>

        {/* Subtitle */}
        <h2 className="text-2xl sm:text-3xl md:text-4xl font-semibold text-[#1d1d1f] dark:text-[#f5f5f7] mt-1 mb-4 opacity-0 animate-fade-in-up delay-200">
          Simple. Potente. Profesional.
        </h2>

        {/* Description */}
        <p className="text-lg sm:text-xl text-[#86868b] max-w-2xl mx-auto mb-8 opacity-0 animate-fade-in-up delay-300">
          La plataforma todo en uno para gestionar alumnos, instructores,
          vehículos, clases y exámenes. Diseñada para que te enfoques en lo
          que importa: enseñar a conducir.
        </p>

        {/* CTA Buttons */}
        <div className="flex flex-col sm:flex-row items-center justify-center gap-4 opacity-0 animate-fade-in-up delay-400">
          <Link
            href="/registro"
            className="bg-[#0071e3] text-white text-lg px-8 py-3 rounded-full hover:bg-[#0077ED] transition-all duration-300 hover:scale-105 font-medium"
          >
            Comenzar gratis
          </Link>
          <Link
            href="/login"
            className="text-[#0071e3] text-lg px-8 py-3 rounded-full hover:bg-[#0071e3]/5 transition-all duration-300 font-medium"
          >
            Iniciar sesión &gt;
          </Link>
        </div>

        {/* Hero visual */}
        <div className="mt-16 opacity-0 animate-scale-in delay-500">
          <div className="relative mx-auto max-w-4xl">
            {/* Browser mockup */}
            <div className="rounded-2xl border border-gray-200/80 dark:border-gray-800/80 bg-[#f5f5f7] dark:bg-[#1d1d1f] shadow-2xl overflow-hidden">
              {/* Browser bar */}
              <div className="flex items-center gap-2 px-4 py-3 bg-[#e8e8ed] dark:bg-[#2d2d2d] border-b border-gray-200/50 dark:border-gray-700/50">
                <div className="flex gap-1.5">
                  <div className="w-3 h-3 rounded-full bg-[#ff5f57]" />
                  <div className="w-3 h-3 rounded-full bg-[#febc2e]" />
                  <div className="w-3 h-3 rounded-full bg-[#28c840]" />
                </div>
                <div className="flex-1 mx-4">
                  <div className="bg-white dark:bg-[#1d1d1f] rounded-md px-3 py-1 text-xs text-[#86868b] text-center">
                    autoescuelapro.com/dashboard
                  </div>
                </div>
              </div>

              {/* Dashboard preview */}
              <div className="p-6 sm:p-8 bg-white dark:bg-[#161616]">
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-6">
                  {[
                    { label: "Alumnos Activos", value: "128", color: "#0071e3" },
                    { label: "Clases Hoy", value: "24", color: "#28c840" },
                    { label: "Exámenes", value: "12", color: "#ff9f0a" },
                    { label: "Aprobados", value: "96%", color: "#bf5af2" },
                  ].map((stat) => (
                    <div
                      key={stat.label}
                      className="bg-[#f5f5f7] dark:bg-[#1d1d1f] rounded-xl p-4 text-center"
                    >
                      <p
                        className="text-2xl sm:text-3xl font-bold"
                        style={{ color: stat.color }}
                      >
                        {stat.value}
                      </p>
                      <p className="text-xs text-[#86868b] mt-1">
                        {stat.label}
                      </p>
                    </div>
                  ))}
                </div>
                <div className="h-32 sm:h-40 bg-[#f5f5f7] dark:bg-[#1d1d1f] rounded-xl flex items-end justify-around px-4 pb-4">
                  {[40, 65, 45, 80, 55, 90, 70, 85, 60, 95, 75, 88].map(
                    (h, i) => (
                      <div
                        key={i}
                        className="w-full max-w-[24px] rounded-t-md bg-[#0071e3]/70 dark:bg-[#0071e3]/50"
                        style={{ height: `${h}%` }}
                      />
                    )
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Scroll indicator */}
      <div className="absolute bottom-8 left-1/2 -translate-x-1/2 opacity-0 animate-fade-in delay-600">
        <div className="w-6 h-10 border-2 border-[#86868b]/40 rounded-full flex justify-center">
          <div className="w-1.5 h-3 bg-[#86868b]/60 rounded-full mt-2 animate-bounce" />
        </div>
      </div>
    </section>
  );
}
