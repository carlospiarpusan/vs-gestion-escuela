"use client";

import Link from "next/link";
import { motion } from "framer-motion";

export default function CTA() {
  return (
    <section className="border-t border-gray-100 bg-gray-50 py-16 dark:border-gray-900 dark:bg-[#000000] sm:py-24 md:py-32">
      <div className="mx-auto max-w-[980px] px-6 text-left">
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          whileInView={{ opacity: 1, scale: 1 }}
          viewport={{ once: true }}
          transition={{ duration: 0.8, ease: "easeOut" }}
          className="apple-panel overflow-hidden p-8 sm:p-10"
        >
          <span className="apple-badge">Listo para ordenar tu operación</span>
          <h2 className="mt-5 text-3xl font-semibold tracking-tight text-foreground sm:text-4xl md:text-5xl lg:text-6xl">
            Tu escuela puede verse así de organizada desde esta semana.
          </h2>
          <p className="mt-5 max-w-2xl text-base leading-8 text-gray-500 sm:text-xl">
            Si tu equipo todavía reparte la operación entre cuadernos, WhatsApp y hojas de cálculo,
            este es el momento de centralizarlo en un solo sistema.
          </p>

          <div className="mt-10 flex flex-col gap-3 sm:flex-row">
            <Link
              href="/registro"
              className="apple-button-primary min-h-[48px] justify-center px-6 text-sm font-semibold sm:w-auto"
            >
              Probar demo gratuita
            </Link>
            <a
              href="#contacto"
              className="apple-button-secondary min-h-[48px] justify-center px-6 text-sm font-semibold sm:w-auto"
            >
              Hablar con soporte
            </a>
          </div>
        </motion.div>
      </div>
    </section>
  );
}
