"use client";

import Link from "next/link";
import { motion, useScroll, useTransform } from "framer-motion";
import { useRef } from "react";

export default function Hero() {
  const ref = useRef(null);
  const { scrollYProgress } = useScroll({
    target: ref,
    offset: ["start start", "end start"],
  });

  const y = useTransform(scrollYProgress, [0, 1], [0, 150]);
  const opacity = useTransform(scrollYProgress, [0, 0.5], [1, 0]);

  return (
    <section
      ref={ref}
      className="relative min-h-screen md:min-h-[120vh] flex flex-col items-center justify-start overflow-hidden bg-background pt-24 sm:pt-32 md:pt-40 pb-16 sm:pb-24 md:pb-32"
    >
      <div className="relative z-10 max-w-[980px] mx-auto px-6 text-center">
        {/* Overline */}
        <motion.p
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, ease: "easeOut" }}
          className="text-blue-apple text-xs md:text-sm font-semibold mb-6 tracking-wider uppercase"
        >
          Gestión de Escuelas de Conducción
        </motion.p>

        {/* Main headline */}
        <motion.h1
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8, delay: 0.1, ease: [0.16, 1, 0.3, 1] }}
          className="text-4xl sm:text-6xl md:text-7xl lg:text-8xl font-semibold tracking-[-0.015em] leading-[1.05] text-foreground mb-4 sm:mb-6"
        >
          AutoEscuela<span className="text-blue-apple">Pro</span>
        </motion.h1>

        {/* Subtitle */}
        <motion.h2
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8, delay: 0.2, ease: [0.16, 1, 0.3, 1] }}
          className="text-xl sm:text-3xl md:text-4xl lg:text-5xl font-medium text-foreground mb-6 sm:mb-10 tracking-tight"
        >
          Simple. Potente. Profesional.
        </motion.h2>

        {/* Description */}
        <motion.p
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8, delay: 0.3, ease: "easeOut" }}
          className="text-base sm:text-xl md:text-2xl text-gray-500 max-w-2xl mx-auto mb-8 sm:mb-12 leading-relaxed font-normal px-2"
        >
          La plataforma definitiva para tu autoescuela. Gestiona alumnos, pagos y clases desde un único lugar.
        </motion.p>

        {/* CTA Buttons */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8, delay: 0.4, ease: "easeOut" }}
          className="flex flex-col sm:flex-row items-center justify-center gap-6"
        >
          <Link
            href="/registro"
            className="w-full sm:w-auto bg-blue-apple text-white text-[15px] sm:text-[17px] px-8 py-3.5 sm:py-3 rounded-full hover:bg-blue-hover transition-all hover:scale-[1.02] active:scale-[0.98] text-center"
          >
            Comenzar gratis
          </Link>
          <Link
            href="/login"
            className="w-full sm:w-auto text-blue-apple text-[15px] sm:text-[17px] px-8 py-3.5 sm:py-3 rounded-full hover:bg-blue-apple/10 transition-colors flex items-center justify-center gap-1 group border border-blue-apple/20 sm:border-transparent"
          >
            Iniciar Sesión
            <span className="group-hover:translate-x-1 transition-transform">
              &gt;
            </span>
          </Link>
        </motion.div>

        {/* Hero visual with Parallax */}
        <motion.div
          style={{ y, opacity }}
          initial={{ opacity: 0, scale: 0.95, y: 40 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          transition={{ duration: 1, delay: 0.5, ease: [0.16, 1, 0.3, 1] }}
          className="mt-12 sm:mt-16 md:mt-24 w-full"
        >
          <div className="relative mx-auto max-w-6xl">
            {/* Browser Window Mockup */}
            <div className="rounded-xl border border-gray-200 dark:border-gray-800 bg-background shadow-2xl overflow-hidden ring-1 ring-black/5">
              {/* Traffic Lights */}
              <div className="flex items-center gap-2 px-4 py-3 bg-gray-50 dark:bg-[#1c1c1e] border-b border-gray-200 dark:border-gray-800">
                <div className="flex gap-1.5">
                  <div className="w-3 h-3 rounded-full bg-[#ff5f57]" />
                  <div className="w-3 h-3 rounded-full bg-[#febc2e]" />
                  <div className="w-3 h-3 rounded-full bg-[#28c840]" />
                </div>
              </div>

              {/* Window Content */}
              <div className="p-4 sm:p-8 md:p-12 bg-gray-50/50 dark:bg-[#000000]">
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                  {/* Dummy Dashboard Cards */}
                  <div className="bg-background rounded-2xl p-6 shadow-sm border border-gray-100 dark:border-gray-800">
                    <div className="text-sm text-gray-500 font-medium mb-2">Ingresos Mes</div>
                    <div className="text-3xl font-semibold text-foreground">€12,450</div>
                    <div className="mt-4 h-1 w-full bg-gray-100 dark:bg-gray-800 rounded-full overflow-hidden">
                      <div className="h-full bg-green-500 w-[75%] rounded-full" />
                    </div>
                  </div>
                  <div className="bg-background rounded-2xl p-6 shadow-sm border border-gray-100 dark:border-gray-800">
                    <div className="text-sm text-gray-500 font-medium mb-2">Nuevos Alumnos</div>
                    <div className="text-3xl font-semibold text-foreground">+24</div>
                    <div className="flex gap-1 mt-4">
                      {[1, 2, 3, 4, 5].map(i => (
                        <div key={i} className="h-6 w-full bg-blue-apple/10 rounded-sm" />
                      ))}
                    </div>
                  </div>
                  <div className="bg-background rounded-2xl p-6 shadow-sm border border-gray-100 dark:border-gray-800">
                    <div className="text-sm text-gray-500 font-medium mb-2">Clases Hoy</div>
                    <div className="text-3xl font-semibold text-foreground">18</div>
                    <div className="mt-4 flex -space-x-2">
                      {[1, 2, 3].map(i => (
                        <div key={i} className="w-8 h-8 rounded-full bg-gray-200 dark:bg-gray-700 border-2 border-background" />
                      ))}
                    </div>
                  </div>
                </div>
                {/* Main Content Area */}
                <div className="mt-6 bg-background rounded-2xl p-6 shadow-sm border border-gray-100 dark:border-gray-800 h-64 flex items-center justify-center">
                  <div className="text-gray-400 font-medium">Gráfico de Rendimiento</div>
                </div>
              </div>
            </div>
          </div>
        </motion.div>
      </div>
    </section>
  );
}
