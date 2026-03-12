"use client";

import Link from "next/link";
import { motion, useScroll, useTransform } from "framer-motion";
import { useRef } from "react";
import { cn } from "@/lib/utils";

const steps = [
  {
    number: "01",
    title: "Crea tu cuenta",
    description: "Activa tu escuela y agenda una demo guiada para arrancar con un flujo claro.",
  },
  {
    number: "02",
    title: "Configura sedes, flota y tarifas",
    description: "Deja listos vehículos, usuarios, categorías y estructura operativa en minutos.",
  },
  {
    number: "03",
    title: "Empieza a operar con control",
    description: "Gestiona alumnos, pagos y agenda diaria sin depender de hojas sueltas.",
  },
];

export default function HowItWorks() {
  const ref = useRef(null);
  const { scrollYProgress } = useScroll({
    target: ref,
    offset: ["start end", "end start"],
  });

  const lineHeight = useTransform(scrollYProgress, [0.1, 0.6], ["0%", "100%"]);

  return (
    <section
      ref={ref}
      id="how-it-works"
      className="relative overflow-hidden bg-background py-16 sm:py-24 md:py-32"
    >
      <div className="max-w-[980px] mx-auto px-6">
        <div className="mb-12 text-left sm:mb-16 md:mb-24">
          <motion.span
            initial={{ opacity: 0, y: 16 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.45 }}
            className="apple-badge"
          >
            Implementación simple
          </motion.span>
          <motion.h2
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.6 }}
            className="mt-4 text-3xl font-semibold tracking-tight text-foreground sm:text-4xl md:text-5xl"
          >
            Empieza en minutos.
          </motion.h2>
          <motion.p
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.6, delay: 0.1 }}
            className="mt-4 max-w-2xl text-left text-base leading-7 text-gray-500 sm:text-lg"
          >
            Sin configuraciones complejas ni procesos eternos. La idea es que tu escuela empiece a
            ver orden desde el primer día.
          </motion.p>
        </div>

        <div className="relative">
          {/* Vertical Line for Desktop */}
          <div className="absolute left-[50%] top-0 bottom-0 w-[1px] bg-gray-200 dark:bg-gray-800 hidden md:block" />

          <motion.div
            style={{ height: lineHeight }}
            className="absolute left-[50%] top-0 w-[2px] bg-blue-apple origin-top hidden md:block"
          />

          <div className="flex flex-col gap-16 md:gap-32">
            {steps.map((step, index) => (
              <motion.div
                key={step.number}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.8, delay: index * 0.2 }}
                className={cn(
                  "flex flex-col md:flex-row items-center gap-8 md:gap-24",
                  index % 2 === 0 ? "md:flex-row-reverse" : ""
                )}
              >
                <div className="flex-1 text-left">
                  <div className={cn("inline-block mb-4", index % 2 === 0 ? "md:text-left" : "md:text-right w-full")}>
                    <span className="text-6xl sm:text-8xl font-bold text-gray-100 dark:text-gray-900 select-none block leading-none tracking-tighter">
                      {step.number}
                    </span>
                  </div>
                </div>

                {/* Center Point */}
                <div className="relative z-10 hidden md:flex items-center justify-center w-8 h-8 rounded-full bg-background border-2 border-gray-200 dark:border-gray-800">
                  <div className="w-2.5 h-2.5 rounded-full bg-blue-apple" />
                </div>

                <div className="flex-1 text-left">
                  <h3 className="text-2xl font-semibold text-foreground mb-3">
                    {step.title}
                  </h3>
                  <p className="text-lg text-gray-500 leading-relaxed">
                    {step.description}
                  </p>
                </div>
              </motion.div>
            ))}
          </div>
        </div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.55, delay: 0.15 }}
          className="mt-14 flex flex-col gap-3 sm:flex-row"
        >
          <Link
            href="/registro"
            className="apple-button-primary min-h-[48px] justify-center px-6 text-sm font-semibold"
          >
            Crear cuenta para mi autoescuela
          </Link>
          <a
            href="#pricing"
            className="apple-button-secondary min-h-[48px] justify-center px-6 text-sm font-semibold"
          >
            Ver planes y demo
          </a>
        </motion.div>
      </div>
    </section>
  );
}
