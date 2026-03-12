"use client";

import Link from "next/link";
import { motion } from "framer-motion";
import { BadgeCheck, Building2, CarFront, GraduationCap, Headphones } from "lucide-react";

const planCards = [
  {
    icon: GraduationCap,
    title: "Escuela en crecimiento",
    description: "Ideal para una sede que necesita ordenar alumnos, clases, pagos y caja diaria.",
  },
  {
    icon: Building2,
    title: "Operación multi-sede",
    description: "Pensado para escuelas que necesitan control por sede, instructores, flota y reportes.",
  },
];

const planHighlights = [
  "Demo guiada gratuita para validar el flujo real de tu escuela.",
  "Configuración inicial acompañada para sedes, vehículos y usuarios.",
  "Planes adaptados al tamaño de tu operación en Colombia.",
];

export default function Pricing() {
  return (
    <section
      id="pricing"
      className="border-y border-gray-100 bg-[linear-gradient(180deg,rgba(244,247,252,0.9),rgba(255,255,255,0.96))] py-16 dark:border-gray-900 dark:bg-[linear-gradient(180deg,rgba(10,10,12,0.95),rgba(0,0,0,1))] sm:py-24 md:py-32"
    >
      <div className="mx-auto max-w-[1180px] px-6">
        <div className="mb-12 max-w-3xl">
          <motion.span
            initial={{ opacity: 0, y: 16 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.45 }}
            className="apple-badge"
          >
            Planes y acompañamiento
          </motion.span>
          <motion.h2
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.55, delay: 0.05 }}
            className="mt-4 text-left text-3xl font-semibold tracking-tight text-foreground sm:text-4xl md:text-5xl"
          >
            Precios claros para escuelas de conducción en Colombia.
          </motion.h2>
          <motion.p
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.55, delay: 0.1 }}
            className="mt-5 max-w-2xl text-left text-base leading-relaxed text-gray-500 sm:text-lg"
          >
            Estamos afinando la tabla pública de precios. Mientras tanto, puedes arrancar con demo
            guiada, configuración inicial acompañada y una propuesta ajustada al tamaño de tu flota,
            tus sedes y tus usuarios.
          </motion.p>
        </div>

        <div className="grid gap-6 lg:grid-cols-[1.2fr_0.8fr]">
          <motion.div
            initial={{ opacity: 0, y: 24 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.55 }}
            className="apple-panel p-6 sm:p-8"
          >
            <div className="mb-6 flex flex-wrap items-center gap-3">
              <span className="apple-badge">Demo gratuita</span>
              <span className="rounded-full border border-emerald-200 bg-emerald-50 px-3 py-1 text-xs font-semibold text-emerald-700 dark:border-emerald-900/70 dark:bg-emerald-950/40 dark:text-emerald-300">
                Implementación guiada
              </span>
            </div>

            <div className="grid gap-4 md:grid-cols-2">
              {planCards.map((plan, index) => (
                <motion.div
                  key={plan.title}
                  initial={{ opacity: 0, y: 18 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true }}
                  transition={{ duration: 0.45, delay: 0.08 * index }}
                  className="rounded-[28px] border border-gray-100 bg-white/80 p-5 shadow-[0_18px_45px_rgba(15,23,42,0.06)] dark:border-gray-800 dark:bg-white/[0.03]"
                >
                  <plan.icon className="mb-4 h-10 w-10 text-blue-apple" />
                  <h3 className="text-xl font-semibold text-foreground">{plan.title}</h3>
                  <p className="mt-3 text-sm leading-6 text-gray-500">{plan.description}</p>
                </motion.div>
              ))}
            </div>

            <div className="mt-6 rounded-[28px] border border-blue-100 bg-blue-50/70 p-5 dark:border-blue-900/60 dark:bg-blue-950/20">
              <div className="flex items-center gap-3">
                <CarFront className="h-5 w-5 text-blue-apple" />
                <p className="text-sm font-semibold text-foreground">
                  Cotización ajustada a tu operación real, no a una plantilla genérica.
                </p>
              </div>
              <p className="mt-3 text-sm leading-6 text-gray-600 dark:text-gray-300">
                Si estás en Ipiales, Pasto, Bogotá o cualquier ciudad de Colombia, la plataforma se
                adapta a tu volumen de alumnos, instructores y vehículos.
              </p>
            </div>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 24 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.55, delay: 0.08 }}
            className="apple-panel-muted flex flex-col justify-between p-6 sm:p-8"
          >
            <div>
              <div className="mb-5 flex items-center gap-3">
                <Headphones className="h-5 w-5 text-blue-apple" />
                <p className="text-sm font-semibold uppercase tracking-[0.18em] text-gray-500">
                  Qué incluye
                </p>
              </div>

              <div className="space-y-4">
                {planHighlights.map((item) => (
                  <div key={item} className="flex items-start gap-3">
                    <BadgeCheck className="mt-0.5 h-5 w-5 shrink-0 text-blue-apple" />
                    <p className="text-sm leading-6 text-gray-600 dark:text-gray-300">{item}</p>
                  </div>
                ))}
              </div>
            </div>

            <div className="mt-8 flex flex-col gap-3">
              <Link
                href="/registro"
                className="apple-button-primary min-h-[48px] justify-center text-sm font-semibold"
              >
                Crear cuenta para mi autoescuela
              </Link>
              <a
                href="#contacto"
                className="apple-button-secondary min-h-[48px] justify-center text-sm font-semibold"
              >
                Solicitar acompañamiento
              </a>
            </div>
          </motion.div>
        </div>
      </div>
    </section>
  );
}
