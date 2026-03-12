"use client";

import Link from "next/link";
import { Users, Calendar, Car, BarChart3 } from "lucide-react";
import { cn } from "@/lib/utils";
import { motion, useMotionTemplate, useMotionValue, useSpring } from "framer-motion";
import { MouseEvent } from "react";

type FeatureItem = {
  icon: typeof Users;
  title: string;
  description: string;
  benefit: string;
  ctaLabel: string;
  className: string;
};

const features: FeatureItem[] = [
  {
    icon: Users,
    title: "Alumnos",
    description: "Expedientes, matrículas, pagos, contratos y progreso práctico en un mismo lugar.",
    benefit: "Reduce errores en expedientes y controla mejor los pagos atrasados.",
    ctaLabel: "Ver gestión de alumnos",
    className: "sm:col-span-2 md:col-span-2 md:row-span-2",
  },
  {
    icon: Calendar,
    title: "Agenda",
    description: "Programa clases y exámenes por instructor, sede y vehículo sin perder visibilidad.",
    benefit: "Evita cruces de horarios y aprovecha mejor tu flota.",
    ctaLabel: "Ver agenda en acción",
    className: "sm:col-span-1 md:col-span-1 md:row-span-1",
  },
  {
    icon: Car,
    title: "Flota",
    description: "Controla mantenimientos, tecnomecánica, seguros y disponibilidad diaria.",
    benefit: "Anticipa vencimientos y evita parar vehículos por falta de control.",
    ctaLabel: "Ver control de flota",
    className: "sm:col-span-1 md:col-span-1 md:row-span-1",
  },
  {
    icon: BarChart3,
    title: "Finanzas",
    description: "Monitorea ingresos, gastos, caja, cartera y rendimiento por sede.",
    benefit: "Detecta fugas de dinero y entiende mejor qué cursos dejan margen.",
    ctaLabel: "Ver módulo de finanzas",
    className: "sm:col-span-2 md:col-span-2 md:row-span-1",
  },
];

function FeatureCard({ feature, index }: { feature: FeatureItem; index: number }) {
  const x = useMotionValue(0);
  const y = useMotionValue(0);

  const mouseX = useSpring(x, { stiffness: 500, damping: 100 });
  const mouseY = useSpring(y, { stiffness: 500, damping: 100 });

  function onMouseMove({ currentTarget, clientX, clientY }: MouseEvent) {
    const { left, top } = currentTarget.getBoundingClientRect();
    x.set(clientX - left);
    y.set(clientY - top);
  }

  const maskImage = useMotionTemplate`radial-gradient(240px at ${mouseX}px ${mouseY}px, white, transparent)`;
  const style = { maskImage, WebkitMaskImage: maskImage };

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true }}
      transition={{ duration: 0.5, delay: index * 0.08 }}
      onMouseMove={onMouseMove}
      className={cn(
        "group relative overflow-hidden rounded-[32px] border border-gray-100 bg-white/85 p-8 shadow-[0_20px_55px_rgba(15,23,42,0.06)] transition-shadow duration-500 hover:shadow-[0_28px_70px_rgba(15,23,42,0.12)] dark:border-gray-800 dark:bg-white/[0.03]",
        feature.className
      )}
    >
      <div className="pointer-events-none absolute inset-0 transition-colors duration-500 group-hover:bg-slate-50/50 dark:group-hover:bg-white/5" />

      <motion.div
        className="pointer-events-none absolute -inset-px opacity-0 transition duration-300 group-hover:opacity-100"
        style={style}
      >
        <div className="absolute inset-0 bg-gradient-to-r from-blue-500/10 to-sky-300/10" />
      </motion.div>

      <div className="relative z-10 flex h-full flex-col justify-between">
        <div>
          <feature.icon className="mb-5 h-10 w-10 text-blue-apple" />
          <h3 className="text-left text-2xl font-semibold text-foreground">{feature.title}</h3>
          <p className="mt-3 max-w-[36rem] text-left text-base leading-7 text-gray-600 dark:text-gray-300">
            {feature.description}
          </p>
          <p className="mt-4 max-w-[36rem] text-left text-sm font-medium leading-6 text-foreground/82">
            {feature.benefit}
          </p>
        </div>

        <Link
          href="/registro"
          className="mt-8 inline-flex min-h-[44px] items-center text-left text-sm font-semibold text-blue-apple transition-transform group-hover:translate-x-1"
        >
          {feature.ctaLabel} &rarr;
        </Link>
      </div>
    </motion.div>
  );
}

export default function Features() {
  return (
    <section
      id="features"
      className="border-y border-gray-100 bg-gray-50 py-16 dark:border-gray-900 dark:bg-black sm:py-24 md:py-32"
    >
      <div className="mx-auto max-w-[1200px] px-6">
        <div className="mb-12 max-w-3xl text-left sm:mb-16 md:mb-20">
          <motion.span
            initial={{ opacity: 0, y: 16 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.45 }}
            className="apple-badge"
          >
            Características clave
          </motion.span>
          <motion.h2
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.55, delay: 0.05 }}
            className="mt-4 text-3xl font-semibold tracking-tight text-foreground sm:text-4xl md:text-5xl"
          >
            Control operativo real para escuelas de conducción.
          </motion.h2>
          <motion.p
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.55, delay: 0.1 }}
            className="mt-5 max-w-2xl text-base leading-7 text-gray-500 sm:text-lg"
          >
            Desde matrícula hasta cartera, agenda y flota: cada módulo está pensado para ahorrar
            tiempo al equipo administrativo y darle visibilidad diaria a la dirección.
          </motion.p>
        </div>

        <div className="grid auto-rows-[minmax(220px,auto)] grid-cols-1 gap-4 sm:grid-cols-2 sm:gap-6 sm:auto-rows-[minmax(240px,auto)] md:grid-cols-3">
          {features.map((feature, index) => (
            <FeatureCard key={feature.title} feature={feature} index={index} />
          ))}
        </div>
      </div>
    </section>
  );
}
