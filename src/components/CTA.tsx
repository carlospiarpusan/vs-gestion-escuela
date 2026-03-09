"use client";

import Link from "next/link";
import { motion } from "framer-motion";

export default function CTA() {
  return (
    <section className="py-16 sm:py-24 md:py-32 bg-gray-50 dark:bg-[#000000] border-t border-gray-100 dark:border-gray-900">
      <div className="max-w-[980px] mx-auto px-6 text-center">
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          whileInView={{ opacity: 1, scale: 1 }}
          viewport={{ once: true }}
          transition={{ duration: 0.8, ease: "easeOut" }}
        >
          <h2 className="text-3xl sm:text-4xl md:text-5xl lg:text-6xl font-semibold tracking-tight text-foreground mb-6">
            AutoEscuelaPro.
          </h2>
          <p className="text-xl sm:text-2xl text-gray-500 max-w-2xl mx-auto mb-10">
            La herramienta que tu autoescuela necesita.
          </p>

          <div className="flex flex-col sm:flex-row items-center justify-center gap-6">
            <Link
              href="/registro"
              className="w-full sm:w-auto bg-blue-apple text-white text-[15px] sm:text-[17px] px-8 py-3.5 sm:py-3 rounded-full hover:bg-blue-hover transition-all hover:scale-[1.02] text-center"
            >
              Empezar ahora
            </Link>
            <Link
              href="/login"
              className="w-full sm:w-auto text-blue-apple text-[15px] sm:text-[17px] px-8 py-3.5 sm:py-3 rounded-full hover:bg-blue-apple/10 transition-colors text-center font-medium"
            >
              Iniciar Sesión
            </Link>
          </div>
        </motion.div>
      </div>
    </section>
  );
}
