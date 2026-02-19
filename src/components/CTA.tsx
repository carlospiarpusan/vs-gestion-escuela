"use client";

import Link from "next/link";
import { motion } from "framer-motion";

export default function CTA() {
  return (
    <section className="py-32 bg-gray-50 dark:bg-[#000000] border-t border-gray-100 dark:border-gray-900">
      <div className="max-w-[980px] mx-auto px-6 text-center">
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          whileInView={{ opacity: 1, scale: 1 }}
          viewport={{ once: true }}
          transition={{ duration: 0.8, ease: "easeOut" }}
        >
          <h2 className="text-4xl sm:text-5xl md:text-6xl font-semibold tracking-tight text-foreground mb-6">
            AutoEscuelaPro.
          </h2>
          <p className="text-xl sm:text-2xl text-gray-500 max-w-2xl mx-auto mb-10">
            La herramienta que tu autoescuela necesita.
          </p>

          <div className="flex flex-col sm:flex-row items-center justify-center gap-6">
            <Link
              href="/registro"
              className="bg-blue-apple text-white text-[17px] px-8 py-3 rounded-full hover:bg-blue-hover transition-all hover:scale-[1.02]"
            >
              Empezar ahora
            </Link>
          </div>
        </motion.div>
      </div>
    </section>
  );
}
